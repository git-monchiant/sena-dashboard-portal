import { SiteFilterValues } from '../components';

export interface AgingBucket {
  count: number;
  amount: number;
}

export interface AgingSummary {
  total: AgingBucket;
  buckets: {
    '0-30': AgingBucket;
    '31-60': AgingBucket;
    '61-90': AgingBucket;
    '91-180': AgingBucket;
    '181-360': AgingBucket;
    '360+': AgingBucket;
  };
}

export interface AgingInvoice {
  id: number;
  docNumber: string;
  unit: string;
  owner: string;
  project: string;
  siteId: number;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  bucket: '0-30' | '31-60' | '61-90' | '91-180' | '181-360' | '360+';
}

export interface AgingPagination {
  total: number;
  limit: number;
  offset: number;
}

export interface AgingData {
  summary: AgingSummary;
  invoices: AgingInvoice[];
  pagination: AgingPagination;
}

export type AgingSortField = 'docNumber' | 'unit' | 'owner' | 'project' | 'amount' | 'dueDate' | 'daysOverdue';
export type SortOrder = 'asc' | 'desc';

export interface AgingFilters extends SiteFilterValues {
  bucket?: '0-30' | '31-60' | '61-90' | '91-180' | '181-360' | '360+';
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: AgingSortField;
  sortOrder?: SortOrder;
}

export async function fetchAgingData(filters: AgingFilters): Promise<AgingData> {
  const params = new URLSearchParams();

  if (filters.siteId) {
    params.set('site_id', filters.siteId);
  }
  if (filters.year && filters.year !== 'all') {
    params.set('year', filters.year);
  }
  if (filters.bucket) {
    params.set('bucket', filters.bucket);
  }
  if (filters.search) {
    params.set('search', filters.search);
  }
  if (filters.limit) {
    params.set('limit', filters.limit.toString());
  }
  if (filters.offset !== undefined) {
    params.set('offset', filters.offset.toString());
  }
  if (filters.sortBy) {
    params.set('sort_by', filters.sortBy);
  }
  if (filters.sortOrder) {
    params.set('sort_order', filters.sortOrder);
  }

  const url = `/api/common-fee/aging${params.toString() ? `?${params}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch aging data');
  }

  return response.json();
}
