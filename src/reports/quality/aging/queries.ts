export interface AgingJob {
  id: string;
  requestNumber: string;
  projectName: string;
  unitNumber: string;
  category: string;
  assignee: string;
  status: string;
  openDate: string;
  assessmentDate: string | null;
  assignDate: string | null;
  serviceDate: string | null;
  customerName: string;
  daysOpen: number;
  bucket: '0-30' | '31-45' | '46-60' | '61-120' | '120+';
}

export interface AgingPagination {
  total: number;
  limit: number;
  offset: number;
}

export interface AgingData {
  jobs: AgingJob[];
  pagination: AgingPagination;
}

export type AgingSortField = 'daysOpen' | 'requestNumber' | 'projectName' | 'unitNumber' | 'category' | 'assignee' | 'status' | 'openDate';
export type SortOrder = 'asc' | 'desc';

export type JobFilter = 'open' | 'closed' | 'all';

export interface AgingFilters {
  projectId?: string;
  projectType?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  jobFilter?: JobFilter;
  bucket?: '0-30' | '31-45' | '46-60' | '61-120' | '120+';
  search?: string;
  sortBy?: AgingSortField;
  sortOrder?: SortOrder;
  limit?: number;
  offset?: number;
}

export interface JobDetail {
  id: string;
  requestNumber: string;
  projectName: string;
  unitNumber: string;
  customerName: string;
  customerPhone: string;
  category: string;
  status: string;
  jobStatus: string;
  issue: string;
  symptom: string;
  symptomDetail: string;
  openDate: string;
  assessmentDate: string | null;
  assignDate: string | null;
  serviceDate: string | null;
  closeDate: string | null;
  slaDate: string | null;
  assignee: string;
  technicianEmail: string;
  technicianDetail: string;
  technicianNote: string;
  adminNote: string;
  jobHistory: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  customerImageUrl: string;
  isUrgent: boolean;
  warrantyStatus: string;
  slaExceeded: boolean;
  requestChannel: string;
  reviewScore: number | null;
  reviewComment: string;
  reviewDate: string | null;
  daysOpen: number;
}

export async function fetchJobDetail(id: string): Promise<JobDetail> {
  const res = await fetch(`/api/quality/job/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to fetch job detail');
  return res.json();
}

export async function fetchAgingData(filters: AgingFilters = {}): Promise<AgingData> {
  const params = new URLSearchParams();

  if (filters.projectId) params.set('project_id', filters.projectId);
  if (filters.projectType) params.set('project_type', filters.projectType);
  if (filters.category) params.set('category', filters.category);
  if (filters.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters.dateTo) params.set('date_to', filters.dateTo);
  if (filters.jobFilter) params.set('job_filter', filters.jobFilter);
  if (filters.bucket) params.set('bucket', filters.bucket);
  if (filters.search) params.set('search', filters.search);
  if (filters.sortBy) params.set('sort_by', filters.sortBy);
  if (filters.sortOrder) params.set('sort_order', filters.sortOrder);
  if (filters.limit) params.set('limit', filters.limit.toString());
  if (filters.offset !== undefined) params.set('offset', filters.offset.toString());

  const res = await fetch(`/api/quality/aging?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch aging data');
  return res.json();
}
