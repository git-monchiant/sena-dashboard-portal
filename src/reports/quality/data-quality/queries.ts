export interface ColumnCompleteness {
  column: string;
  label: string;
  total: number;
  filled: number;
  nullCount: number;
  fillRate: number;
}

export interface DateFieldAnalysis {
  field: string;
  label: string;
  total: number;
  filled: number;
  nullCount: number;
  nullOpenJobs: number;
}

export interface NullOpenDateProject {
  projectId: string;
  projectName: string;
  totalJobs: number;
  nullOpenDate: number;
  nullRate: number;
}

export interface DataAnomaly {
  type: string;
  label: string;
  count: number;
  description: string;
}

export interface DataQualityData {
  totalRecords: number;
  dateRange: { min: string | null; max: string | null };
  columnCompleteness: ColumnCompleteness[];
  dateFieldAnalysis: DateFieldAnalysis[];
  nullOpenDateByProject: NullOpenDateProject[];
  anomalies: DataAnomaly[];
}

export async function fetchDataQuality(): Promise<DataQualityData> {
  const res = await fetch('/api/quality/data-quality');
  if (!res.ok) throw new Error('Failed to fetch data quality');
  return res.json();
}
