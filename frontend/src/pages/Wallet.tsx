import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Key, Download, Upload, Rocket, XCircle } from 'lucide-react';
import TransactionHistory from '@/components/TransactionHistory';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/StatCard';

export default function Wallet() {
  const { user } = useAuth();
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!user || !user.wallet) {
    toast.error('Failed to load wallet data. Please try again.');
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded mb-4">Failed to load wallet data. Please refresh or contact support.</div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Available Keys',
      value: (user?.wallet?.availableKeys || 0).toString(),
      icon: Key,
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Total Received',
      value: (user?.wallet?.totalKeysReceived || 0).toString(),
      icon: Download,
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Total Transferred',
      value: (user?.wallet?.totalKeysTransferred || 0).toString(),
      icon: Upload,
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Total Provisioned',
      value: (user?.wallet?.totalProvisioned || 0).toString(),
      icon: Rocket,
      gradient: 'from-yellow-500 to-orange-500'
    },
    {
      title: 'Revoked Keys',
      value: (user?.wallet?.totalRevoked || 0).toString(),
      icon: XCircle,
      gradient: 'from-rose-500 to-red-600'
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {errorBanner && (
        <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-4 rounded mb-4">
          {errorBanner}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            {...stat}
            className={stat.title === 'Revoked Keys' ? 'border-rose-200 dark:border-rose-800' : ''}
          />
        ))}
      </div>

      {/* Transaction History */}
      <Card className="overflow-hidden border border-gray-200 dark:border-gray-700/50">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700/50 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl text-gray-900 dark:text-gray-100">Transaction History</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                All key transactions in your account
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

      {/* Revoked Keys Section */}
      {user?.wallet?.totalRevoked > 0 && (
        <Card className="border-rose-800 bg-rose-950/90">
          <CardHeader>
            <CardTitle className="flex items-center text-rose-200">
              <AlertCircle className="h-5 w-5 text-rose-500 mr-2" />
              <span>Revoked Keys</span>
            </CardTitle>
            <CardDescription className="text-rose-300">
              You have {user.wallet.totalRevoked} revoked key(s) in your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="border-rose-800 text-rose-400 hover:bg-rose-900/30 hover:text-rose-300"
              onClick={() => {
                setRefreshKey(prev => prev + 1);
              }}
            >
              View Revoked Keys History
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
