import { SiteFilterValues } from '../components';

// Collection Summary - เหมือนกับหน้า Collection
export interface CollectionSummary {
  total: number;
  totalUnitCount: number;
  totalAmount: number;
  paid: { count: number; unitCount: number; amount: number };
  partial: { count: number; unitCount: number; amount: number };
  active: { count: number; unitCount: number; amount: number };
  overdue: {
    count: number;
    unitCount: number;
    amount: number;
    yearlyCount: number;
    yearlyUnitCount: number;
    cumulativeAmount: number;
    cumulativeCount: number;
    cumulativeUnitCount: number;
    totalUnitCount: number;
  };
  void: { count: number; unitCount: number; amount: number };
  draft: { count: number; unitCount: number; amount: number };
}

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
  month_key?: string;
  billed: number;
  paid: number;
  outstanding: number;
  cumBilled: number;
  cumPaid: number;
  cumOutstanding: number;
  cumOutstandingYear?: number;
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

export interface ExpenseSummaryItem {
  id: string;
  name: string;
  count: number;
  amount: number;
}

export interface ExpenseSummaryData {
  data: ExpenseSummaryItem[];
  totalInvoices: number;
  filters: {
    site_id?: string;
    year?: string;
    status?: string;
  };
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
  // Collection summary - เหมือนหน้า Collection (รวมทุก project)
  summary: CollectionSummary;
}

export async function fetchCommonFeeOverview(
  filters: SiteFilterValues
): Promise<CommonFeeOverviewData> {
  // Build query params from all filters
  const params = new URLSearchParams();
  if (filters.siteId) {
    params.set('site_id', filters.siteId);
  }
  // Use year filter
  if (filters.year) {
    params.set('year', filters.year);
  }

  if (filters.status && filters.status !== 'all') {
    params.set('status', filters.status);
  }
  if (filters.payGroup) {
    params.set('pay_group', filters.payGroup);
  }
  if (filters.expenseType) {
    params.set('expense_type', filters.expenseType);
  }
  if (filters.projectType) {
    params.set('project_type', filters.projectType);
  }

  // Fetch both overview and collection data in parallel
  const overviewUrl = `/api/common-fee/overview${params.toString() ? `?${params}` : ''}`;

  // Collection params - ใช้ filter เหมือนกับ overview (ยกเว้น status)
  const collectionParams = new URLSearchParams();
  if (filters.siteId) {
    collectionParams.set('site_id', filters.siteId);
  }
  // Use year filter
  if (filters.year) {
    collectionParams.set('year', filters.year);
  }
  if (filters.payGroup) {
    collectionParams.set('pay_group', filters.payGroup);
  }
  if (filters.expenseType) {
    collectionParams.set('expense_type', filters.expenseType);
  }
  if (filters.projectType) {
    collectionParams.set('project_type', filters.projectType);
  }
  collectionParams.set('limit', '1'); // แค่ต้องการ summary ไม่ต้องดึง data มาก
  const collectionUrl = `/api/common-fee/collection?${collectionParams}`;

  const [overviewResponse, collectionResponse] = await Promise.all([
    fetch(overviewUrl),
    fetch(collectionUrl),
  ]);

  if (!overviewResponse.ok) {
    throw new Error('Failed to fetch overview data');
  }

  const data = await overviewResponse.json();

  // Get collection summary (with status breakdown)
  let summary: CollectionSummary = {
    total: 0,
    totalUnitCount: 0,
    totalAmount: 0,
    paid: { count: 0, unitCount: 0, amount: 0 },
    partial: { count: 0, unitCount: 0, amount: 0 },
    active: { count: 0, unitCount: 0, amount: 0 },
    overdue: { count: 0, unitCount: 0, amount: 0, yearlyCount: 0, yearlyUnitCount: 0, cumulativeAmount: 0, cumulativeCount: 0, cumulativeUnitCount: 0, totalUnitCount: 0 },
    void: { count: 0, unitCount: 0, amount: 0 },
    draft: { count: 0, unitCount: 0, amount: 0 },
  };

  if (collectionResponse.ok) {
    const collectionData = await collectionResponse.json();
    summary = collectionData.summary;
  }

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
    summary,
  };
}

export async function fetchExpenseSummary(
  filters: SiteFilterValues
): Promise<ExpenseSummaryData> {
  const params = new URLSearchParams();
  if (filters.siteId) {
    params.set('site_id', filters.siteId);
  }
  // Use year filter
  if (filters.year) {
    params.set('year', filters.year);
  }
  if (filters.projectType) {
    params.set('project_type', filters.projectType);
  }
  // Don't send expense_type to pie chart - it already shows breakdown by type

  const url = `/api/common-fee/expense-summary${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch expense summary');
  }

  return response.json();
}

// Invoice Summary - ดึงตรงจาก table invoice
export interface InvoiceSummaryData {
  total: { count: number; unitCount: number; amount: number };
  paid: { count: number; unitCount: number; amount: number };
  partial: { count: number; unitCount: number; amount: number };
  active: { count: number; unitCount: number; amount: number };
  overdue: { count: number; unitCount: number; amount: number };
  overdueCumulative: { count: number; unitCount: number; amount: number };
  selectedYear: number;
  void: { count: number; unitCount: number; amount: number };
  draft: { count: number; unitCount: number; amount: number };
}

export async function fetchInvoiceSummary(
  filters: SiteFilterValues
): Promise<InvoiceSummaryData> {
  const params = new URLSearchParams();
  if (filters.siteId) {
    params.set('site_id', filters.siteId);
  }
  // Use year filter
  if (filters.year) {
    params.set('year', filters.year);
  }

  if (filters.status && filters.status !== 'all') {
    params.set('status', filters.status);
  }
  if (filters.payGroup) {
    params.set('pay_group', filters.payGroup);
  }
  if (filters.expenseType) {
    params.set('expense_type', filters.expenseType);
  }
  if (filters.projectType) {
    params.set('project_type', filters.projectType);
  }

  const url = `/api/common-fee/invoice-summary${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch invoice summary');
  }

  return response.json();
}

// Collection by project - for comparison chart
export interface YearlyBreakdownItem {
  totalAmount: number;
  paidAmount: number;
  overdueAmount: number;
}

export interface ProjectCollectionData {
  siteId: number;
  name: string;
  projectType: string;
  isCondo: boolean;
  totalAmount: number;
  paidAmount: number;
  overdueAmount: number;
  totalUnits: number;
  collectionRate: number;
  ageYears: number;
  ageMonths: number;
  firstInvoiceDate?: string;
  yearlyBreakdown?: Record<number, YearlyBreakdownItem>;
  cumulative?: YearlyBreakdownItem;
}

export interface CollectionByProjectData {
  year: number;
  years?: number[];
  projects: ProjectCollectionData[];
}

export async function fetchCollectionByProject(
  filters: SiteFilterValues
): Promise<CollectionByProjectData> {
  const params = new URLSearchParams();
  if (filters.siteId) {
    params.set('site_id', filters.siteId);
  }
  if (filters.year) {
    params.set('year', filters.year);
  }
  if (filters.payGroup) {
    params.set('pay_group', filters.payGroup);
  }
  if (filters.expenseType) {
    params.set('expense_type', filters.expenseType);
  }
  if (filters.projectType) {
    params.set('project_type', filters.projectType);
  }

  const url = `/api/common-fee/collection-by-project${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch collection by project');
  }

  return response.json();
}
