import { QualityFilterState } from './filters';

export interface QualityKPIData {
  totalJobs: number;
  openJobs: number;
  jobsOver14Days: number;
  aging: {
    days0to7: number;
    days8to14: number;
    days15to30: number;
    daysOver30: number;
  };
  avgResolutionDays: number;
  completionRate: number;
}

export interface TrendDataPoint {
  month: string;
  total: number;
  completed: number;
}

export interface OpenJobsByCategory {
  category: string;
  label: string;
  totalJobs: number;
  openJobs: number;
  color: string;
}

export interface ProjectDefect {
  projectId: string;
  projectName: string;
  totalDefects: number;
  openDefects: number;
  defectsOver14Days: number;
  avgResolutionDays: number;
  completionRate: number;
}

export interface ProjectDefectByCategory {
  projectId: string;
  projectName: string;
  categories: Record<string, number>;
  total: number;
}

export interface StatusDistribution {
  jobStatus: string;
  jobSubStatus: string;
  count: number;
}

export interface WarrantyDistribution {
  warrantyStatus: string;
  label: string;
  total: number;
  openJobs: number;
  color: string;
}

export interface QualityOverviewData {
  kpis: QualityKPIData;
  trend: TrendDataPoint[];
  openJobsByCategory: OpenJobsByCategory[];
  projectDefects: ProjectDefect[];
  projectDefectsByCategory: ProjectDefectByCategory[];
  allCategories: string[];
  statusDistribution: StatusDistribution[];
  warrantyDistribution: WarrantyDistribution[];
  requestChannelDistribution: { channel: string; total: number; openJobs: number; color: string }[];
  syncInfo: {
    lastDataDate: string;
    totalProjects: number;
    totalUnits: number;
  };
  nullDateOpenJobs: number;
}

export async function fetchQualityOverview(
  filters: QualityFilterState
): Promise<QualityOverviewData> {
  const params = new URLSearchParams();
  if (filters.projectId) params.set('project_id', filters.projectId);
  if (filters.projectType) params.set('project_type', filters.projectType);
  if (filters.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters.dateTo) params.set('date_to', filters.dateTo);

  const res = await fetch(`/api/quality/overview?${params}`);
  if (!res.ok) throw new Error('Failed to fetch quality overview');
  return res.json();
}

export interface ProjectOption {
  project_id: string;
  project_name: string;
}

export async function fetchProjects(): Promise<ProjectOption[]> {
  const res = await fetch('/api/quality/projects');
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export interface CategoryTrendPoint {
  month: string;
  total: number;
  completed: number;
  openJobs: number;
}

export async function fetchCategoryTrend(
  category: string,
  filters: Pick<QualityFilterState, 'projectId' | 'projectType'>
): Promise<CategoryTrendPoint[]> {
  const params = new URLSearchParams();
  params.set('category', category);
  if (filters.projectId) params.set('project_id', filters.projectId);
  if (filters.projectType) params.set('project_type', filters.projectType);

  const res = await fetch(`/api/quality/category-trend?${params}`);
  if (!res.ok) throw new Error('Failed to fetch category trend');
  return res.json();
}
