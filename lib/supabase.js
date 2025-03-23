import { createClient } from '@supabase/supabase-js';

// Estas variáveis de ambiente devem ser definidas no arquivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Log para debug (apenas no servidor)
if (typeof window === 'undefined') {
  console.log('Variáveis de ambiente do Supabase:');
  console.log('URL:', supabaseUrl ? 'Definida' : 'Não definida');
  console.log('ANON_KEY:', supabaseAnonKey ? 'Definida' : 'Não definida');
}

// Verifica se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('As variáveis de ambiente do Supabase não estão definidas!');
  
  // Em ambiente de produção, lançar erro ou usar valores mockados
  if (process.env.NODE_ENV === 'production') {
    console.error('Erro fatal: Variáveis de ambiente do Supabase são obrigatórias em produção');
  }
}

export const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Tentando criar cliente Supabase, mas variáveis de ambiente estão faltando');
  }
  return createClient(supabaseUrl || '', supabaseAnonKey || '');
};

const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export default supabase; 