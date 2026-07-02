import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Não lança erro em build (Next roda esse arquivo no servidor também),
  // mas o app mostra uma tela de erro amigável se as chamadas falharem.
  console.warn(
    'Variáveis NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY não configuradas.'
  );
}

// createClient exige uma URL válida; sem isso ele lança na hora do import
// (derrubando a renderização inteira). Usamos um placeholder para o app
// conseguir renderizar e cair no tratamento de erro amigável das chamadas.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
