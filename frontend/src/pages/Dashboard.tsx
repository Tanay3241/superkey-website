import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/StatCard';
import {
  Key, Users, Activity, TrendingUp, Plus, Lock, ArrowRight, Eye, EyeOff, Ban
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import RecentActivity from '@/components/RecentActivity';
import DeviceManagement from '@/components/DeviceManagement';
import RetailerManagement from '@/components/RetailerManagement';
import RetailerDeviceDetails from '@/components/RetailerDeviceDetails';
import { CreateKeyModal } from '@/components/CreateKeyModal';
import TransactionHistory from '@/components/TransactionHistory';

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    try {
      if (!isAuthenticated) navigate('/');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load dashboard');
      setErrorMessage(error?.message || 'Failed to load dashboard');
    }
  }, [isAuthenticated, navigate]);

  if (!user) {
    return null;
  }

  const getWelcomeMessage = () => {
    switch (user.role) {
      case 'super_admin': return 'Welcome, Super Admin';
      case 'super_distributor': return 'Welcome, Super Distributor';
      case 'distributor': return 'Welcome, Distributor';
      case 'retailer': return 'Welcome, Retailer';
      default: return 'Welcome';
    }
  };

  const getQuickActions = () => {
    const safeNavigate = (path: string) => {
      try {
        navigate(path);
      } catch (error: any) {
        toast.error(error?.message || 'Failed to navigate');
      }
    };
    switch (user.role) {
      case 'super_admin':
        return [
          { title: 'Create Keys', action: () => setShowCreateKeyModal(true) },
          { title: 'Add Super Distributor', action: () => safeNavigate('/users') },
          { title: 'View Statistics', action: () => safeNavigate('/wallet') }
        ];
      case 'super_distributor':
        return [
          { title: 'Transfer Keys', action: () => safeNavigate('/keys') },
          { title: 'Add Distributor', action: () => safeNavigate('/users') },
          { title: 'View Wallet', action: () => safeNavigate('/wallet') }
        ];
      case 'distributor':
        return [
          { title: 'Transfer Keys', action: () => safeNavigate('/keys') },
          { title: 'Add Retailer', action: () => safeNavigate('/users') },
          { title: 'View Wallet', action: () => safeNavigate('/wallet') }
        ];
      case 'retailer':
        return [
          { title: 'Provision Key', action: () => safeNavigate('/my-keys') },
          { title: 'View EMI Status', action: () => safeNavigate('/emi') },
          { title: 'View Wallet', action: () => safeNavigate('/wallet') }
        ];
      default: return [];
    }
  };

  const handleCreateKey = () => toast.success('New key created successfully!');
  const handleAssignKey = () => toast.success('Key assigned successfully!');

  const getDashboardStats = () => {
    return {
      totalKeys: user?.wallet?.availableKeys || 0,
      activeUsers: 0, // This should be fetched from an API
      revenue: 0, // This should be fetched from an API
    };
  };

  const stats = getDashboardStats();
  const actions = getQuickActions();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white p-8">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 mb-8 shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-white">{getWelcomeMessage()}</h1>
            <p className="text-gray-100">Manage your entire key distribution network</p>
          </div>
          <Button
            onClick={() => setShowCreateKeyModal(true)}
            className="bg-white/20 hover:bg-white/30 text-white border-0 flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create New Key
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {actions.map((action, index) => (
          <Card 
            key={index} 
            className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors p-6 cursor-pointer border border-gray-200 dark:border-gray-700 shadow-lg"
            onClick={action.action}
          >
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{action.title}</h3>
            <p className="text-gray-600 dark:text-gray-300">Click to proceed</p>
          </Card>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Total Keys"
          value={stats.totalKeys.toString()}
          icon={Key}
          gradient="from-blue-500 to-cyan-600"
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers.toString()}
          icon={Users}
          gradient="from-green-500 to-emerald-600"
        />
        <StatCard
          title="Revenue"
          value={`$${stats.revenue}`}
          icon={Activity}
          gradient="from-purple-500 to-pink-600"
        />
        {user?.wallet?.totalRevoked > 0 && (
          <StatCard
            title="Revoked Keys"
            value={user.wallet.totalRevoked.toString()}
            icon={Ban}
            gradient="from-rose-500 to-red-600"
            className="bg-rose-50/10 dark:bg-rose-900/10 border-rose-200/50 dark:border-rose-800/50"
          />
        )}
      </div>

      {/* Transaction History */}
      <Card className="mb-8 overflow-hidden border border-gray-200 dark:border-gray-700/50">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700/50 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl text-gray-900 dark:text-gray-100">Transaction History</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Recent key transactions in your account
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TransactionHistory 
            key={`${user?.role}-${refreshKey}`}
            filterRole={user?.role}
            className="border-0"
          />
        </CardContent>
      </Card>

      {/* Create Key Modal */}
      <CreateKeyModal
        open={showCreateKeyModal}
        onClose={() => setShowCreateKeyModal(false)}
      />
    </div>
  );
};

export default Dashboard;
