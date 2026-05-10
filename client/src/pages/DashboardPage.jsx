import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/layout/MainLayout';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <MainLayout>
      <div className="glass-panel p-8 rounded-2xl">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}! 👋</h1>
        <p className="text-gray-400 mb-8">
          Role: <span className="text-white capitalize">{user?.role}</span> | 
          Team: <span className="text-white">{user?.teamId || 'Not Assigned'}</span>
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
            <h3 className="text-gray-400 font-medium text-sm">Active Tasks</h3>
            <p className="text-3xl font-bold mt-2">12</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
            <h3 className="text-gray-400 font-medium text-sm">Completed</h3>
            <p className="text-3xl font-bold mt-2 text-green-400">45</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
            <h3 className="text-gray-400 font-medium text-sm">Overdue</h3>
            <p className="text-3xl font-bold mt-2 text-red-400">2</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
