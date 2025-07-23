import React from 'react';
import TransactionHistory from './TransactionHistory';

const RecentActivity = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recent Transactions</h3>
      </div>
      <TransactionHistory showFilter={false} />
    </div>
  );
};

export default RecentActivity;