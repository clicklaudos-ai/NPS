import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { insertLink } from '../../../lib/db';

export const dynamic = 'force-dynamic';

const SENHA_APP = '9171';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIMITE_CONTATOS = 300;

function emailHtml({ nome, url }) {
  return `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; background:#F4F8FA; padding:32px 16px;">
    <div style="max-width:480px; margin:0 auto; background:#FFFFFF; border-radius:20px; padding:32px; border:1px solid #E4EBF0;">
      <div style="font-size:20px; font-weight:800; margin-bottom:4px;">
        <span style="color:#0A2E52;">Click</span><span style="color:#4FC3E8;">Laudos</span>
      </div>
      <p style="color:#5B7186; font-size:11px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; margin-top:0;">
        Solução Tecnológica em Telediagnóstico
      </p>
      <h1 style="color:#0F1F30; font-size:18px; margin-bottom:8px;">Olá${nome ? `, ${nome}` : ''}!</h1>
      <p style="color:#5B7186; font-size:14px; line-height:1.6;">
        Em uma escala de 0 a 10, o quanto você recomendaria a Click Laudos para um amigo ou colega?
        Sua resposta leva menos de um minuto e nos ajuda a melhorar cada vez mais.
      </p>
      <div style="text-align:center; margin:28px 0;">
        <a href="${url}" style="background:#0A2E52; color:#ffffff; text-decoration:none; font-weight:700; font-size:14px; padding:14px 28px; border-radius:12px; display:inline-block;">
          Responder pesquisa
        </a>
      </div>
      <p style="color:#5B7186; font-size:12px; line-height:1.6;">
        Se o botão não funcionar, copie e cole este link no navegador:<br />
        <a href="${url}" style="color:#123A63;">${url}</a>
      </p>
    </div>
  </div>`;
}

async function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ erro: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const { senha, atendente, contatos, origin } = body || {};

  if (senha !== SENHA_APP) {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ erro: 'RESEND_API_KEY não configurada no servidor.' }, { status: 500 });
  }

  if (!Array.isArray(contatos) || contatos.length === 0) {
    return NextResponse.json({ erro: 'Nenhum contato informado.' }, { status: 400 });
  }

  if (contatos.length > LIMITE_CONTATOS) {
    return NextResponse.json({ erro: `Limite de ${LIMITE_CONTATOS} contatos por disparo.` }, { status: 400 });
  }

  const baseUrl = (origin && String(origin).replace(/\/$/, '')) || req.nextUrl.origin;
  const enderecoRemetente = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const remetente = `Pesquisa ClickLaudos <${enderecoRemetente}>`;
  const resend = new Resend(process.env.RESEND_API_KEY);

  const resultados = [];

  for (const contato of contatos) {
    const nome = (contato?.nome || '').trim();
    const email = (contato?.email || '').trim();

    if (!email || !EMAIL_REGEX.test(email)) {
      resultados.push({ nome, email, status: 'erro', mensagem: 'E-mail inválido.' });
      continue;
    }

    const id = randomUUID();
    const url = `${baseUrl}/avaliar?id=${id}`;
    let statusEnvio = 'ok';
    let erroEnvio = null;

    try {
      const envio = await resend.emails.send({
        from: remetente,
        to: email,
        subject: 'Sua opinião é muito importante para a Click Laudos',
        html: emailHtml({ nome, url }),
      });
      if (envio.error) {
        statusEnvio = 'erro';
        erroEnvio = envio.error.message || 'Falha ao enviar e-mail.';
      }
    } catch (e) {
      statusEnvio = 'erro';
      erroEnvio = e.message || 'Falha inesperada.';
    }

    // Registra a tentativa (com sucesso ou não) no histórico de disparos,
    // mesmo quando o e-mail falha, para dar visibilidade ao suporte.
    try {
      await insertLink({
        id, cliente: nome || email, atendente: atendente || '—', tipo: 'nps', url,
        email, canal: 'email', statusEnvio, erroEnvio,
      });
    } catch (e) {
      if (statusEnvio === 'ok') { statusEnvio = 'erro'; erroEnvio = 'E-mail enviado, mas falhou ao registrar no histórico.'; }
    }

    resultados.push(statusEnvio === 'ok'
      ? { nome, email, status: 'ok', url }
      : { nome, email, status: 'erro', mensagem: erroEnvio });

    // Respeita o limite de requisições por segundo do provedor de e-mail.
    await esperar(350);
  }

  return NextResponse.json({ resultados });
}
