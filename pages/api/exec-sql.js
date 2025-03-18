import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase com as variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Endpoint para executar scripts SQL personalizados
export default async function handler(req, res) {
  // Verificar se a requisição é POST e se há uma chave de autenticação
  if (req.method !== 'POST' || req.headers.authorization !== `Bearer ${process.env.API_SECRET_KEY}`) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  // Verificar se o corpo da requisição contém um script SQL
  if (!req.body || !req.body.sql) {
    return res.status(400).json({ error: 'Script SQL não fornecido' });
  }

  // Inicializa o cliente Supabase com a chave de serviço
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Executar o script SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: req.body.sql
    });

    if (error) {
      console.error('Erro ao executar SQL:', error);
      return res.status(500).json({ error: 'Erro ao executar SQL', details: error });
    }

    return res.status(200).json({ message: 'SQL executado com sucesso', data });
  } catch (error) {
    console.error('Erro ao processar requisição:', error);
    return res.status(500).json({ error: 'Erro interno ao executar SQL', details: error.message });
  }
} 