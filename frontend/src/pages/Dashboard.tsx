import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import {
  Key, Users, Activity, TrendingUp, Plus, Lock, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/DashboardLayout';
import RecentActivity from '@/components/RecentActivity';
import DeviceManagement from '@/components/DeviceManagement';
import KeyManagement from '@/components/KeyManagement';
import UserManagement from '@/components/UserManagement';
import RetailerManagement from '@/components/RetailerManagement';
import RetailerDeviceDetails from '@/components/RetailerDeviceDetails';

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  if (!user) return null;

  const getWelcomeMessage = () => {
    switch (user.role) {
      case 'super-admin': return 'Welcome, Super Admin';
      case 'super-distributor': return 'Welcome, Super Distributor';
      case 'distributor': return 'Welcome, Distributor';
      case 'retailer': return 'Welcome, Retailer';
      default: return 'Welcome';
    }
  };

  const getQuickActions = () => {
    switch (user.role) {
      case 'super-admin':
        return [
          { title: 'Create Keys', action: () => navigate('/keys') },
          { title: 'Add Super Distributor', action: () => navigate('/users') },
          { title: 'View Statistics', action: () => navigate('/wallet') }
        ];
      case 'super-distributor':
        return [
          { title: 'Transfer Keys', action: () => navigate('/keys') },
          { title: 'Add Distributor', action: () => navigate('/users') },
          { title: 'View Wallet', action: () => navigate('/wallet') }
        ];
      case 'distributor':
        return [
          { title: 'Transfer Keys', action: () => navigate('/keys') },
          { title: 'Add Retailer', action: () => navigate('/users') },
          { title: 'View Wallet', action: () => navigate('/wallet') }
        ];
      case 'retailer':
        return [
          { title: 'Provision Key', action: () => navigate('/my-keys') },
          { title: 'View EMI Status', action: () => navigate('/emi') },
          { title: 'View Wallet', action: () => navigate('/wallet') }
        ];
      default: return [];
    }
  };

  const getDashboardStats = () => {
    switch (user.role) {
      case 'super-admin':
        return [
          { title: 'Total Keys Created', value: '1,247', icon: Key, gradient: 'from-blue-500 to-cyan-600', trend: { value: 12, isPositive: true } },
          { title: 'Active Users', value: '89', icon: Users, gradient: 'from-green-500 to-emerald-600', trend: { value: 8, isPositive: true } },
          { title: 'Keys Sold', value: '856', icon: TrendingUp, gradient: 'from-purple-500 to-pink-600', trend: { value: 15, isPositive: true } },
          { title: 'Revenue', value: '$12,450', icon: Activity, gradient: 'from-orange-500 to-red-600', trend: { value: 23, isPositive: true } },
        ];
      case 'super-distributor':
        return [
          { title: 'Available Keys', value: '156', icon: Key, gradient: 'from-blue-500 to-indigo-600' },
          { title: 'Assigned Keys', value: '89', icon: Users, gradient: 'from-green-500 to-teal-600' },
          { title: 'Sold Keys', value: '67', icon: TrendingUp, gradient: 'from-purple-500 to-violet-600' },
        ];
      case 'distributor':
        return [
          { title: 'Available Keys', value: '78', icon: Key, gradient: 'from-cyan-500 to-blue-600' },
          { title: 'Assigned Keys', value: '45', icon: Users, gradient: 'from-emerald-500 to-green-600' },
          { title: 'Sold Keys', value: '33', icon: TrendingUp, gradient: 'from-pink-500 to-rose-600' },
        ];
      case 'retailer':
        return [
          { title: 'Total Keys', value: '23', icon: Key, gradient: 'from-indigo-500 to-purple-600' },
          { title: 'Used Keys', value: '18', icon: Activity, gradient: 'from-green-500 to-emerald-600' },
          { title: 'Active Keys', value: '5', icon: TrendingUp, gradient: 'from-orange-500 to-yellow-600' },
        ];
      default: return [];
    }
  };

  const handleCreateKey = () => toast.success('New key created successfully!');
  const handleAssignKey = () => toast.success('Key assigned successfully!');

  const stats = getDashboardStats();
  const actions = getQuickActions();

  return (
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">{getWelcomeMessage()}</h1>
              <p className="text-blue-100">
                {user.role === 'super-admin' && 'Manage your entire key distribution network'}
                {user.role === 'super-distributor' && 'Distribute keys to your network'}
                {user.role === 'distributor' && 'Manage your retailer network'}
                {user.role === 'retailer' && 'Control your devices efficiently'}
              </p>
            </div>
            {(user.role === 'super-admin' || user.role === 'super-distributor' || user.role === 'distributor') && (
              <Button
                onClick={user.role === 'super-admin' ? handleCreateKey : handleAssignKey}
                className="bg-white/20 hover:bg-white/30 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                {user.role === 'super-admin' ? 'Create New Key' : 'Assign Key'}
              </Button>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((action, i) => (
            <Button key={i} onClick={action.action} className="h-24 text-lg font-semibold" variant="outline">
              {action.title}
            </Button>
          ))}
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={stat.title} className="animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <StatCard {...stat} />
            </div>
          ))}
        </div>

        {/* Sections Based on Role */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Recent Activity</h2>
          <RecentActivity />
        </div>

        {(user.role === 'super-admin' || user.role === 'admin') && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Device Management</h2>
            <DeviceManagement />
          </div>
        )}

        {user.role === 'super-admin' && (
          <>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Key Management</h2>
              <KeyManagement />
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">User Management</h2>
              <UserManagement />
            </div>
          </>
        )}

        {user.role === 'distributor' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Retailer Management</h2>
            <RetailerManagement />
          </div>
        )}

        {user.role === 'retailer' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">My Devices</h2>
            <RetailerDeviceDetails />
          </div>
        )}

        {/* Secure Key Management Overview */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="w-5 h-5" />
              <span>Secure Key Management Overview</span>
            </CardTitle>
            <CardDescription>Your comprehensive solution for digital key security.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-8">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg h-48 flex items-center justify-center text-muted-foreground">
                <img src="/security-graphic.svg" alt="Security Graphic" className="w-24 h-24" />
              </div>
              <div className="w-full md:w-1/2 text-center md:text-left space-y-4">
                <p className="text-lg">
                  Our platform provides robust security features to protect your digital keys, ensuring peace of mind.
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Advanced encryption protocols</li>
                  <li>Multi-factor authentication</li>
                  <li>Real-time threat detection</li>
                  <li>Secure key storage and retrieval</li>
                </ul>
                <Button className="bg-blue-600 text-white hover:bg-blue-700">
                  Learn More
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
};

export default Dashboard;
