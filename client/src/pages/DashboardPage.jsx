import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Welcome, {user.name}!</h1>
      <p className="text-gray-600 mb-8">Role: {user.role} | Team: {user.teamId || 'None'}</p>
      
      <button 
        onClick={logout}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
}
