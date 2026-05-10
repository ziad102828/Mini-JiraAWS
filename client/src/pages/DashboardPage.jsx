import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import MainLayout from '../components/layout/MainLayout';
import { isAfter, parseISO } from 'date-fns';

export default function DashboardPage() {
  const { user, token } = useAuth();

  // Fetch real tasks to calculate stats
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', user?.teamId],
    queryFn: () => api.getTasks(token, user?.role === 'manager' ? null : user?.teamId),
    enabled: !!token && !!user
  });

  // Calculate Real Stats
  const activeTasks = tasks.filter(t => t.status !== 'done').length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const overdueTasks = tasks.filter(t => 
    t.status !== 'done' && 
    t.deadline && 
    isAfter(new Date(), parseISO(t.deadline))
  ).length;

  return (
    <MainLayout>
      <div className="glass-panel p-8 rounded-2xl">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}! 👋</h1>
        <p className="text-gray-400 mb-8">
          Role: <span className="text-white capitalize">{user?.role}</span> | 
          Team: <span className="text-white">{user?.teamId || 'Not Assigned'}</span>
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl hover:border-blue-500/50 transition-colors">
            <h3 className="text-gray-400 font-medium text-sm">Active Tasks</h3>
            <p className="text-3xl font-bold mt-2">{activeTasks}</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl hover:border-green-500/50 transition-colors">
            <h3 className="text-gray-400 font-medium text-sm">Completed</h3>
            <p className="text-3xl font-bold mt-2 text-green-400">{completedTasks}</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl hover:border-red-500/50 transition-colors">
            <h3 className="text-gray-400 font-medium text-sm">Overdue</h3>
            <p className="text-3xl font-bold mt-2 text-red-400">{overdueTasks}</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
