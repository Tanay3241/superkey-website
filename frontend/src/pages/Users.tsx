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
                        {user.name}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleString()}</TableCell>
                      {activeRoleFilter === 'super-distributor' && (
                        <TableCell>
                          {user.receiptId === 'Click name to reveal' ? 'N/A' : user.receiptId}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add-user">
          <Card>
            <CardHeader>
              <CardTitle>Add New User</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="text"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Select Role</option>
                    {user?.role === 'super_admin' && (
                      <option value="super-distributor">Super Distributor</option>
                    )}
                    {(user?.role === 'super_admin' || user?.role === 'super_distributor') && (
                      <option value="distributor">Distributor</option>
                    )}
                    {(user?.role === 'super_admin' || user?.role === 'super_distributor' || user?.role === 'distributor') && (
                      <option value="retailer">Retailer</option>
                    )}
                  </select>
                </div>
                {newUser.role === 'retailer' && (
                  <div className="space-y-2">
                    <Label htmlFor="shopName">Shop Name</Label>
                    <Input
                      id="shopName"
                      type="text"
                      value={newUser.shopName}
                      onChange={(e) => setNewUser({ ...newUser, shopName: e.target.value })}
                    />
                  </div>
                )}
                {newUser.role === 'retailer' && (
                  <div className="space-y-2">
                    <Label htmlFor="paymentQr">Payment QR</Label>
                    <Input
                      id="paymentQr"
                      type="text"
                      value={newUser.paymentQr}
                      onChange={(e) => setNewUser({ ...newUser, paymentQr: e.target.value })}
                    />
                  </div>
                )}
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Adding...' : 'Add User'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
