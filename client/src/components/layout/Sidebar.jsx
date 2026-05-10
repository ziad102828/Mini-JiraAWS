import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  FolderKanban, 
  LogOut, 
  Hexagon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Define navigation links based on role
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'My Tasks', icon: CheckSquare, path: '/tasks' },
  ];

  if (user?.role === 'manager') {
    navItems.push(
      { name: 'Projects', icon: FolderKanban, path: '/projects' },
      { name: 'Manage Teams', icon: Users, path: '/teams' }
    );
  }

  return (
    <div 
      className={`relative h-screen bg-[#11111a] border-r border-white/5 transition-all duration-300 flex flex-col
        ${collapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Collapse Toggle Button */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 bg-blue-600 rounded-full p-1 text-white shadow-lg hover:bg-blue-500 z-10"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Logo Area */}
      <div className={`flex items-center h-20 border-b border-white/5 ${collapsed ? 'justify-center' : 'px-6'}`}>
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
          <Hexagon className="text-white w-6 h-6" fill="currentColor" />
        </div>
        {!collapsed && (
          <span className="ml-3 text-xl font-bold tracking-tight text-white whitespace-nowrap">
            Mini-Jira
          </span>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `
              flex items-center px-3 py-3 rounded-xl transition-all duration-200 group
              ${isActive 
                ? 'bg-blue-600/10 text-blue-500' 
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? item.name : undefined}
          >
            <item.icon className={`w-5 h-5 shrink-0 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && <span className="font-medium">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-white/5">
        <div className={`flex items-center ${collapsed ? 'justify-center mb-4' : 'mb-4'}`}>
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-blue-400 font-bold uppercase shrink-0">
            {user?.name?.charAt(0) || 'U'}
          </div>
          {!collapsed && (
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{user?.role}</p>
            </div>
          )}
        </div>
        
        <button
          onClick={logout}
          className={`flex items-center w-full px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors
            ${collapsed ? 'justify-center' : ''}
          `}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className={`w-5 h-5 shrink-0 ${collapsed ? '' : 'mr-3'}`} />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
}
