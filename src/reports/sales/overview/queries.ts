import { FilterState, ChartDataPoint } from '@shared/types';

// Mock data for sales overview
export interface SalesKPIData {
  totalSales: {
    value: string;
    change: string;
    changeType: 'positive' | 'negative';
    targetPercentage: number;
  };
  unitsSold: {
    value: number;
    change: string;
    changeType: 'positive' | 'negative';
    targetPercentage: number;
  };
  activeLeads: {
    value: number;
    change: string;
    changeType: 'positive' | 'negative';
  };
  conversionRate: {
    value: string;
    change: string;
    changeType: 'positive' | 'negative';
  };
}

export interface SalesOverviewData {
  kpis: SalesKPIData;
  salesTrend: ChartDataPoint[];
  pipelineData: ChartDataPoint[];
  channelData: { name: string; value: number; color: string }[];
}

// Simulated API call - replace with actual API
export async function fetchSalesOverview(
  _filters: FilterState
): Promise<SalesOverviewData> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    kpis: {
      totalSales: {
        value: '฿ 245.8M',
        change: '+12.5%',
        changeType: 'positive',
        targetPercentage: 82,
      },
      unitsSold: {
        value: 156,
        change: '+8.2%',
        changeType: 'positive',
        targetPercentage: 78,
      },
      activeLeads: {
        value: 423,
        change: '-3.1%',
        changeType: 'negative',
      },
      conversionRate: {
        value: '24.8%',
        change: '+2.4%',
        changeType: 'positive',
      },
    },
    salesTrend: [
      { month: 'Jan', sales: 4200, target: 4000 },
      { month: 'Feb', sales: 3800, target: 4200 },
      { month: 'Mar', sales: 5100, target: 4500 },
      { month: 'Apr', sales: 4700, target: 4800 },
      { month: 'May', sales: 5300, target: 5000 },
      { month: 'Jun', sales: 5800, target: 5200 },
    ],
    pipelineData: [
      { stage: 'Lead', count: 245, value: 120 },
      { stage: 'Qualified', count: 180, value: 95 },
      { stage: 'Proposal', count: 95, value: 68 },
      { stage: 'Negotiation', count: 48, value: 42 },
      { stage: 'Closed', count: 32, value: 35 },
    ],
    channelData: [
      { name: 'Direct Sales', value: 45, color: '#10b981' },
      { name: 'Online', value: 28, color: '#3b82f6' },
      { name: 'Agents', value: 18, color: '#8b5cf6' },
      { name: 'Referral', value: 9, color: '#f59e0b' },
    ],
  };
}

// Hook for using with React Query or similar
export function useSalesOverview(filters: FilterState) {
  // This would typically use React Query or SWR
  // For now, return mock structure
  return {
    data: null as SalesOverviewData | null,
    isLoading: false,
    error: null as Error | null,
    refetch: () => fetchSalesOverview(filters),
  };
}
