import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { keysApi } from '@/lib/api';

// Define types for our data
interface Key {
  _id: string;
  keyCode: string;
  status: 'active' | 'inactive' | 'revoked';
  isUsed: boolean;
  createdAt: string;
  user: string;
}

interface User {
  _id: string;
  username: string;
  role: string;
}

const Keys: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    console.log('User role in Keys.tsx:', user?.role);
  }, [user]);

  const [keys, setKeys] = useState<Key[]>([]);
  const [recipients, setRecipients] = useState<User[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null);
  const [numberOfKeys, setNumberOfKeys] = useState(1);
  const [keyToRevoke, setKeyToRevoke] = useState<Key | null>(null);
  const [isRevokeModalOpen, setRevokeModalOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [validityInMonths, setValidityInMonths] = useState(12);
  const [revokeUser, setRevokeUser] = useState<User | null>(null);
  const [revokeCount, setRevokeCount] = useState(1);
  const [revokeReason, setRevokeReason] = useState('');

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchKeys = useCallback(async () => {
    if (!user) return;
    try {
      const response = await keysApi.getAll();
      const data = Array.isArray(response.data) ? response.data : [];
      setKeys(data);
    } catch (error) {
      console.error('Failed to fetch keys:', error);
      toast.error('Failed to fetch keys.');
      setKeys([]);
    }
  }, [user]);

  const fetchRecipients = useCallback(async () => {
    if (!user) return;
    let url = `${API_URL}/api/users/recipients`;

    if (user?.role === 'super_admin') {
      url = `${API_URL}/api/users/all`;
    }

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecipients(data);
      } else {
        console.error('Failed to fetch recipients');
        toast.error('Failed to load users for key transfer.');
      }
    } catch (error) {
      console.error('Error fetching recipients:', error);
      toast.error('An error occurred while fetching users.');
    }
  }, [user, API_URL]);

  useEffect(() => {
    console.log('Keys.tsx: Current user role:', user?.role);
    fetchKeys();
    fetchRecipients();
  }, [user]); // Add user to dependency array to re-run when user changes

  const handleCreateKeys = async () => {
    if (!user) return;

    try {
      await keysApi.create(numberOfKeys, validityInMonths);
      toast.success(`${numberOfKeys} key(s) created successfully!`);
      fetchKeys(); // Refresh the key list
    } catch (error: any) {
      toast.error(error.message || 'Failed to create keys');
    }
  };

  const handleTransfer = async () => {
    if (!selectedRecipient) {
      toast.warning('Please select a recipient.');
      return;
    }

    try {
      await keysApi.transfer(selectedRecipient._id, numberOfKeys);
      toast.success('Keys transferred successfully!');
      fetchKeys();
      setSelectedRecipient(null);
      setNumberOfKeys(1);
    } catch (error: any) {
      toast.error(error.message || 'Failed to transfer keys');
    }
  };

  const handleRevokeClick = (key: Key) => {
    setKeyToRevoke(key);
    setRevokeModalOpen(true);
  };

  const confirmRevoke = async () => {
    if (!keyToRevoke) return;

    try {
      await keysApi.revoke(keyToRevoke._id, 1, 'Revoked from UI');
      toast.success('Key revoked successfully!');
      setKeyToRevoke(null);
      setRevokeModalOpen(false);
      fetchKeys(); // Refresh keys
    } catch (error: any) {
      toast.error(error.message || 'Failed to revoke key');
    }
  };

  return (
    <div className="container mx-auto py-10">
      {console.log('Rendering Keys component. User role:', user?.role)}
      <Tabs defaultValue="my-keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-keys">My Keys</TabsTrigger>
          {(user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'distributor') && (
            <TabsTrigger value="create-keys">Create Keys</TabsTrigger>
          )}
          {(user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'distributor') && (
            <TabsTrigger value="transfer-keys">Transfer Keys</TabsTrigger>
          )}
          {(user?.role === 'super_admin') && (
            <TabsTrigger value="revoke-keys">Revoke Keys</TabsTrigger>
          )}
        </TabsList>

        {/* My Keys Tab */}
        <TabsContent value="my-keys">
          <Card>
            <CardHeader>
              <CardTitle>My Keys</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Is Used</TableHead>
                    <TableHead>Created At</TableHead>
                    {(user?.role === 'super_admin' || user?.role === 'distributor') && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(keys) && keys.map((key) => (
                    <TableRow key={key._id}>
                      <TableCell>{key.keyCode}</TableCell>
                      <TableCell>{key.status}</TableCell>
                      <TableCell>{key.isUsed ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{new Date(key.createdAt).toLocaleDateString()}</TableCell>
                      {(user?.role === 'super_admin' || user?.role === 'distributor') && (
                        <TableCell className="text-right">
                          {key.status !== 'revoked' && (
                            <Button variant="destructive" size="sm" onClick={() => handleRevokeClick(key)}>
                              Revoke
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Keys Tab */}
        {(user?.role === 'super_admin' || user?.role === 'distributor') && (
          <TabsContent value="create-keys">
            <Card>
              <CardHeader>
                <CardTitle>Create New Keys</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-w-sm">
                  <div>
                    <Label htmlFor="numberOfKeysCreate">Number of Keys to Create</Label>
                    <Input
                      id="numberOfKeysCreate"
                      type="number"
                      value={numberOfKeys}
                      onChange={(e) => setNumberOfKeys(parseInt(e.target.value, 10))}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="validityInMonths">Validity (months)</Label>
                    <Input
                      id="validityInMonths"
                      type="number"
                      value={validityInMonths}
                      onChange={(e) => setValidityInMonths(parseInt(e.target.value, 10))}
                      min="1"
                    />
                  </div>
                  <Button onClick={handleCreateKeys}>Create Keys</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Transfer Keys Tab */}
        {(user?.role === 'super_admin' || user?.role === 'distributor') && (
          <TabsContent value="transfer-keys">
            <Card>
              <CardHeader>
                <CardTitle>Transfer Keys</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-w-sm">
                  <div>
                    <Label>Recipient</Label>
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={popoverOpen}
                          className="w-full justify-between"
                        >
                          {selectedRecipient ? `${selectedRecipient.username} (${selectedRecipient.role})` : 'Select a recipient...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search recipient..." />
                          <CommandList>
                            <CommandEmpty>No recipients found.</CommandEmpty>
                            <CommandGroup>
                              {recipients.map((recipient) => (
                                <CommandItem
                                  key={recipient._id}
                                  value={recipient.username}
                                  onSelect={() => {
                                    setSelectedRecipient(recipient);
                                    setPopoverOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      selectedRecipient?._id === recipient._id ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  {recipient.username} ({recipient.role})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="numberOfKeysTransfer">Number of Keys to Transfer</Label>
                    <Input
                      id="numberOfKeysTransfer"
                      type="number"
                      value={numberOfKeys}
                      onChange={(e) => setNumberOfKeys(parseInt(e.target.value, 10))}
                      min="1"
                    />
                  </div>
                  <Button onClick={handleTransfer}>Transfer Keys</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Revoke Keys Tab */}
        {(user?.role === 'super_admin') && (
          <TabsContent value="revoke-keys">
            <Card>
              <CardHeader>
                <CardTitle>Revoke Keys</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-w-sm">
                  <div>
                    <Label>Select User</Label>
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={popoverOpen}
                          className="w-full justify-between"
                        >
                          {revokeUser ? `${revokeUser.username} (${revokeUser.role})` : 'Select a user...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search user..." />
                          <CommandList>
                            <CommandEmpty>No users found.</CommandEmpty>
                            <CommandGroup>
                              {recipients.map((recipient) => (
                                <CommandItem
                                  key={recipient._id}
                                  value={recipient.username}
                                  onSelect={() => {
                                    setRevokeUser(recipient);
                                    setPopoverOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      revokeUser?._id === recipient._id ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  {recipient.username} ({recipient.role})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="revokeCount">Number of Keys to Revoke</Label>
                    <Input
                      id="revokeCount"
                      type="number"
                      value={revokeCount}
                      onChange={(e) => setRevokeCount(parseInt(e.target.value, 10))}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="revokeReason">Reason for Revocation</Label>
                    <Input
                      id="revokeReason"
                      type="text"
                      value={revokeReason}
                      onChange={(e) => setRevokeReason(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (!revokeUser) {
                        toast.error('Please select a user');
                        return;
                      }
                      try {
                        await keysApi.revoke(revokeUser._id, revokeCount, revokeReason);
                        toast.success('Keys revoked successfully!');
                        setRevokeUser(null);
                        setRevokeCount(1);
                        setRevokeReason('');
                        fetchKeys();
                      } catch (error: any) {
                        toast.error(error.message || 'An error occurred while revoking keys.');
                      }
                    }}
                  >
                    Revoke Keys
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Revoke Key Confirmation Modal */}
      <Dialog open={isRevokeModalOpen} onOpenChange={setRevokeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently revoke the key{' '}
              <strong>{keyToRevoke?.keyCode}</strong> and it will no longer be usable.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmRevoke}>Confirm Revoke</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
export default Keys;