import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from 'react-hot-toast';
import Layout from '../../components/Layout';
import { FiEdit2, FiTrash2, FiCheckCircle, FiXCircle } from 'react-icons/fi';

export default function AdminUsers() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const user = useUser();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  
  useEffect(() => {
    if (user) {
      checkIfAdmin();
    }
  }, [user]);
  
  const checkIfAdmin = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('plan_type')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      
      if (data && data.plan_type === 'admin') {
        setIsAdmin(true);
        loadUsers();
      } else {
        toast.error('Você não tem permissão para acessar esta página');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      toast.error('Erro ao verificar permissões');
    } finally {
      setLoading(false);
    }
  };
  
  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Buscar perfis de usuários
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (profilesError) throw profilesError;
      
      // Não é possível usar auth.admin.listUsers no frontend (requer service_role key)
      // Usamos apenas os dados dos perfis
      setUsers(profiles || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar lista de usuários');
    } finally {
      setLoading(false);
    }
  };
  
  const handleEdit = (user) => {
    setEditingUser({
      ...user,
      expiry_date: user.expiry_date ? new Date(user.expiry_date).toISOString().split('T')[0] : '',
      trial_start_date: user.trial_start_date ? new Date(user.trial_start_date).toISOString().split('T')[0] : '',
      trial_days: user.trial_days || 7
    });
  };
  
  const handleSave = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          full_name: editingUser.full_name,
          plan_type: editingUser.plan_type,
          expiry_date: editingUser.expiry_date || null,
          trial_start_date: editingUser.trial_start_date || null,
          trial_days: editingUser.trial_days || 7
        })
        .eq('id', editingUser.id);
        
      if (error) throw error;
      
      toast.success('Usuário atualizado com sucesso');
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro ao atualizar usuário');
    } finally {
      setLoading(false);
    }
  };
  
  const confirmDelete = (user) => {
    setUserToDelete(user);
    setShowConfirm(true);
  };
  
  const handleDelete = async () => {
    try {
      setLoading(true);
      
      // Não excluir dados de usuário, apenas marcar como inativo
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userToDelete.id);
        
      if (error) throw error;
      
      toast.success('Usuário desativado com sucesso');
      setShowConfirm(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error) {
      console.error('Erro ao desativar usuário:', error);
      toast.error('Erro ao desativar usuário');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancel = () => {
    setEditingUser(null);
    setShowConfirm(false);
    setUserToDelete(null);
  };
  
  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (loading && !isAdmin) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[70vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }
  
  if (!isAdmin) return null;
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold dark-text-primary mb-2">Gerenciamento de Usuários</h1>
          <p className="dark-text-secondary">Gerencie usuários do aplicativo, altere planos e configure datas de expiração.</p>
        </div>
        
        {/* Search and Filters */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              className="dark-input w-full p-3 pl-10 rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg
              className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 dark:text-gray-300"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto dark-card rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Nome Completo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tipo de Plano
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Data de Expiração
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Avaliação Gratuita
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map(user => (
                  <tr key={user.id} className={!user.active ? "bg-gray-100 dark:bg-gray-700/30" : ""}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser?.id === user.id ? (
                        <input
                          type="text"
                          className="dark-input w-full p-2 rounded"
                          value={editingUser.full_name || ''}
                          onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})}
                        />
                      ) : (
                        <div className="text-sm font-medium dark-text-primary">{user.full_name || 'Sem nome'}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm dark-text-secondary">{user.email || 'Email não disponível'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser?.id === user.id ? (
                        <select
                          className="dark-input w-full p-2 rounded"
                          value={editingUser.plan_type}
                          onChange={(e) => setEditingUser({...editingUser, plan_type: e.target.value})}
                        >
                          <option value="free">Gratuito</option>
                          <option value="paid">Premium</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${user.plan_type === 'admin' ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200' : 
                            user.plan_type === 'paid' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                          {user.plan_type === 'admin' ? 'Admin' : 
                           user.plan_type === 'paid' ? 'Premium' : 'Gratuito'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser?.id === user.id ? (
                        <input
                          type="date"
                          className="dark-input w-full p-2 rounded"
                          value={editingUser.expiry_date || ''}
                          onChange={(e) => setEditingUser({...editingUser, expiry_date: e.target.value})}
                        />
                      ) : (
                        <div className="text-sm dark-text-secondary">
                          {user.expiry_date ? new Date(user.expiry_date).toLocaleDateString('pt-BR') : 'N/A'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingUser?.id === user.id ? (
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-2">
                            <label className="text-sm dark-text-secondary">Início:</label>
                            <input
                              type="date"
                              className="dark-input flex-1 p-1 text-sm rounded"
                              value={editingUser.trial_start_date || ''}
                              onChange={(e) => setEditingUser({...editingUser, trial_start_date: e.target.value})}
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <label className="text-sm dark-text-secondary">Dias:</label>
                            <input
                              type="number"
                              className="dark-input flex-1 p-1 text-sm rounded"
                              value={editingUser.trial_days || 7}
                              min="1"
                              max="90"
                              onChange={(e) => setEditingUser({...editingUser, trial_days: parseInt(e.target.value) || 7})}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm dark-text-secondary">
                          {user.trial_start_date ? (
                            <>
                              <div>Início: {new Date(user.trial_start_date).toLocaleDateString('pt-BR')}</div>
                              <div>Duração: {user.trial_days || 7} dias</div>
                            </>
                          ) : (
                            'N/A'
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.active !== false ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                          Ativo
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingUser?.id === user.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSave}
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                            disabled={loading}
                          >
                            <FiCheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          >
                            <FiXCircle className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                          >
                            <FiEdit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => confirmDelete(user)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                            disabled={user.id === user?.id} // Não permitir excluir a si mesmo
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center dark-text-secondary">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="dark-card rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-bold mb-4 dark-text-primary">Confirmar Desativação</h3>
              <p className="mb-6 dark-text-secondary">
                Tem certeza que deseja desativar o usuário {userToDelete?.full_name || userToDelete?.email}? 
                Esta ação não exclui o usuário, apenas o marca como inativo.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  disabled={loading}
                >
                  {loading ? 'Processando...' : 'Desativar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
} 