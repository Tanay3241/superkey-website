import { useState, useEffect } from 'react';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface User {
  uid: string;
  name: string;
  email: string;
  phone: string;
  shopName?: string;
  role: string;
  createdAt: string;
  receiptId?: string; // Added for future receipt ID functionality
}

export default function Users() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [activeRoleFilter, setActiveRoleFilter] = useState<string>('super-distributor');
  const [showReceiptId, setShowReceiptId] = useState<string | null>(null); // State to hold the UID of the user whose receipt ID is shown
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: '',
    shopName: '', // Added for retailer
    paymentQr: '' // Added for retailer
  });



  useEffect(() => {
    console.log('Users.tsx: useEffect triggered, calling loadUsers()');
    loadUsers();
  }, []);

  useEffect(() => {
    console.log('Users.tsx: Filtering users. Current users array:', users);
    console.log('Users.tsx: Filtering users. Current activeRoleFilter:', activeRoleFilter);
    if (activeRoleFilter === 'super-distributor') {
      setFilteredUsers(users.filter(user => user.role === 'super-distributor' || user.role === 'super_distributor' || user.role === 'Super Distributor'));
    } else if (activeRoleFilter === 'distributor') {
      setFilteredUsers(users.filter(user => user.role === 'distributor'));
    } else if (activeRoleFilter === 'retailer') {
      setFilteredUsers(users.filter(user => user.role === 'retailer'));
    }
    // The console.log below will show the *previous* state of filteredUsers due to async state updates.
    // To see the updated filteredUsers, we'd need another useEffect or log it after a re-render.
    // For now, the logs above should help diagnose the filtering input.
  }, [users, activeRoleFilter]);

  useEffect(() => {
    console.log('Users.tsx: Filtered users state updated:', filteredUsers);
  }, [filteredUsers]);

  const loadUsers = async () => {
    try {
      const { data } = await usersApi.getHierarchy();
      setUsers(data.users);
      console.log('Users.tsx: Users loaded successfully, raw data:', data.users);
    } catch (error) {
      console.error('Users.tsx: Failed to load users:', error);
      toast.error('Failed to load users');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (newUser.role === 'super-distributor') {
        await usersApi.createSuperDistributor({
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          password: newUser.password,
        });
      } else if (newUser.role === 'distributor') {
        await usersApi.createDistributor({
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          password: newUser.password,
          // superDistributorId: user?.uid || '', // TODO: This needs to be dynamically selected or handled based on the hierarchy
        });
      } else if (newUser.role === 'retailer') {
        await usersApi.createRetailer({
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          password: newUser.password,
          shopName: newUser.shopName || '', // Assuming shopName is part of retailer creation
          paymentQr: newUser.paymentQr || '', // Assuming paymentQr is part of retailer creation
          // superDistributorId: user?.uid || '', // TODO: This needs to be dynamically selected or handled based on the hierarchy
          // distributorId: user?.uid || '', // TODO: This needs to be dynamically selected or handled based on the hierarchy
        });
      } else {
        throw new Error('Invalid role specified');
      }
      toast.success('User created successfully');
      setNewUser({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: '',
        shopName: '',
        paymentQr: ''
      });
      console.log('Users.tsx: Calling loadUsers() after successful user creation for role:', newUser.role);
      await loadUsers();
      setActiveRoleFilter(newUser.role); // Set active filter to the role of the newly created user
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error('Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };



  const handleToggleReceiptId = (uid: string) => {
    setShowReceiptId(showReceiptId === uid ? null : uid);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">User Management</h1>
      
      <Tabs defaultValue="list" className="space-y-4">
        {user?.role === 'super_admin' && (
          <div className="flex space-x-2 mb-4">
            <Button
              variant={activeRoleFilter === 'super-distributor' ? 'default' : 'outline'}
              onClick={() => setActiveRoleFilter('super-distributor')}
            >
              Super Distributors
            </Button>
            <Button
              variant={activeRoleFilter === 'distributor' ? 'default' : 'outline'}
              onClick={() => setActiveRoleFilter('distributor')}
            >
              Distributors
            </Button>
            <Button
              variant={activeRoleFilter === 'retailer' ? 'default' : 'outline'}
              onClick={() => setActiveRoleFilter('retailer')}
            >
              Retailers
            </Button>
          </div>
        )}
        <TabsList>
          <TabsTrigger value="list">User List</TabsTrigger>
          {user?.role === 'super_admin' && (
            <TabsTrigger value="add-user">Add New User</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>User List</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created At</TableHead>
                    {activeRoleFilter === 'super-distributor' && <TableHead>Receipt ID</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell>
                        {user.role === 'super-distributor' ? (
                          <span
                            className="cursor-pointer text-blue-600 hover:underline"
                            onClick={() => handleToggleReceiptId(user.uid)}
                          >
                            {user.name}
                          </span>
                        ) : (
                          user.name
                        )}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>
                        {user.createdAt ? new Date(user.createdAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </TableCell>
                      {activeRoleFilter === 'super-distributor' && (
                        <TableCell>
                          {showReceiptId === user.uid ? (
                            <span className="font-mono text-sm text-gray-700">{user.receiptId || 'REC-' + user.uid.substring(0, 8).toUpperCase()}</span>
                          ) : (
                            <span className="text-gray-400">Click name to reveal</span>
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

        {user?.role === 'super_admin' && (
          <TabsContent value="add-user">
            <Card>
              <CardHeader>
                <CardTitle>Add New User</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddUser}>
                  <div className="grid w-full items-center gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" placeholder="Name of the user" value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" placeholder="Email of the user" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" placeholder="Phone number" value={newUser.phone} onChange={(e) => setNewUser({...newUser, phone: e.target.value})} />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <Label htmlFor="role">Role</Label>
                      <Input id="role" placeholder="Role (e.g., super_distributor, distributor, retailer)" value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} />
                    </div>
                    <Button type="submit" disabled={isLoading}>
                       {isLoading ? 'Adding...' : 'Add User'}
                     </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

      </Tabs>
    </div>
  );
}
