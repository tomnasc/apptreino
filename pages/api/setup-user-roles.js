import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase com as variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // Verificar se a requisição é POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Inicializa o cliente Supabase com a chave de serviço
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('Iniciando configuração de perfis de usuário...');
    
    // Lista de comandos SQL para executar sequencialmente
    const sqlCommands = [
      // Criar enum para tipos de plano
      `CREATE TYPE IF NOT EXISTS user_plan_type AS ENUM ('admin', 'paid', 'free');`,
      
      // Criar tabela de perfis de usuário
      `CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT,
        full_name TEXT,
        plan_type user_plan_type DEFAULT 'free',
        start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expiry_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,
      
      // Criar tabela para configurações globais do aplicativo
      `CREATE TABLE IF NOT EXISTS app_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,
      
      // Inserir configuração padrão
      `INSERT INTO app_settings (setting_key, setting_value, description)
      VALUES ('free_trial_days', '14', 'Número de dias para período de teste de usuários gratuitos')
      ON CONFLICT (setting_key) DO NOTHING;`,
      
      // Habilitar RLS para tabela de perfis
      `ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;`,
      
      // Políticas para user_profiles
      `DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON user_profiles;`,
      `CREATE POLICY "Usuários podem ver seu próprio perfil"
        ON user_profiles
        FOR SELECT
        USING (id = auth.uid());`,
        
      `DROP POLICY IF EXISTS "Administradores podem ver todos os perfis" ON user_profiles;`,
      `CREATE POLICY "Administradores podem ver todos os perfis"
        ON user_profiles
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND plan_type = 'admin'
          )
        );`,
        
      `DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON user_profiles;`,
      `CREATE POLICY "Usuários podem atualizar seu próprio perfil"
        ON user_profiles
        FOR UPDATE
        USING (id = auth.uid())
        WITH CHECK (id = auth.uid() AND plan_type = OLD.plan_type);`,
        
      `DROP POLICY IF EXISTS "Administradores podem atualizar todos os perfis" ON user_profiles;`,
      `CREATE POLICY "Administradores podem atualizar todos os perfis"
        ON user_profiles
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND plan_type = 'admin'
          )
        );`,
        
      // Configurar políticas para app_settings
      `ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;`,
        
      `DROP POLICY IF EXISTS "Administradores podem gerenciar configurações" ON app_settings;`,
      `CREATE POLICY "Administradores podem gerenciar configurações"
        ON app_settings
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND plan_type = 'admin'
          )
        );`,
        
      `DROP POLICY IF EXISTS "Todos os usuários podem ver configurações" ON app_settings;`,
      `CREATE POLICY "Todos os usuários podem ver configurações"
        ON app_settings
        FOR SELECT
        USING (true);`,
        
      // Criar funções
      `CREATE OR REPLACE FUNCTION check_user_access()
      RETURNS BOOLEAN AS $$
      DECLARE
        user_plan user_plan_type;
        user_expiry TIMESTAMP WITH TIME ZONE;
        free_days INTEGER;
      BEGIN
        -- Obter o plano do usuário
        SELECT plan_type, expiry_date INTO user_plan, user_expiry
        FROM user_profiles
        WHERE id = auth.uid();
        
        -- Administradores e usuários pagos sempre têm acesso
        IF user_plan = 'admin' OR user_plan = 'paid' THEN
          RETURN TRUE;
        END IF;
        
        -- Usuários gratuitos têm acesso apenas durante o período de teste
        IF user_plan = 'free' THEN
          -- Se tiver data de expiração definida, verificar se ainda é válida
          IF user_expiry IS NOT NULL THEN
            RETURN NOW() < user_expiry;
          ELSE
            -- Se não tiver data, verificar a configuração global e calcular
            SELECT COALESCE((SELECT setting_value::INTEGER FROM app_settings WHERE setting_key = 'free_trial_days'), 14)
            INTO free_days;
            
            RETURN (SELECT created_at + (free_days || ' days')::INTERVAL > NOW() FROM user_profiles WHERE id = auth.uid());
          END IF;
        END IF;
        
        -- Por padrão, negar acesso
        RETURN FALSE;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;`,
        
      `CREATE OR REPLACE FUNCTION update_profile_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;`,
        
      `DROP TRIGGER IF EXISTS update_profiles_timestamp ON user_profiles;`,
      `CREATE TRIGGER update_profiles_timestamp
        BEFORE UPDATE ON user_profiles
        FOR EACH ROW
        EXECUTE FUNCTION update_profile_timestamp();`,
        
      `CREATE OR REPLACE FUNCTION create_profile_for_new_user()
      RETURNS TRIGGER AS $$
      DECLARE
        free_days INTEGER;
        expiry_date TIMESTAMP WITH TIME ZONE;
      BEGIN
        -- Obter a configuração de dias de teste
        SELECT COALESCE((SELECT setting_value::INTEGER FROM app_settings WHERE setting_key = 'free_trial_days'), 14)
        INTO free_days;
        
        -- Calcular data de expiração para usuários gratuitos
        expiry_date := NOW() + (free_days || ' days')::INTERVAL;
        
        -- Inserir o perfil padrão
        INSERT INTO user_profiles (id, email, plan_type, start_date, expiry_date)
        VALUES (NEW.id, NEW.email, 'free', NOW(), expiry_date);
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;`,
        
      `DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'create_profile_on_signup'
        ) THEN
          CREATE TRIGGER create_profile_on_signup
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION create_profile_for_new_user();
        END IF;
      END
      $$;`,
      
      // Popular perfis para usuários existentes
      `INSERT INTO user_profiles (id, email, plan_type, start_date, expiry_date)
      SELECT id, email, 'free', NOW(), NOW() + INTERVAL '14 days'
      FROM auth.users
      WHERE id NOT IN (SELECT id FROM user_profiles)
      ON CONFLICT (id) DO NOTHING;`
    ];

    try {
      // Executar comandos SQL sequencialmente
      for (const sql of sqlCommands) {
        try {
          const { error } = await supabase.rpc('execute_sql', { sql });
          
          if (error) {
            console.warn('Aviso ao executar SQL:', sql, error);
            // Continuar mesmo com erro em alguns comandos (podem já existir)
          }
        } catch (cmdError) {
          console.warn('Erro ao executar comando:', cmdError);
          // Continuar mesmo com erro em alguns comandos
        }
      }
      
      // Verificar se a tabela user_profiles foi criada com sucesso
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);
      
      if (error) {
        return res.status(500).json({
          error: 'Tabela user_profiles não foi criada corretamente',
          message: error.message
        });
      }
      
      // Definir o administrador se fornecido
      if (req.body && req.body.adminEmail) {
        try {
          const { data: userData, error: userError } = await supabase.auth.admin
            .getUserByEmail(req.body.adminEmail);
          
          if (userData && !userError) {
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({ plan_type: 'admin' })
              .eq('id', userData.id);
              
            if (updateError) {
              console.error('Erro ao definir admin:', updateError);
            }
          }
        } catch (adminError) {
          console.error('Erro ao configurar admin:', adminError);
        }
      }
      
      return res.status(200).json({
        message: 'Perfis de usuário configurados com sucesso!'
      });
      
    } catch (sqlError) {
      console.error('Erro ao executar SQL:', sqlError);
      
      // Verificar se a tabela foi criada mesmo com erros
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id')
          .limit(1);
        
        if (!error) {
          return res.status(200).json({
            message: 'Perfis de usuário configurados parcialmente',
            warning: sqlError.message
          });
        } else {
          return res.status(500).json({
            error: 'Falha ao configurar perfis de usuário',
            message: error.message
          });
        }
      } catch (checkError) {
        return res.status(500).json({
          error: 'Erro ao verificar configuração',
          message: sqlError.message,
          checkError: checkError.message
        });
      }
    }
  } catch (error) {
    console.error('Erro geral:', error);
    return res.status(500).json({
      error: 'Erro interno',
      message: error.message || 'Erro desconhecido'
    });
  }
} 