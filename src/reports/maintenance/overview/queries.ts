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

export interface ResolutionTrendDataPoint {
  month: string;
  average: number;
  outsource: number;
  senaWarranty: number;
  juristicTechnician: number;
}

export interface JobTypeDistribution {
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

export interface OpenJobsByCategory {
  category: string;
  label: string;
  openJobs: number;
  color: string;
}

export interface ProjectDefectByCategory {
  projectId: string;
  projectName: string;
  electrical: number;
  plumbing: number;
  structure: number;
  aircon: number;
  elevator: number;
  commonArea: number;
  other: number;
  total: number;
}

export interface ProjectDefectByJobType {
  projectId: string;
  projectName: string;
  repair: number;
  complaint: number;
  inspection: number;
  preventive: number;
  total: number;
}

export interface MaintenanceOverviewData {
  kpis: MaintenanceKPIData;
  responsibilityStats: ResponsibilityStats[];
  trend: TrendDataPoint[];
  resolutionTrend: ResolutionTrendDataPoint[];
  jobTypeDistribution: JobTypeDistribution;
  openJobsByCategory: OpenJobsByCategory[];
  projectDefects: ProjectDefect[];
  projectDefectsByCategory: ProjectDefectByCategory[];
  projectDefectsByJobType: ProjectDefectByJobType[];
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
    resolutionTrend: [
      { month: 'ม.ค.', average: 4.4, outsource: 6.2, senaWarranty: 3.8, juristicTechnician: 3.1 },
      { month: 'ก.พ.', average: 4.3, outsource: 6.5, senaWarranty: 3.5, juristicTechnician: 2.9 },
      { month: 'มี.ค.', average: 3.9, outsource: 5.8, senaWarranty: 3.2, juristicTechnician: 2.7 },
      { month: 'เม.ย.', average: 4.2, outsource: 6.1, senaWarranty: 3.4, juristicTechnician: 3.0 },
      { month: 'พ.ค.', average: 3.7, outsource: 5.5, senaWarranty: 3.1, juristicTechnician: 2.6 },
      { month: 'มิ.ย.', average: 3.9, outsource: 5.8, senaWarranty: 3.2, juristicTechnician: 2.8 },
    ],
    jobTypeDistribution: {
      repair: 55,
      complaint: 20,
      inspection: 15,
      preventive: 10,
    },
    openJobsByCategory: [
      { category: 'electrical', label: 'ไฟฟ้า', openJobs: 32, color: '#eab308' },
      { category: 'plumbing', label: 'ประปา', openJobs: 28, color: '#3b82f6' },
      { category: 'structure', label: 'โครงสร้าง', openJobs: 15, color: '#64748b' },
      { category: 'architecture', label: 'สถาปัตยกรรม', openJobs: 12, color: '#78716c' },
      { category: 'aircon', label: 'ระบบปรับอากาศ', openJobs: 22, color: '#06b6d4' },
      { category: 'elevator', label: 'ลิฟต์และบันไดเลื่อน', openJobs: 8, color: '#a855f7' },
      { category: 'security', label: 'ระบบรักษาความปลอดภัย', openJobs: 10, color: '#6366f1' },
      { category: 'fire_system', label: 'ระบบดับเพลิง', openJobs: 5, color: '#ef4444' },
      { category: 'it_comm', label: 'ระบบสื่อสารและ IT', openJobs: 14, color: '#14b8a6' },
      { category: 'common_area', label: 'พื้นที่ส่วนกลาง', openJobs: 18, color: '#10b981' },
      { category: 'sanitation', label: 'ความสะอาดและสุขาภิบาล', openJobs: 9, color: '#84cc16' },
      { category: 'landscape', label: 'ภูมิทัศน์', openJobs: 6, color: '#22c55e' },
      { category: 'general_complaint', label: 'งานร้องเรียนทั่วไป', openJobs: 4, color: '#f97316' },
      { category: 'other', label: 'อื่น ๆ', openJobs: 4, color: '#9ca3af' },
    ],
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
    projectDefectsByCategory: [
      { projectId: 'P001', projectName: 'SENA Park Grand รามอินทรา', electrical: 12, plumbing: 10, structure: 8, aircon: 6, elevator: 4, commonArea: 5, other: 3, total: 48 },
      { projectId: 'P002', projectName: 'SENA Villa ลาดพร้าว', electrical: 8, plumbing: 9, structure: 5, aircon: 4, elevator: 3, commonArea: 4, other: 2, total: 35 },
      { projectId: 'P007', projectName: 'SENA Kith ศรีนครินทร์', electrical: 10, plumbing: 6, structure: 4, aircon: 5, elevator: 2, commonArea: 3, other: 2, total: 32 },
      { projectId: 'P004', projectName: 'SENA Park รังสิต', electrical: 7, plumbing: 6, structure: 5, aircon: 4, elevator: 2, commonArea: 2, other: 2, total: 28 },
      { projectId: 'P011', projectName: 'SENA Park สุขุมวิท', electrical: 8, plumbing: 5, structure: 5, aircon: 4, elevator: 3, commonArea: 2, other: 1, total: 28 },
      { projectId: 'P005', projectName: 'SENA Grand Home พระราม 2', electrical: 6, plumbing: 5, structure: 4, aircon: 4, elevator: 2, commonArea: 2, other: 2, total: 25 },
      { projectId: 'P003', projectName: 'SENA Kith บางนา', electrical: 5, plumbing: 5, structure: 3, aircon: 3, elevator: 2, commonArea: 2, other: 2, total: 22 },
      { projectId: 'P009', projectName: 'SENA Park Grand เพชรเกษม', electrical: 5, plumbing: 5, structure: 4, aircon: 3, elevator: 2, commonArea: 2, other: 1, total: 22 },
      { projectId: 'P006', projectName: 'SENA Park Ville บางใหญ่', electrical: 4, plumbing: 5, structure: 3, aircon: 3, elevator: 2, commonArea: 2, other: 1, total: 20 },
      { projectId: 'P008', projectName: 'SENA Villa รัตนาธิเบศร์', electrical: 4, plumbing: 4, structure: 3, aircon: 3, elevator: 1, commonArea: 2, other: 1, total: 18 },
      { projectId: 'P014', projectName: 'SENA Grand ปิ่นเกล้า', electrical: 4, plumbing: 4, structure: 3, aircon: 3, elevator: 1, commonArea: 2, other: 1, total: 18 },
      { projectId: 'P010', projectName: 'SENA Ecotown บางนา', electrical: 3, plumbing: 3, structure: 3, aircon: 2, elevator: 1, commonArea: 2, other: 1, total: 15 },
      { projectId: 'P016', projectName: 'SENA Villa อ่อนนุช', electrical: 4, plumbing: 3, structure: 2, aircon: 2, elevator: 1, commonArea: 2, other: 1, total: 15 },
      { projectId: 'P012', projectName: 'SENA Villa พหลโยธิน', electrical: 3, plumbing: 3, structure: 2, aircon: 2, elevator: 1, commonArea: 2, other: 1, total: 14 },
      { projectId: 'P013', projectName: 'SENA Kith ราชพฤกษ์', electrical: 3, plumbing: 2, structure: 2, aircon: 2, elevator: 1, commonArea: 1, other: 1, total: 12 },
      { projectId: 'P018', projectName: 'SENA Park นวมินทร์', electrical: 3, plumbing: 2, structure: 2, aircon: 2, elevator: 1, commonArea: 1, other: 1, total: 12 },
      { projectId: 'P015', projectName: 'SENA Park เอกมัย', electrical: 2, plumbing: 2, structure: 2, aircon: 1, elevator: 1, commonArea: 1, other: 1, total: 10 },
      { projectId: 'P020', projectName: 'SENA Villa บางแค', electrical: 2, plumbing: 2, structure: 2, aircon: 1, elevator: 1, commonArea: 1, other: 1, total: 10 },
      { projectId: 'P017', projectName: 'SENA Ecoville มีนบุรี', electrical: 2, plumbing: 2, structure: 1, aircon: 1, elevator: 1, commonArea: 1, other: 0, total: 8 },
      { projectId: 'P019', projectName: 'SENA Kith ประชาอุทิศ', electrical: 1, plumbing: 1, structure: 1, aircon: 1, elevator: 1, commonArea: 1, other: 0, total: 6 },
    ],
    projectDefectsByJobType: [
      { projectId: 'P001', projectName: 'SENA Park Grand รามอินทรา', repair: 26, complaint: 10, inspection: 7, preventive: 5, total: 48 },
      { projectId: 'P002', projectName: 'SENA Villa ลาดพร้าว', repair: 19, complaint: 7, inspection: 5, preventive: 4, total: 35 },
      { projectId: 'P007', projectName: 'SENA Kith ศรีนครินทร์', repair: 18, complaint: 6, inspection: 5, preventive: 3, total: 32 },
      { projectId: 'P004', projectName: 'SENA Park รังสิต', repair: 15, complaint: 6, inspection: 4, preventive: 3, total: 28 },
      { projectId: 'P011', projectName: 'SENA Park สุขุมวิท', repair: 15, complaint: 6, inspection: 4, preventive: 3, total: 28 },
      { projectId: 'P005', projectName: 'SENA Grand Home พระราม 2', repair: 14, complaint: 5, inspection: 4, preventive: 2, total: 25 },
      { projectId: 'P003', projectName: 'SENA Kith บางนา', repair: 12, complaint: 4, inspection: 4, preventive: 2, total: 22 },
      { projectId: 'P009', projectName: 'SENA Park Grand เพชรเกษม', repair: 12, complaint: 4, inspection: 4, preventive: 2, total: 22 },
      { projectId: 'P006', projectName: 'SENA Park Ville บางใหญ่', repair: 11, complaint: 4, inspection: 3, preventive: 2, total: 20 },
      { projectId: 'P008', projectName: 'SENA Villa รัตนาธิเบศร์', repair: 10, complaint: 3, inspection: 3, preventive: 2, total: 18 },
      { projectId: 'P014', projectName: 'SENA Grand ปิ่นเกล้า', repair: 10, complaint: 3, inspection: 3, preventive: 2, total: 18 },
      { projectId: 'P010', projectName: 'SENA Ecotown บางนา', repair: 8, complaint: 3, inspection: 2, preventive: 2, total: 15 },
      { projectId: 'P016', projectName: 'SENA Villa อ่อนนุช', repair: 8, complaint: 3, inspection: 2, preventive: 2, total: 15 },
      { projectId: 'P012', projectName: 'SENA Villa พหลโยธิน', repair: 8, complaint: 2, inspection: 2, preventive: 2, total: 14 },
      { projectId: 'P013', projectName: 'SENA Kith ราชพฤกษ์', repair: 7, complaint: 2, inspection: 2, preventive: 1, total: 12 },
      { projectId: 'P018', projectName: 'SENA Park นวมินทร์', repair: 7, complaint: 2, inspection: 2, preventive: 1, total: 12 },
      { projectId: 'P015', projectName: 'SENA Park เอกมัย', repair: 5, complaint: 2, inspection: 2, preventive: 1, total: 10 },
      { projectId: 'P020', projectName: 'SENA Villa บางแค', repair: 5, complaint: 2, inspection: 2, preventive: 1, total: 10 },
      { projectId: 'P017', projectName: 'SENA Ecoville มีนบุรี', repair: 4, complaint: 2, inspection: 1, preventive: 1, total: 8 },
      { projectId: 'P019', projectName: 'SENA Kith ประชาอุทิศ', repair: 3, complaint: 1, inspection: 1, preventive: 1, total: 6 },
    ],
    syncInfo: {
      lastSyncAt: '2024-01-15 14:30:00',
      totalProjects: 4,
      totalUnits: 2820,
    },
  };
}
