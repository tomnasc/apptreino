import { useState, useEffect } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { ClipboardIcon, CheckIcon, UserPlusIcon, GiftIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useToast } from '../context/ToastContext';

export default function AffiliateSystem() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [invites, setInvites] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [stats, setStats] = useState({
    totalInvites: 0,
    acceptedInvites: 0,
    pendingBonuses: 0,
    appliedBonuses: 0
  });

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchInvites();
      fetchBonuses();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('affiliate_code, affiliate_bonuses')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('affiliate_invites')
        .select('*')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);

      // Calcular estatísticas
      setStats(prev => ({
        ...prev,
        totalInvites: data.length,
        acceptedInvites: data.filter(invite => invite.status === 'accepted').length
      }));
    } catch (error) {
      console.error('Erro ao buscar convites:', error);
    }
  };

  const fetchBonuses = async () => {
    try {
      // Versão corrigida da consulta - primeiro busca os bônus sem o join
      const { data, error } = await supabase
        .from('affiliate_bonuses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Agora vamos buscar os emails dos usuários referidos em uma segunda consulta se houver bônus
      if (data && data.length > 0) {
        // Obter todos os IDs de usuários referidos
        const referredUserIds = data.map(bonus => bonus.referred_user_id);
        
        // Buscar os emails dos usuários referidos
        const { data: usersData, error: usersError } = await supabase
          .from('user_profiles')
          .select('id, email')
          .in('id', referredUserIds);
        
        if (!usersError && usersData) {
          // Criar um mapa de id -> email para facilitar o join manual
          const userMap = {};
          usersData.forEach(user => {
            userMap[user.id] = user.email;
          });
          
          // Adicionar o email ao objeto de bônus
          data.forEach(bonus => {
            bonus.referred_user = {
              email: userMap[bonus.referred_user_id] || 'Usuário não encontrado'
            };
          });
        }
      }
      
      setBonuses(data || []);

      // Calcular estatísticas de bônus
      setStats(prev => ({
        ...prev,
        pendingBonuses: data.filter(bonus => bonus.status === 'pending').length,
        appliedBonuses: data.filter(bonus => bonus.status === 'applied').length
      }));
    } catch (error) {
      console.error('Erro ao buscar bônus:', error);
    }
  };

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/register?ref=${userProfile.affiliate_code}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    showToast('Link de convite copiado!', 'success');
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const shareOnWhatsApp = () => {
    const inviteLink = `${window.location.origin}/register?ref=${userProfile.affiliate_code}`;
    const message = encodeURIComponent(`Olá! Estou usando o Treino na Mão para gerenciar meus treinos de academia. Experimente você também com este link: ${inviteLink}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const sendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes('@')) {
      showToast('Por favor, informe um email válido', 'error');
      return;
    }

    try {
      setSendingInvite(true);
      
      // Gerar um novo código de convite único para este email específico
      const inviteCode = userProfile.affiliate_code + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Salvar o convite no banco de dados
      const { error } = await supabase
        .from('affiliate_invites')
        .insert({
          sender_id: user.id,
          email: inviteEmail,
          code: inviteCode
        });

      if (error) throw error;
      
      // Enviar email (isso seria feito via Edge Function no Supabase)
      // Por enquanto, só vamos simular como se o email fosse enviado
      
      showToast('Convite enviado com sucesso!', 'success');
      setInviteEmail('');
      fetchInvites(); // Atualizar a lista de convites
    } catch (error) {
      console.error('Erro ao enviar convite:', error);
      showToast('Erro ao enviar convite', 'error');
    } finally {
      setSendingInvite(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return <div className="text-center p-4">Carregando sistema de afiliados...</div>;
  }

  return (
    <div className="dark-card p-4 md:p-6 rounded-lg mb-6">
      <h2 className="text-xl font-bold dark-text-primary mb-4 flex items-center">
        <UserPlusIcon className="w-6 h-6 mr-2" />
        Sistema de Afiliados
      </h2>
      
      <div className="mb-6">
        <div className="bg-green-50/60 dark:bg-green-900/20 rounded-lg p-4 border border-green-100 dark:border-green-800/50">
          <p className="text-sm mb-2 dark-text-secondary">
            Convide amigos para o App Treino na Mão! Quando eles assinarem, você ganha 1 mês grátis.
          </p>
          
          {userProfile?.affiliate_code && (
            <div className="flex flex-col space-y-3 mt-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="relative flex-grow">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/register?ref=${userProfile.affiliate_code}`}
                    className="w-full p-2 pr-10 border dark:border-gray-700 rounded-md bg-white/90 dark:bg-gray-800/90 text-sm"
                  />
                  <button
                    onClick={copyInviteLink}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    title="Copiar link de convite"
                  >
                    {copied ? (
                      <CheckIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <ClipboardIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <button
                  onClick={copyInviteLink}
                  className="sm:w-auto w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  {copied ? 'Copiado!' : 'Copiar Link'}
                </button>
              </div>
              
              <button
                onClick={shareOnWhatsApp}
                className="py-2 px-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.091 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345m-5.446 7.443h-.016c-1.77 0-3.524-.48-5.055-1.38l-.36-.214-3.75.975 1.005-3.645-.239-.375c-.99-1.576-1.516-3.391-1.516-5.26 0-5.445 4.455-9.885 9.942-9.885 2.654 0 5.145 1.035 7.021 2.91 1.875 1.859 2.909 4.35 2.909 6.99-.004 5.444-4.46 9.885-9.935 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652c1.746.943 3.71 1.444 5.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.495-8.411"/>
                </svg>
                Compartilhar via WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50/60 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800/50">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Convites Enviados</h3>
          <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalInvites}</p>
        </div>
        
        <div className="bg-green-50/60 dark:bg-green-900/20 rounded-lg p-4 border border-green-100 dark:border-green-800/50">
          <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Convites Aceitos</h3>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{stats.acceptedInvites}</p>
        </div>
        
        <div className="bg-yellow-50/60 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-100 dark:border-yellow-800/50">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Bônus Pendentes</h3>
          <p className="mt-1 text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pendingBonuses}</p>
        </div>
        
        <div className="bg-purple-50/60 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-100 dark:border-purple-800/50">
          <h3 className="text-sm font-medium text-purple-800 dark:text-purple-300">Bônus Aplicados</h3>
          <p className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.appliedBonuses}</p>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold dark-text-primary mb-2 flex items-center">
          <EnvelopeIcon className="w-5 h-5 mr-2" />
          Também Disponível: Envio de Convite por Email
        </h3>
        
        <form onSubmit={sendInvite} className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Email do seu amigo"
            className="w-full p-2 border dark:border-gray-700 rounded-md bg-white/90 dark:bg-gray-800/90"
            required
          />
          <button
            type="submit"
            disabled={sendingInvite}
            className="sm:w-auto w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {sendingInvite ? 'Enviando...' : 'Enviar Convite'}
          </button>
        </form>
      </div>
      
      {/* Convites Enviados */}
      {invites.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold dark-text-primary mb-2">Convites Enviados</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {invites.map((invite) => (
                  <tr key={invite.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm dark-text-secondary">{invite.email}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        invite.status === 'accepted' 
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' 
                          : invite.status === 'expired'
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                            : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'
                      }`}>
                        {invite.status === 'accepted' ? 'Aceito' : invite.status === 'expired' ? 'Expirado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm dark-text-secondary">{formatDate(invite.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Bônus Recebidos */}
      {bonuses.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold dark-text-primary mb-2 flex items-center">
            <GiftIcon className="w-5 h-5 mr-2" />
            Meus Bônus
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usuário</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Obtido em</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aplicado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {bonuses.map((bonus) => (
                  <tr key={bonus.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm dark-text-secondary">{bonus.referred_user?.email || 'Usuário'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        bonus.status === 'applied' 
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' 
                          : bonus.status === 'expired'
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                            : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'
                      }`}>
                        {bonus.status === 'applied' ? 'Aplicado' : bonus.status === 'expired' ? 'Expirado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm dark-text-secondary">{formatDate(bonus.created_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm dark-text-secondary">{bonus.applied_at ? formatDate(bonus.applied_at) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 