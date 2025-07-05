import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, Filter, Eye, Pencil, Trash2, Ban } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CreateKeyModal } from './CreateKeyModal';
import { RevokeKeyModal } from './RevokeKeyModal';
import { toast } from 'sonner';
import { keysApi } from '@/lib/api';

interface Key { 
  id: string;
  createdDate: string;
  assignedTo: string;
  status: string;
  unlockingKeys: string[];
}

const KeyManagement = () => {
  const [keys, setKeys] = useState<Key[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const response = await keysApi.getAllKeys();
        setKeys(response.data);
      } catch (error) {
        console.error('Failed to fetch keys:', error);
        toast.error('Failed to load keys.');
      }
    };
    fetchKeys();
  }, []);

  const handleRevokeKeys = async (userId: string, count: number, reason: string) => {
    try {
      await keysApi.revoke(userId, count, reason);
      toast.success(`Successfully revoked ${count} keys from user ${userId}.`);
      // Optionally refetch keys or update state to reflect changes
      // fetchKeys(); // If you want to refresh the entire list
    } catch (error) {
      console.error('Failed to revoke keys:', error);
      toast.error('Failed to revoke keys.');
    }
  };

  const handleKeyCreated = async (newKeyData: Omit<Key, 'id' | 'createdDate'>) => {
    try {
      const response = await keysApi.createKey(newKeyData);
      setKeys((prevKeys) => [...prevKeys, response.data]);
      toast.success(`Key ${response.data.id} created successfully!`);
    } catch (error) {
      console.error('Failed to create key:', error);
      toast.error('Failed to create key.');
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      await keysApi.deleteKey(keyId);
      setKeys((prevKeys) => prevKeys.filter((key) => key.id !== keyId));
      toast.success(`Key ${keyId} deleted successfully!`);
    } catch (error) {
      console.error('Failed to delete key:', error);
      toast.error('Failed to delete key.');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Key Management</CardTitle>
        <div className="flex space-x-2">
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Key
          </Button>
          <Button variant="destructive" onClick={() => setIsRevokeModalOpen(true)}>
            <Ban className="mr-2 h-4 w-4" /> Revoke Keys
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center py-4">
          <Input
            placeholder="Search keys..."
            className="max-w-sm"
          />
          <Button variant="outline" className="ml-auto">
            <Filter className="mr-2 h-4 w-4" /> Filter
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key ID</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((key) => (
              <TableRow key={key.id}>
                <TableCell className="font-medium">{key.id}</TableCell>
                <TableCell>{key.createdDate}</TableCell>
                <TableCell>{key.assignedTo}</TableCell>
                <TableCell>{key.status}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="mr-1">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="mr-1">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteKey(key.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CreateKeyModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onKeyCreated={handleKeyCreated} />
      <RevokeKeyModal isOpen={isRevokeModalOpen} onClose={() => setIsRevokeModalOpen(false)} onRevoke={handleRevokeKeys} />
    </Card>
  );
};

export default KeyManagement;
