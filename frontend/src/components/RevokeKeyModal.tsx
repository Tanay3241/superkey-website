import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface RevokeKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRevoke: (userId: string, count: number, reason: string) => void;
  onUserSelect: (userId: string) => void;
  selectedUserKeysCount: number | null;
}

export const RevokeKeyModal: React.FC<RevokeKeyModalProps> = ({
  isOpen,
  onClose,
  onRevoke,
  onUserSelect,
  selectedUserKeysCount,
}) => {
  const [userId, setUserId] = useState('');
  const [count, setCount] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (userId) {
      onUserSelect(userId);
    }
  }, [userId, onUserSelect]);

  const handleRevoke = async () => {
    if (!userId || count <= 0) {
      toast.error('Please enter a valid User ID and a positive count.');
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
              User ID
            </Label>
            <Input
              id="userId"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                onUserSelect(e.target.value);
              }}
              className="col-span-3"
              placeholder="User ID to revoke keys from"
            />
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