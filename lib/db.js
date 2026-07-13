import { supabase } from './supabaseClient';

/* ------------------------------------------------------------------ */
/* Mapeamento: linhas do banco <-> formato usado pelo app              */
/* ------------------------------------------------------------------ */
function mapAtendente(row) {
  return { id: row.id, nome: row.nome };
}
function mapLink(row) {
  return {
    id: row.id,
    cliente: row.cliente,
    atendente: row.atendente_nome,
    tipo: row.tipo,
    url: row.url,
    respondido: row.respondido,
    data: row.criado_em,
  };
}
function mapResponse(row) {
  return {
    id: row.id,
    cliente: row.cliente,
    atendente: row.atendente_nome,
    tipo: row.tipo,
    nota: row.nota,
    comentario: row.comentario || '',
    data: row.criado_em,
  };
}

/* ------------------------------------------------------------------ */
/* Leitura                                                              */
/* ------------------------------------------------------------------ */
export async function fetchAll() {
  const [atendentesRes, linksRes, responsesRes] = await Promise.all([
    supabase.from('atendentes').select('*').order('nome', { ascending: true }),
    supabase.from('survey_links').select('*').order('criado_em', { ascending: false }),
    supabase.from('survey_responses').select('*').order('criado_em', { ascending: false }),
  ]);

  if (atendentesRes.error) throw atendentesRes.error;
  if (linksRes.error) throw linksRes.error;
  if (responsesRes.error) throw responsesRes.error;

  return {
    atendentes: (atendentesRes.data || []).map(mapAtendente),
    links: (linksRes.data || []).map(mapLink),
    responses: (responsesRes.data || []).map(mapResponse),
  };
}

/* ------------------------------------------------------------------ */
/* Escrita — Links                                                      */
/* ------------------------------------------------------------------ */
export async function insertLink({ id, cliente, atendente, tipo, url }) {
  const payload = { cliente, atendente_nome: atendente, tipo, url };
  if (id) payload.id = id;
  const { data, error } = await supabase
    .from('survey_links')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return mapLink(data);
}

/* ------------------------------------------------------------------ */
/* Leitura — Link público (tela do cliente, por id)                     */
/* ------------------------------------------------------------------ */
export async function getLinkById(id) {
  const { data, error } = await supabase
    .from('survey_links')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapLink(data) : null;
}

/* ------------------------------------------------------------------ */
/* Escrita — Respostas                                                  */
/* ------------------------------------------------------------------ */
export async function insertResponse({ linkId, cliente, atendente, tipo, nota, comentario }) {
  const { data, error } = await supabase
    .from('survey_responses')
    .insert({
      link_id: linkId || null,
      cliente,
      atendente_nome: atendente,
      tipo,
      nota,
      comentario: comentario && comentario.trim() !== '' ? comentario.trim() : null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapResponse(data);
}

/* ------------------------------------------------------------------ */
/* Escrita — Atendentes (cadastrar / editar / excluir)                  */
/* ------------------------------------------------------------------ */
export async function insertAtendente(nome) {
  const { data, error } = await supabase.from('atendentes').insert({ nome }).select().single();
  if (error) throw error;
  return mapAtendente(data);
}

export async function updateAtendente(id, nome) {
  const { error } = await supabase.from('atendentes').update({ nome }).eq('id', id);
  if (error) throw error;
}

export async function deleteAtendenteDb(id) {
  const { error } = await supabase.from('atendentes').delete().eq('id', id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Envio em massa — campanhas de e-mail                                */
/* ------------------------------------------------------------------ */
function mapCampaign(row) {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo,
    atendentePadrao: row.atendente_padrao,
    data: row.criado_em,
  };
}
function mapRecipient(row) {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    linkId: row.link_id,
    cliente: row.cliente,
    email: row.email,
    atendente: row.atendente_nome,
    status: row.status,
    resendMessageId: row.resend_message_id,
    erro: row.erro,
    enviadoEm: row.enviado_em,
    data: row.criado_em,
  };
}

export async function insertEmailCampaign({ nome, tipo, atendentePadrao }) {
  const { data, error } = await supabase
    .from('email_campaigns')
    .insert({ nome: nome || null, tipo, atendente_padrao: atendentePadrao || null })
    .select()
    .single();
  if (error) throw error;
  return mapCampaign(data);
}

export async function insertEmailCampaignRecipients(campaignId, recipients) {
  const payload = recipients.map((r) => {
    const row = {
      campaign_id: campaignId,
      cliente: r.cliente,
      email: r.email,
      atendente_nome: r.atendente || '—',
    };
    if (r.id) row.id = r.id;
    return row;
  });
  const { data, error } = await supabase
    .from('email_campaign_recipients')
    .insert(payload)
    .select();
  if (error) throw error;
  return (data || []).map(mapRecipient);
}

export async function fetchEmailCampaigns() {
  const { data, error } = await supabase
    .from('email_campaigns')
    .select('*')
    .order('criado_em', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapCampaign);
}

export async function fetchEmailCampaignRecipients(campaignId) {
  const { data, error } = await supabase
    .from('email_campaign_recipients')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapRecipient);
}

/* ------------------------------------------------------------------ */
/* Tempo real — mantém o Dashboard sincronizado entre usuários         */
/* ------------------------------------------------------------------ */
export function subscribeRealtime(onChange) {
  const channel = supabase
    .channel('clicklaudos-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'survey_responses' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'survey_links' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'atendentes' }, onChange)
    .subscribe();

  return () => supabase.removeChannel(channel);
}
