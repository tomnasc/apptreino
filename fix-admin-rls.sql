-- Script para corrigir problemas de RLS (Row Level Security) na tabela admin_users
-- Este script habilita o RLS que estava definido mas não ativado

-- Verificar se a tabela admin_users existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'admin_users'
  ) THEN
    -- Habilitar RLS para tabela de admin_users se ainda não estiver habilitado
    ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE 'RLS habilitado para a tabela admin_users com sucesso';
    
    -- Verificar se as políticas existem e recriar se necessário
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'admin_users' AND policyname = 'Permitir acesso total'
    ) THEN
      -- Esta política permitirá aos administradores acesso total à tabela
      CREATE POLICY "Permitir acesso total" 
        ON public.admin_users
        FOR ALL
        USING (is_admin());
        
      RAISE NOTICE 'Política "Permitir acesso total" criada para a tabela admin_users';
    END IF;
  ELSE
    RAISE NOTICE 'A tabela admin_users não existe. Nenhuma ação realizada.';
  END IF;
END
$$;

-- Garantir que a função is_admin() existe e está correta
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar outras tabelas com RLS não habilitado
DO $$
DECLARE
  tabela_nome text;
BEGIN
  FOR tabela_nome IN 
    SELECT t.table_name
    FROM information_schema.tables t
    JOIN pg_catalog.pg_policies p ON p.tablename = t.table_name
    LEFT JOIN pg_catalog.pg_class c ON c.relname = t.table_name
    WHERE t.table_schema = 'public'
    AND (c.relrowsecurity IS NULL OR c.relrowsecurity = false)
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabela_nome);
    RAISE NOTICE 'RLS habilitado para a tabela %', tabela_nome;
  END LOOP;
END
$$;

-- Mostrar o status atual das tabelas com RLS
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  array_agg(pol.polname) AS policies
FROM pg_class c
LEFT JOIN pg_policy pol ON c.oid = pol.polrelid
WHERE c.relkind = 'r' 
  AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname; 