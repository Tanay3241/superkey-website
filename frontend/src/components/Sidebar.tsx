
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, Users, Wallet, Key, LogOut } from 'lucide-react';

export default function Sidebar() {
  const { logout } = useAuth();

  const menuItems = [
    { icon: Home, label: 'Home', to: '/dashboard' },
    { icon: Users, label: 'Users', to: '/users' },
    { icon: Wallet, label: 'Wallet', to: '/wallet' },
    { icon: Key, label: 'Keys', to: '/keys' },
  ];

  return (
    <div className="w-64 min-h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col">
      <div className="flex-1">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">SuperKey</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Management Dashboard</p>
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-100 dark:bg-gray-700/50 text-primary dark:text-primary-foreground'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <button
        onClick={async () => {
          await logout();
          window.location.href = '/';
        }}
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 transition-colors w-full"
      >
        <LogOut className="w-5 h-5" />
        Logout
      </button>
    </div>
  );
}
