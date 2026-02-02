export interface ComplaintRecord {
  id: number;
  datasource: string;
  project_id: string;
  project_name: string;
  project_type: string;
  original_project_name: string;
  opm: string;
  category: string;
  complaint_topic: string;
  topic_summary: string;
  original_detail: string;
  extracted_detail: string;
  row_number: number;
}

export interface ComplaintSummary {
  category: string;
  count: string;
}

export interface ComplaintTopProject {
  project_id: string;
  project_name: string;
  count: string;
}

export interface ComplaintFilters {
  projectId?: string;
  projectType?: string;
  category?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface ComplaintData {
  summary: ComplaintSummary[];
  topProjects: ComplaintTopProject[];
  records: ComplaintRecord[];
  distinctProjects: number;
  pagination: { total: number; limit: number; offset: number };
}

export async function fetchComplaintData(filters: ComplaintFilters = {}): Promise<ComplaintData> {
  const params = new URLSearchParams();
  if (filters.projectId) params.set('project_id', filters.projectId);
  if (filters.projectType) params.set('project_type', filters.projectType);
  if (filters.category) params.set('category', filters.category);
  if (filters.search) params.set('search', filters.search);
  if (filters.sortBy) params.set('sort_by', filters.sortBy);
  if (filters.sortOrder) params.set('sort_order', filters.sortOrder);
  if (filters.limit) params.set('limit', filters.limit.toString());
  if (filters.offset !== undefined) params.set('offset', filters.offset.toString());

  const res = await fetch(`/api/quality/complain?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch complaint data');
  return res.json();
}
