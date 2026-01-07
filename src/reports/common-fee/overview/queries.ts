import { CommonFeeFilterState } from './filters';

export interface CommonFeeKPIData {
  totalBilled: {
    value: string;
    change: string;
    changeType: 'positive' | 'negative';
  };
  totalPaid: {
    value: string;
    change: string;
    changeType: 'positive' | 'negative';
  };
  totalOutstanding: {
    value: string;
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
  billed: number;
  paid: number;
  outstanding: number;
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
}

export async function fetchCommonFeeOverview(
  _filters: CommonFeeFilterState
): Promise<CommonFeeOverviewData> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    kpis: {
      totalBilled: {
        value: '฿ 12.5M',
        change: '+8.2%',
        changeType: 'positive',
      },
      totalPaid: {
        value: '฿ 10.8M',
        change: '+12.5%',
        changeType: 'positive',
      },
      totalOutstanding: {
        value: '฿ 1.7M',
        change: '-15.3%',
        changeType: 'positive',
      },
      collectionRate: {
        value: '86.4%',
        percentage: 86.4,
        change: '+3.2%',
        changeType: 'positive',
      },
      outstandingUnits: {
        value: 48,
        change: '-12',
        changeType: 'positive',
      },
    },
    statusDistribution: {
      paid: 72,
      partial: 8,
      unpaid: 12,
      overdue: 8,
    },
    trend: [
      { month: 'ม.ค.', billed: 2100, paid: 1800, outstanding: 300 },
      { month: 'ก.พ.', billed: 2050, paid: 1750, outstanding: 300 },
      { month: 'มี.ค.', billed: 2200, paid: 1950, outstanding: 250 },
      { month: 'เม.ย.', billed: 2150, paid: 1900, outstanding: 250 },
      { month: 'พ.ค.', billed: 2000, paid: 1850, outstanding: 150 },
      { month: 'มิ.ย.', billed: 2000, paid: 1800, outstanding: 200 },
    ],
    highRiskUnits: [
      { unit: 'A-1205', owner: 'คุณสมชาย ใจดี', project: 'SENA Park Grand Rama 9', amount: 185000, daysOverdue: 120 },
      { unit: 'B-0803', owner: 'คุณวิภา แสงทอง', project: 'SENA Ville Bangna', amount: 142000, daysOverdue: 95 },
      { unit: 'C-1502', owner: 'บริษัท เอบีซี จำกัด', project: 'SENA Park Pinklao', amount: 128500, daysOverdue: 88 },
      { unit: 'A-0901', owner: 'คุณประยุทธ์ มั่นคง', project: 'SENA Park Grand Rama 9', amount: 98000, daysOverdue: 75 },
      { unit: 'D-2001', owner: 'คุณนภา สดใส', project: 'SENA Grand Sukhumvit', amount: 89000, daysOverdue: 62 },
    ],
    overdueUnits: [
      { unit: 'A-1205', owner: 'คุณสมชาย ใจดี', project: 'SENA Park Grand Rama 9', amount: 185000, daysOverdue: 120 },
      { unit: 'B-0803', owner: 'คุณวิภา แสงทอง', project: 'SENA Ville Bangna', amount: 142000, daysOverdue: 95 },
      { unit: 'C-1502', owner: 'บริษัท เอบีซี จำกัด', project: 'SENA Park Pinklao', amount: 128500, daysOverdue: 88 },
    ],
    syncInfo: {
      lastSyncAt: '2024-01-15 14:30:00',
      totalUnits: 2820,
      totalProjects: 4,
      status: 'synced',
    },
  };
}
