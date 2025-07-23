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

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchKeys = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_URL}/api/keys`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setKeys(data);
      } else {
        console.error('Failed to fetch keys');
        toast.error('Failed to fetch keys.');
      }
    } catch (error) {
      console.error('Error fetching keys:', error);
      toast.error('An error occurred while fetching keys.');
    }
  }, [user, API_URL]);

  const fetchRecipients = useCallback(async () => {
    if (!user) return;
    let url = `${API_URL}/api/users/recipients`;

    if (user?.role === 'superadmin') {
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
      const response = await fetch(`${API_URL}/keys/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ numberOfKeys, owner: user._id }),
      });

      if (response.ok) {
        const newKeys = await response.json();
        setKeys((prevKeys) => [...prevKeys, ...newKeys]);
        toast.success(`${numberOfKeys} key(s) created successfully!`);
        fetchKeys(); // Refresh the key list
      } else {
        const errorData = await response.json();
        console.error('Failed to create keys:', errorData.message);
        toast.error(`Failed to create keys: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error creating keys:', error);
      toast.error('An error occurred while creating keys.');
    }
  };

  const handleTransfer = async () => {
    if (!selectedRecipient) {
      toast.warning('Please select a recipient.');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/keys/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          recipientId: selectedRecipient._id,
          numberOfKeys,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(result.message);
        fetchKeys();
        setSelectedRecipient(null);
        setNumberOfKeys(1);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Failed to transfer keys:', error);
      toast.error('An error occurred during key transfer.');
    }
  };

  const handleRevokeClick = (key: Key) => {
    setKeyToRevoke(key);
    setRevokeModalOpen(true);
  };

  const confirmRevoke = async () => {
    if (!keyToRevoke) return;

    try {
      const response = await fetch(`${API_URL}/keys/revoke/${keyToRevoke._id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        toast.success('Key revoked successfully!');
        setKeyToRevoke(null);
        setRevokeModalOpen(false);
        fetchKeys(); // Refresh keys
      } else {
        const errorData = await response.json();
        toast.error(`Failed to revoke key: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error revoking key:', error);
      toast.error('An error occurred while revoking the key.');
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
                    {(user?.role === 'superadmin' || user?.role === 'distributor') && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key) => (
                    <TableRow key={key._id}>
                      <TableCell>{key.keyCode}</TableCell>
                      <TableCell>{key.status}</TableCell>
                      <TableCell>{key.isUsed ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{new Date(key.createdAt).toLocaleDateString()}</TableCell>
                      {(user?.role === 'superadmin' || user?.role === 'distributor') && (
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
        {(user?.role === 'superadmin' || user?.role === 'distributor') && (
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
                  <Button onClick={handleCreateKeys}>Create Keys</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Transfer Keys Tab */}
        {(user?.role === 'superadmin' || user?.role === 'distributor') && (
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
                          {selectedRecipient ? selectedRecipient.username : 'Select a recipient...'}
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
                                  {recipient.username}
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