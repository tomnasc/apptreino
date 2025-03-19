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
    
    // SQL para criar a tabela de perfis e configurar perfis padrão
    const setupSQL = `
      -- Criar enum para tipos de plano
      CREATE TYPE IF NOT EXISTS user_plan_type AS ENUM ('admin', 'paid', 'free');
      
      -- Criar tabela de perfis de usuário
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT,
        full_name TEXT,
        plan_type user_plan_type DEFAULT 'free',
        start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expiry_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Criar tabela para configurações globais do aplicativo
      CREATE TABLE IF NOT EXISTS app_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Inserir configuração padrão para tempo de teste dos usuários gratuitos (em dias)
      INSERT INTO app_settings (setting_key, setting_value, description)
      VALUES ('free_trial_days', '14', 'Número de dias para período de teste de usuários gratuitos')
      ON CONFLICT (setting_key) DO NOTHING;
      
      -- Habilitar RLS para tabela de perfis
      ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
      
      -- Configurar políticas de segurança para perfis
      
      -- Usuários podem ver seu próprio perfil
      DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON user_profiles;
      CREATE POLICY "Usuários podem ver seu próprio perfil"
        ON user_profiles
        FOR SELECT
        USING (id = auth.uid());
      
      -- Administradores podem ver todos os perfis
      DROP POLICY IF EXISTS "Administradores podem ver todos os perfis" ON user_profiles;
      CREATE POLICY "Administradores podem ver todos os perfis"
        ON user_profiles
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND plan_type = 'admin'
          )
        );
      
      -- Usuários podem atualizar seu próprio perfil (exceto plan_type)
      DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON user_profiles;
      CREATE POLICY "Usuários podem atualizar seu próprio perfil"
        ON user_profiles
        FOR UPDATE
        USING (id = auth.uid())
        WITH CHECK (id = auth.uid() AND plan_type = OLD.plan_type);
      
      -- Administradores podem atualizar todos os perfis
      DROP POLICY IF EXISTS "Administradores podem atualizar todos os perfis" ON user_profiles;
      CREATE POLICY "Administradores podem atualizar todos os perfis"
        ON user_profiles
        FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND plan_type = 'admin'
          )
        );
      
      -- Configurar políticas para app_settings
      ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
      
      -- Administradores podem ver e modificar configurações
      DROP POLICY IF EXISTS "Administradores podem gerenciar configurações" ON app_settings;
      CREATE POLICY "Administradores podem gerenciar configurações"
        ON app_settings
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND plan_type = 'admin'
          )
        );
      
      -- Todos os usuários podem ver configurações
      DROP POLICY IF EXISTS "Todos os usuários podem ver configurações" ON app_settings;
      CREATE POLICY "Todos os usuários podem ver configurações"
        ON app_settings
        FOR SELECT
        USING (true);
      
      -- Criar função para verificar se um usuário tem acesso à funcionalidade
      CREATE OR REPLACE FUNCTION check_user_access()
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
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      -- Trigger para atualizar a data de atualização de perfis
      CREATE OR REPLACE FUNCTION update_profile_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      DROP TRIGGER IF EXISTS update_profiles_timestamp ON user_profiles;
      CREATE TRIGGER update_profiles_timestamp
        BEFORE UPDATE ON user_profiles
        FOR EACH ROW
        EXECUTE FUNCTION update_profile_timestamp();
      
      -- Trigger para criar perfil automaticamente na criação de usuário
      CREATE OR REPLACE FUNCTION create_profile_for_new_user()
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
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      -- Verificar se o trigger já existe
      DO $$
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
      $$;
    `;

    try {
      // Executar SQL diretamente
      const { data, error } = await supabase
        .from('_exec_sql')
        .select('*')
        .rpc('query', { query: setupSQL });
        
      if (error) {
        console.error('Erro ao executar SQL:', error);
        return res.status(500).json({
          error: 'Erro ao configurar perfis de usuário',
          message: error.message
        });
      }
      
      // Verificar se existem administradores, se não, criar o primeiro admin
      if (req.body && req.body.adminEmail) {
        const { data: user, error: userError } = await supabase
          .from('auth.users')
          .select('id')
          .eq('email', req.body.adminEmail)
          .single();
          
        if (user && !userError) {
          // Atualizar usuário para admin
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ plan_type: 'admin' })
            .eq('id', user.id);
            
          if (updateError) {
            console.error('Erro ao definir admin:', updateError);
          }
        }
      }
      
      return res.status(200).json({
        message: 'Perfis de usuário configurados com sucesso!'
      });
      
    } catch (sqlError) {
      console.error('Erro ao executar SQL:', sqlError);
      
      // Tentar método alternativo - verificar se as tabelas existem
      try {
        // Verificar se a tabela de perfis existe
        const { error: checkError } = await supabase
          .from('user_profiles')
          .select('id')
          .limit(1);
          
        return res.status(200).json({
          message: checkError 
            ? 'Criação de perfis falhou, por favor tente novamente' 
            : 'Perfis verificados com sucesso',
          error: checkError ? checkError.message : null
        });
        
      } catch (fallbackError) {
        return res.status(500).json({
          error: 'Erro em todas as tentativas de configuração',
          message: sqlError.message,
          fallbackError: fallbackError.message
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