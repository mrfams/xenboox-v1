/**
 * Pre-configured tRPC query options for different data types.
 * Use these to optimize caching and refetching behavior.
 */

// Critical data that changes frequently (balances, cash position)
export const realtimeQueryOptions = {
  staleTime: 10 * 1000, // 10 seconds
  gcTime: 2 * 60 * 1000, // 2 minutes
  refetchInterval: 30 * 1000, // Refetch every 30 seconds
  refetchOnWindowFocus: true,
};

// Semi-critical data that updates periodically (invoices, bills, transactions)
export const regularQueryOptions = {
  staleTime: 60 * 1000, // 1 minute
  gcTime: 5 * 60 * 1000, // 5 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: false,
};

// Static/slow-changing data (settings, chart of accounts, reports)
export const staticQueryOptions = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: false,
};

// AI insights and analytics (expensive to compute, cache aggressively)
export const analyticsQueryOptions = {
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: false,
};

// List data with pagination (invoices, expenses, transactions)
export const listQueryOptions = {
  staleTime: 30 * 1000, // 30 seconds
  gcTime: 3 * 60 * 1000, // 3 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: false,
};

// Dashboard overview data (aggregated, cache longer)
export const dashboardQueryOptions = {
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: false,
};
