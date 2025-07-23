
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { keysApi } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface CreateKeyModalProps {
  open: boolean;
  onClose: () => void;
}

export const CreateKeyModal: React.FC<CreateKeyModalProps> = ({ open, onClose }) => {
  const [count, setCount] = useState<number>(1);
  const [validityInMonths, setValidityInMonths] = useState<number>(12);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is super_admin
    if (user?.role !== 'super_admin') {
      toast.error('Only super admin can create keys');
      return;
    }
    
    setIsLoading(true);

    try {
      await keysApi.create(count, validityInMonths);
      toast.success(`Successfully created ${count} key${count > 1 ? 's' : ''}`);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create keys');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">Create New Keys</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="count" className="text-gray-700 dark:text-gray-200">Number of Keys</Label>
            <Input
              id="count"
              type="number"
              min={1}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
          </div>
          <div>
            <Label htmlFor="validity" className="text-gray-700 dark:text-gray-200">Validity (in months)</Label>
            <Input
              id="validity"
              type="number"
              min={1}
              value={validityInMonths}
              onChange={(e) => setValidityInMonths(parseInt(e.target.value) || 12)}
              className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {isLoading ? 'Creating...' : 'Create Keys'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
