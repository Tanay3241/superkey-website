import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  _id: string;
  name: string;
  receiptId?: string;
}

interface RevokeKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRevoke: (userId: string, count: number, reason: string) => void;
  onUserSelect: (userId: string) => void;
  selectedUserKeysCount: number | null;
  users: User[]; // Add users prop
}

export const RevokeKeyModal: React.FC<RevokeKeyModalProps> = ({
  isOpen,
  onClose,
  onRevoke,
  onUserSelect,
  selectedUserKeysCount,
  users, // Destructure users prop
}) => {
  const [userId, setUserId] = useState('');
  const [count, setCount] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false); // For popover state
  const [value, setValue] = useState(''); // For command input value

  React.useEffect(() => {
    if (userId) {
      onUserSelect(userId);
    }
  }, [userId, onUserSelect]);

  const handleRevoke = async () => {
    if (!userId || count <= 0) {
      toast.error('Please select a user and enter a positive count.');
      return;
    }

    setIsLoading(true);
    try {
      await onRevoke(userId, count, reason);
      toast.success('Keys revoked successfully!');
      onClose();
      setUserId('');
      setCount(1);
      setReason('');
      setValue(''); // Clear selected user in dropdown
    } catch (error) {
      console.error('Failed to revoke keys:', error);
      toast.error('Failed to revoke keys.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Revoke Keys</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="userId" className="text-right">
              User
            </Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between col-span-3"
                >
                  {value
                    ? users.find((user) => user._id === value)?.name
                    : "Select user..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search user..." />
                  <CommandEmpty>No user found.</CommandEmpty>
                  <CommandList>
                    <CommandGroup>
                      {users.map((user) => (
                        <CommandItem
                          key={user._id}
                          value={user._id}
                          onSelect={(currentValue) => {
                            setValue(currentValue === value ? '' : currentValue);
                            setUserId(currentValue);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              value === user._id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {user.name} {user.receiptId && `(${user.receiptId})`}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          {selectedUserKeysCount !== null && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Available Keys</Label>
              <span className="col-span-3 text-sm font-medium">{selectedUserKeysCount}</span>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="count" className="text-right">
              Count
            </Label>
            <Input
              id="count"
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="col-span-3"
              min={1}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reason" className="text-right">
              Reason
            </Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="col-span-3"
              placeholder="Reason for revocation (optional)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleRevoke} disabled={isLoading}>
            {isLoading ? 'Revoking...' : 'Revoke Keys'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};