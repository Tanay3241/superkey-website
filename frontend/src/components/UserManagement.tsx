import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi, keysApi } from '@/lib/api';
import { getAllUsersWithKeyCount } from '@/lib/getAllUsersWithKeyCount';
import { AddUserModal } from '@/components/AddUserModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PlusCircle, Search, Filter, Eye, Pencil, Ban, RefreshCw, Loader2, ChevronLeft, ChevronRight, Key, ShieldCheck, Users, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ChildUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  shopName?: string;
  superDistributorId?: string;
  distributorId?: string;
  retailerId?: string;
  createdAt: string | Date;
  status?: 'active' | 'inactive' | 'suspended';
  lastActive?: string;
  avatar?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  keyCount?: number;
}

type UserRole = 'super_distributor' | 'distributor' | 'retailer' | 'end_user' | 'all';

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  super_admin: {
    bg: 'bg-violet-50 dark:bg-violet-900/20',
    text: 'text-violet-800 dark:text-violet-200',
    border: 'border-violet-200 dark:border-violet-800',
    icon: <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
  },
  super_distributor: {
    bg: 'bg-sky-50 dark:bg-sky-900/20',
    text: 'text-sky-800 dark:text-sky-200',
    border: 'border-sky-200 dark:border-sky-800',
    icon: <Users className="h-3.5 w-3.5 mr-1.5" />
  },
  distributor: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-800 dark:text-emerald-200',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: <Users className="h-3.5 w-3.5 mr-1.5" />
  },
  retailer: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-800 dark:text-amber-200',
    border: 'border-amber-200 dark:border-amber-800',
    icon: <Users className="h-3.5 w-3.5 mr-1.5" />
  },
  end_user: {
    bg: 'bg-slate-50 dark:bg-slate-800/20',
    text: 'text-slate-800 dark:text-slate-200',
    border: 'border-slate-200 dark:border-slate-700',
    icon: <Users className="h-3.5 w-3.5 mr-1.5" />
  },
  enduser: {
    bg: 'bg-slate-50 dark:bg-slate-800/20',
    text: 'text-slate-800 dark:text-slate-200',
    border: 'border-slate-200 dark:border-slate-700',
    icon: <Users className="h-3.5 w-3.5 mr-1.5" />
  },
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  active: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-800 dark:text-green-200',
    border: 'border-green-200 dark:border-green-800',
    dot: 'bg-green-500'
  },
  inactive: {
    bg: 'bg-slate-50 dark:bg-slate-800/20',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400'
  },
  suspended: {
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    text: 'text-rose-800 dark:text-rose-200',
    border: 'border-rose-200 dark:border-rose-800',
    dot: 'bg-rose-500'
  },
};

console.log('UserManagement component is rendering');

console.log('UserManagement component is rendering');

const UserManagement = () => {
  // State management
  const { user } = useAuth();
  const [users, setUsers] = useState<ChildUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ChildUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<UserRole>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedRoleTab, setSelectedRoleTab] = useState<'super_distributor' | 'distributor' | 'retailer'>('super_distributor');

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  // Get role to show based on user role
  const getRoleToShow = useCallback(() => {
    if (!user) return 'all';
    
    const roleMap: Record<string, string> = {
      'super_admin': 'all',
      'super_distributor': 'super_distributor',
      'distributor': 'distributor',
      'retailer': 'retailer'
    };
    
    return roleMap[user.role] || 'all';
  }, [user]);

  // Fetch users with key counts
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      
      if (user?.role === 'super_admin') {
        // Get users with key counts for super admin
        const usersWithKeys = await getAllUsersWithKeyCount();
        setUsers(usersWithKeys);
      } else {
        const roleToFetch = getRoleToShow();
        if (roleToFetch === 'all') return;
        
        // Get users by role first
        response = await usersApi.getUsersByRole(roleToFetch);
        const usersData = Array.isArray(response.data) ? response.data : response.data.users || [];
        
        // Then get key counts for each user
        const usersWithKeys = await Promise.all(
          usersData.map(async (u) => {
            try {
              const userId = u._id || u.uid || u.id;
              const keysRes = await keysApi.getUserKeys(userId);
              const keysArr = Array.isArray(keysRes.data?.keys) ? keysRes.data.keys : [];
              return { ...u, keyCount: keysArr.length };
            } catch (error) {
              console.error('Error fetching keys for user:', error);
              return { ...u, keyCount: 0 };
            }
          })
        );
        
        setUsers(usersWithKeys);
      }
    } catch (err: any) {
      let errorMessage = 'Failed to fetch users';
      
      if (err?.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
        toast.error(errorMessage);
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, getRoleToShow]);

  // Handle refresh with loading state
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchUsers();
      toast.success('User list refreshed successfully');
    } catch (error) {
      console.error('Error refreshing users:', error);
      toast.error('Failed to refresh user list');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter users based on search and filters
  useEffect(() => {
    if (!users.length) return;
    
    let result = [...users];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(user => {
        const searchFields = [
          user.name?.toLowerCase() || '',
          user.email?.toLowerCase() || '',
          user.phone?.toLowerCase() || '',
          user.shopName?.toLowerCase() || '',
          user.city?.toLowerCase() || '',
          user.state?.toLowerCase() || '',
          user.pincode?.toLowerCase() || ''
        ];
        return searchFields.some(field => field.includes(term));
      });
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(user => user.status === statusFilter);
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      result = result.filter(user => user.role === roleFilter);
    }
    
    setFilteredUsers(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [users, searchTerm, statusFilter, roleFilter]);

  // Initial data fetch
  useEffect(() => {
    const allowedRoles = ['super_admin', 'super_distributor', 'distributor', 'retailer'];
    if (user && allowedRoles.includes(user.role)) {
      fetchUsers();
    } else if (user) {
      setError('You do not have permission to view this page');
      setLoading(false);
    }
  }, [user, fetchUsers]);

  // Get user initials for avatar
  const getInitials = (name: string) => {
    if (!name) return '--';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Get parent user name for display
  const getUserParent = (user: ChildUser) => {
    if (user.role === 'distributor' && user.superDistributorId) {
      const parentUser = users.find(x => x.id === user.superDistributorId);
      return parentUser ? parentUser.name : user.superDistributorId;
    } else if (user.role === 'retailer' && user.distributorId) {
      const parentUser = users.find(x => x.id === user.distributorId);
      return parentUser ? parentUser.name : user.distributorId;
    } else if (user.role === 'enduser' && user.retailerId) {
      const parentUser = users.find(x => x.id === user.retailerId);
      return parentUser ? parentUser.name : user.retailerId;
    }
    return 'N/A';
  };

  // Role title mapping
  const getRoleTitle = () => {
    const titles: Record<string, string> = {
      super_distributor: 'Distributors',
      distributor: 'Retailers',
      retailer: 'End Users',
      all: 'All Users',
    };
    return titles[selectedRoleTab] || 'Users';
  };

  // Role description mapping
  const getRoleDescription = () => {
    const descriptions: Record<string, string> = {
      super_distributor: 'Manage all distributors in your network',
      distributor: 'Manage all retailers in your network',
      retailer: 'Manage all end users in your network',
      all: 'Manage all users in the system',
    };
    return descriptions[selectedRoleTab] || 'Manage users';
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-8">
      <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/90 to-primary/70 shadow-lg shadow-primary/10 dark:shadow-primary/20">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {getRoleTitle()}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm">{getRoleDescription()}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefresh} 
                    disabled={isRefreshing}
                    className="hover:bg-background/80 transition-all duration-200 text-gray-700 dark:text-gray-200"
                  >
                    {isRefreshing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh user list</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <AddUserModal 
                    onUserAdded={(newUser) => {
                      fetchUsers(); // Refresh the user list
                      toast.success(`Successfully added ${newUser.name}`);
                    }}
                    currentUserRole={user?.role}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create a new user</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <Card className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800">
        <CardHeader className="pb-2">
          <Tabs 
            defaultValue={selectedRoleTab} 
            className="w-full"
            onValueChange={(value) => {
              if (['super_distributor', 'distributor', 'retailer'].includes(value)) {
                setSelectedRoleTab(value as 'super_distributor' | 'distributor' | 'retailer');
                setRoleFilter(value as UserRole);
              } else if (value === 'all') {
                setRoleFilter('all');
              }
            }}
          >
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="grid w-full grid-cols-4 gap-0 sm:w-fit bg-gray-100/50 dark:bg-gray-800/50 p-0.5 rounded-xl border border-gray-200 dark:border-gray-700">
                <TabsTrigger 
                  value="all" 
                  className="flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-200 bg-white/95 dark:bg-gray-700/95 hover:bg-primary/10 dark:hover:bg-primary/20 data-[state=active]:bg-primary/20 dark:data-[state=active]:bg-primary/30 data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground shadow-sm rounded-lg px-1.5 py-1"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="mx-1">All</span>
                  <Badge variant="secondary" className="px-1 text-xs bg-primary/20 dark:bg-primary/30 text-primary-foreground">
                    {filteredUsers.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="super_distributor"
                  className="flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-200 bg-white/95 dark:bg-gray-700/95 hover:bg-violet-500/10 dark:hover:bg-violet-500/20 data-[state=active]:bg-violet-500/20 dark:data-[state=active]:bg-violet-500/30 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300 shadow-sm rounded-lg px-1.5 py-1"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="mx-1">Super</span>
                  <Badge variant="secondary" className="px-1 text-xs bg-violet-500/20 dark:bg-violet-500/30 text-violet-700 dark:text-violet-300">
                    {filteredUsers.filter(user => user.role === 'super_distributor').length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="distributor"
                  className="flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-200 bg-white/95 dark:bg-gray-700/95 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 data-[state=active]:bg-emerald-500/20 dark:data-[state=active]:bg-emerald-500/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-300 shadow-sm rounded-lg px-1.5 py-1"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="mx-1">Dist</span>
                  <Badge variant="secondary" className="px-1 text-xs bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                    {filteredUsers.filter(user => user.role === 'distributor').length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="retailer"
                  className="flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-200 bg-white/95 dark:bg-gray-700/95 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 data-[state=active]:bg-amber-500/20 dark:data-[state=active]:bg-amber-500/30 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-300 shadow-sm rounded-lg px-1.5 py-1"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span className="mx-1">Retail</span>
                  <Badge variant="secondary" className="px-1 text-xs bg-amber-500/20 dark:bg-amber-500/30 text-amber-700 dark:text-amber-300">
                    {filteredUsers.filter(user => user.role === 'retailer').length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
              
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                <div className="relative w-full sm:w-80 group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                  <Input
                    type="search"
                    placeholder="Search by name, email, or phone..."
                    className="pl-9 w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 focus:border-blue-600 transition-all duration-200 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 rounded-xl h-10 shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 transition-all duration-200 rounded-xl h-10 shadow-sm">
                    <Filter className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                    <SelectValue placeholder="Status" className="text-sm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <TabsContent value="all" className="mt-0"></TabsContent>
            <TabsContent value="super_distributor" className="mt-0"></TabsContent>
            <TabsContent value="distributor" className="mt-0"></TabsContent>
            <TabsContent value="retailer" className="mt-0"></TabsContent>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          <div className="bg-white dark:bg-gray-900 overflow-hidden">
            <Table>
              <TableHeader className="bg-blue-50/80 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-800">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[250px] text-gray-900 dark:text-gray-100 font-semibold">User</TableHead>
                  <TableHead className="text-gray-900 dark:text-gray-100 font-semibold">Role</TableHead>
                  <TableHead className="text-gray-900 dark:text-gray-100 font-semibold">Status</TableHead>
                  <TableHead className="text-gray-900 dark:text-gray-100 font-semibold">Parent</TableHead>
                  <TableHead className="text-gray-900 dark:text-gray-100 font-semibold">Available Keys</TableHead>
                  <TableHead className="text-gray-900 dark:text-gray-100 font-semibold">Created</TableHead>
                  <TableHead className="text-gray-900 dark:text-gray-100 font-semibold">Last Active</TableHead>
                  <TableHead className="text-right text-gray-900 dark:text-gray-100 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {currentItems.length > 0 ? (
                  currentItems.map((userItem) => {
                    const roleInfo = ROLE_COLORS[userItem.role] || { bg: 'bg-gray-100', text: 'text-gray-800 dark:text-gray-200', border: 'border-gray-200', icon: null };
                    const statusInfo = STATUS_COLORS[userItem.status || 'inactive'] || { bg: '', text: '', border: '', dot: 'bg-gray-400' };
                    const parent = getUserParent(userItem);
                    
                    return (
                      <TableRow 
                        key={userItem.id}
                        className={cn(
                          'group transition-all duration-200 hover:bg-blue-50 dark:hover:bg-gray-800/30',
                          'border-b border-gray-100 dark:border-gray-800',
                          userItem.status === 'suspended' && 'opacity-70 hover:opacity-100',
                          'hover:shadow-sm hover:shadow-blue-100/50 dark:hover:shadow-blue-900/20'
                        )}
                      >
                        <TableCell className="py-3">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-800 shadow-sm">
                              <AvatarImage src={userItem.avatar} alt={userItem.name} />
                              <AvatarFallback className="text-xs">
                                {getInitials(userItem.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white truncate">{userItem.name || 'N/A'}</div>
                              <div className="text-sm text-gray-700 dark:text-gray-200 truncate max-w-[180px]">
                                {userItem.email || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge 
                            className={cn(
                              'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                              roleInfo.bg,
                              roleInfo.text,
                              roleInfo.border
                            )}
                          >
                            {roleInfo.icon}
                            {userItem.role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center">
                            <span className={`w-2 h-2 rounded-full ${statusInfo.dot} mr-2 animate-pulse`}></span>
                            <Badge 
                              variant="outline"
                              className={cn(
                                'text-xs',
                                statusInfo.bg,
                                statusInfo.text,
                                statusInfo.border
                              )}
                            >
                              {userItem.status ? userItem.status.charAt(0).toUpperCase() + userItem.status.slice(1) : 'Inactive'}
                            </Badge>
                          </div>
                        </TableCell>
                        
                        {/* Parent Cell */}
                        <TableCell className="py-3 text-sm text-gray-700 dark:text-gray-200">
                          {(() => {
                            if (parent === 'N/A') {
                              if (userItem.role === 'super_distributor') {
                                return (
                                  <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
                                    Super Admin
                                  </Badge>
                                );
                              }
                              return parent;
                            }
                            return (
                              <div className="flex flex-col gap-1">
                                <span className="font-medium text-gray-900 dark:text-gray-100">{parent}</span>
                                <Badge variant="outline" className="w-fit text-xs bg-gray-50/50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800">
                                  {userItem.role === 'distributor' ? 'Super Distributor' : 
                                   userItem.role === 'retailer' ? 'Distributor' : 
                                   userItem.role === 'enduser' ? 'Retailer' : ''}
                                </Badge>
                              </div>
                            );
                          })() as React.ReactNode}
                        </TableCell>

                        {/* Available Keys Cell */}
                        <TableCell className="py-3">
                          <div className="flex items-center space-x-2">
                            <div className={cn(
                              "p-1.5 rounded-full transition-colors duration-200",
                              userItem.keyCount && userItem.keyCount > 0 
                                ? "bg-green-100 dark:bg-green-900/20" 
                                : "bg-gray-100 dark:bg-gray-800"
                            )}>
                              <Key className={cn(
                                "h-4 w-4 transition-colors duration-200",
                                userItem.keyCount && userItem.keyCount > 0 
                                  ? "text-green-600 dark:text-green-400" 
                                  : "text-gray-400 dark:text-gray-500"
                              )} />
                            </div>
                            <div className="flex flex-col">
                              <span className={cn(
                                "font-medium transition-colors duration-200",
                                userItem.keyCount && userItem.keyCount > 0 
                                  ? "text-green-600 dark:text-green-400" 
                                  : "text-gray-500 dark:text-gray-400"
                              )}>
                                {userItem.keyCount || 0}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Available
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Created Date Cell */}
                        <TableCell className="py-3 text-sm text-gray-700 dark:text-gray-200">
                          {userItem.createdAt ? format(new Date(userItem.createdAt), 'MMM d, yyyy') : 'N/A'}
                        </TableCell>

                        {/* Last Active Cell */}
                        <TableCell className="py-3 text-sm text-gray-700 dark:text-gray-200">
                          {userItem.lastActive ? format(new Date(userItem.lastActive), 'MMM d, yyyy') : 'N/A'}
                        </TableCell>

                        {/* Actions Cell */}
                        <TableCell className="py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3 py-6">
                        <Users className="h-12 w-12 text-muted-foreground/30" />
                        <div>
                          <h3 className="text-lg font-medium text-foreground/80">No users found</h3>
                          <p className="text-sm text-muted-foreground">
                            {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
                              ? 'Try adjusting your search or filter criteria' 
                              : 'Get started by adding a new user'}
                          </p>
                        </div>
                        {!searchTerm && statusFilter === 'all' && roleFilter === 'all' && (
                          <Button 
                            className="mt-2"
                            size="sm"
                          >
                            <UserPlus className="mr-2 h-4 w-4" /> Add User
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="text-sm text-gray-700 dark:text-gray-200">
            Showing <span className="font-medium text-gray-900 dark:text-white">{Math.min(indexOfFirstItem + 1, filteredUsers.length)}</span> to{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {Math.min(indexOfLastItem, filteredUsers.length)}
            </span>{' '}
            of <span className="font-medium text-gray-900 dark:text-white">{filteredUsers.length}</span> {filteredUsers.length === 1 ? 'user' : 'users'}
            
            <span className="mx-2 text-gray-500 dark:text-gray-400">•</span>
            
            <span className="inline-flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              <span className="font-medium text-gray-900 dark:text-white">
                {users.filter(u => u.status === 'active').length}
              </span> active
            </span>
            
            <span className="mx-2 text-gray-500 dark:text-gray-400">•</span>
            
            <span className="text-gray-700 dark:text-gray-200">Page {currentPage} of {totalPages}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="h-9 w-9 p-0 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200 flex items-center justify-center shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Calculate page number to display (centered around current page)
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                const isCurrent = currentPage === pageNum;
                const isFirst = pageNum === 1;
                const isLast = pageNum === totalPages;
                
                return (
                  <Button
                    key={pageNum}
                    variant={isCurrent ? "default" : "ghost"}
                    size="sm"
                    className={`h-8 w-8 p-0 rounded-lg transition-all duration-200 ${
                      isCurrent 
                        ? 'font-bold shadow-sm shadow-primary/10' 
                        : 'hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-foreground'
                    }`}
                    onClick={() => setCurrentPage(pageNum)}
                    aria-current={isCurrent ? 'page' : undefined}
                    aria-label={`Page ${pageNum}${isCurrent ? ', current page' : ''}`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <span className="px-2 text-sm text-muted-foreground" aria-hidden="true">...</span>
              )}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="px-2 text-sm text-muted-foreground" aria-hidden="true">...</span>
                  <Button
                    variant={currentPage === totalPages ? "default" : "ghost"}
                    size="sm"
                    className={`h-8 w-8 p-0 rounded-lg transition-all duration-200 ${
                      currentPage === totalPages 
                        ? 'font-bold shadow-sm shadow-primary/10' 
                        : 'hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-foreground'
                    }`}
                    onClick={() => setCurrentPage(totalPages)}
                    aria-label={`Go to last page (${totalPages})`}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="h-9 w-9 p-0 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200 flex items-center justify-center shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default UserManagement;
