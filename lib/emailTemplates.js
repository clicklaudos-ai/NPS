/* ------------------------------------------------------------------ */
/* Template de e-mail — pesquisa CSAT/NPS                              */
/* Usado apenas pela API route (app/api/campaigns/send). HTML de       */
/* e-mail precisa de tabelas + estilos inline (Outlook ignora <style>  */
/* e não suporta flex/grid), por isso não reaproveita Tailwind/JSX.    */
/* ------------------------------------------------------------------ */

// Mesmos tokens de marca de components/ClickLaudosApp.jsx (const C),
// duplicados aqui porque aquele arquivo é 'use client' e não deve ser
// importado por código server-only.
const COLORS = {
  navy: '#0A2E52',
  blue: '#4FC3E8',
  blueSoft: '#E8F6FC',
  ink: '#0F1F30',
  sub: '#5B7186',
  border: '#E4EBF0',
};

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildNpsEmailSubject({ tipo }) {
  return tipo === 'csat'
    ? 'Como foi seu atendimento na Click Laudos?'
    : 'Você recomendaria a Click Laudos para um amigo?';
}

export function buildNpsEmailHtml({ cliente, atendente, url, tipo, appUrl }) {
  const nome = escapeHtml(cliente).split(' ')[0] || escapeHtml(cliente);
  const pergunta = tipo === 'csat'
    ? 'Queremos saber como foi o atendimento que você recebeu. Leva menos de 1 minuto:'
    : 'Em uma escala de 0 a 10, o quanto você recomendaria a Click Laudos para um amigo ou colega? Leva menos de 1 minuto:';
  const logoUrl = `${appUrl}/logo.jpg`;
  const linkSeguro = escapeHtml(url);

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(buildNpsEmailSubject({ tipo }))}</title>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.blueSoft};font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.blueSoft};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${COLORS.border};">
            <tr>
              <td style="padding:28px 32px 0 32px;text-align:center;">
                <img src="${logoUrl}" alt="Click Laudos" width="48" height="48" style="border-radius:12px;display:inline-block;" />
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;">
                <p style="margin:0 0 4px 0;font-size:13px;color:${COLORS.sub};">Olá, ${nome}!</p>
                <h1 style="margin:0 0 16px 0;font-size:20px;line-height:1.4;color:${COLORS.ink};">${escapeHtml(pergunta)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="border-radius:12px;background:${COLORS.navy};">
                      <a href="${linkSeguro}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">
                        Responder pesquisa
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 0 0;font-size:12px;color:${COLORS.sub};">
                  Se o botão não funcionar, copie e cole este link no navegador:<br />
                  <a href="${linkSeguro}" style="color:${COLORS.blue};word-break:break-all;">${linkSeguro}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 28px 32px;border-top:1px solid ${COLORS.border};">
                <p style="margin:16px 0 0 0;font-size:11px;color:${COLORS.sub};">
                  ${atendente ? `Atendimento realizado por ${escapeHtml(atendente)} • ` : ''}Click Laudos — Solução Tecnológica em Telediagnóstico
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function buildNpsEmailText({ cliente, url, tipo }) {
  const nome = String(cliente ?? '').split(' ')[0] || cliente;
  const pergunta = tipo === 'csat'
    ? 'Como foi o atendimento que você recebeu?'
    : 'De 0 a 10, o quanto você recomendaria a Click Laudos para um amigo ou colega?';
  return `Olá, ${nome}!\n\n${pergunta}\n\nResponda em menos de 1 minuto: ${url}\n\nClick Laudos — Solução Tecnológica em Telediagnóstico`;
}
