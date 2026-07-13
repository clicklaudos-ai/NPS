'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  Upload, Mail, Send, Check, X, AlertCircle, RefreshCw, History,
  ChevronDown, ChevronUp, FileSpreadsheet, Download,
} from 'lucide-react';
import { C, SENHA_APP } from '../lib/theme';
import {
  insertEmailCampaign, insertEmailCampaignRecipients,
  fetchEmailCampaigns, fetchEmailCampaignRecipients,
} from '../lib/db';

const CHUNK_SIZE = 50;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DIACRITICS_RE = /[̀-ͯ]/g;
function norm(s) {
  return String(s || '').trim().toLowerCase().normalize('NFD').replace(DIACRITICS_RE, '');
}

/* ------------------------------------------------------------------ */
/* Parsing e validação do CSV                                          */
/* ------------------------------------------------------------------ */
function parseCsv(texto) {
  const resultado = Papa.parse(texto, { header: true, skipEmptyLines: true });
  const campos = resultado.meta.fields || [];
  const chaveNome = campos.find((f) => ['nome', 'cliente', 'name'].includes(norm(f)));
  const chaveEmail = campos.find((f) => norm(f).includes('email'));
  const chaveAtendente = campos.find((f) => norm(f).includes('atendente'));

  return resultado.data.map((row) => ({
    cliente: chaveNome ? String(row[chaveNome] || '').trim() : '',
    email: chaveEmail ? String(row[chaveEmail] || '').trim() : '',
    atendenteRaw: chaveAtendente ? String(row[chaveAtendente] || '').trim() : '',
  }));
}

function validarLinhas(linhas, atendentes) {
  const emailsVistos = new Set();
  return linhas.map((l) => {
    const emailNorm = l.email.toLowerCase();
    let status = 'valido';
    let motivo = '';

    if (!l.cliente) { status = 'invalido'; motivo = 'Nome vazio'; }
    else if (!l.email || !EMAIL_RE.test(l.email)) { status = 'invalido'; motivo = 'E-mail inválido'; }
    else if (emailsVistos.has(emailNorm)) { status = 'duplicado'; motivo = 'E-mail duplicado na planilha'; }

    if (status === 'valido' || status === 'duplicado') {
      if (status === 'valido') emailsVistos.add(emailNorm);
    }

    const atendenteResolvido = l.atendenteRaw
      ? atendentes.find((a) => norm(a.nome) === norm(l.atendenteRaw))?.nome
      : null;

    return { ...l, status, motivo, atendenteResolvido };
  });
}

const STATUS_BADGE = {
  valido: { label: 'Válido', bg: '#E4F8EE', color: '#22B573' },
  invalido: { label: 'Inválido', bg: '#FCE7E7', color: '#E5484D' },
  duplicado: { label: 'Duplicado', bg: '#FEF3DF', color: '#F5A623' },
  pendente: { label: 'Pendente', bg: '#E4EBF0', color: '#5B7186' },
  enviado: { label: 'Enviado', bg: '#E4F8EE', color: '#22B573' },
  falhou: { label: 'Falhou', bg: '#FCE7E7', color: '#E5484D' },
};

function Badge({ status }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.pendente;
  return (
    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] uppercase" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function baixarModeloCsv() {
  const conteudo = 'nome,email,atendente\nMaria Silva,maria@exemplo.com,Bruna Andrade\nJoão Souza,joao@exemplo.com,\n';
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo-envio-em-massa.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Componente principal                                                 */
/* ------------------------------------------------------------------ */
export default function EnvioMassaView({ atendentes }) {
  const [etapa, setEtapa] = useState('upload'); // upload | preview | enviando | resultado
  const [linhas, setLinhas] = useState([]);
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [erroArquivo, setErroArquivo] = useState('');

  const [nomeCampanha, setNomeCampanha] = useState('');
  const [tipo, setTipo] = useState('nps');
  const [atendentePadraoId, setAtendentePadraoId] = useState('');

  const [campanhaAtual, setCampanhaAtual] = useState(null);
  const [destinatarios, setDestinatarios] = useState([]); // {id, cliente, email, atendente, status, erro}
  const [progresso, setProgresso] = useState({ enviados: 0, falhas: 0, processados: 0, total: 0 });
  const [erroEnvio, setErroEnvio] = useState('');

  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [campanhaExpandida, setCampanhaExpandida] = useState(null);
  const [destinatariosExpandidos, setDestinatariosExpandidos] = useState([]);

  const validas = linhas.filter((l) => l.status === 'valido');

  /* ---------------------------- Upload ---------------------------- */
  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErroArquivo('');
    setNomeArquivo(file.name);
    try {
      const texto = await file.text();
      const brutas = parseCsv(texto);
      if (brutas.length === 0) {
        setErroArquivo('Não encontramos nenhuma linha nesse arquivo.');
        return;
      }
      setLinhas(validarLinhas(brutas, atendentes));
      setEtapa('preview');
    } catch (err) {
      console.error(err);
      setErroArquivo('Não foi possível ler esse arquivo. Confira se é um CSV válido.');
    }
    e.target.value = '';
  };

  const reiniciar = () => {
    setEtapa('upload');
    setLinhas([]);
    setNomeArquivo('');
    setErroArquivo('');
    setNomeCampanha('');
    setCampanhaAtual(null);
    setDestinatarios([]);
    setProgresso({ enviados: 0, falhas: 0, processados: 0, total: 0 });
    setErroEnvio('');
  };

  /* ---------------------------- Envio ------------------------------ */
  const enviarChunks = async (campaignId, tipoEnvio, lista) => {
    let enviados = 0;
    let falhas = 0;
    const statusPorId = new Map();

    for (let i = 0; i < lista.length; i += CHUNK_SIZE) {
      const chunk = lista.slice(i, i + CHUNK_SIZE);
      try {
        const resp = await fetch('/api/campaigns/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senha: SENHA_APP,
            campaignId,
            tipo: tipoEnvio,
            recipients: chunk.map((r) => ({ recipientId: r.id, cliente: r.cliente, email: r.email, atendente: r.atendente })),
          }),
        });
        const data = await resp.json();
        if (Array.isArray(data.resultados)) {
          data.resultados.forEach((res) => {
            statusPorId.set(res.recipientId, { status: res.status, erro: res.erro });
            if (res.status === 'enviado') enviados += 1; else falhas += 1;
          });
        } else {
          chunk.forEach((r) => { statusPorId.set(r.id, { status: 'falhou', erro: data.erro || 'Erro ao enviar.' }); falhas += 1; });
        }
      } catch (err) {
        console.error(err);
        chunk.forEach((r) => { statusPorId.set(r.id, { status: 'falhou', erro: 'Falha de rede ao enviar este lote.' }); falhas += 1; });
      }

      setProgresso({ enviados, falhas, processados: Math.min(i + CHUNK_SIZE, lista.length), total: lista.length });
      setDestinatarios((prev) => prev.map((r) => (statusPorId.has(r.id) ? { ...r, ...statusPorId.get(r.id) } : r)));
    }
  };

  const confirmarEnvio = async () => {
    setEtapa('enviando');
    setErroEnvio('');
    const atendenteNomePadrao = atendentes.find((a) => a.id === atendentePadraoId)?.nome || '';

    try {
      const campanha = await insertEmailCampaign({ nome: nomeCampanha.trim() || null, tipo, atendentePadrao: atendenteNomePadrao || null });
      setCampanhaAtual(campanha);

      const lista = validas.map((l) => ({
        id: crypto.randomUUID(),
        cliente: l.cliente,
        email: l.email,
        atendente: l.atendenteResolvido || atendenteNomePadrao || '—',
        status: 'pendente',
        erro: null,
      }));

      await insertEmailCampaignRecipients(campanha.id, lista);
      setDestinatarios(lista);
      setProgresso({ enviados: 0, falhas: 0, processados: 0, total: lista.length });

      await enviarChunks(campanha.id, tipo, lista);
      setEtapa('resultado');
    } catch (err) {
      console.error(err);
      setErroEnvio('Não foi possível criar a campanha. Tente novamente.');
      setEtapa('preview');
    }
  };

  const reenviarFalhas = async () => {
    const falhados = destinatarios.filter((d) => d.status === 'falhou');
    if (falhados.length === 0 || !campanhaAtual) return;
    setEtapa('enviando');
    setProgresso({ enviados: 0, falhas: 0, processados: 0, total: falhados.length });
    await enviarChunks(campanhaAtual.id, campanhaAtual.tipo || tipo, falhados);
    setEtapa('resultado');
  };

  /* --------------------------- Histórico ---------------------------- */
  const abrirHistorico = async () => {
    setMostrarHistorico(true);
    setCarregandoHistorico(true);
    try {
      const camps = await fetchEmailCampaigns();
      setHistorico(camps);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const alternarDetalheCampanha = async (camp) => {
    if (campanhaExpandida === camp.id) { setCampanhaExpandida(null); return; }
    setCampanhaExpandida(camp.id);
    try {
      const recs = await fetchEmailCampaignRecipients(camp.id);
      setDestinatariosExpandidos(recs);
    } catch (err) {
      console.error(err);
      setDestinatariosExpandidos([]);
    }
  };

  const reenviarFalhasHistorico = async (camp) => {
    const falhados = destinatariosExpandidos.filter((d) => d.status === 'falhou');
    if (falhados.length === 0) return;
    setCampanhaAtual(camp);
    setDestinatarios(destinatariosExpandidos.map((d) => ({ id: d.id, cliente: d.cliente, email: d.email, atendente: d.atendente, status: d.status, erro: d.erro })));
    setTipo(camp.tipo);
    setMostrarHistorico(false);
    setEtapa('enviando');
    setProgresso({ enviados: 0, falhas: 0, processados: 0, total: falhados.length });
    await enviarChunks(camp.id, camp.tipo, falhados.map((d) => ({ id: d.id, cliente: d.cliente, email: d.email, atendente: d.atendente })));
    setEtapa('resultado');
  };

  /* ------------------------------ Render ----------------------------- */
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3" style={{ background: C.blueSoft, color: C.navy2 }}>
            <Mail size={12} /> Envio em massa
          </div>
          <h1 className="text-2xl font-extrabold" style={{ color: C.ink }}>Enviar pesquisas por e-mail</h1>
          <p className="text-sm mt-1" style={{ color: C.sub }}>Suba uma planilha com nome e e-mail dos clientes para disparar a pesquisa para todos de uma vez.</p>
        </div>
        <button onClick={abrirHistorico} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border shrink-0" style={{ borderColor: C.border, color: C.navy2, background: C.card }}>
          <History size={14} /> Histórico de campanhas
        </button>
      </div>

      {mostrarHistorico && (
        <div className="mb-6 rounded-2xl border p-5" style={{ background: C.card, borderColor: C.border }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: C.ink }}>Campanhas anteriores</h3>
            <button onClick={() => setMostrarHistorico(false)} className="p-1 rounded-md" style={{ color: C.sub }}><X size={15} /></button>
          </div>
          {carregandoHistorico ? (
            <p className="text-xs" style={{ color: C.sub }}>Carregando...</p>
          ) : historico.length === 0 ? (
            <p className="text-xs" style={{ color: C.sub }}>Nenhuma campanha enviada ainda.</p>
          ) : (
            <div className="space-y-2">
              {historico.map((camp) => (
                <div key={camp.id} className="rounded-xl border" style={{ borderColor: C.border }}>
                  <button onClick={() => alternarDetalheCampanha(camp)} className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: C.ink }}>{camp.nome || `Campanha ${camp.tipo.toUpperCase()}`}</div>
                      <div className="text-[11px]" style={{ color: C.sub }}>
                        {new Date(camp.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })} • {camp.tipo.toUpperCase()}
                      </div>
                    </div>
                    {campanhaExpandida === camp.id ? <ChevronUp size={16} style={{ color: C.sub }} /> : <ChevronDown size={16} style={{ color: C.sub }} />}
                  </button>
                  {campanhaExpandida === camp.id && (
                    <div className="px-3.5 pb-3.5">
                      <DetalheDestinatarios lista={destinatariosExpandidos} />
                      {destinatariosExpandidos.some((d) => d.status === 'falhou') && (
                        <button onClick={() => reenviarFalhasHistorico(camp)} className="mt-2 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: C.navy, color: '#fff' }}>
                          <RefreshCw size={12} /> Reenviar falhas
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {etapa === 'upload' && (
        <div className="rounded-2xl border p-8 text-center" style={{ background: C.card, borderColor: C.border }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: C.blueSoft }}>
            <FileSpreadsheet size={24} style={{ color: C.navy2 }} />
          </div>
          <h3 className="text-base font-bold mb-1.5" style={{ color: C.ink }}>Envie um arquivo CSV</h3>
          <p className="text-xs mb-5" style={{ color: C.sub }}>O arquivo precisa ter colunas de <b>nome</b> e <b>e-mail</b> (coluna de <b>atendente</b> é opcional).</p>
          <label className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm cursor-pointer" style={{ background: C.navy, color: '#fff' }}>
            <Upload size={16} /> Escolher arquivo CSV
            <input type="file" accept=".csv,text/csv" onChange={onFileChange} className="hidden" />
          </label>
          {erroArquivo && (
            <div className="flex items-center gap-1.5 text-xs font-semibold mt-3 justify-center" style={{ color: C.red }}>
              <AlertCircle size={13} /> {erroArquivo}
            </div>
          )}
          <button onClick={baixarModeloCsv} className="flex items-center gap-1.5 text-xs font-semibold mx-auto mt-5" style={{ color: C.navy2 }}>
            <Download size={13} /> Baixar modelo de planilha
          </button>
        </div>
      )}

      {etapa === 'preview' && (
        <div className="space-y-5">
          <div className="rounded-2xl border p-5" style={{ background: C.card, borderColor: C.border }}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.ink }}>
                <FileSpreadsheet size={15} /> {nomeArquivo}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: C.greenSoft, color: C.green }}>{validas.length} válidos</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: C.bg, color: C.sub }}>{linhas.length} linhas</span>
              </div>
              <button onClick={reiniciar} className="text-xs font-semibold" style={{ color: C.sub }}>Trocar arquivo</button>
            </div>

            <div className="overflow-x-auto -mx-1 mb-5" style={{ maxHeight: 280, overflowY: 'auto' }}>
              <table className="w-full text-xs min-w-[480px]">
                <thead>
                  <tr style={{ color: C.sub }} className="text-left">
                    <th className="font-semibold px-2 py-2">Nome</th>
                    <th className="font-semibold px-2 py-2">E-mail</th>
                    <th className="font-semibold px-2 py-2">Atendente</th>
                    <th className="font-semibold px-2 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: C.border }}>
                      <td className="px-2 py-2 font-semibold" style={{ color: C.ink }}>{l.cliente || '—'}</td>
                      <td className="px-2 py-2" style={{ color: C.sub }}>{l.email || '—'}</td>
                      <td className="px-2 py-2" style={{ color: C.sub }}>{l.atendenteResolvido || '—'}</td>
                      <td className="px-2 py-2">
                        <Badge status={l.status} />
                        {l.motivo && <span className="ml-1.5 text-[11px]" style={{ color: C.sub }}>{l.motivo}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-1.5" style={{ color: C.ink }}>Nome da campanha <span className="font-normal" style={{ color: C.sub }}>(opcional)</span></label>
                <input value={nomeCampanha} onChange={(e) => setNomeCampanha(e.target.value)} placeholder="Ex.: Pesquisa NPS — Julho/2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2" style={{ borderColor: C.border, background: C.bg }} />
              </div>

              <div>
                <label className="text-sm font-semibold block mb-2" style={{ color: C.ink }}>Tipo de pesquisa</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setTipo('csat')} className="rounded-xl border-2 px-3 py-3 text-left transition-all"
                    style={tipo === 'csat' ? { borderColor: C.navy, background: C.blueSoft } : { borderColor: C.border }}>
                    <div className="text-sm font-bold" style={{ color: C.ink }}>CSAT</div>
                    <div className="text-xs" style={{ color: C.sub }}>Fim de atendimento</div>
                  </button>
                  <button onClick={() => setTipo('nps')} className="rounded-xl border-2 px-3 py-3 text-left transition-all"
                    style={tipo === 'nps' ? { borderColor: C.navy, background: C.blueSoft } : { borderColor: C.border }}>
                    <div className="text-sm font-bold" style={{ color: C.ink }}>NPS</div>
                    <div className="text-xs" style={{ color: C.sub }}>Pesquisa de base</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-1.5" style={{ color: C.ink }}>
                  Atendente padrão <span className="font-normal" style={{ color: C.sub }}>(usado quando a planilha não informar um atendente na linha)</span>
                </label>
                <select value={atendentePadraoId} onChange={(e) => setAtendentePadraoId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2" style={{ borderColor: C.border, background: C.bg, color: atendentePadraoId ? C.ink : C.sub }}>
                  <option value="">Sem atendente padrão</option>
                  {atendentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>

              {erroEnvio && (
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: C.red }}>
                  <AlertCircle size={13} /> {erroEnvio}
                </div>
              )}

              <button onClick={confirmarEnvio} disabled={validas.length === 0}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={validas.length > 0 ? { background: C.navy, color: '#fff' } : { background: C.border, color: C.sub, cursor: 'not-allowed' }}>
                <Send size={16} /> Enviar para {validas.length} {validas.length === 1 ? 'destinatário' : 'destinatários'}
              </button>
            </div>
          </div>
        </div>
      )}

      {etapa === 'enviando' && (
        <div className="rounded-2xl border p-8 text-center" style={{ background: C.card, borderColor: C.border }}>
          <div className="w-10 h-10 rounded-full border-4 mx-auto mb-4 animate-spin" style={{ borderColor: C.border, borderTopColor: C.navy }} />
          <h3 className="text-base font-bold mb-1.5" style={{ color: C.ink }}>Enviando pesquisas...</h3>
          <p className="text-xs" style={{ color: C.sub }}>{progresso.processados} de {progresso.total} processados • {progresso.enviados} enviados • {progresso.falhas} falhas</p>
          <div className="w-full h-2 rounded-full mt-4 overflow-hidden" style={{ background: C.bg }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progresso.total ? (progresso.processados / progresso.total) * 100 : 0}%`, background: C.blue }} />
          </div>
        </div>
      )}

      {etapa === 'resultado' && (
        <div className="space-y-5">
          <div className="rounded-2xl border p-5" style={{ background: C.blueSoft, borderColor: C.blueSoft2 }}>
            <div className="flex items-center gap-2 mb-1">
              <Check size={18} style={{ color: C.green }} />
              <h3 className="text-base font-bold" style={{ color: C.ink }}>Campanha concluída</h3>
            </div>
            <p className="text-sm" style={{ color: C.navy2 }}>{progresso.enviados} e-mails enviados • {progresso.falhas} falhas de {progresso.total} destinatários</p>
          </div>

          <div className="rounded-2xl border p-5" style={{ background: C.card, borderColor: C.border }}>
            <DetalheDestinatarios lista={destinatarios} />
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              {destinatarios.some((d) => d.status === 'falhou') && (
                <button onClick={reenviarFalhas} className="flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border" style={{ borderColor: C.border, color: C.ink, background: '#fff' }}>
                  <RefreshCw size={14} /> Reenviar falhas
                </button>
              )}
              <button onClick={reiniciar} className="flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2" style={{ background: C.navy, color: '#fff' }}>
                <Mail size={14} /> Nova campanha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetalheDestinatarios({ lista }) {
  if (!lista || lista.length === 0) {
    return <p className="text-xs" style={{ color: C.sub }}>Nenhum destinatário para exibir.</p>;
  }
  return (
    <div className="overflow-x-auto -mx-1" style={{ maxHeight: 320, overflowY: 'auto' }}>
      <table className="w-full text-xs min-w-[480px]">
        <thead>
          <tr style={{ color: C.sub }} className="text-left">
            <th className="font-semibold px-2 py-2">Nome</th>
            <th className="font-semibold px-2 py-2">E-mail</th>
            <th className="font-semibold px-2 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((d) => (
            <tr key={d.id} className="border-t" style={{ borderColor: C.border }}>
              <td className="px-2 py-2 font-semibold" style={{ color: C.ink }}>{d.cliente}</td>
              <td className="px-2 py-2" style={{ color: C.sub }}>{d.email}</td>
              <td className="px-2 py-2">
                <Badge status={d.status} />
                {d.erro && <span className="ml-1.5 text-[11px]" style={{ color: C.red }}>{d.erro}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
