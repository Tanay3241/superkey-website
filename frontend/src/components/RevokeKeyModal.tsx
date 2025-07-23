import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Key, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface RevokeKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRevoke: (userId: string, count: number, reason: string) => void;
  onUserSelect: (userId: string) => void;
  selectedUserKeysCount: number | null;
  users: Array<{
    id: string;
    name: string;
    email: string;
    keyCount?: number;
    role?: string;
    parent?: {
      id: string;
      name: string;
      role: string;
    } | null;
  }>;
}

export const RevokeKeyModal: React.FC<RevokeKeyModalProps> = ({
  isOpen,
  onClose,
  onRevoke,
  onUserSelect,
  selectedUserKeysCount,
  users,
}) => {
  const [selectedUserId, setSelectedUserId] = React.useState<string>('');
  const [count, setCount] = React.useState<number>(1);
  const [reason, setReason] = React.useState<string>('');

  React.useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setSelectedUserId('');
      setCount(1);
      setReason('');
    }
  }, [isOpen]);

  const handleUserSelect = (userId: string) => {
    console.log('User selected:', userId);
    setSelectedUserId(userId);
    onUserSelect(userId);
    // Reset count when user changes
    setCount(1);
  };

  const handleRevoke = () => {
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }
    if (!count || count < 1) {
      toast.error('Please enter a valid number of keys to revoke');
      return;
    }
    if (count > (selectedUserKeysCount || 0)) {
      toast.error(`User only has ${selectedUserKeysCount} keys available`);
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason for revoking the keys');
      return;
    }

    onRevoke(selectedUserId, count, reason);
  };

  // Helper function to get role display name
  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      'super_distributor': 'Super Distributor',
      'distributor': 'Distributor',
      'retailer': 'Retailer',
      'end_user': 'End User'
    };
    return roleMap[role] || role;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Revoke Keys</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="user-select" className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Select User
            </Label>
            <Select value={selectedUserId} onValueChange={handleUserSelect}>
              <SelectTrigger id="user-select" className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{user.name}</span>
                        <Badge variant="outline" className={cn(
                          "ml-2 text-xs",
                          user.role === 'super_distributor' && "bg-sky-50 text-sky-700 border-sky-200",
                          user.role === 'distributor' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                          user.role === 'retailer' && "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          {getRoleDisplay(user.role)}
                        </Badge>
                      </div>
                      {user.parent && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Parent: {user.parent.name} ({getRoleDisplay(user.parent.role)})
                        </div>
                      )}
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email} • {user.keyCount || 0} key(s)
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="count" className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Number of Keys to Revoke
            </Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={selectedUserKeysCount || 1}
              value={count}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                setCount(Math.min(value, selectedUserKeysCount || 1));
              }}
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
              placeholder="Enter number of keys"
            />
            {selectedUserKeysCount !== null && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                User has {selectedUserKeysCount} active key(s)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Reason for Revocation
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
              placeholder="Enter reason for revoking keys"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-4 py-2"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRevoke}
              className="px-4 py-2"
            >
              Revoke Keys
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};