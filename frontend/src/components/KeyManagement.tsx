import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, Filter, Eye, Pencil, Ban, RefreshCw, Loader2, ChevronLeft, ChevronRight, Key, ShieldCheck, ArrowLeftRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CreateKeyModal } from './CreateKeyModal';
import { RevokeKeyModal } from './RevokeKeyModal';
import { toast } from 'sonner';
import { keysApi, usersApi } from '@/lib/api';
import { debounce } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { lightTheme, darkTheme } from '@/lib/theme';

import { useAuth } from '@/contexts/AuthContext';

interface Key { 
  id: string;
  createdDate: string;
  assignedTo: string;
  status: 'Available' | 'Assigned' | 'Revoked' | 'Expired';
  unlockingKeys: string[];
  assignedToId?: string;
  assignedToName?: string;
  expiryDate?: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  Available: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: <ShieldCheck className="h-4 w-4 mr-1" />
  },
  Assigned: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    icon: <Key className="h-4 w-4 mr-1" />
  },
  Revoked: {
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    icon: <Ban className="h-4 w-4 mr-1" />
  },
  Expired: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    icon: <ShieldCheck className="h-4 w-4 mr-1" />
  },
};

const KeyManagement = () => {
  // Get the user from auth context
  const { user } = useAuth();
  
  // State for keys and filtering
  const [keys, setKeys] = useState<Key[]>([]);
  const [filteredKeys, setFilteredKeys] = useState<Key[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);

  // For create modal: number of keys and validity
  const [count, setCount] = useState(1);
  const [validityInMonths, setValidityInMonths] = useState(12);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch keys with loading state
  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const response = await keysApi.getMyKeys();
      const keysData = Array.isArray(response.data) ? response.data : [];
      setKeys(keysData);
      setFilteredKeys(keysData);
    } catch (error) {
      console.error('Failed to fetch keys:', error);
      toast.error('Failed to load keys.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced fetchKeys
  const debouncedFetchKeys = useRef(debounce(fetchKeys, 400)).current;

  // For revoke modal: fetch users
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserKeysCount, setSelectedUserKeysCount] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const handleUserSelect = async (userId: string) => {
    setSelectedUserId(userId);
    try {
      console.log('Fetching keys for user:', userId);
      const response = await keysApi.getUserKeys(userId);
      console.log('User keys response:', response);
      
      // Calculate count from response
      let count = 0;
      if (response.data) {
        if (typeof response.data.count === 'number') {
          count = response.data.count;
        } else if (Array.isArray(response.data)) {
          count = response.data.length;
        } else if (Array.isArray(response.data.keys)) {
          count = response.data.keys.length;
        }
      }
      
      console.log('Setting user key count to:', count);
      setSelectedUserKeysCount(count);

    } catch (error: any) {
      console.error('Error fetching user keys:', error);
      if (error?.response?.status === 403) {
        toast.error('You do not have permission to view this user\'s keys. Only super admin can view key counts.');
        setSelectedUserKeysCount(null);
      } else {
        toast.error('Failed to fetch user keys');
        setSelectedUserKeysCount(0);
      }
    }
  };

  // Helper function to get parent user info
  const findParentUser = (user: any, allUsers: any[]) => {
    if (user.role === 'distributor' && user.superDistributorId) {
      const parent = allUsers.find(u => (u.id || u._id || u.uid) === user.superDistributorId);
      return parent ? { id: parent.id || parent._id || parent.uid, name: parent.name, role: 'super_distributor' } : null;
    } else if (user.role === 'retailer' && user.distributorId) {
      const parent = allUsers.find(u => (u.id || u._id || u.uid) === user.distributorId);
      return parent ? { id: parent.id || parent._id || parent.uid, name: parent.name, role: 'distributor' } : null;
    } else if (user.role === 'enduser' && user.retailerId) {
      const parent = allUsers.find(u => (u.id || u._id || u.uid) === user.retailerId);
      return parent ? { id: parent.id || parent._id || parent.uid, name: parent.name, role: 'retailer' } : null;
    }
    return null;
  };

  const fetchUsers = async () => {
    try {
      console.log('Fetching users for all roles');
      const roles = ['super_distributor', 'distributor', 'retailer', 'end_user'];
      let allUsers = [];
      let tempUsers = []; // Temporary array to store all users before processing parents
      
      // First, fetch all users
      for (const role of roles) {
        try {
          console.log(`Fetching users for role: ${role}`);
          const res = await usersApi.getHierarchy(); // Use getHierarchy instead of getUsersByRole
          console.log(`API response for role ${role}:`, res.data);
          
          let usersOfRole = [];
          if (Array.isArray(res.data.users)) {
            usersOfRole = res.data.users;
          } else if (res.data && typeof res.data === 'object') {
            usersOfRole = [res.data];
          }
          
          tempUsers = tempUsers.concat(usersOfRole);
        } catch (roleError) {
          console.error(`Error fetching users for role ${role}:`, roleError);
        }
      }
      
      // Then process all users to include key counts and parent info
      allUsers = await Promise.all(
        tempUsers.map(async user => {
          const userId = user.id || user._id || user.uid;
          try {
            const keysRes = await keysApi.getUserKeys(userId);
            const keyCount = Array.isArray(keysRes.data?.keys) ? keysRes.data.keys.length : 0;
            
            return {
              id: userId,
              name: user.name,
              email: user.email,
              role: user.role,
              keyCount,
              parent: user.parent || null,
              superDistributorId: user.superDistributorId,
              distributorId: user.distributorId,
              retailerId: user.retailerId
            };
          } catch (error) {
            console.error(`Error fetching keys for user ${userId}:`, error);
            
            return {
              id: userId,
              name: user.name,
              email: user.email,
              role: user.role,
              keyCount: 0,
              parent: user.parent || null,
              superDistributorId: user.superDistributorId,
              distributorId: user.distributorId,
              retailerId: user.retailerId
            };
          }
        })
      );
      
      console.log('Setting users state with:', allUsers);
      setUsers(allUsers);
      
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      toast.error('Failed to fetch users');
      setUsers([]);
    }
  };

  // Debug: log every users state change
  useEffect(() => {
    console.log('users state changed:', users.length, users.map(u => u.role));
  }, [users]);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter and search functionality
  useEffect(() => {
    let result = [...keys];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(key => 
        key.id.toLowerCase().includes(term) || 
        (key.assignedToName?.toLowerCase().includes(term) ?? false) ||
        key.status.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(key => key.status === statusFilter);
    }
    
    setFilteredKeys(result);
    setCurrentPage(1); // Reset to first page when filters change
  }, [keys, searchTerm, statusFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredKeys.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredKeys.slice(indexOfFirstItem, indexOfLastItem);

  // Initial data fetch
  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleRevokeKeys = async (userId: string, count: number, reason: string) => {
    try {
      console.log('Revoking keys:', { userId, count, reason });
      await keysApi.revoke(userId, count, reason);
      toast.success(`Successfully revoked ${count} keys.`);
      await debouncedFetchKeys(); // Refresh keys after revocation
      setIsRevokeModalOpen(false); // Close the modal after successful revocation
    } catch (error) {
      console.error('Failed to revoke keys:', error);
      toast.error('Failed to revoke keys.');
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await fetchKeys();
      toast.success('Key list refreshed successfully');
    } catch (error) {
      console.error('Error refreshing keys:', error);
      toast.error('Failed to refresh key list');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleKeyCreated = async (newKeyData: { count: number; validityInMonths: number }) => {
    try {
      setIsLoading(true);
      await keysApi.create(newKeyData.count, newKeyData.validityInMonths);
      toast.success('Key(s) created successfully!');
      await debouncedFetchKeys(); // Refresh keys after creation
    } catch (error) {
      console.error('Failed to create key:', error);
      toast.error('Failed to create key.');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete is not supported by API. Button will be hidden/disabled.
  // const handleDeleteKey = async (keyId: string) => {
  //   // Not implemented
  // };



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

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
              <Key className="h-6 w-6 text-primary dark:text-primary/90" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Key Management
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">Manage and monitor your API keys and access controls</p>
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
                  className="w-full sm:w-auto hover:bg-background/80 transition-all duration-200 text-gray-700 dark:text-gray-200"
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
                <p className="text-sm">Refresh key list</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 transition-all duration-300 shadow-md hover:shadow-lg text-white dark:text-gray-100"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Create New Key
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Generate new API keys</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  onClick={() => {
                    console.log('Opening revoke modal');
                    // Fetch users first, then open modal
                    fetchUsers().then(() => {
                      console.log('Users fetched, opening modal');
                      setIsRevokeModalOpen(true);
                    }).catch(error => {
                      console.error('Error fetching users:', error);
                      toast.error('Failed to load users');
                    });
                  }}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white hover:shadow-md transition-all duration-200"
                >
                  <Ban className="mr-2 h-4 w-4" /> Revoke Keys
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Revoke existing keys</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <Card className={cn(
        lightTheme.card.background,
        "border rounded-lg shadow-sm",
        lightTheme.card.border
      )}>
        <CardHeader>
          <CardTitle className={lightTheme.text}>Create New Keys</CardTitle>
          <CardDescription className="text-gray-600">
            Generate new API keys for your application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            handleKeyCreated({ count, validityInMonths });
          }}>
            <div>
              <Label className={lightTheme.text}>Number of Keys</Label>
              <Input
                type="number"
                min={1}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                className={cn(
                  lightTheme.input.background,
                  lightTheme.input.text,
                  lightTheme.input.border,
                  lightTheme.input.placeholder
                )}
                placeholder="Enter number of keys"
              />
            </div>
            <div>
              <Label className={lightTheme.text}>Validity (months)</Label>
              <Input
                type="number"
                min={1}
                value={validityInMonths}
                onChange={(e) => setValidityInMonths(parseInt(e.target.value) || 12)}
                className={cn(
                  lightTheme.input.background,
                  lightTheme.input.text,
                  lightTheme.input.border,
                  lightTheme.input.placeholder
                )}
                placeholder="Enter validity period"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
              >
                <Key className="w-4 h-4 mr-2" />
                {isLoading ? 'Creating...' : 'Create Keys'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

              {/* Content for Create Keys tab */}
              <div className="space-y-4 p-4">
                <h3 className="text-lg font-semibold">Create New Keys</h3>
                <form className="space-y-4" onSubmit={(e) => {
                  e.preventDefault();
                  handleKeyCreated({ count, validityInMonths });
                }}>
                  <div>
                    <Label>Number of Keys</Label>
                    <Input
                      type="number"
                      min={1}
                      value={count}
                      onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                      placeholder="Enter number of keys"
                    />
                  </div>
                  <div>
                    <Label>Validity (months)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={validityInMonths}
                      onChange={(e) => setValidityInMonths(parseInt(e.target.value) || 12)}
                      placeholder="Enter validity period"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={isLoading}
                    >
                      <Key className="w-4 h-4 mr-2" />
                      {isLoading ? 'Creating...' : 'Create Keys'}
                    </Button>
                  </div>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="transfer" className="mt-0">
              {/* Content for Transfer Keys tab */}
              <div className="space-y-4 p-4">
                <h3 className="text-lg font-semibold">Transfer Keys</h3>
                <form className="space-y-4">
                  <div>
                    <Label>Select User</Label>
                    <Select onValueChange={handleUserSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Number of Keys to Transfer</Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Enter number of keys"
                    />
                  </div>
                  <div>
                    <Label>Transfer To</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipient" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="submit">
                      <ArrowLeftRight className="w-4 h-4 mr-2" />
                      Transfer Keys
                    </Button>
                  </div>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="revoke" className="mt-0">
              {/* Content for Revoke Keys tab */}
              <div className="space-y-4 p-4">
                <h3 className="text-lg font-semibold">Revoke Keys</h3>
                <form className="space-y-4">
                  <div>
                    <Label>Select User</Label>
                    <Select onValueChange={handleUserSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Number of Keys to Revoke</Label>
                    <Input
                      type="number"
                      min={1}
                      max={selectedUserKeysCount}
                      placeholder="Enter number of keys"
                    />
                    {selectedUserKeysCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        User has {selectedUserKeysCount} active keys
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Reason for Revocation</Label>
                    <Textarea 
                      placeholder="Enter reason for revocation"
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="destructive" type="submit">
                      <Ban className="w-4 h-4 mr-2" />
                      Revoke Keys
                    </Button>
                  </div>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
      
      {/* Modals */}
      <CreateKeyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onKeyCreated={handleKeyCreated}
      />
      <RevokeKeyModal
        isOpen={isRevokeModalOpen}
        onClose={() => setIsRevokeModalOpen(false)}
        users={users}
        onRevoke={handleRevokeKeys}
      />
    </div>
  );
};

export default KeyManagement

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4 sm:w-fit">
          <TabsTrigger value="all" className="flex items-center space-x-1 text-xs sm:text-sm">
            <span>All Keys</span>
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center space-x-1 text-xs sm:text-sm">
            <span>Create Keys</span>
          </TabsTrigger>
          <TabsTrigger value="transfer" className="flex items-center space-x-1 text-xs sm:text-sm">
            <span>Transfer Keys</span>
          </TabsTrigger>
          <TabsTrigger value="revoke" className="flex items-center space-x-1 text-xs sm:text-sm">
            <span>Revoke Keys</span>
          </TabsTrigger>
        </TabsList>
        
        <Tabs
Content value="create" className="mt-0">
              {/* Content for Create Keys tab */}
              <div className="space-y-4 p-4">
                <h3 className="text-lg font-semibold">Create New Keys</h3>
                <form className="space-y-4" onSubmit={(e) => {
                  e.preventDefault();
                  handleKeyCreated({ count, validityInMonths });
                }}>
                  <div>
                    <Label>Number of Keys</Label>
                    <Input
                      type="number"
                      min={1}
                      value={count}
                      onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                      placeholder="Enter number of keys"
                    />
                  </div>
                  <div>
                    <Label>Validity (months)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={validityInMonths}
                      onChange={(e) => setValidityInMonths(parseInt(e.target.value) || 12)}
                      placeholder="Enter validity period"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={isLoading}
                    >
                      <Key className="w-4 h-4 mr-2" />
                      {isLoading ? 'Creating...' : 'Create Keys'}
                    </Button>
                  </div>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="transfer" className="mt-0">
              {/* Content for Transfer Keys tab */}
              <div className="space-y-4 p-4">
                <h3 className="text-lg font-semibold">Transfer Keys</h3>
                <form className="space-y-4">
                  <div>
                    <Label>Select User</Label>
                    <Select onValueChange={handleUserSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Number of Keys to Transfer</Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Enter number of keys"
                    />
                  </div>
                  <div>
                    <Label>Transfer To</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipient" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="submit">
                      <ArrowLeftRight className="w-4 h-4 mr-2" />
                      Transfer Keys
                    </Button>
                  </div>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="revoke" className="mt-0">
              {/* Content for Revoke Keys tab */}
              <div className="space-y-4 p-4">
                <h3 className="text-lg font-semibold">Revoke Keys</h3>
                <form className="space-y-4">
                  <div>
                    <Label>Select User</Label>
                    <Select onValueChange={handleUserSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Number of Keys to Revoke</Label>
                    <Input
                      type="number"
                      min={1}
                      max={selectedUserKeysCount}
                      placeholder="Enter number of keys"
                    />
                    {selectedUserKeysCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        User has {selectedUserKeysCount} active keys
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Reason for Revocation</Label>
                    <Textarea 
                      placeholder="Enter reason for revocation"
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="destructive" type="submit">
                      <Ban className="w-4 h-4 mr-2" />
                      Revoke Keys
                    </Button>
                  </div>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>

      <Card className="border border-gray-200 dark:border-gray-700/50">
        <CardHeader className="pb-2">
          <Tabs defaultValue="all" className="w-full">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="grid w-full grid-cols-4 sm:w-fit">
                <TabsTrigger 
                  value="all" 
                  className="flex items-center space-x-1 text-xs sm:text-sm"
                  onClick={() => setStatusFilter('all')}
                >
                  <span>All Keys</span>
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                    {filteredKeys.length}
                  </Badge>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="create" 
                  className="flex items-center space-x-1 text-xs sm:text-sm"
                >
                  <span>Create Keys</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="transfer" 
                  className="flex items-center space-x-1 text-xs sm:text-sm"
                >
                  <span>Transfer Keys</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="revoke" 
                  className="flex items-center space-x-1 text-xs sm:text-sm"
                >
                  <span>Revoke Keys</span>
                </TabsTrigger>
              </TabsList>
              
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search keys by ID or name..."
                    className="pl-9 w-full bg-background/80 backdrop-blur-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-background/80 backdrop-blur-sm">
                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Assigned">Assigned</SelectItem>
                    <SelectItem value="Revoked">Revoked</SelectItem>
                    <SelectItem value="Expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <TabsContent value="all" className="mt-0">
              {/* Move the table content here */}
              <CardContent className="p-0">
                <div className="rounded-lg border border-gray-200 dark:border-gray-700/50 bg-card/50 backdrop-blur-sm">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[220px] font-semibold text-gray-700 dark:text-gray-200">Key ID</TableHead>
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Created Date</TableHead>
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Assigned To</TableHead>
                        <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Status</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-200">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-200 dark:divide-gray-700/50">
                      {currentItems.length > 0 ? (
                        currentItems.map((key) => {
                          const statusInfo = STATUS_COLORS[key.status] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', icon: null };
                          return (
                            <TableRow 
                              key={key.id} 
                              className={cn(
                                'transition-colors hover:bg-muted/10',
                                key.status === 'Expired' && 'opacity-70 hover:opacity-100'
                              )}
                            >
                              <TableCell className="font-mono text-sm py-3 text-gray-900 dark:text-gray-100">
                                <div className="flex items-center">
                                  <div className="p-1.5 rounded-md bg-primary/10 dark:bg-primary/20 mr-3">
                                    <Key className="h-4 w-4 text-primary dark:text-primary/90" />
                                  </div>
                                  <div className="truncate max-w-[160px] font-medium" title={key.id}>
                                    {key.id}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 text-gray-700 dark:text-gray-200">
                                <div className="flex flex-col">
                                  <span className="text-sm">
                                    {key.createdDate ? new Date(key.createdDate).toLocaleDateString() : 'N/A'}
                                  </span>
                                  {key.expiryDate && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      Expires: {new Date(key.expiryDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="flex items-center">
                                  <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                                  <div className="truncate max-w-[150px] font-medium" title={key.assignedTo || 'N/A'}>
                                    {key.assignedTo || 'Unassigned'}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                <Badge 
                                  className={cn(
                                    'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                                    statusInfo.bg,
                                    statusInfo.text,
                                    statusInfo.border
                                  )}
                                >
                                  {statusInfo.icon}
                                  {key.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-3">
                                <div className="flex justify-end space-x-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-8 w-8 p-0 hover:bg-muted/50"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>View details</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    
                                    {key.status === 'Available' && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 w-8 p-0 hover:bg-muted/50"
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Edit key</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </TooltipProvider>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <div className="flex flex-col items-center justify-center space-y-3 py-6">
                              <Key className="h-12 w-12 text-muted-foreground/30" />
                              <div>
                                <h3 className="text-lg font-medium text-foreground/80">No keys found</h3>
                                <p className="text-sm text-muted-foreground">
                                  {searchTerm || statusFilter !== 'all' 
                                    ? 'Try adjusting your search or filter criteria' 
                                    : 'Get started by creating a new key'}
                                </p>
                              </div>
                              {!searchTerm && statusFilter === 'all' && (
                                <Button 
                                  onClick={() => setIsCreateModalOpen(true)}
                                  className="mt-2"
                                  size="sm"
                                >
                                  <PlusCircle className="mr-2 h-4 w-4" /> Create Key
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
              {filteredKeys.length > 0 && (
                <CardFooter className="flex flex-col items-start space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 px-6 py-4 border-t bg-muted/10">
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{Math.min(indexOfFirstItem + 1, filteredKeys.length)}</span> to{' '}
                    <span className="font-medium text-foreground">
                      {Math.min(indexOfLastItem, filteredKeys.length)}
                    </span>{' '}
                    of <span className="font-medium text-foreground">{filteredKeys.length}</span> {filteredKeys.length === 1 ? 'key' : 'keys'}
                    
                    <span className="mx-2 text-muted-foreground/50">•</span>
                    
                    <span className="inline-flex items-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                      <span className="font-medium text-foreground">
                        {keys.filter(k => k.status === 'Available').length}
                      </span> available
                    </span>
                    
                    <span className="mx-2 text-muted-foreground/50">•</span>
                    
                    <span>Page {currentPage} of {totalPages}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
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
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "ghost"}
                            size="sm"
                            className={`h-8 w-8 p-0 ${currentPage === pageNum ? 'font-bold' : ''}`}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <span className="px-2 text-sm text-muted-foreground">...</span>
                      )}
                      
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <Button
                          variant={currentPage === totalPages ? "default" : "ghost"}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setCurrentPage(totalPages)}
                        >
                          {totalPages}
                        </Button>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage >= totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              )}
            </TabsContent>
            
            <Tabs
