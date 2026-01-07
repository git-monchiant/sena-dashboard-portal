// Common types used across the application

export interface Project {
  id: number;
  name: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  avatar?: string;
}

export interface FilterState {
  projectId: string;
  dateRange: DateRangeType;
  startDate?: string;
  endDate?: string;
}

export type DateRangeType = 'today' | 'wtd' | 'mtd' | 'qtd' | 'ytd' | 'custom';

export interface KPIData {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  target?: {
    value: number;
    percentage: number;
  };
}

export interface ChartDataPoint {
  [key: string]: string | number;
}

export interface ReportModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  href: string;
  tags: string[];
  highlights: string[];
  stats: {
    reports: number;
    lastUpdated: string;
  };
  disabled?: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
