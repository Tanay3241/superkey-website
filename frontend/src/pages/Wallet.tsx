import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Wallet() {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Total Provisioned',
      value: user?.wallet?.totalProvisioned || 0,
      description: 'Total keys provisioned to end users',
      roles: ['retailer'] // Only visible to retailers
    },
    {
      title: 'Revoked Keys',
      value: user?.wallet?.totalRevoked || 0,
      description: 'Total keys revoked from your account'
    },
    {
      title: 'Available Keys',
      value: user?.wallet?.availableKeys || 0,
      description: 'Keys ready to transfer or provision'
    },
    {
      title: 'Total Received',
      value: user?.wallet?.totalKeysReceived || 0,
      description: 'Total keys received from higher level'
    },
    {
      title: 'Total Transferred',
      value: user?.wallet?.totalKeysTransferred || 0,
      description: 'Total keys transferred to lower level'
    },

  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Wallet</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          (!stat.roles || stat.roles.includes(user?.role as string)) ? (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ) : null
        ))}
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>

          <TabsTrigger value="transfer">Transfer Keys</TabsTrigger>
          <TabsTrigger value="revoked">Revoked Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground">
                Transaction history will be implemented soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfer">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Keys</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground">
                Transfer keys functionality will be implemented soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revoked">
          <Card>
            <CardHeader>
              <CardTitle>Revoked Keys History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap">user123</td>
                      <td className="px-6 py-4 whitespace-nowrap">5</td>
                      <td className="px-6 py-4 whitespace-nowrap">Fraudulent activity</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap">user456</td>
                      <td className="px-6 py-4 whitespace-nowrap">2</td>
                      <td className="px-6 py-4 whitespace-nowrap">Account suspended</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
