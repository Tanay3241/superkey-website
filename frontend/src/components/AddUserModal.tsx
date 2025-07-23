
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddUserModalProps {
  onUserAdded: (newUser: any) => void;
  currentUserRole?: string;
}

export const AddUserModal = ({ onUserAdded, currentUserRole }: AddUserModalProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    shopName: '',
    role: '',
    superDistributorId: '',
    distributorId: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [superDistributors, setSuperDistributors] = useState<any[]>([]);
  const [distributors, setDistributors] = useState<any[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Set default role based on currentUserRole
  useEffect(() => {
    if (currentUserRole && !formData.role) {
      const roleOptions = getRoleOptions();
      if (roleOptions.length === 1) {
        handleInputChange('role', roleOptions[0].value);
      }
    }
  }, [currentUserRole, formData.role]);

  // Fetch super distributors when needed
  useEffect(() => {
    if (currentUserRole === 'super_admin' && (formData.role === 'distributor' || formData.role === 'retailer')) {
      const fetchSuperDistributors = async () => {
        try {
          const response = await usersApi.getUsersByRole('super_distributor');
          setSuperDistributors(response.data.users || []);
        } catch (error) {
          console.error('Error fetching super distributors:', error);
          toast.error('Failed to fetch super distributors');
        }
      };
      fetchSuperDistributors();
    }
  }, [currentUserRole, formData.role]);

  // Fetch distributors when a super distributor is selected
  useEffect(() => {
    if (formData.role === 'retailer' && formData.superDistributorId) {
      const fetchDistributors = async () => {
        try {
          const response = await usersApi.getDistributorsBySuperDistributor(formData.superDistributorId);
          setDistributors(response.data.users || []);
        } catch (error) {
          console.error('Error fetching distributors:', error);
          toast.error('Failed to fetch distributors');
          setDistributors([]);
        }
      };
      fetchDistributors();
    } else {
      setDistributors([]);
    }
  }, [formData.role, formData.superDistributorId]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    // Basic field validation
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.phone.trim()) errors.phone = 'Phone is required';
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Phone validation (E.164 format)
    const phoneRegex = /^\+[1-9]\d{9,14}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      errors.phone = 'Phone must be in E.164 format (e.g., +919812345678)';
    }
    
    // Password validation
    if (!formData.password) errors.password = 'Password is required';
    if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    // Role-specific validation
    if (formData.role === 'retailer') {
      if (!formData.shopName.trim()) {
        errors.shopName = 'Shop name is required for retailers';
      }
      if (formData.shopName && formData.shopName.length < 3) {
        errors.shopName = 'Shop name must be at least 3 characters';
      }
      
      if (currentUserRole === 'super_admin') {
        if (!formData.superDistributorId) {
          errors.superDistributorId = 'Please select a Super Distributor';
        }
        if (!formData.distributorId) {
          errors.distributorId = 'Please select a Distributor';
        }
      }
    }
    
    if (formData.role === 'distributor' && currentUserRole === 'super_admin' && !formData.superDistributorId) {
      errors.superDistributorId = 'Please select a Super Distributor';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Reset dependent fields
      if (field === 'role') {
        newData.superDistributorId = '';
        newData.distributorId = '';
        newData.shopName = '';
      } else if (field === 'superDistributorId') {
        newData.distributorId = '';
      }
      
      // Clear the error for this field when it's changed
      setFormErrors(prev => ({ ...prev, [field]: '' }));
      return newData;
    });
  };

  const getRoleOptions = () => {
    switch (currentUserRole) {
      case 'super_admin':
        return [
          { value: 'super_distributor', label: 'Super Distributor' },
          { value: 'distributor', label: 'Distributor' },
          { value: 'retailer', label: 'Retailer' }
        ];
      case 'super_distributor':
        return [{ value: 'distributor', label: 'Distributor' }];
      case 'distributor':
        return [{ value: 'retailer', label: 'Retailer' }];
      default:
        return [];
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly');
      return;
    }

    setIsLoading(true);

    try {
      let response;
      const userData = {
        email: formData.email,
        name: formData.name,
        phone: formData.phone,
        password: formData.password
      };

      switch (formData.role || getRoleOptions()[0]?.value) {
        case 'retailer':
          response = await usersApi.createRetailer({
            ...userData,
            shopName: formData.shopName,
            paymentQr: 'default-qr.png',
            superDistributorId: currentUserRole === 'super_admin' ? formData.superDistributorId : user?.hierarchy?.superDistributor || '',
            distributorId: currentUserRole === 'super_admin' ? formData.distributorId : user?.uid || ''
          });
          break;
        
        case 'distributor':
          response = await usersApi.createDistributor({
            ...userData,
            superDistributorId: currentUserRole === 'super_admin' ? formData.superDistributorId : user?.uid
          });
          break;
        
        case 'super_distributor':
          response = await usersApi.createSuperDistributor(userData);
          break;
        
        default:
          toast.error('Invalid role selection');
          return;
      }

      if (response?.data?.success) {
        toast.success('User added successfully!');
        onUserAdded(response.data.user);
        setOpen(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          password: '',
          shopName: '',
          role: '',
          superDistributorId: '',
          distributorId: ''
        });
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to create user';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add New User</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account. Fill in all required fields.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Role Selection */}
          {currentUserRole === 'super_admin' && (
            <div>
              <Label>Role</Label>
              <select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className={cn(
                  "w-full p-2 border rounded",
                  formErrors.role ? "border-red-500" : "border-gray-300"
                )}
                required
              >
                <option value="">Select Role</option>
                {getRoleOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {formErrors.role && (
                <p className="text-sm text-red-500 mt-1">{formErrors.role}</p>
              )}
            </div>
          )}

          {/* Super Distributor Selection */}
          {currentUserRole === 'super_admin' && (formData.role === 'distributor' || formData.role === 'retailer') && (
            <div>
              <Label>Super Distributor</Label>
              <select
                value={formData.superDistributorId}
                onChange={(e) => handleInputChange('superDistributorId', e.target.value)}
                className={cn(
                  "w-full p-2 border rounded",
                  formErrors.superDistributorId ? "border-red-500" : "border-gray-300"
                )}
                required
              >
                <option value="">Select Super Distributor</option>
                {superDistributors.map(sd => (
                  <option key={sd.uid} value={sd.uid}>
                    {sd.name} ({sd.email})
                  </option>
                ))}
              </select>
              {formErrors.superDistributorId && (
                <p className="text-sm text-red-500 mt-1">{formErrors.superDistributorId}</p>
              )}
            </div>
          )}

          {/* Distributor Selection */}
          {formData.role === 'retailer' && formData.superDistributorId && currentUserRole === 'super_admin' && (
            <div>
              <Label>Distributor</Label>
              <select
                value={formData.distributorId}
                onChange={(e) => handleInputChange('distributorId', e.target.value)}
                className={cn(
                  "w-full p-2 border rounded",
                  formErrors.distributorId ? "border-red-500" : "border-gray-300"
                )}
                required
                disabled={!formData.superDistributorId}
              >
                <option value="">{formData.superDistributorId ? 'Select Distributor' : 'Select Super Distributor first'}</option>
                {distributors.map(d => (
                  <option key={d.uid} value={d.uid}>
                    {d.name} ({d.email})
                  </option>
                ))}
              </select>
              {formErrors.distributorId && (
                <p className="text-sm text-red-500 mt-1">{formErrors.distributorId}</p>
              )}
            </div>
          )}

          {/* Basic User Information */}
          <div>
            <Label>Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Full Name"
              className={cn(formErrors.name && "border-red-500")}
            />
            {formErrors.name && (
              <p className="text-sm text-red-500 mt-1">{formErrors.name}</p>
            )}
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Email"
              className={cn(formErrors.email && "border-red-500")}
            />
            {formErrors.email && (
              <p className="text-sm text-red-500 mt-1">{formErrors.email}</p>
            )}
          </div>

          <div>
            <Label>Phone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+919812345678"
              className={cn(formErrors.phone && "border-red-500")}
            />
            {formErrors.phone && (
              <p className="text-sm text-red-500 mt-1">{formErrors.phone}</p>
            )}
          </div>

          <div>
            <Label>Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Password"
                className={cn(formErrors.password && "border-red-500")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {formErrors.password && (
              <p className="text-sm text-red-500 mt-1">{formErrors.password}</p>
            )}
          </div>

          {/* Shop Name for Retailers */}
          {formData.role === 'retailer' && (
            <div>
              <Label>Shop Name</Label>
              <Input
                value={formData.shopName}
                onChange={(e) => handleInputChange('shopName', e.target.value)}
                placeholder="Shop Name"
                className={cn(formErrors.shopName && "border-red-500")}
              />
              {formErrors.shopName && (
                <p className="text-sm text-red-500 mt-1">{formErrors.shopName}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center">
                  <span className="mr-2">Creating...</span>
                  {/* Add a loading spinner here if needed */}
                </div>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
