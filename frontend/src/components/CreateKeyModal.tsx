
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface CreateKeyModalProps {
  onKeyCreated: (newKey: any) => void;
}

export const CreateKeyModal = ({ onKeyCreated }: CreateKeyModalProps) => {
  const [open, setOpen] = useState(false);
  const [keyId, setKeyId] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!keyId) {
      toast.error('Please enter a Key ID');
      return;
    }

    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newKey = {
      id: keyId,
      createdDate: new Date().toISOString().split('T')[0],
      assignedTo: assignTo || 'Unassigned',
      status: assignTo ? 'Active' : 'Available',
      unlockingKeys: Array.from({length: 12}, (_, i) => `UK-${String(Math.random() * 1000).padStart(3, '0')}`)
    };

    onKeyCreated(newKey);
    toast.success('Key created successfully!');
    setOpen(false);
    setKeyId('');
    setAssignTo('');
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 ripple-button">
          <Plus className="w-4 h-4 mr-2" />
          Create New Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Key</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="keyId">Key ID</Label>
            <Input
              id="keyId"
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="Enter key ID"
            />
          </div>
          <div>
            <Label htmlFor="assignTo">Assign To (Optional)</Label>
            <Select value={assignTo} onValueChange={setAssignTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select user to assign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                <SelectItem value="John Distributor">John Distributor</SelectItem>
                <SelectItem value="Jane Super Distributor">Jane Super Distributor</SelectItem>
                <SelectItem value="Mike Retailer">Mike Retailer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleCreate} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Creating...' : 'Create Key'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
