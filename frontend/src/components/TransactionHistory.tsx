import React, { useEffect, useState, useCallback, useRef } from 'react';
import { keysApi } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

type FirestoreTimestamp = {
  _seconds: number;
  _nanoseconds: number;
};

type TransactionTimestamp = string | number | FirestoreTimestamp;

interface Transaction {
  id: string;
  fromRole: string;
  toRole: string;
  action: string;
  reason?: string;
  timestamp: TransactionTimestamp;
}

interface TransactionHistoryProps {
  filterRole?: string;
  className?: string;
  showFilter?: boolean;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  filterRole = 'all',
  className = '',
  showFilter = true,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedRole, setSelectedRole] = useState<string>(filterRole);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursors, setPrevCursors] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper function to parse timestamp from different formats
  const getTimestampMs = useCallback((ts: TransactionTimestamp): number => {
    if (!ts) return 0;
    if (typeof ts === 'object' && '_seconds' in ts) return ts._seconds * 1000;
    if (typeof ts === 'number') return ts < 1e12 ? ts * 1000 : ts;
    if (typeof ts === 'string') return new Date(ts).getTime();
    return 0;
  }, []);

  // Format timestamp for display
  const formatTimestamp = useCallback((timestamp: TransactionTimestamp): string => {
    try {
      const ms = getTimestampMs(timestamp);
      if (!ms) return 'N/A';
      const date = new Date(ms);
      return isNaN(date.getTime()) ? 'Invalid date' : format(date, 'MMM d, yyyy HH:mm:ss');
    } catch (err) {
      console.error('Error formatting timestamp:', err);
      return 'Invalid date';
    }
  }, [getTimestampMs]);

  // Fetch transactions
  const fetchTransactions = useCallback(async (cursor?: string | null) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    try {
      setLoading(true);
      setError(null);
      
      const pageSize = 10;
      const response = await keysApi.getTransactions(cursor, pageSize);
      
      if (!response?.data?.transactions || !Array.isArray(response.data.transactions)) {
        throw new Error('Invalid response format from API');
      }

      // Sort transactions by timestamp
      const sortedTransactions = response.data.transactions.sort((a, b) => 
        getTimestampMs(b.timestamp) - getTimestampMs(a.timestamp)
      );
      
      setTransactions(sortedTransactions);
      setHasMore(response.data.hasMore);
      setNextCursor(response.data.nextCursor);
      
      // Update last refresh time
      setLastRefreshTime(Date.now());
    } catch (err) {
      if (err.name === 'AbortError') {
        // Ignore abort errors
        return;
      }
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      abortControllerRef.current = null;
    }
  }, [getTimestampMs]);

  // Initialize with the first page
  useEffect(() => {
    fetchTransactions(null);
    
    // Cleanup function to abort any pending requests
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTransactions]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    // Prevent refresh if less than 5 seconds since last refresh
    if (Date.now() - lastRefreshTime < 5000) return;
    
    setIsRefreshing(true);
    setCurrentPage(0);
    setPrevCursors([]);
    setNextCursor(null);
    await fetchTransactions(null);
  }, [fetchTransactions, lastRefreshTime]);

  // Handle role changes
  const handleRoleChange = (value: string) => {
    setSelectedRole(value);
    setTransactions([]);
    setCurrentPage(0);
    setPrevCursors([]);
    setNextCursor(null);
    setHasMore(true);
    fetchTransactions(null);
  };

  // Handle next page
  const handleNextPage = () => {
    if (!hasMore || loading || !nextCursor) return;
    
    setPrevCursors(prev => [...prev, nextCursor]);
    setCurrentPage(prev => prev + 1);
    fetchTransactions(nextCursor);
  };

  // Handle previous page
  const handlePrevPage = () => {
    if (currentPage <= 0 || loading) return;
    
    const newPrevCursors = [...prevCursors];
    const prevCursor = newPrevCursors.pop();
    setPrevCursors(newPrevCursors);
    setCurrentPage(prev => prev - 1);
    fetchTransactions(prevCursor || null);
  };

  // Filter transactions by role only
  const filteredTransactions = React.useMemo(() => {
    let result = [...transactions];
    
    // Filter by role if needed
    if (selectedRole && selectedRole !== 'all') {
      result = result.filter(tx => 
        tx.fromRole === selectedRole || tx.toRole === selectedRole
      );
    }
    
    return result;
  }, [transactions, selectedRole]);

  // Get status badge color
  const getStatusBadge = (action: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      'transferred': { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300' },
      'revoked': { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300' },
      'assigned': { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300' },
      'created': { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300' },
      'provisioned': { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300' }
    };
    return statusMap[action] || { bg: 'bg-gray-100 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-300' };
  };

  // Set up auto-refresh interval
  useEffect(() => {
    // Only set up auto-refresh if component is mounted and not in loading state
    if (loading) return;
    
    const intervalId = setInterval(() => {
      // Only refresh if the page is visible, not loading, and more than 60 seconds since last refresh
      if (document.visibilityState === 'visible' && !loading && Date.now() - lastRefreshTime >= 60000) {
        handleRefresh();
      }
    }, 60000); // Check every minute
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [handleRefresh, loading, lastRefreshTime]);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        {showFilter && (
          <Select value={selectedRole} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="super_distributor">Super Distributor</SelectItem>
              <SelectItem value="distributor">Distributor</SelectItem>
              <SelectItem value="retailer">Retailer</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing || loading || Date.now() - lastRefreshTime < 5000}
          className={showFilter ? "" : "ml-auto"}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="text-red-500 mb-4">{error}</div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{formatTimestamp(tx.timestamp)}</TableCell>
                  <TableCell>{tx.fromRole}</TableCell>
                  <TableCell>{tx.toRole}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary"
                      className={`${getStatusBadge(tx.action).bg} ${getStatusBadge(tx.action).text}`}
                    >
                      {tx.action}
                    </Badge>
                  </TableCell>
                  <TableCell>{tx.reason || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && filteredTransactions.length > 0 && (
        <div className="flex justify-between items-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage === 0 || loading}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage + 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!hasMore || loading}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
