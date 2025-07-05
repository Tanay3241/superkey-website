import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { keysApi } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Key {
  id: string;
  status: string;
  createdAt: string;
  validUntil: string | null;
  provisionedAt: string | null;
  user_id: string | null;
}

export default function MyKeys() {
  const { user, refreshUser } = useAuth();
  const [keys, setKeys] = useState<Key[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [provisionData, setProvisionData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    deviceName: '',
    imei1: '',
    imei2: '',
    keyId: '',
    emi: {
      start_date: '',
      installments_left: 12,
      monthly_installment: 0,
      total_amount: 0,
      down_payment: 0,
      amount_left: 0
    }
  });

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      const { data } = await keysApi.getMyKeys();
      setKeys(data.keys);
    } catch (error) {
      toast.error('Failed to load keys');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('emi.')) {
      const emiField = name.split('.')[1];
      setProvisionData(prev => ({
        ...prev,
        emi: {
          ...prev.emi,
          [emiField]: value
        }
      }));
    } else {
      setProvisionData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Calculate EMI details
      const totalAmount = parseFloat(provisionData.emi.total_amount.toString());
      const downPayment = parseFloat(provisionData.emi.down_payment.toString());
      const amountLeft = totalAmount - downPayment;
      const monthlyInstallment = amountLeft / provisionData.emi.installments_left;

      const data = {
        ...provisionData,
        emi: {
          ...provisionData.emi,
          amount_left: amountLeft,
          monthly_installment: monthlyInstallment
        }
      };

      await keysApi.provisionKey(data);
      toast.success('Key provisioned successfully');
      loadKeys();
      refreshUser();
      // Reset form
      setProvisionData({
        fullName: '',
        email: '',
        phoneNumber: '',
        deviceName: '',
        imei1: '',
        imei2: '',
        keyId: '',
        emi: {
          start_date: '',
          installments_left: 12,
          monthly_installment: 0,
          total_amount: 0,
          down_payment: 0,
          amount_left: 0
        }
      });
    } catch (error) {
      toast.error('Failed to provision key');
      console.error('Provision error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Keys</h1>

      <div className="grid gap-6">
        {/* Key List */}
        <Card>
          <CardHeader>
            <CardTitle>Available Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>{key.id}</TableCell>
                    <TableCell>{key.status}</TableCell>
                    <TableCell>{new Date(key.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {key.validUntil ? new Date(key.validUntil).toLocaleDateString() : 'No expiry'}
                    </TableCell>
                    <TableCell>
                      {key.status === 'credited' && (
                        <Button
                          onClick={() => setProvisionData(prev => ({ ...prev, keyId: key.id }))}
                          size="sm"
                        >
                          Provision
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Provision Form */}
        {provisionData.keyId && (
          <Card>
            <CardHeader>
              <CardTitle>Provision Key</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProvision} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Customer Name</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={provisionData.fullName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={provisionData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      value={provisionData.phoneNumber}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deviceName">Device Name</Label>
                    <Input
                      id="deviceName"
                      name="deviceName"
                      value={provisionData.deviceName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imei1">IMEI 1</Label>
                    <Input
                      id="imei1"
                      name="imei1"
                      value={provisionData.imei1}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="imei2">IMEI 2</Label>
                    <Input
                      id="imei2"
                      name="imei2"
                      value={provisionData.imei2}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emi.total_amount">Total Amount</Label>
                    <Input
                      id="emi.total_amount"
                      name="emi.total_amount"
                      type="number"
                      value={provisionData.emi.total_amount}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emi.down_payment">Down Payment</Label>
                    <Input
                      id="emi.down_payment"
                      name="emi.down_payment"
                      type="number"
                      value={provisionData.emi.down_payment}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emi.installments_left">Number of EMIs</Label>
                    <Input
                      id="emi.installments_left"
                      name="emi.installments_left"
                      type="number"
                      min="1"
                      value={provisionData.emi.installments_left}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emi.start_date">EMI Start Date</Label>
                    <Input
                      id="emi.start_date"
                      name="emi.start_date"
                      type="date"
                      value={provisionData.emi.start_date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setProvisionData(prev => ({ ...prev, keyId: '' }))}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Provisioning...' : 'Provision Key'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
