import { useState, useEffect } from 'react';
import { keysApi, usersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Ban, CheckCircle2, Loader2 } from 'lucide-react';
import { RevokeKeyModal } from '@/components/RevokeKeyModal';
import { cn } from '@/lib/utils';

interface User {
  _id: string;
  name: string;
  receiptId?: string; // Add optional receiptId
}

export default function Keys() {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [count, setCount] = useState(1);
  const [validity, setValidity] = useState(12);
  const [transferUserId, setTransferUserId] = useState('');
  const [transferCount, setTransferCount] = useState(1);
  const [superDistributors, setSuperDistributors] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [selectedRecipientReceiptId, setSelectedRecipientReceiptId] = useState<string | undefined>(undefined);
  const [availableKeys, setAvailableKeys] = useState<number | null>(null);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [selectedUserKeysCount, setSelectedUserKeysCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchSuperDistributors = async () => {
      try {
        const response = await usersApi.getUsersByRole('super-distributor');
        console.log('API response for super distributors:', response.data.users);
        setSuperDistributors(response.data.users);
        console.log('Super distributors after setting state:', response.data.users);
      } catch (error) {
        toast.error('Failed to fetch super distributors');
        console.error('Fetch super distributors error:', error);
      }
    };

    const fetchAvailableKeys = async () => {
      try {
        const response = await keysApi.getMyKeys();
        setAvailableKeys(response.data.keys.length);
      } catch (error) {
        toast.error('Failed to fetch available keys');
        console.error('Fetch available keys error:', error);
      }
    };

    console.log('Current user role:', user?.role);
    if (user?.role === 'super_admin') {
      fetchSuperDistributors();
    }
    fetchAvailableKeys();
    console.log('Super distributors state:', superDistributors);
  }, [user]);

  const handleCreateKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await keysApi.create(count, validity);
      toast.success(`Successfully created ${count} keys`);
      setCount(1);
      setValidity(12);
    } catch (error) {
      toast.error('Failed to create keys');
      console.error('Key creation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserKeysCount = async (userId: string) => {
    try {
      const response = await keysApi.getUserKeys(userId);
      setSelectedUserKeysCount(response.data.keys.length);
    } catch (error) {
      toast.error('Failed to fetch user keys count');
      console.error('Fetch user keys count error:', error);
      setSelectedUserKeysCount(null);
    }
  };

  const handleRevokeKeys = async (userId: string, count: number, reason: string) => {
    try {
    await keysApi.revoke(userId, count, reason);
    toast.success(`Successfully revoked ${count} keys from user ${userId}`);
    // Refresh user data to update wallet stats
    refreshUser();
    setIsRevokeModalOpen(false); // Close modal after successful revocation
    } catch (error) {
      toast.error('Failed to revoke keys');
      console.error('Key revocation error:', error);
    }
  };

  const handleTransferKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    if (availableKeys !== null && transferCount > availableKeys) {
      toast.error(`You only have ${availableKeys} keys left. You can transfer a maximum of ${availableKeys} keys.`);
      return;
    }
    setIsLoading(true);
    try {
      await keysApi.transfer(transferUserId, transferCount);
      const recipient = superDistributors.find(sd => sd._id === transferUserId);
      toast.success(`Successfully transferred ${transferCount} keys to ${recipient?.name || 'unknown user'}`);
      setTransferUserId('');
      setTransferCount(1);
      // Optionally display receiptId after successful transfer
      if (recipient?.receiptId) {
        toast.info(`Recipient Receipt ID: ${recipient.receiptId}`);
      }
    } catch (error) {
      toast.error('Failed to transfer keys');
      console.error('Key transfer error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Key Management</h1>
      
      <Tabs defaultValue="create" className="space-y-4">
        <TabsList>
          {user?.role === 'super_admin' && (
            <TabsTrigger value="create">Create Keys</TabsTrigger>
          )}
          <TabsTrigger value="transfer">Transfer Keys</TabsTrigger>
          {user?.role === 'super_admin' && (
            <TabsTrigger value="revoke" onClick={() => {
              setIsRevokeModalOpen(true);
              // Optionally fetch keys for the currently selected user in the revoke modal if applicable
              // For now, we'll assume the modal handles its own user selection and key count display
            }}>Revoke Keys</TabsTrigger>
          )}
        </TabsList>

        {user?.role === 'super_admin' && (
          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle>Create New Keys</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateKeys} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="count">Number of Keys</Label>
                    <Input
                      id="count"
                      type="number"
                      min="1"
                      max="100"
                      value={count}
                      onChange={(e) => setCount(parseInt(e.target.value))}
                      required
                    />
                  </div>
                {selectedRecipientReceiptId && (
                  <p className="text-sm text-gray-500 mt-2">Receipt ID: {selectedRecipientReceiptId}</p>
                )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="validity">Validity (months)</Label>
                    <Input
                      id="validity"
                      type="number"
                      min="1"
                      value={validity}
                      onChange={(e) => setValidity(parseInt(e.target.value))}
                      required
                    />
                  </div>

                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Keys'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Keys</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTransferKeys} className="space-y-4">
                {availableKeys !== null && (
                  <p className="text-sm text-gray-500">Available Keys: {availableKeys}</p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="userId">Recipient User</Label>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                      >
                        {value
                          ? superDistributors.find((sd) => sd._id === value)?.name + ' (' + superDistributors.find((sd) => sd._id === value)?._id + ')'
                          : "Select super distributor..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Search super distributor..." />
                        <CommandEmpty>No super distributor found.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {superDistributors.map((sd) => (
                              <CommandItem
                                key={sd._id}
                                value={sd.name}
                                onSelect={() => {
                                  setValue(sd._id);
                                  setTransferUserId(sd._id);
                                  setOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    sd._id === value ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                {sd.name} ({sd._id})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transferCount">Number of Keys to Transfer</Label>
                  <Input
                    id="transferCount"
                    type="number"
                    min="1"
                    value={transferCount}
                    onChange={(e) => setTransferCount(parseInt(e.target.value))}
                    required
                  />
                </div>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Transferring...' : 'Transfer Keys'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {user?.role === 'super_admin' && (
          <TabsContent value="revoke">
            <Card>
              <CardHeader>
                <CardTitle>Revoke Keys</CardTitle>
              </CardHeader>
              <CardContent>
                <RevokeKeyModal
        isOpen={isRevokeModalOpen}
        onClose={() => setIsRevokeModalOpen(false)}
        onRevoke={handleRevokeKeys}
        onUserSelect={fetchUserKeysCount} // Pass the function to fetch user keys
        selectedUserKeysCount={selectedUserKeysCount} // Pass the selected user's key count
      />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
