import { createClient } from '@supabase/supabase-js';

// Estas variáveis de ambiente devem ser definidas no arquivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const createSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
};

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase; 