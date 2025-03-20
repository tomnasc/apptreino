-- Script auxiliar para verificar a criação original da view
SELECT pg_catalog.pg_get_viewdef(c.oid, true) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid WHERE c.relkind = 'v' AND n.nspname = 'public' AND c.relname = 'workout_session_averages';
