import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import MainLayout from '../components/layout/MainLayout';
import { Plus, Loader2, Users, Trash2, X } from 'lucide-react';

export default function TeamsPage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  const { data: teamsData, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.getTeams(token),
    enabled: !!token
  });

  const createMutation = useMutation({
    mutationFn: (name) => api.createTeam(token, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setNewTeamName('');
      setShowCreate(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (teamId) => api.deleteTeam(token, teamId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] })
  });

  const teams = teamsData?.teams || [];

  return (
    <MainLayout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Teams</h1>
            <p className="text-gray-400 mt-1">Manage your company's teams</p>
          </div>
          {user?.role === 'manager' && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center px-4 py-2 bg-blue-600 rounded-xl text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 text-sm font-semibold"
            >
              <Plus size={16} className="mr-2" /> New Team
            </button>
          )}
        </div>

        {/* Create Team Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#11111a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Create New Team</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <input
                type="text"
                placeholder="Team name (e.g. Frontend)"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 mb-4"
                onKeyDown={e => e.key === 'Enter' && newTeamName.trim() && createMutation.mutate(newTeamName.trim())}
              />
              <button
                onClick={() => createMutation.mutate(newTeamName.trim())}
                disabled={!newTeamName.trim() || createMutation.isPending}
                className="w-full py-2.5 bg-blue-600 rounded-xl text-white hover:bg-blue-500 transition-all font-semibold disabled:opacity-50 flex items-center justify-center"
              >
                {createMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : 'Create Team'}
              </button>
            </div>
          </div>
        )}

        {/* Teams List */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
        ) : teams.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
            <Users size={40} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 font-medium">No teams yet</p>
            <p className="text-gray-500 text-sm mt-1">Create your first team to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map(team => (
              <div key={team.teamId} className="glass-panel p-6 rounded-2xl hover:border-blue-500/30 transition-colors group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <Users size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{team.name}</h3>
                      <p className="text-xs text-gray-500 font-mono">{team.teamId}</p>
                    </div>
                  </div>
                  {user?.role === 'manager' && (
                    <button
                      onClick={() => deleteMutation.mutate(team.teamId)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
