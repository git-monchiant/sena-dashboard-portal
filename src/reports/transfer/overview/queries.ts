import { FilterState, ChartDataPoint } from '@shared/types';

export interface TransferKPIData {
  totalTransfers: {
    value: number;
    change: string;
    changeType: 'positive' | 'negative';
    subtext: string;
  };
  completed: {
    value: number;
    change: string;
    changeType: 'positive' | 'negative';
    subtext: string;
  };
  avgTime: {
    value: string;
    change: string;
    changeType: 'positive' | 'negative';
    subtext: string;
  };
  delayed: {
    value: number;
    change: string;
    changeType: 'positive' | 'negative';
    subtext: string;
  };
}

export interface TransferOverviewData {
  kpis: TransferKPIData;
  transferTrend: ChartDataPoint[];
  agingData: { range: string; count: number; color: string }[];
  statusData: { status: string; value: number; color: string }[];
  statusDistribution: {
    completed: number;
    inProgress: number;
    pending: number;
    delayed: number;
  };
}

export async function fetchTransferOverview(
  _filters: FilterState
): Promise<TransferOverviewData> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    kpis: {
      totalTransfers: {
        value: 96,
        change: '+15.2%',
        changeType: 'positive',
        subtext: '58 completed, 38 in progress',
      },
      completed: {
        value: 58,
        change: '+12.5%',
        changeType: 'positive',
        subtext: '฿ 328.5M total value',
      },
      avgTime: {
        value: '42 days',
        change: '-5 days',
        changeType: 'positive',
        subtext: 'Improved from last month',
      },
      delayed: {
        value: 8,
        change: '+2',
        changeType: 'negative',
        subtext: 'Requires attention',
      },
    },
    transferTrend: [
      { month: 'Jan', completed: 42, pending: 18 },
      { month: 'Feb', completed: 38, pending: 22 },
      { month: 'Mar', completed: 51, pending: 15 },
      { month: 'Apr', completed: 47, pending: 20 },
      { month: 'May', completed: 53, pending: 12 },
      { month: 'Jun', completed: 58, pending: 8 },
    ],
    agingData: [
      { range: '0-30 days', count: 45, color: '#10b981' },
      { range: '31-60 days', count: 28, color: '#3b82f6' },
      { range: '61-90 days', count: 15, color: '#f59e0b' },
      { range: '90+ days', count: 8, color: '#ef4444' },
    ],
    statusData: [
      { status: 'Completed', value: 65, color: '#10b981' },
      { status: 'In Progress', value: 22, color: '#3b82f6' },
      { status: 'Pending Doc', value: 8, color: '#f59e0b' },
      { status: 'Delayed', value: 5, color: '#ef4444' },
    ],
    statusDistribution: {
      completed: 65,
      inProgress: 22,
      pending: 8,
      delayed: 5,
    },
  };
}
