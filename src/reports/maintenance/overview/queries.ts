import { MaintenanceFilterState } from './filters';
import { ResponsibilityStats } from '../types';

export interface MaintenanceKPIData {
  totalJobs: { value: number; change: string; changeType: 'positive' | 'negative' | 'neutral' };
  openJobs: { value: number; change: string; changeType: 'positive' | 'negative' | 'neutral' };
  jobsOver14Days: { value: number; change: string; changeType: 'positive' | 'negative' | 'neutral' };
  avgResolutionDays: { value: number; change: string; changeType: 'positive' | 'negative' | 'neutral' };
  completionRate: { value: number; change: string; changeType: 'positive' | 'negative' | 'neutral' };
}

export interface TrendDataPoint {
  month: string;
  total: number;
  completed: number;
}

export interface CategoryDistribution {
  repair: number;
  complaint: number;
  inspection: number;
  preventive: number;
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

export interface MaintenanceOverviewData {
  kpis: MaintenanceKPIData;
  responsibilityStats: ResponsibilityStats[];
  trend: TrendDataPoint[];
  categoryDistribution: CategoryDistribution;
  projectDefects: ProjectDefect[];
  syncInfo: {
    lastSyncAt: string;
    totalProjects: number;
    totalUnits: number;
  };
}

export async function fetchMaintenanceOverview(
  _filters: MaintenanceFilterState
): Promise<MaintenanceOverviewData> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    kpis: {
      totalJobs: { value: 1245, change: '+12.5%', changeType: 'positive' },
      openJobs: { value: 187, change: '-8.2%', changeType: 'positive' },
      jobsOver14Days: { value: 42, change: '-15.3%', changeType: 'positive' },
      avgResolutionDays: { value: 4.2, change: '-0.8', changeType: 'positive' },
      completionRate: { value: 84.9, change: '+3.2%', changeType: 'positive' },
    },
    responsibilityStats: [
      {
        type: 'OUTSOURCE',
        totalJobs: 420,
        openJobs: 65,
        completedJobs: 355,
        jobsUnder7Days: 28,
        jobs7to14Days: 22,
        jobsOver14Days: 15,
        avgResolutionDays: 5.8,
      },
      {
        type: 'SENA_WARRANTY',
        totalJobs: 285,
        openJobs: 42,
        completedJobs: 243,
        jobsUnder7Days: 25,
        jobs7to14Days: 12,
        jobsOver14Days: 5,
        avgResolutionDays: 3.2,
      },
      {
        type: 'JURISTIC_TECHNICIAN',
        totalJobs: 540,
        openJobs: 80,
        completedJobs: 460,
        jobsUnder7Days: 44,
        jobs7to14Days: 24,
        jobsOver14Days: 12,
        avgResolutionDays: 2.8,
      },
    ],
    trend: [
      { month: 'ม.ค.', total: 180, completed: 165 },
      { month: 'ก.พ.', total: 195, completed: 180 },
      { month: 'มี.ค.', total: 210, completed: 195 },
      { month: 'เม.ย.', total: 225, completed: 210 },
      { month: 'พ.ค.', total: 218, completed: 205 },
      { month: 'มิ.ย.', total: 217, completed: 203 },
    ],
    categoryDistribution: {
      repair: 55,
      complaint: 20,
      inspection: 15,
      preventive: 10,
    },
    projectDefects: [
      { projectId: 'P001', projectName: 'SENA Park Grand รามอินทรา', totalDefects: 285, openDefects: 48, defectsOver14Days: 18, avgResolutionDays: 9.2, completionRate: 83.2 },
      { projectId: 'P002', projectName: 'SENA Villa ลาดพร้าว', totalDefects: 198, openDefects: 35, defectsOver14Days: 12, avgResolutionDays: 7.5, completionRate: 82.3 },
      { projectId: 'P003', projectName: 'SENA Kith บางนา', totalDefects: 156, openDefects: 22, defectsOver14Days: 8, avgResolutionDays: 5.8, completionRate: 85.9 },
      { projectId: 'P004', projectName: 'SENA Park รังสิต', totalDefects: 142, openDefects: 28, defectsOver14Days: 10, avgResolutionDays: 8.1, completionRate: 80.3 },
      { projectId: 'P005', projectName: 'SENA Grand Home พระราม 2', totalDefects: 132, openDefects: 25, defectsOver14Days: 9, avgResolutionDays: 7.8, completionRate: 81.1 },
      { projectId: 'P006', projectName: 'SENA Park Ville บางใหญ่', totalDefects: 128, openDefects: 20, defectsOver14Days: 6, avgResolutionDays: 5.5, completionRate: 84.4 },
      { projectId: 'P007', projectName: 'SENA Kith ศรีนครินทร์', totalDefects: 118, openDefects: 32, defectsOver14Days: 15, avgResolutionDays: 10.2, completionRate: 72.9 },
      { projectId: 'P008', projectName: 'SENA Villa รัตนาธิเบศร์', totalDefects: 112, openDefects: 18, defectsOver14Days: 5, avgResolutionDays: 4.8, completionRate: 83.9 },
      { projectId: 'P009', projectName: 'SENA Park Grand เพชรเกษม', totalDefects: 105, openDefects: 22, defectsOver14Days: 8, avgResolutionDays: 6.5, completionRate: 79.0 },
      { projectId: 'P010', projectName: 'SENA Ecotown บางนา', totalDefects: 98, openDefects: 15, defectsOver14Days: 4, avgResolutionDays: 4.2, completionRate: 84.7 },
      { projectId: 'P011', projectName: 'SENA Park สุขุมวิท', totalDefects: 95, openDefects: 28, defectsOver14Days: 12, avgResolutionDays: 9.8, completionRate: 70.5 },
      { projectId: 'P012', projectName: 'SENA Villa พหลโยธิน', totalDefects: 88, openDefects: 14, defectsOver14Days: 3, avgResolutionDays: 4.5, completionRate: 84.1 },
      { projectId: 'P013', projectName: 'SENA Kith ราชพฤกษ์', totalDefects: 82, openDefects: 12, defectsOver14Days: 4, avgResolutionDays: 5.2, completionRate: 85.4 },
      { projectId: 'P014', projectName: 'SENA Grand ปิ่นเกล้า', totalDefects: 78, openDefects: 18, defectsOver14Days: 7, avgResolutionDays: 7.2, completionRate: 76.9 },
      { projectId: 'P015', projectName: 'SENA Park เอกมัย', totalDefects: 72, openDefects: 10, defectsOver14Days: 2, avgResolutionDays: 3.8, completionRate: 86.1 },
      { projectId: 'P016', projectName: 'SENA Villa อ่อนนุช', totalDefects: 68, openDefects: 15, defectsOver14Days: 6, avgResolutionDays: 6.8, completionRate: 77.9 },
      { projectId: 'P017', projectName: 'SENA Ecoville มีนบุรี', totalDefects: 62, openDefects: 8, defectsOver14Days: 2, avgResolutionDays: 4.0, completionRate: 87.1 },
      { projectId: 'P018', projectName: 'SENA Park นวมินทร์', totalDefects: 58, openDefects: 12, defectsOver14Days: 5, avgResolutionDays: 6.2, completionRate: 79.3 },
      { projectId: 'P019', projectName: 'SENA Kith ประชาอุทิศ', totalDefects: 52, openDefects: 6, defectsOver14Days: 1, avgResolutionDays: 3.5, completionRate: 88.5 },
      { projectId: 'P020', projectName: 'SENA Villa บางแค', totalDefects: 48, openDefects: 10, defectsOver14Days: 4, avgResolutionDays: 5.8, completionRate: 79.2 },
    ],
    syncInfo: {
      lastSyncAt: '2024-01-15 14:30:00',
      totalProjects: 4,
      totalUnits: 2820,
    },
  };
}
