import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { buildNpsEmailHtml, buildNpsEmailSubject, buildNpsEmailText } from '../../../../lib/emailTemplates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHUNK_SIZE = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function badRequest(msg) {
  return NextResponse.json({ erro: msg }, { status: 400 });
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return badRequest('JSON inválido.');
  }

  const { senha, campaignId, tipo, recipients } = body || {};

  // Proteção mínima: mesma senha compartilhada já usada no PasswordGate do
  // app, agora validada no servidor. Não é autenticação real, só impede
  // que a rota seja acionada por qualquer request anônimo na internet.
  if (!process.env.APP_ACCESS_PASSWORD || senha !== process.env.APP_ACCESS_PASSWORD) {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 });
  }

  if (typeof campaignId !== 'string' || !campaignId) return badRequest('campaignId obrigatório.');
  if (tipo !== 'csat' && tipo !== 'nps') return badRequest('tipo deve ser "csat" ou "nps".');
  if (!Array.isArray(recipients) || recipients.length === 0) return badRequest('recipients vazio.');
  if (recipients.length > CHUNK_SIZE) return badRequest(`no máximo ${CHUNK_SIZE} destinatários por chamada.`);

  for (const r of recipients) {
    if (!r || typeof r.recipientId !== 'string' || typeof r.cliente !== 'string' || !r.cliente.trim() || typeof r.email !== 'string' || !EMAIL_RE.test(r.email)) {
      return badRequest('cada destinatário precisa de recipientId, cliente e email válidos.');
    }
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return NextResponse.json({ erro: 'RESEND_API_KEY/RESEND_FROM_EMAIL não configurados no servidor.' }, { status: 500 });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, '');

  // Gera um survey_links por destinatário (mesmo fluxo do link manual).
  const prepared = recipients.map((r) => {
    const linkId = randomUUID();
    return {
      ...r,
      linkId,
      url: `${appUrl}/avaliar?id=${linkId}`,
    };
  });

  const { error: insertLinksError } = await supabase.from('survey_links').insert(
    prepared.map((r) => ({
      id: r.linkId,
      cliente: r.cliente.trim(),
      atendente_nome: r.atendente || '—',
      tipo,
      url: r.url,
    }))
  );

  if (insertLinksError) {
    await supabase.from('email_campaign_recipients').upsert(
      recipients.map((r) => ({ id: r.recipientId, status: 'falhou', erro: `Erro ao criar link: ${insertLinksError.message}` })),
      { onConflict: 'id' }
    );
    return NextResponse.json({ erro: insertLinksError.message, enviados: 0, falhas: recipients.length, resultados: [] }, { status: 200 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const subject = buildNpsEmailSubject({ tipo });

  const { data, error: sendError } = await resend.batch.send(
    prepared.map((r) => ({
      from: process.env.RESEND_FROM_EMAIL,
      to: r.email,
      subject,
      html: buildNpsEmailHtml({ cliente: r.cliente, atendente: r.atendente, url: r.url, tipo, appUrl }),
      text: buildNpsEmailText({ cliente: r.cliente, url: r.url, tipo }),
    }))
  );

  const items = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : null;

  const now = new Date().toISOString();
  const updates = prepared.map((r, i) => {
    if (sendError || !items) {
      return {
        id: r.recipientId,
        link_id: r.linkId,
        status: 'falhou',
        erro: sendError?.message || 'Falha desconhecida ao enviar o lote.',
      };
    }
    const item = items[i];
    if (item?.id) {
      return {
        id: r.recipientId,
        link_id: r.linkId,
        status: 'enviado',
        resend_message_id: item.id,
        enviado_em: now,
        erro: null,
      };
    }
    return {
      id: r.recipientId,
      link_id: r.linkId,
      status: 'falhou',
      erro: item?.message || item?.error || 'Erro desconhecido ao enviar este destinatário.',
    };
  });

  const { error: updateError } = await supabase
    .from('email_campaign_recipients')
    .upsert(updates, { onConflict: 'id' });

  if (updateError) {
    return NextResponse.json({ erro: `E-mails processados, mas falhou ao salvar status: ${updateError.message}` }, { status: 200 });
  }

  const enviados = updates.filter((u) => u.status === 'enviado').length;
  const falhas = updates.length - enviados;

  return NextResponse.json({
    enviados,
    falhas,
    resultados: updates.map((u) => ({ recipientId: u.id, status: u.status, erro: u.erro })),
  });
}
