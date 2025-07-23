import { useState, useEffect, useRef } from 'react';
import { usersApi } from '@/lib/api';
import { debounce } from '@/lib/utils';
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
import UserManagement from '@/components/UserManagement';

interface User {
  _id?: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  shopName?: string;
  role: string;
  createdAt: string;
  superDistributorId?: string;
  distributorId?: string;
}

export default function Users() {
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [activeRoleFilter, setActiveRoleFilter] = useState<string>('super_distributor');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'super_distributor',
    shopName: '',
    paymentQr: '',
    superDistributorId: '',
    distributorId: ''
  });
  const [superDistributors, setSuperDistributors] = useState<User[]>([]);
  const [distributors, setDistributors] = useState<User[]>([]);
  const [filteredDistributors, setFilteredDistributors] = useState<User[]>([]);

  // Debounced fetchSuperDistributors
  const debouncedFetchSuperDistributors = useRef(
    debounce(async () => {
      try {
        const [resKebab, resSnake] = await Promise.all([
          usersApi.getUsersByRole('super-distributor'),
          usersApi.getUsersByRole('super_distributor'),
        ]);
        const all = [
          ...(resKebab.data.users || resKebab.data || []),
          ...(resSnake.data.users || resSnake.data || []),
        ];
        const unique = Array.from(
          new Map(all.map(u => [u.uid, u])).values()
        );
        setSuperDistributors(unique);
        console.log('Merged super distributors:', unique);
      } catch (e: any) {
        setSuperDistributors([]);
        const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Failed to fetch super distributors';
        toast.error(msg);
      }
    }, 400)
  ).current;

  useEffect(() => {
    if (activeRoleFilter === 'retailer' || newUser.role === 'retailer') {
      debouncedFetchSuperDistributors();
    }
  }, [activeRoleFilter, newUser.role]);

  // Fetch distributors for Distributor tab and for Retailer creation when a super distributor is selected
  // Debounced fetchDistributors
  const debouncedFetchDistributors = useRef(
    debounce(async () => {
      try {
        if (newUser.role === 'retailer' && newUser.superDistributorId) {
          const res = await usersApi.getDistributorsBySuperDistributor(newUser.superDistributorId);
          console.log('Fetched distributors for superDistributorId', newUser.superDistributorId, ':', res.data);
          setFilteredDistributors(res.data.users || res.data);
        } else if (activeRoleFilter === 'distributor' || newUser.role === 'distributor') {
          const res = await usersApi.getUsersByRole('distributor');
          setDistributors(res.data.users || res.data);
        } else {
          setFilteredDistributors([]);
        }
      } catch (e: any) {
        setFilteredDistributors([]);
        setDistributors([]);
        const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Failed to fetch distributors';
        toast.error(msg);
      }
    }, 400)
  ).current;

  useEffect(() => {
    debouncedFetchDistributors();
  }, [newUser.role, newUser.superDistributorId, activeRoleFilter]);

  // Reset dependent fields and dropdowns on tab/role change
  useEffect(() => {
    setNewUser(prev => ({
      ...prev,
      superDistributorId: '',
      distributorId: '',
      shopName: '',
      paymentQr: '',
    }));
    setFilteredDistributors([]);
  }, [activeRoleFilter, newUser.role]);

  useEffect(() => {
    console.log('Users.tsx: useEffect triggered, calling loadUsers()');
    loadUsers();
  }, []);

  useEffect(() => {
    console.log('DEBUG: All loaded users:', users);
    console.log('DEBUG: Active role filter:', activeRoleFilter);
    if (users && users.length > 0) {
      users.forEach(u => console.log('DEBUG: User:', u.name, '| Role:', u.role));
    }
    // Normalize roles for filtering (accept both dash and underscore)
    const normalizeRole = (role: string) => role.replace(/[-_]/g, '').toLowerCase();
    const normalizedFilter = normalizeRole(activeRoleFilter);
    setFilteredUsers(users.filter(user => normalizeRole(user.role) === normalizedFilter));
    // The console.log below will show the *previous* state of filteredUsers due to async state updates.
    // To see the updated filteredUsers, we'd need another useEffect or log it after a re-render.
    // For now, the logs above should help diagnose the filtering input.
  }, [users, activeRoleFilter]);

  useEffect(() => {
    console.log('Users.tsx: Filtered users state updated:', filteredUsers);
  }, [filteredUsers]);

  const loadUsers = async () => {
    try {
      let data;
      if (user?.role === 'super_admin') {
        data = (await usersApi.getAllUsers()).data;
      } else {
        data = (await usersApi.getHierarchy()).data;
      }
      setUsers(data.users);
      console.log('DEBUG: Users loaded successfully, raw data:', data.users);
      if (data.users && data.users.length > 0) {
        data.users.forEach(u => console.log('DEBUG: Loaded user:', u.name, '| Role:', u.role));
      }
    } catch (error: any) {
      const msg = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Failed to load users';
      toast.error(msg);
      console.error('Users.tsx: Failed to load users:', error);
    }
  };


  // Utility to remove undefined values from an object
  function removeUndefined(obj: Record<string, any>) {
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    // E.164 phone validation: + followed by 10-15 digits
    const phoneRegex = /^\+[1-9]\d{9,14}$/;
    if (!newUser.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!newUser.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!phoneRegex.test(newUser.phone)) {
      toast.error('Phone number must be in E.164 format, e.g., +919812345678');
      return;
    }
    if (!newUser.password.trim()) {
      toast.error('Password is required');
      return;
    }
    if (newUser.role === 'distributor' && !newUser.superDistributorId) {
      toast.error('Please select a Super Distributor for this Distributor');
      return;
    }
    if (newUser.role === 'retailer' && !newUser.superDistributorId) {
      toast.error('Please select a Super Distributor for this Retailer');
      return;
    }
    if (newUser.role === 'retailer' && !newUser.distributorId) {
      toast.error('Please select a Distributor for this Retailer');
      return;
    }
    setIsLoading(true);
    try {
      if (newUser.role === 'super_distributor') {
        await usersApi.createSuperDistributor({
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          password: newUser.password,
        });
      } else if (newUser.role === 'distributor') {
        // Find the selected super distributor object by uid
        const selectedSuperDistributor = users.find(u => u.uid === newUser.superDistributorId);
        const distributorPayload = removeUndefined({
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          password: newUser.password,
          superDistributorId: selectedSuperDistributor?.uid || newUser.superDistributorId,
          superAdmin: user?.uid // add if your backend expects this
        });
        await usersApi.createDistributor(distributorPayload);
      } else if (newUser.role === 'retailer') {
        // Super distributor creates retailer: set superDistributorId to own uid, distributorId from dropdown
        await usersApi.createRetailer({
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          password: newUser.password,
          shopName: newUser.shopName,
          paymentQr: newUser.paymentQr,
          superDistributorId: newUser.superDistributorId, 
          distributorId: newUser.distributorId,
        });
      } else {
        throw new Error('Invalid role specified');
      }
      toast.success('User created successfully');
      // Refresh user list and set filter to the created user's role
      await loadUsers();
      setActiveRoleFilter(newUser.role || 'super_distributor');
      // Reset form
      setNewUser({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'super_distributor',
        shopName: '',
        paymentQr: '',
        superDistributorId: '',
        distributorId: ''
      });
      console.log('Users.tsx: Called loadUsers() and set filter after user creation for role:', newUser.role);
    } catch (error: any) {
      console.error('Failed to create user:', error);
      // Show backend message if available, else fallback
      const msg = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Failed to create user';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // For testing - show UserManagement regardless of role
  console.log('Current user role:', user?.role);
  return <UserManagement />;
  
  // Original role check - temporarily commented for testing
  // if (user?.role !== 'super_admin') {
  //   return <UserManagement />;
  // }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">User Management</h1>
      
      <Tabs defaultValue="list" className="space-y-4">
        <div className="flex space-x-2 mb-4">
          <Button
            variant={activeRoleFilter === 'super_distributor' ? 'default' : 'outline'}
            onClick={() => setActiveRoleFilter('super_distributor')}
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
        <TabsList>
          <TabsTrigger value="list">User List</TabsTrigger>
          <TabsTrigger value="add-user">Add New User</TabsTrigger>
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
    <TableHead>Parent</TableHead>
    <TableHead>Email</TableHead>
    <TableHead>Phone</TableHead>
    <TableHead>Role</TableHead>
    <TableHead>Created At</TableHead>
  </TableRow>
</TableHeader>
<TableBody>
  {filteredUsers.map((user) => {
  let parentDisplay = '-';
  if (user.parentName && user.parentName.trim() !== '' && user.parentId && user.parentId.trim() !== '') {
    parentDisplay = `${user.parentName} (${user.parentId})`;
  } else if (user.parentName && user.parentName.trim() !== '') {
    parentDisplay = user.parentName;
  } else if (user.parentId && user.parentId.trim() !== '') {
    parentDisplay = user.parentId;
  } else if ((!user.parentName || user.parentName.trim() === '') && user.role === 'super_distributor') {
    parentDisplay = 'Admin';
  }
  return (
    <TableRow
      key={user._id || user.uid}
      onClick={() => setSelectedUserUid(user._id || user.uid)}
      className={selectedUserUid === (user._id || user.uid) ? 'bg-blue-100 cursor-pointer' : 'cursor-pointer'}
    >
      <TableCell>{user.name}</TableCell>
      <TableCell>{parentDisplay}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>{user.phone}</TableCell>
      <TableCell>{user.role}</TableCell>
      <TableCell>{new Date(user.createdAt).toLocaleString()}</TableCell>
    </TableRow>
  );
})}
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
      {/* User type selection tabs */}
      <Tabs defaultValue={newUser.role} className="mb-4">
        <TabsList>
          <TabsTrigger value="super_distributor" onClick={() => setNewUser({ ...newUser, role: 'super_distributor', superDistributorId: '', distributorId: '', shopName: '', paymentQr: '' })}>Super Distributor</TabsTrigger>
          <TabsTrigger value="distributor" onClick={() => setNewUser({ ...newUser, role: 'distributor', superDistributorId: '', distributorId: '', shopName: '', paymentQr: '' })}>Distributor</TabsTrigger>
          <TabsTrigger value="retailer" onClick={() => setNewUser({ ...newUser, role: 'retailer', superDistributorId: '', distributorId: '', shopName: '', paymentQr: '' })}>Retailer</TabsTrigger>
        </TabsList>
      </Tabs>
      <form onSubmit={handleAddUser} className="space-y-4">
        {/* Common fields */}
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
  <div className="relative">
    <Input
      id="password"
      type={showPassword ? 'text' : 'password'}
      value={newUser.password}
      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
      required
    />
    <button
      type="button"
      onClick={() => setShowPassword((prev) => !prev)}
      className="absolute inset-y-0 right-0 px-3 flex items-center text-sm text-gray-500 focus:outline-none"
      tabIndex={-1}
    >
      {showPassword ? 'Hide' : 'Show'}
    </button>
  </div>
</div>
        {/* Super Distributor: No extra fields */}
        {/* Distributor: Select Super Distributor */}
        {newUser.role === 'distributor' && (
          <div className="space-y-2">
            <Label htmlFor="superDistributorId">Super Distributor</Label>
            <select
              id="superDistributorId"
              value={newUser.superDistributorId}
              onChange={e => setNewUser({ ...newUser, superDistributorId: e.target.value })}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select Super Distributor</option>
              {(() => {
                const superDistOptions = users.filter(u => u.role === 'super_distributor' || u.role === 'super-distributor');
                console.log('DEBUG: Super Distributors for dropdown:', superDistOptions);
                if (superDistOptions.length === 0) {
                  return <option value="">No Super Distributors Available</option>;
                }
                return superDistOptions.map(sd => (
                  <option key={sd.uid} value={sd.uid}>{sd.name} ({sd.email})</option>
                ));
              })()}

            </select>
          </div>
        )}
        {/* Retailer: Select Super Distributor and Distributor */}
        {newUser.role === 'retailer' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="superDistributorId">Super Distributor</Label>
              <select
                id="superDistributorId"
                value={newUser.superDistributorId}
                onChange={e => setNewUser({ ...newUser, superDistributorId: e.target.value, distributorId: '' })}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select Super Distributor</option>
                {superDistributors.length === 0 ? (
                  <option value="">No Super Distributors Available</option>
                ) : (
                  superDistributors.map(sd => (
                    <option key={sd.uid} value={sd.uid}>{sd.name} ({sd.email})</option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="distributorId">Distributor</Label>
              <select
                id="distributorId"
                value={newUser.distributorId}
                onChange={e => setNewUser({ ...newUser, distributorId: e.target.value })}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={!newUser.superDistributorId}
              >
                <option value="">{newUser.superDistributorId ? 'Select Distributor' : 'Select Super Distributor first'}</option>
                {console.log('filteredDistributors for dropdown:', filteredDistributors)}
                {filteredDistributors.map(d => (
                  <option key={d.uid} value={d.uid}>{d.name} ({d.email})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shopName">Shop Name</Label>
              <Input
                id="shopName"
                type="text"
                value={newUser.shopName}
                onChange={(e) => setNewUser({ ...newUser, shopName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentQr">Payment QR</Label>
              <Input
                id="paymentQr"
                type="text"
                value={newUser.paymentQr}
                onChange={(e) => setNewUser({ ...newUser, paymentQr: e.target.value })}
              />
            </div>
          </>
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
