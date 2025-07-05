
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  LayoutDashboard, 
  Wallet, 
  Key, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  Settings
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const getMenuItems = (role: UserRole) => {
    const baseItems = [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: Wallet, label: 'Wallet', path: '/wallet' },
    ];

    switch (role) {
      case 'super-admin':
        return [
          ...baseItems,
          { icon: Key, label: 'Key Assignment', path: '/keys' },
          { icon: Users, label: 'User Management', path: '/users' },
        ];
      case 'super-distributor':
      case 'distributor':
        return [
          ...baseItems,
          { icon: Key, label: 'My Keys', path: '/my-keys' },
          { icon: Users, label: 'User Management', path: '/users' },
        ];
      case 'retailer':
        return [
          ...baseItems,
          { icon: Key, label: 'My Keys', path: '/my-keys' },
        ];
      default:
        return baseItems;
    }
  };

  const menuItems = user ? getMenuItems(user.role) : [];

  return (
    <div className={`bg-sidebar border-r border-sidebar-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} flex flex-col h-screen`}>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-2 animate-fade-in">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Key className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sidebar-foreground">SDC</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="hover:bg-sidebar-accent text-sidebar-foreground hover-scale"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* User Info */}
      {user && !collapsed && (
        <div className="p-4 border-b border-sidebar-border animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/70 capitalize">{user.role.replace('-', ' ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item, index) => (
            <li key={item.path} className={`animate-fade-in`} style={{ animationDelay: `${index * 0.1}s` }}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 hover-scale ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-md'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  }`
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className={`${collapsed ? 'w-full p-3' : 'w-full justify-start'} text-sidebar-foreground hover:bg-sidebar-accent hover-scale`}
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="ml-3">Logout</span>}
        </Button>
      </div>
    </div>
  );
};
