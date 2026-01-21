import { SiteFilterValues } from '../components';

export interface CommonFeeKPIData {
  totalBilled: {
    value: string;
    rawValue: number;
    change: string;
    changeType: 'positive' | 'negative';
  };
  totalPaid: {
    value: string;
    rawValue: number;
    change: string;
    changeType: 'positive' | 'negative';
  };
  totalOutstanding: {
    value: string;
    rawValue: number;
    change: string;
    changeType: 'positive' | 'negative';
  };
  collectionRate: {
    value: string;
    percentage: number;
    change: string;
    changeType: 'positive' | 'negative';
  };
  outstandingUnits: {
    value: number;
    change: string;
    changeType: 'positive' | 'negative';
  };
}

export interface StatusDistribution {
  paid: number;
  partial: number;
  unpaid: number;
  overdue: number;
}

export interface TrendDataPoint {
  month: string;
  monthKey?: string;
  billed: number;
  paid: number;
  outstanding: number;
  cumBilled: number;
  cumPaid: number;
  cumOutstanding: number;
}

export interface RiskUnit {
  unit: string;
  owner: string;
  project: string;
  amount: number;
  daysOverdue: number;
}

export interface SyncInfo {
  lastSyncAt: string;
  totalUnits: number;
  totalProjects: number;
  status: 'synced' | 'syncing' | 'error';
}

export interface CommonFeeOverviewData {
  kpis: CommonFeeKPIData;
  statusDistribution: StatusDistribution;
  trend: TrendDataPoint[];
  highRiskUnits: RiskUnit[];
  overdueUnits: RiskUnit[];
  syncInfo: SyncInfo;
  availableYears: number[];
  selectedYear: number;
  trendUnit: string;
}

export async function fetchCommonFeeOverview(
  filters: SiteFilterValues
): Promise<CommonFeeOverviewData> {
  // Build query params from all filters
  const params = new URLSearchParams();
  if (filters.siteId) {
    params.set('site_id', filters.siteId);
  }
  if (filters.year && filters.year !== 'all') {
    params.set('year', filters.year);
  }
  if (filters.period) {
    params.set('period', filters.period);
  }
  if (filters.status && filters.status !== 'all') {
    params.set('status', filters.status);
  }
  if (filters.payGroup) {
    params.set('pay_group', filters.payGroup);
  }

  const url = `/api/common-fee/overview${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch overview data');
  }

  const data = await response.json();

  // Map API response to CommonFeeOverviewData
  return {
    kpis: {
      totalBilled: data.kpis.totalBilled,
      totalPaid: data.kpis.totalPaid,
      totalOutstanding: data.kpis.totalOutstanding,
      collectionRate: {
        value: '0%',
        percentage: 0,
        change: '+0%',
        changeType: 'positive',
      },
      outstandingUnits: data.kpis.outstandingUnits,
    },
    statusDistribution: data.statusDistribution,
    trend: data.trend,
    highRiskUnits: data.highRiskUnits,
    overdueUnits: data.highRiskUnits, // Use same data for now
    syncInfo: data.syncInfo,
    availableYears: data.availableYears || [],
    selectedYear: data.selectedYear || new Date().getFullYear(),
    trendUnit: data.trendUnit || 'M',
  };
}
