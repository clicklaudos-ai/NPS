'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Check } from 'lucide-react';
import { getLinkById, insertResponse } from '../lib/db';
import { C, ClickLaudosLogo, ClienteView } from './ClickLaudosApp';

function CentralCard({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: `radial-gradient(circle at 20% 10%, ${C.blueSoft} 0%, ${C.bg} 55%)` }}>
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><ClickLaudosLogo size="md" /></div>
        <div className="rounded-3xl shadow-lg border p-7 text-center" style={{ background: C.card, borderColor: C.border }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AvaliarClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [status, setStatus] = useState('loading'); // loading | notfound | error | ready
  const [link, setLink] = useState(null);
  const [jaRespondido, setJaRespondido] = useState(false);

  useEffect(() => {
    if (!id) { setStatus('notfound'); return; }
    let cancelado = false;
    (async () => {
      try {
        const data = await getLinkById(id);
        if (cancelado) return;
        if (!data) { setStatus('notfound'); return; }
        setLink(data);
        setJaRespondido(!!data.respondido);
        setStatus('ready');
      } catch (e) {
        console.error(e);
        if (!cancelado) setStatus('error');
      }
    })();
    return () => { cancelado = true; };
  }, [id]);

  const onSubmit = async ({ nota, comentario }) => {
    await insertResponse({
      linkId: link.id,
      cliente: link.cliente,
      atendente: link.atendente,
      tipo: link.tipo,
      nota,
      comentario,
    });
    setJaRespondido(true);
  };

  if (status === 'loading') {
    return (
      <CentralCard>
        <div className="flex items-center gap-2 justify-center text-xs font-semibold" style={{ color: C.sub }}>
          <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: C.border, borderTopColor: C.navy }} />
          Carregando pesquisa...
        </div>
      </CentralCard>
    );
  }

  if (status === 'notfound') {
    return (
      <CentralCard>
        <AlertCircle size={28} style={{ color: C.red }} className="mx-auto mb-3" />
        <p className="text-sm font-semibold" style={{ color: C.ink }}>
          Este link de pesquisa não existe ou é inválido.
        </p>
      </CentralCard>
    );
  }

  if (status === 'error') {
    return (
      <CentralCard>
        <AlertCircle size={28} style={{ color: C.red }} className="mx-auto mb-3" />
        <p className="text-sm font-semibold" style={{ color: C.ink }}>
          Não foi possível carregar a pesquisa. Verifique sua conexão e tente novamente.
        </p>
      </CentralCard>
    );
  }

  if (jaRespondido) {
    return (
      <CentralCard>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: C.greenSoft }}>
          <Check size={30} style={{ color: C.green }} strokeWidth={3} />
        </div>
        <h2 className="text-xl font-extrabold mb-1.5" style={{ color: C.ink }}>Obrigado por nos ajudar a melhorar!</h2>
        <p className="text-sm" style={{ color: C.sub }}>Sua resposta já foi registrada para este atendimento.</p>
      </CentralCard>
    );
  }

  return (
    <ClienteView
      survey={{ id: link.id, cliente: link.cliente, atendente: link.atendente, tipo: link.tipo }}
      onSubmit={onSubmit}
    />
  );
}
