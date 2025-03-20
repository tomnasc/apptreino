/**
 * Utilitário para verificar se o usuário tem acesso às funcionalidades
 * com base no tipo de plano e na data de expiração
 */

// Removendo a importação do createClient e criação de cliente
// import { createClient } from '@supabase/supabase-js';
// 
// // Cria o cliente Supabase usando as variáveis de ambiente públicas
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Verifica se o usuário tem acesso às funcionalidades do aplicativo
 * 
 * @param {Object} user - Objeto de usuário do Supabase
 * @param {Object} supabaseClient - Cliente Supabase (opcional)
 * @returns {Promise<{hasAccess: boolean, message: string, daysLeft: number|null}>}
 */
export async function checkUserAccess(user, supabaseClient = null) {
  if (!user) {
    return {
      hasAccess: false,
      message: 'Usuário não autenticado',
      daysLeft: null
    };
  }

  try {
    // Usar o cliente Supabase fornecido ou importar dinamicamente se não for fornecido
    let supabase = supabaseClient;
    
    if (!supabase) {
      // Importa o createClient apenas se necessário
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      supabase = createClient(supabaseUrl, supabaseAnonKey);
    }

    // Buscar o perfil do usuário
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Erro ao verificar perfil do usuário:', error);
      return {
        hasAccess: false,
        message: 'Erro ao verificar permissões',
        daysLeft: null
      };
    }

    if (!profile) {
      return {
        hasAccess: false, 
        message: 'Perfil de usuário não encontrado',
        daysLeft: null
      };
    }

    // Administradores e usuários pagos sempre têm acesso
    if (profile.plan_type === 'admin' || profile.plan_type === 'paid') {
      return {
        hasAccess: true,
        message: profile.plan_type === 'admin' ? 'Acesso de administrador' : 'Acesso de usuário pago',
        daysLeft: null
      };
    }

    // Usuários gratuitos - verificar período de expiração
    if (profile.plan_type === 'free') {
      // Se tiver data de expiração definida
      if (profile.expiry_date) {
        const expiryDate = new Date(profile.expiry_date);
        const now = new Date();
        
        // Calcular dias restantes
        const diffTime = expiryDate - now;
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (now < expiryDate) {
          return {
            hasAccess: true,
            message: `Período de teste ativo por mais ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`,
            daysLeft
          };
        } else {
          return {
            hasAccess: false,
            message: 'Seu período de teste gratuito expirou',
            daysLeft: 0
          };
        }
      } else {
        // Se não tiver data de expiração, verificar com base na data de criação
        try {
          // Obter configuração global
          const { data: settings } = await supabase
            .from('app_settings')
            .select('setting_value')
            .eq('setting_key', 'free_trial_days')
            .single();

          const freeDays = settings?.setting_value 
            ? parseInt(settings.setting_value) 
            : 14; // 14 dias por padrão
          
          const createdAt = new Date(profile.created_at);
          const expiryDate = new Date(createdAt);
          expiryDate.setDate(expiryDate.getDate() + freeDays);
          
          const now = new Date();
          
          // Calcular dias restantes
          const diffTime = expiryDate - now;
          const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (now < expiryDate) {
            return {
              hasAccess: true,
              message: `Período de teste ativo por mais ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`,
              daysLeft
            };
          } else {
            return {
              hasAccess: false,
              message: 'Seu período de teste gratuito expirou',
              daysLeft: 0
            };
          }
        } catch (err) {
          console.error('Erro ao calcular período de teste:', err);
          return {
            hasAccess: false,
            message: 'Erro ao verificar período de teste',
            daysLeft: null
          };
        }
      }
    }

    // Por padrão, negar acesso
    return {
      hasAccess: false,
      message: 'Tipo de plano desconhecido',
      daysLeft: null
    };
  } catch (err) {
    console.error('Erro ao verificar acesso:', err);
    return {
      hasAccess: false,
      message: 'Erro ao verificar acesso',
      daysLeft: null
    };
  }
}

/**
 * Componente HOC (High Order Component) para proteger rotas
 * que exigem determinado nível de acesso
 * 
 * Este é um exemplo de como usar o checkUserAccess com Next.js
 * para proteger páginas/componentes
 */
export function withAccessControl(WrappedComponent) {
  // Retorna um novo componente
  return function WithAccessControl(props) {
    // Você pode implementar a lógica de redirecionamento ou exibição
    // de uma mensagem caso o usuário não tenha acesso
    // ...
    
    // Se tudo estiver ok, renderize o componente original
    return <WrappedComponent {...props} />;
  };
} 