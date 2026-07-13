'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Link2, Copy, Check, Send, BarChart3, MessageSquare, Calendar,
  Sparkles, ArrowLeft, ClipboardList, Users, TrendingUp, TrendingDown,
  Search, ExternalLink, AlertCircle, ThumbsUp, Clock, Zap, Frown,
  Settings2, Pencil, Trash2, X, Lock, Mail
} from 'lucide-react';
import {
  fetchAll, insertLink, insertResponse, insertAtendente,
  updateAtendente, deleteAtendenteDb, subscribeRealtime,
} from '../lib/db';
import EnvioMassaView from './EnvioMassaView';
import { C, SENHA_APP } from '../lib/theme';

/* ------------------------------------------------------------------ */
/* Logo                                                                 */
/* ------------------------------------------------------------------ */
function ClickLaudosLogo({ size = 'md', showTag = true }) {
  const h = size === 'lg' ? 34 : size === 'sm' ? 18 : 24;
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/logo.jpg"
        alt="Click Laudos"
        className="rounded-xl shrink-0 object-cover"
        style={{ width: h + 16, height: h + 16 }}
      />
      <div>
        <div style={{ fontSize: h, lineHeight: 1, letterSpacing: '-0.02em' }} className="font-extrabold">
          <span style={{ color: C.navy }}>Click</span>
          <span style={{ color: C.blue }}>Laudos</span>
        </div>
        {showTag && (
          <div style={{ color: C.navy, fontSize: Math.max(h * 0.26, 8), letterSpacing: '0.14em' }} className="font-bold uppercase mt-0.5">
            Solução Tecnológica em Telediagnóstico
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers de data                                                      */
/* ------------------------------------------------------------------ */
function inRange(dateStr, filter, custom) {
  const d = new Date(dateStr);
  const now = new Date();
  if (filter === '7d') {
    const from = new Date(now); from.setDate(now.getDate() - 7);
    return d >= from;
  }
  if (filter === '30d') {
    const from = new Date(now); from.setDate(now.getDate() - 30);
    return d >= from;
  }
  if (filter === 'month') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  if (filter === 'custom' && custom.from && custom.to) {
    const from = new Date(custom.from);
    const to = new Date(custom.to); to.setHours(23, 59, 59, 999);
    return d >= from && d <= to;
  }
  return true;
}
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function formatDateShort(dateStr) {
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/* ------------------------------------------------------------------ */
/* Nav                                                                   */
/* ------------------------------------------------------------------ */
function NavBar({ view, setView, sincronizando }) {
  const items = [
    { id: 'suporte', label: 'Gerador de Link', icon: Link2 },
    { id: 'campanha', label: 'Envio em massa', icon: Mail },
    { id: 'cliente', label: 'Simulação Cliente', icon: Users },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  ];
  return (
    <div className="sticky top-0 z-30 border-b" style={{ background: '#fff', borderColor: C.border }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <ClickLaudosLogo size="sm" showTag={false} />
          <span className="hidden md:flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: C.sub }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: sincronizando ? C.amber : C.green }} />
            {sincronizando ? 'Salvando...' : 'Dados sincronizados'}
          </span>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: C.bg }}>
          {items.map((it) => {
            const Icon = it.icon;
            const active = view === it.id;
            return (
              <button
                key={it.id}
                onClick={() => setView(it.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all"
                style={active ? { background: C.navy, color: '#fff' } : { color: C.sub }}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{it.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gerenciador de atendentes (editar / excluir)                         */
/* ------------------------------------------------------------------ */
function AtendentesPanel({ atendentes, onEdit, onDelete, onClose }) {
  const [editandoId, setEditandoId] = useState(null);
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [confirmandoId, setConfirmandoId] = useState(null);

  const iniciarEdicao = (a) => { setEditandoId(a.id); setNomeEdicao(a.nome); setConfirmandoId(null); };
  const salvarEdicao = () => {
    const nome = nomeEdicao.trim();
    if (nome) onEdit(editandoId, nome);
    setEditandoId(null);
  };

  return (
    <div className="mt-3 rounded-xl border p-3.5" style={{ background: C.bg, borderColor: C.border }}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: C.sub }}>Atendentes cadastrados</span>
        <button onClick={onClose} className="p-1 rounded-md" style={{ color: C.sub }}><X size={14} /></button>
      </div>
      {atendentes.length === 0 && <p className="text-xs" style={{ color: C.sub }}>Nenhum atendente cadastrado ainda.</p>}
      <div className="space-y-1.5">
        {atendentes.map((a) => (
          <div key={a.id} className="flex items-center gap-2 bg-white rounded-lg border px-2.5 py-2" style={{ borderColor: C.border }}>
            {editandoId === a.id ? (
              <>
                <input value={nomeEdicao} onChange={(e) => setNomeEdicao(e.target.value)} autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && salvarEdicao()}
                  className="flex-1 text-sm px-2 py-1 rounded-md border outline-none" style={{ borderColor: C.border }} />
                <button onClick={salvarEdicao} className="text-xs font-bold px-2 py-1 rounded-md" style={{ background: C.navy, color: '#fff' }}>Salvar</button>
                <button onClick={() => setEditandoId(null)} className="text-xs font-semibold px-2 py-1" style={{ color: C.sub }}>Cancelar</button>
              </>
            ) : confirmandoId === a.id ? (
              <>
                <span className="flex-1 text-xs font-semibold" style={{ color: C.red }}>Excluir "{a.nome}"? Isso não apaga o histórico já registrado.</span>
                <button onClick={() => { onDelete(a.id); setConfirmandoId(null); }} className="text-xs font-bold px-2 py-1 rounded-md" style={{ background: C.red, color: '#fff' }}>Excluir</button>
                <button onClick={() => setConfirmandoId(null)} className="text-xs font-semibold px-2 py-1" style={{ color: C.sub }}>Cancelar</button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-semibold" style={{ color: C.ink }}>{a.nome}</span>
                <button onClick={() => iniciarEdicao(a)} className="p-1.5 rounded-md hover:opacity-70" style={{ color: C.navy2 }} title="Editar">
                  <Pencil size={13} />
                </button>
                <button onClick={() => setConfirmandoId(a.id)} className="p-1.5 rounded-md hover:opacity-70" style={{ color: C.red }} title="Excluir">
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* VISÃO 1 — Gerador de Link (Suporte)                                  */
/* ------------------------------------------------------------------ */
function SuporteView({ addLink, goToCliente, atendentes, addAtendente, editAtendente, deleteAtendente }) {
  const [nome, setNome] = useState('');
  const [atendenteId, setAtendenteId] = useState('');
  const [tipo, setTipo] = useState('csat');
  const [linkGerado, setLinkGerado] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [erroCopia, setErroCopia] = useState(false);
  const [novoAtendente, setNovoAtendente] = useState('');
  const [mostrarNovoAtendente, setMostrarNovoAtendente] = useState(false);
  const [mostrarGerenciar, setMostrarGerenciar] = useState(false);

  const podeGerar = nome.trim().length > 0 && atendenteId !== '';

  const [gerando, setGerando] = useState(false);

  const gerarLink = async () => {
    if (!podeGerar || gerando) return;
    setGerando(true);
    const atendente = atendentes.find((a) => a.id === atendenteId);
    const id = crypto.randomUUID();
    const url = `${window.location.origin}/avaliar?id=${id}`;
    const novo = { id, cliente: nome.trim(), atendente: atendente ? atendente.nome : '—', tipo, url };
    const criado = await addLink(novo);
    if (criado) {
      setLinkGerado(criado);
      setCopiado(false);
    }
    setGerando(false);
  };

  const salvarNovoAtendente = async () => {
    const nomeNovo = novoAtendente.trim();
    if (!nomeNovo) return;
    const id = await addAtendente(nomeNovo);
    if (id) setAtendenteId(id);
    setNovoAtendente('');
    setMostrarNovoAtendente(false);
  };

  const handleDeleteAtendente = (id) => {
    deleteAtendente(id);
    if (atendenteId === id) setAtendenteId('');
  };

  const copiarLink = async () => {
    const texto = linkGerado.url;
    let sucesso = false;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(texto);
        sucesso = true;
      } catch (e) { sucesso = false; }
    }

    if (!sucesso) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = texto;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        sucesso = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (e) { sucesso = false; }
    }

    if (sucesso) {
      setCopiado(true);
      setErroCopia(false);
      setTimeout(() => setCopiado(false), 2000);
    } else {
      setErroCopia(true);
      setTimeout(() => setErroCopia(false), 2500);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3" style={{ background: C.blueSoft, color: C.navy2 }}>
          <Link2 size={12} /> Gerador de pesquisa
        </div>
        <h1 className="text-2xl font-extrabold" style={{ color: C.ink }}>Gerar link de avaliação</h1>
        <p className="text-sm mt-1" style={{ color: C.sub }}>Preencha os dados do atendimento para gerar o link de pesquisa a ser enviado ao cliente.</p>
      </div>

      <div className="rounded-2xl p-6 shadow-sm border" style={{ background: C.card, borderColor: C.border }}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold block mb-1.5" style={{ color: C.ink }}>Nome do cliente</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Maria Silva"
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2" style={{ borderColor: C.border, background: C.bg }} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold" style={{ color: C.ink }}>Atendente responsável</label>
              {atendentes.length > 0 && (
                <button onClick={() => setMostrarGerenciar((v) => !v)} className="flex items-center gap-1 text-xs font-semibold" style={{ color: C.navy2 }}>
                  <Settings2 size={12} /> Gerenciar
                </button>
              )}
            </div>
            {!mostrarNovoAtendente ? (
              <>
                <select value={atendenteId} onChange={(e) => setAtendenteId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2" style={{ borderColor: C.border, background: C.bg, color: atendenteId ? C.ink : C.sub }}>
                  <option value="">Selecione o atendente...</option>
                  {atendentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
                <button onClick={() => setMostrarNovoAtendente(true)} className="text-xs font-semibold mt-1.5" style={{ color: C.navy2 }}>
                  + Cadastrar novo atendente
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <input value={novoAtendente} onChange={(e) => setNovoAtendente(e.target.value)} placeholder="Nome do atendente" autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && salvarNovoAtendente()}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2" style={{ borderColor: C.border, background: C.bg }} />
                <button onClick={salvarNovoAtendente} className="px-3 rounded-xl text-sm font-bold" style={{ background: C.navy, color: '#fff' }}>Salvar</button>
                <button onClick={() => { setMostrarNovoAtendente(false); setNovoAtendente(''); }} className="px-3 rounded-xl text-sm font-semibold border" style={{ borderColor: C.border, color: C.sub }}>Cancelar</button>
              </div>
            )}
            {mostrarGerenciar && (
              <AtendentesPanel
                atendentes={atendentes}
                onEdit={editAtendente}
                onDelete={handleDeleteAtendente}
                onClose={() => setMostrarGerenciar(false)}
              />
            )}
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

          <button onClick={gerarLink} disabled={!podeGerar || gerando}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={podeGerar && !gerando ? { background: C.navy, color: '#fff' } : { background: C.border, color: C.sub, cursor: 'not-allowed' }}>
            <Link2 size={16} /> {gerando ? 'Gerando...' : 'Gerar link de avaliação'}
          </button>
        </div>
      </div>

      {linkGerado && (
        <div className="mt-5 rounded-2xl p-5 border animate-[fadeIn_0.2s]" style={{ background: C.blueSoft, borderColor: C.blueSoft2 }}>
          <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.navy2 }}>Link gerado</div>
          <div className="flex items-center gap-2 bg-white rounded-xl border px-3.5 py-2.5 mb-3" style={{ borderColor: C.border }}>
            <ExternalLink size={14} style={{ color: C.sub }} className="shrink-0" />
            <input
              readOnly
              value={linkGerado.url}
              onFocus={(e) => e.target.select()}
              className="text-sm truncate font-mono w-full bg-transparent outline-none"
              style={{ color: C.ink }}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={copiarLink} className="flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border"
              style={{ background: '#fff', borderColor: erroCopia ? C.red : C.border, color: erroCopia ? C.red : C.ink }}>
              {copiado ? <Check size={15} style={{ color: C.green }} /> : <Copy size={15} />}
              {copiado ? 'Link copiado!' : erroCopia ? 'Não copiou — selecione manualmente' : 'Copiar link'}
            </button>
            <button onClick={() => goToCliente(linkGerado)} className="flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
              style={{ background: C.navy, color: '#fff' }}>
              <Users size={15} /> Simular clique do cliente
            </button>
          </div>
          <p className="text-xs mt-3" style={{ color: C.navy2 }}>Envie este link para o cliente via WhatsApp ou e-mail. O botão de simulação é apenas para teste desta demonstração.</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* VISÃO 2 — Tela do Cliente                                            */
/* ------------------------------------------------------------------ */
const CSAT_OPTS = [
  { v: 1, emoji: '😡', label: 'Péssimo' },
  { v: 2, emoji: '🙁', label: 'Ruim' },
  { v: 3, emoji: '😐', label: 'Regular' },
  { v: 4, emoji: '🙂', label: 'Bom' },
  { v: 5, emoji: '😄', label: 'Ótimo' },
];
function npsColor(v) {
  if (v <= 6) return C.red;
  if (v <= 8) return C.amber;
  return C.green;
}

function ClienteView({ survey, onSubmit, onBack, onChangeDemoTipo }) {
  const [nota, setNota] = useState(null);
  const [comentario, setComentario] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const isCsat = survey.tipo === 'csat';
  const isDemo = survey.id === 'demo';
  const comentarioObrigatorio = !isCsat && nota !== null && nota <= 6;

  const enviar = async () => {
    if (nota === null) { setErro('Selecione uma nota antes de enviar.'); return; }
    if (comentarioObrigatorio && comentario.trim() === '') { setErro('Conte pra gente o motivo da nota.'); return; }
    setErro('');
    setEnviando(true);
    try {
      await onSubmit({
        cliente: survey.cliente,
        atendente: survey.atendente,
        tipo: survey.tipo,
        nota,
        comentario: comentario.trim(),
      });
      setEnviado(true);
    } catch (e) {
      setErro('Não foi possível enviar sua avaliação. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10" style={{ background: `radial-gradient(circle at 20% 10%, ${C.blueSoft} 0%, ${C.bg} 55%)` }}>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><ClickLaudosLogo size="md" /></div>

        <div className="rounded-3xl shadow-lg border p-7" style={{ background: C.card, borderColor: C.border }}>
          {!enviado ? (
            <>
              {isDemo && onChangeDemoTipo && (
                <div className="flex items-center gap-1 p-1 rounded-lg mb-4" style={{ background: C.bg }}>
                  <button onClick={() => onChangeDemoTipo('csat')}
                    className="flex-1 py-1.5 rounded-md text-xs font-bold transition-all"
                    style={isCsat ? { background: C.navy, color: '#fff' } : { color: C.sub }}>
                    Pesquisa CSAT
                  </button>
                  <button onClick={() => onChangeDemoTipo('nps')}
                    className="flex-1 py-1.5 rounded-md text-xs font-bold transition-all"
                    style={!isCsat ? { background: C.navy, color: '#fff' } : { color: C.sub }}>
                    Pesquisa NPS
                  </button>
                </div>
              )}
              <div className="text-xs font-semibold mb-1" style={{ color: C.sub }}>
                {isCsat ? `${survey.cliente} • Atendido por ${survey.atendente}` : survey.cliente}
              </div>
              <h1 className="text-lg font-extrabold leading-snug mb-6" style={{ color: C.ink }}>
                {isCsat
                  ? 'Como você avalia o atendimento que recebeu hoje na Click Laudos?'
                  : 'Em uma escala de 0 a 10, o quanto você recomendaria a Click Laudos para um amigo ou colega?'}
              </h1>

              {isCsat ? (
                <div className="flex justify-between gap-1 mb-2">
                  {CSAT_OPTS.map((o) => (
                    <button key={o.v} onClick={() => { setNota(o.v); setErro(''); }}
                      className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all"
                      style={nota === o.v ? { borderColor: C.navy, background: C.blueSoft, transform: 'scale(1.05)' } : { borderColor: C.border }}>
                      <span style={{ fontSize: 28 }}>{o.emoji}</span>
                      <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: C.sub }}>{o.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div>
                  <div className="flex gap-1 mb-1.5">
                    {Array.from({ length: 11 }, (_, v) => v).map((v) => (
                      <button key={v} onClick={() => { setNota(v); setErro(''); }}
                        className="flex-1 min-w-0 rounded-lg font-bold text-[11px] sm:text-sm py-2.5 sm:py-3 flex items-center justify-center border-2 transition-all"
                        style={nota === v
                          ? { background: npsColor(v), color: '#fff', borderColor: npsColor(v), transform: 'scale(1.08)' }
                          : { borderColor: C.border, color: C.ink }}>
                        {v}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[11px] font-medium mb-4" style={{ color: C.sub }}>
                    <span>Pouco provável</span><span>Muito provável</span>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label className="text-sm font-semibold block mb-1.5" style={{ color: C.ink }}>
                  {isCsat ? 'Quer deixar um comentário sobre o atendimento?' : 'Qual o principal motivo da sua nota?'}
                  {!isCsat && comentarioObrigatorio && <span style={{ color: C.red }}> *</span>}
                  {isCsat && <span className="font-normal" style={{ color: C.sub }}> (opcional)</span>}
                </label>
                <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3}
                  placeholder="Escreva aqui..." className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none resize-none"
                  style={{ borderColor: C.border, background: C.bg }} />
              </div>

              {erro && (
                <div className="flex items-center gap-1.5 text-xs font-semibold mt-2" style={{ color: C.red }}>
                  <AlertCircle size={13} /> {erro}
                </div>
              )}

              <button onClick={enviar} disabled={enviando} className="w-full mt-5 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: C.navy, color: '#fff', opacity: enviando ? 0.7 : 1, cursor: enviando ? 'not-allowed' : 'pointer' }}>
                <Send size={16} /> {enviando ? 'Enviando...' : 'Enviar avaliação'}
              </button>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: C.greenSoft }}>
                <Check size={30} style={{ color: C.green }} strokeWidth={3} />
              </div>
              <h2 className="text-xl font-extrabold mb-1.5" style={{ color: C.ink }}>Obrigado por nos ajudar a melhorar!</h2>
              <p className="text-sm" style={{ color: C.sub }}>Sua resposta foi registrada e já está refletida no painel do gestor.</p>
              {onBack && (
                <button onClick={onBack} className="mt-6 text-sm font-semibold px-4 py-2 rounded-xl border" style={{ borderColor: C.border, color: C.navy }}>
                  Voltar ao início
                </button>
              )}
            </div>
          )}
        </div>
        {!enviado && onBack && <div className="text-center mt-4"><button onClick={onBack} className="text-xs font-semibold flex items-center gap-1 mx-auto" style={{ color: C.sub }}><ArrowLeft size={12} /> Voltar</button></div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* VISÃO 3 — Dashboard do Gestor                                        */
/* ------------------------------------------------------------------ */
function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="rounded-2xl border p-4 sm:p-5" style={{ background: C.card, borderColor: C.border }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '1A' }}>
          <Icon size={17} style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-extrabold" style={{ color: C.ink }}>{value}</div>
      <div className="text-xs font-semibold mt-0.5" style={{ color: C.sub }}>{label}</div>
      {sub && <div className="text-[11px] mt-1" style={{ color: C.sub }}>{sub}</div>}
    </div>
  );
}

const KEYWORD_THEMES = [
  { key: 'agilidade', icon: Zap, color: C.green, terms: ['rápido', 'rapidamente', 'ágil', 'agilidade', 'na hora', 'minutos'], text: 'dos comentários elogiam a agilidade na entrega dos laudos e no atendimento' },
  { key: 'demora', icon: Clock, color: C.red, terms: ['demora', 'demorou', 'atrasou', 'atraso', 'lento'], text: 'dos comentários citam demora ou atraso na entrega dos laudos' },
  { key: 'atendimento', icon: ThumbsUp, color: C.blue, terms: ['atenciosa', 'atencioso', 'educad', 'gentil', 'prestativ', 'resolveu'], text: 'dos comentários elogiam a qualidade do atendimento humano' },
  { key: 'tecnico', icon: Frown, color: C.amber, terms: ['travou', 'erro', 'confusa', 'confuso', 'sistema', 'plataforma'], text: 'dos comentários apontam dificuldades técnicas na plataforma' },
];

const NPS_ZONES = [
  {
    id: 'crise', min: -100, max: 0, color: C.red, bg: C.redSoft,
    label: 'Zona de Crise', range: '-100 a 0',
    desc: 'Esta zona representa o pior cenário para qualquer empresa. Estar na Zona de Crise significa que o volume de clientes insatisfeitos e magoados (detratores) é maior do que o de clientes satisfeitos e leais (promotores). Na prática, o negócio está sofrendo um "boca a boca" massivamente negativo. Clientes nessa faixa tendem a cancelar contratos, migrar para concorrentes e registrar reclamações públicas. Para a gestão, este é um sinal de alerta vermelho que exige uma intervenção imediata na operação, no produto ou no atendimento para estancar a perda de clientes.',
  },
  {
    id: 'aperfeicoamento', min: 1, max: 50, color: C.amber, bg: C.amberSoft,
    label: 'Zona de Aperfeiçoamento', range: '1 a 50',
    desc: 'É uma zona cinzenta onde a maioria das empresas em crescimento se encontra. Estar aqui significa que a sua empresa entrega o básico, mas ainda comete erros frequentes que impedem o cliente de se apaixonar pela marca. Há um equilíbrio instável: você tem promotores, mas os detratores e neutros ainda somam um volume expressivo. O cliente acha o serviço "ok", mas se um concorrente oferecer um preço ligeiramente menor ou um prazo mais rápido, ele mudará. O foco do gestor aqui deve ser analisar os comentários para identificar e corrigir os gargalos recorrentes.',
  },
  {
    id: 'qualidade', min: 51, max: 74, color: C.blue, bg: C.blueSoft,
    label: 'Zona de Qualidade', range: '51 a 74',
    desc: 'Entrar na Zona de Qualidade é o primeiro grande marco de sucesso em CX (Experiência do Cliente). Significa que a Click Laudos já possui uma reputação sólida e que a maioria esmagadora da base de clientes confia na marca e tem experiências positivas. O número de promotores supera com folga o de detratores. Os clientes nesta zona não apenas compram recorrentemente, mas começam a indicar a empresa ativamente para amigos e parceiros de negócios. A operação é considerada saudável, eficiente e competitiva.',
  },
  {
    id: 'excelencia', min: 75, max: 100, color: C.green, bg: C.greenSoft,
    label: 'Zona de Excelência', range: '75 a 100',
    desc: 'Este é o nível mais alto de maturidade e lealdade do cliente, ocupado mundialmente por marcas de referência como Apple, Amazon e Netflix. Estar na Zona de Excelência significa que a empresa não tem apenas clientes, mas sim fãs e defensores fervorosos da marca. Os detratores são praticamente inexistentes e os raros problemas que acontecem são resolvidos tão rápido pelo suporte que o cliente continua encantado. O crescimento orgânico (por indicação gratuita) é altíssimo, e o valor percebido pelo cliente torna o preço um fator secundário.',
  },
];

function NpsZonesCard({ score }) {
  const temScore = score !== '—';
  const zonaAtiva = temScore ? NPS_ZONES.find((z) => score >= z.min && score <= z.max) : null;

  return (
    <div className="rounded-2xl border p-5 mb-6" style={{ background: C.card, borderColor: C.border }}>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} style={{ color: C.navy }} />
          <h3 className="text-sm font-bold" style={{ color: C.ink }}>Entenda o resultado do NPS</h3>
        </div>
        {zonaAtiva && (
          <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: zonaAtiva.bg, color: zonaAtiva.color }}>
            Score atual: {score} • {zonaAtiva.label}
          </div>
        )}
      </div>
      <p className="text-xs mb-4" style={{ color: C.sub }}>
        O NPS varia de -100 a 100 e é dividido em quatro zonas de maturidade da experiência do cliente.
      </p>

      {/* barra de escala */}
      <div className="flex h-2.5 rounded-full overflow-hidden mb-1.5">
        {NPS_ZONES.map((z) => (
          <div key={z.id} style={{ background: z.color, width: `${((z.max - z.min + 1) / 201) * 100}%` }} />
        ))}
      </div>
      {temScore && (
        <div className="relative h-4 mb-4">
          <div className="absolute -top-0.5 flex flex-col items-center" style={{ left: `${((score + 100) / 200) * 100}%`, transform: 'translateX(-50%)' }}>
            <div className="w-0.5 h-3" style={{ background: C.ink }} />
          </div>
        </div>
      )}
      {!temScore && <div className="mb-4" />}

      <div className="grid sm:grid-cols-2 gap-3">
        {NPS_ZONES.map((z) => {
          const ativa = zonaAtiva?.id === z.id;
          return (
            <div key={z.id} className="rounded-xl p-3.5 border-2 transition-all"
              style={ativa ? { borderColor: z.color, background: z.bg } : { borderColor: C.border, background: C.bg }}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: z.color }} />
                <span className="text-xs font-extrabold" style={{ color: C.ink }}>{z.label}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-auto" style={{ background: '#fff', color: z.color }}>{z.range}</span>
                {ativa && <Check size={13} style={{ color: z.color }} />}
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: C.sub }}>{z.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardView({ links, responses, atendentes }) {
  const [filtro, setFiltro] = useState('30d');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [busca, setBusca] = useState('');
  const [atendenteFiltro, setAtendenteFiltro] = useState('todos');
  const [comentarioAberto, setComentarioAberto] = useState(null);

  const respostasNoPeriodo = useMemo(() => responses.filter((r) => inRange(r.data, filtro, custom)), [responses, filtro, custom]);
  const linksNoPeriodo = useMemo(() => links.filter((l) => inRange(l.data, filtro, custom)), [links, filtro, custom]);

  const filteredResponses = useMemo(
    () => atendenteFiltro === 'todos' ? respostasNoPeriodo : respostasNoPeriodo.filter((r) => r.atendente === atendenteFiltro),
    [respostasNoPeriodo, atendenteFiltro]
  );
  const filteredLinks = useMemo(
    () => atendenteFiltro === 'todos' ? linksNoPeriodo : linksNoPeriodo.filter((l) => l.atendente === atendenteFiltro),
    [linksNoPeriodo, atendenteFiltro]
  );

  const totalLinks = filteredLinks.length;
  const linksCsat = filteredLinks.filter((l) => l.tipo === 'csat').length;
  const linksNps = filteredLinks.filter((l) => l.tipo === 'nps').length;
  const totalRespostas = filteredResponses.length;
  const conversao = totalLinks ? ((totalRespostas / totalLinks) * 100).toFixed(1) : '0.0';

  const csatResp = filteredResponses.filter((r) => r.tipo === 'csat');
  const csatScore = csatResp.length ? ((csatResp.filter((r) => r.nota >= 4).length / csatResp.length) * 100).toFixed(0) : '—';

  const npsResp = filteredResponses.filter((r) => r.tipo === 'nps');
  const promoters = npsResp.filter((r) => r.nota >= 9).length;
  const passives = npsResp.filter((r) => r.nota >= 7 && r.nota <= 8).length;
  const detractors = npsResp.filter((r) => r.nota <= 6).length;
  const npsScore = npsResp.length ? Math.round(((promoters - detractors) / npsResp.length) * 100) : '—';

  const csatDist = [1, 2, 3, 4, 5].map((v) => ({ nota: v, label: CSAT_OPTS[v - 1].emoji, qtd: csatResp.filter((r) => r.nota === v).length }));
  const npsDist = [
    { name: 'Detratores (0-6)', value: detractors, color: C.red },
    { name: 'Neutros (7-8)', value: passives, color: C.amber },
    { name: 'Promotores (9-10)', value: promoters, color: C.green },
  ];

  const comentarios = filteredResponses.filter((r) => r.comentario && r.comentario.trim() !== '');
  const insights = KEYWORD_THEMES.map((theme) => {
    const count = comentarios.filter((c) => theme.terms.some((t) => c.comentario.toLowerCase().includes(t))).length;
    const pct = comentarios.length ? Math.round((count / comentarios.length) * 100) : 0;
    return { ...theme, count, pct };
  }).filter((t) => t.count > 0).sort((a, b) => b.count - a.count).slice(0, 4);

  const historico = filteredResponses.filter((r) =>
    busca.trim() === '' || r.cliente.toLowerCase().includes(busca.toLowerCase()) || (r.atendente || '').toLowerCase().includes(busca.toLowerCase())
  );

  // Desempenho por atendente (sempre considera todos os atendentes, respeitando só o período)
  const desempenhoAtendentes = useMemo(() => {
    const nomes = Array.from(new Set([...atendentes.map((a) => a.nome), ...respostasNoPeriodo.map((r) => r.atendente), ...linksNoPeriodo.map((l) => l.atendente)]));
    return nomes.map((nomeAt) => {
      const lks = linksNoPeriodo.filter((l) => l.atendente === nomeAt);
      const rsp = respostasNoPeriodo.filter((r) => r.atendente === nomeAt);
      const csat = rsp.filter((r) => r.tipo === 'csat');
      const nps = rsp.filter((r) => r.tipo === 'nps');
      const prom = nps.filter((r) => r.nota >= 9).length;
      const det = nps.filter((r) => r.nota <= 6).length;
      return {
        nome: nomeAt,
        links: lks.length,
        respostas: rsp.length,
        conversao: lks.length ? Math.round((rsp.length / lks.length) * 100) : 0,
        csatScore: csat.length ? Math.round((csat.filter((r) => r.nota >= 4).length / csat.length) * 100) : null,
        npsScore: nps.length ? Math.round(((prom - det) / nps.length) * 100) : null,
      };
    }).filter((a) => a.links > 0 || a.respostas > 0).sort((a, b) => b.respostas - a.respostas);
  }, [atendentes, respostasNoPeriodo, linksNoPeriodo]);

  const FiltroBtn = ({ id, label }) => (
    <button onClick={() => setFiltro(id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={filtro === id ? { background: C.navy, color: '#fff' } : { background: C.card, color: C.sub, border: `1px solid ${C.border}` }}>
      {label}
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: C.ink }}>Painel de métricas</h1>
          <p className="text-sm mt-0.5" style={{ color: C.sub }}>
            {atendenteFiltro === 'todos' ? 'Métrica geral do setor' : `Métricas de ${atendenteFiltro}`} • pesquisas CSAT e NPS
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar size={14} style={{ color: C.sub }} />
          <FiltroBtn id="7d" label="Últimos 7 dias" />
          <FiltroBtn id="30d" label="Últimos 30 dias" />
          <FiltroBtn id="month" label="Mês atual" />
          <div className="flex items-center gap-1">
            <input type="date" value={custom.from} onChange={(e) => { setCustom({ ...custom, from: e.target.value }); setFiltro('custom'); }}
              className="px-2 py-1.5 rounded-lg text-xs border" style={{ borderColor: C.border }} />
            <span className="text-xs" style={{ color: C.sub }}>até</span>
            <input type="date" value={custom.to} onChange={(e) => { setCustom({ ...custom, to: e.target.value }); setFiltro('custom'); }}
              className="px-2 py-1.5 rounded-lg text-xs border" style={{ borderColor: C.border }} />
          </div>
          <select value={atendenteFiltro} onChange={(e) => setAtendenteFiltro(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border" style={{ borderColor: C.border, background: C.card, color: C.ink }}>
            <option value="todos">Todos os atendentes</option>
            {atendentes.map((a) => <option key={a.id} value={a.nome}>{a.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <KpiCard icon={Link2} label="Links gerados" value={totalLinks} sub={
          <span className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-bold" style={{ background: C.blueSoft, color: C.navy2 }}>{linksCsat} CSAT</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-bold" style={{ background: C.greenSoft, color: C.green }}>{linksNps} NPS</span>
          </span>
        } color={C.navy} />
        <KpiCard icon={Send} label="Taxa de conversão" value={`${conversao}%`} sub={`${totalRespostas} de ${totalLinks} links respondidos`} color={C.blue} />
        <KpiCard icon={ThumbsUp} label="Score CSAT" value={csatScore === '—' ? '—' : `${csatScore}%`} sub={`${csatResp.length} avaliações • notas 4 e 5`} color={C.green} />
        <KpiCard icon={npsScore !== '—' && npsScore < 0 ? TrendingDown : TrendingUp} label="Score NPS" value={npsScore} sub={`${npsResp.length} avaliações • promotores − detratores`} color={npsScore === '—' ? C.sub : npsScore >= 50 ? C.green : npsScore >= 0 ? C.amber : C.red} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border p-5" style={{ background: C.card, borderColor: C.border }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: C.ink }}>Distribuição CSAT</h3>
          {csatResp.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={csatDist}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 20 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.sub }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12 }} />
                <Bar dataKey="qtd" radius={[6, 6, 0, 0]} fill={C.blue} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState text="Nenhuma resposta CSAT no período." />}
        </div>

        <div className="rounded-2xl border p-5" style={{ background: C.card, borderColor: C.border }}>
          <h3 className="text-sm font-bold mb-4" style={{ color: C.ink }}>Distribuição NPS</h3>
          {npsResp.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={npsDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {npsDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState text="Nenhuma resposta NPS no período." />}
        </div>
      </div>

      <NpsZonesCard score={npsScore} />

      <div className="rounded-2xl border p-5 mb-6" style={{ background: C.card, borderColor: C.border }}>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: C.navy }} />
            <h3 className="text-sm font-bold" style={{ color: C.ink }}>Desempenho por atendente</h3>
          </div>
          {atendenteFiltro !== 'todos' && (
            <button onClick={() => setAtendenteFiltro('todos')} className="text-xs font-semibold" style={{ color: C.navy2 }}>Ver todos</button>
          )}
        </div>
        {desempenhoAtendentes.length ? (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr style={{ color: C.sub }} className="text-left">
                  <th className="font-semibold px-2 py-2">Atendente</th>
                  <th className="font-semibold px-2 py-2">Links</th>
                  <th className="font-semibold px-2 py-2">Respostas</th>
                  <th className="font-semibold px-2 py-2">Conversão</th>
                  <th className="font-semibold px-2 py-2">CSAT</th>
                  <th className="font-semibold px-2 py-2">NPS</th>
                </tr>
              </thead>
              <tbody>
                {desempenhoAtendentes.map((a) => (
                  <tr key={a.nome} className="border-t cursor-pointer hover:opacity-80" style={{ borderColor: C.border }}
                    onClick={() => setAtendenteFiltro(a.nome)}>
                    <td className="px-2 py-2.5 font-semibold" style={{ color: C.ink }}>{a.nome}</td>
                    <td className="px-2 py-2.5" style={{ color: C.sub }}>{a.links}</td>
                    <td className="px-2 py-2.5" style={{ color: C.sub }}>{a.respostas}</td>
                    <td className="px-2 py-2.5" style={{ color: C.sub }}>{a.conversao}%</td>
                    <td className="px-2 py-2.5 font-bold" style={{ color: a.csatScore === null ? C.sub : a.csatScore >= 70 ? C.green : a.csatScore >= 40 ? C.amber : C.red }}>{a.csatScore === null ? '—' : `${a.csatScore}%`}</td>
                    <td className="px-2 py-2.5 font-bold" style={{ color: a.npsScore === null ? C.sub : a.npsScore >= 50 ? C.green : a.npsScore >= 0 ? C.amber : C.red }}>{a.npsScore === null ? '—' : a.npsScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState text="Nenhum atendente com atividade no período." />}
      </div>

      <div className="rounded-2xl border p-5 mb-6" style={{ background: C.card, borderColor: C.border }}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} style={{ color: C.blue }} />
          <h3 className="text-sm font-bold" style={{ color: C.ink }}>Insights de IA sobre os comentários</h3>
        </div>
        {insights.length ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {insights.map((ins) => {
              const Icon = ins.icon;
              return (
                <div key={ins.key} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: C.bg }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: ins.color + '1A' }}>
                    <Icon size={15} style={{ color: ins.color }} />
                  </div>
                  <div className="text-xs" style={{ color: C.ink }}>
                    <span className="font-extrabold">{ins.pct}%</span> {ins.text}
                    <span style={{ color: C.sub }}> ({ins.count} menções)</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <EmptyState text="Sem comentários suficientes no período para gerar insights." />}
      </div>

      <div className="rounded-2xl border p-5" style={{ background: C.card, borderColor: C.border }}>
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} style={{ color: C.navy }} />
            <h3 className="text-sm font-bold" style={{ color: C.ink }}>Histórico de respostas</h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: C.blueSoft, color: C.navy2 }}>{historico.length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border" style={{ borderColor: C.border, background: C.bg }}>
            <Search size={13} style={{ color: C.sub }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente ou atendente"
              className="text-xs bg-transparent outline-none w-40" />
          </div>
        </div>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr style={{ color: C.sub }} className="text-left">
                <th className="font-semibold px-2 py-2">Data</th>
                <th className="font-semibold px-2 py-2">Cliente</th>
                <th className="font-semibold px-2 py-2">Atendente</th>
                <th className="font-semibold px-2 py-2">Tipo</th>
                <th className="font-semibold px-2 py-2">Nota</th>
                <th className="font-semibold px-2 py-2">Comentário</th>
              </tr>
            </thead>
            <tbody>
              {historico.slice(0, 40).map((r) => (
                <tr key={r.id} className="border-t" style={{ borderColor: C.border }}>
                  <td className="px-2 py-2.5 whitespace-nowrap" style={{ color: C.sub }}>{formatDate(r.data)}</td>
                  <td className="px-2 py-2.5 font-semibold" style={{ color: C.ink }}>{r.cliente}</td>
                  <td className="px-2 py-2.5" style={{ color: C.sub }}>{r.atendente}</td>
                  <td className="px-2 py-2.5">
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] uppercase" style={{ background: r.tipo === 'csat' ? C.blueSoft : C.greenSoft, color: r.tipo === 'csat' ? C.navy2 : C.green }}>{r.tipo}</span>
                  </td>
                  <td className="px-2 py-2.5">
                    <span className="font-bold" style={{ color: r.tipo === 'csat' ? (r.nota >= 4 ? C.green : r.nota === 3 ? C.amber : C.red) : npsColor(r.nota) }}>{r.nota}</span>
                  </td>
                  <td className="px-2 py-2.5 max-w-[260px]" style={{ color: C.sub }}>
                    {r.comentario ? (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate">{r.comentario}</span>
                        {r.comentario.length > 40 && (
                          <button onClick={() => setComentarioAberto(r)} className="text-[11px] font-bold shrink-0" style={{ color: C.navy2 }}>
                            Ler mais
                          </button>
                        )}
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
              {historico.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8" style={{ color: C.sub }}>Nenhuma resposta encontrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {comentarioAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15, 31, 48, 0.5)' }}
          onClick={() => setComentarioAberto(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-5 shadow-lg"
            style={{ background: C.card, borderColor: C.border }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-sm font-bold" style={{ color: C.ink }}>{comentarioAberto.cliente}</div>
                <div className="text-xs mt-0.5" style={{ color: C.sub }}>
                  {comentarioAberto.atendente} • {formatDate(comentarioAberto.data)}
                </div>
              </div>
              <button onClick={() => setComentarioAberto(null)} className="p-1 rounded-md shrink-0" style={{ color: C.sub }}>
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded-full font-bold text-[10px] uppercase" style={{ background: comentarioAberto.tipo === 'csat' ? C.blueSoft : C.greenSoft, color: comentarioAberto.tipo === 'csat' ? C.navy2 : C.green }}>
                {comentarioAberto.tipo}
              </span>
              <span className="font-bold text-sm" style={{ color: comentarioAberto.tipo === 'csat' ? (comentarioAberto.nota >= 4 ? C.green : comentarioAberto.nota === 3 ? C.amber : C.red) : npsColor(comentarioAberto.nota) }}>
                Nota {comentarioAberto.nota}
              </span>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: C.ink }}>{comentarioAberto.comentario}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="h-[220px] flex items-center justify-center text-xs" style={{ color: C.sub }}>{text}</div>;
}

/* ------------------------------------------------------------------ */
/* Tela inicial protegida por senha                                     */
/* Obs.: os links de pesquisa (/avaliar) enviados ao cliente final NÃO   */
/* passam por essa tela — só a aplicação interna exige senha.           */
/* ------------------------------------------------------------------ */
const CHAVE_SESSAO = 'clicklaudos_autenticado';

function PasswordGate({ onUnlock }) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(false);

  const entrar = (e) => {
    e.preventDefault();
    if (senha === SENHA_APP) {
      try { sessionStorage.setItem(CHAVE_SESSAO, '1'); } catch (err) {}
      onUnlock();
    } else {
      setErro(true);
      setSenha('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: C.bg }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6"><ClickLaudosLogo size="md" showTag={false} /></div>
        <form onSubmit={entrar} className="rounded-2xl border p-6 shadow-sm" style={{ background: C.card, borderColor: C.border }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: C.blueSoft }}>
            <Lock size={19} style={{ color: C.navy2 }} />
          </div>
          <h1 className="text-lg font-extrabold mb-1" style={{ color: C.ink }}>Acesso restrito</h1>
          <p className="text-sm mb-4" style={{ color: C.sub }}>Digite a senha para acessar o painel interno.</p>
          <input
            type="password"
            inputMode="numeric"
            value={senha}
            onChange={(e) => { setSenha(e.target.value); setErro(false); }}
            autoFocus
            placeholder="Senha"
            className="w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 mb-2"
            style={{ borderColor: erro ? C.red : C.border, background: C.bg }}
          />
          {erro && (
            <div className="flex items-center gap-1.5 text-xs font-semibold mb-3" style={{ color: C.red }}>
              <AlertCircle size={13} /> Senha incorreta. Tente novamente.
            </div>
          )}
          <button type="submit" className="w-full py-2.5 rounded-xl font-bold text-sm" style={{ background: C.navy, color: '#fff' }}>
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                   */
/* ------------------------------------------------------------------ */
export default function App() {
  const [verificandoAuth, setVerificandoAuth] = useState(true);
  const [autenticado, setAutenticado] = useState(false);
  const [responses, setResponses] = useState([]);
  const [links, setLinks] = useState([]);
  const [atendentes, setAtendentes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [erroCarregamento, setErroCarregamento] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [view, setView] = useState('suporte');
  const [pendingSurvey, setPendingSurvey] = useState(null);
  const [demoTipo, setDemoTipo] = useState('csat');

  // Verifica se já foi autenticado nesta aba (sessionStorage) antes de liberar a tela.
  useEffect(() => {
    let jaAutenticado = false;
    try { jaAutenticado = sessionStorage.getItem(CHAVE_SESSAO) === '1'; } catch (err) {}
    setAutenticado(jaAutenticado);
    setVerificandoAuth(false);
  }, []);

  const carregarTudo = async () => {
    try {
      const data = await fetchAll();
      setResponses(data.responses);
      setLinks(data.links);
      setAtendentes(data.atendentes);
      setErroCarregamento(null);
    } catch (e) {
      console.error(e);
      setErroCarregamento('Não foi possível carregar os dados do Supabase. Confira as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    } finally {
      setLoaded(true);
    }
  };

  // Carga inicial (só depois de autenticado)
  useEffect(() => { if (autenticado) carregarTudo(); }, [autenticado]);

  // Realtime: qualquer mudança feita por outro usuário (ex.: cliente respondendo
  // a pesquisa em outra aba/dispositivo) atualiza o Dashboard na hora.
  useEffect(() => {
    if (!autenticado) return;
    const unsubscribe = subscribeRealtime(() => { carregarTudo(); });
    return unsubscribe;
  }, [autenticado]);

  const addLink = async (novo) => {
    setSincronizando(true);
    try {
      const criado = await insertLink({ id: novo.id, cliente: novo.cliente, atendente: novo.atendente, tipo: novo.tipo, url: novo.url });
      setLinks((prev) => [criado, ...prev]);
      return criado;
    } catch (e) {
      console.error(e);
      alert('Não foi possível gerar o link. Tente novamente.');
    } finally {
      setSincronizando(false);
    }
  };

  const addResponse = async (resp) => {
    setSincronizando(true);
    try {
      const criado = await insertResponse({
        linkId: pendingSurvey?.dbId || null,
        cliente: resp.cliente,
        atendente: resp.atendente,
        tipo: resp.tipo,
        nota: resp.nota,
        comentario: resp.comentario,
      });
      setResponses((prev) => [criado, ...prev]);
      setLinks((prev) => prev.map((l) => (l.id === pendingSurvey?.id ? { ...l, respondido: true } : l)));
    } catch (e) {
      console.error(e);
      throw e;
    } finally {
      setSincronizando(false);
    }
  };

  const addAtendente = async (nome) => {
    setSincronizando(true);
    try {
      const criado = await insertAtendente(nome);
      setAtendentes((prev) => [...prev, criado]);
      return criado.id;
    } catch (e) {
      console.error(e);
      alert('Não foi possível cadastrar o atendente.');
      return null;
    } finally {
      setSincronizando(false);
    }
  };

  const editAtendente = async (id, novoNome) => {
    setAtendentes((prev) => prev.map((a) => (a.id === id ? { ...a, nome: novoNome } : a))); // otimista
    try {
      await updateAtendente(id, novoNome);
    } catch (e) {
      console.error(e);
      alert('Não foi possível salvar a edição. Recarregue a página.');
    }
  };

  const deleteAtendente = async (id) => {
    const anterior = atendentes;
    setAtendentes((prev) => prev.filter((a) => a.id !== id)); // otimista
    try {
      await deleteAtendenteDb(id);
    } catch (e) {
      console.error(e);
      setAtendentes(anterior);
      alert('Não foi possível excluir o atendente.');
    }
  };

  const goToCliente = (link) => {
    setPendingSurvey({ id: link.id, dbId: link.id, cliente: link.cliente, atendente: link.atendente, tipo: link.tipo });
    setView('cliente');
  };

  const handleSetView = (v) => {
    if (v === 'cliente' && !pendingSurvey) {
      setDemoTipo('csat');
    }
    setView(v);
  };

  const survey = pendingSurvey || { id: 'demo', cliente: 'Cliente Demonstração', atendente: atendentes[0]?.nome || 'Atendente Demonstração', tipo: demoTipo };

  if (verificandoAuth) {
    return <div className="min-h-screen" style={{ background: C.bg }} />;
  }

  if (!autenticado) {
    return <PasswordGate onUnlock={() => setAutenticado(true)} />;
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.bg }}>
        <div className="text-center">
          <div className="flex justify-center mb-4"><ClickLaudosLogo size="md" showTag={false} /></div>
          <div className="flex items-center gap-2 justify-center text-xs font-semibold" style={{ color: C.sub }}>
            <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: C.border, borderTopColor: C.navy }} />
            Carregando base de pesquisas...
          </div>
        </div>
      </div>
    );
  }

  if (erroCarregamento) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: C.bg }}>
        <div className="max-w-sm text-center rounded-2xl border p-6" style={{ background: C.card, borderColor: C.border }}>
          <AlertCircle size={28} style={{ color: C.red }} className="mx-auto mb-3" />
          <p className="text-sm font-semibold" style={{ color: C.ink }}>{erroCarregamento}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }}>
      <NavBar view={view} setView={handleSetView} sincronizando={sincronizando} />
      {view === 'suporte' && <SuporteView addLink={addLink} goToCliente={goToCliente} atendentes={atendentes} addAtendente={addAtendente} editAtendente={editAtendente} deleteAtendente={deleteAtendente} />}
      {view === 'campanha' && <EnvioMassaView atendentes={atendentes} />}
      {view === 'cliente' && (
        <ClienteView
          key={survey.id === 'demo' ? 'demo-' + demoTipo : survey.id}
          survey={survey}
          onSubmit={addResponse}
          onBack={() => { setPendingSurvey(null); setView('suporte'); }}
          onChangeDemoTipo={survey.id === 'demo' ? setDemoTipo : undefined}
        />
      )}
      {view === 'dashboard' && <DashboardView links={links} responses={responses} atendentes={atendentes} />}
    </div>
  );
}

export { C, ClickLaudosLogo, ClienteView, SENHA_APP };
