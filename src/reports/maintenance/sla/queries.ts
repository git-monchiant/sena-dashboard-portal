import { ResponsibilityType, Priority } from '../types';

export interface AgingBracket {
  bracket: string;
  count: number;
  percentage: number;
  color: string;
}

export interface LongPendingJob {
  id: string;
  requestNumber: string;
  projectName: string;
  unitNumber: string;
  category: string;
  responsibilityType: ResponsibilityType;
  priority: Priority;
  openedDate: string;
  daysOpen: number;
  assignee: string;
  status: string;
}

export interface AgingByPriority {
  priority: Priority;
  totalJobs: number;
  avgDaysOpen: number;
  maxDaysOpen: number;
}

export interface AgingByResponsibility {
  type: ResponsibilityType;
  totalJobs: number;
  avgDaysOpen: number;
  jobsUnder7Days: number;
  jobs7to14Days: number;
  jobsOver14Days: number;
}

export interface AgingTrend {
  month: string;
  avgDaysOpen: number;
  totalPending: number;
}

export interface AgingData {
  summary: {
    totalOpenJobs: number;
    jobsUnder7Days: number;
    jobs7to14Days: number;
    jobsOver14Days: number;
    avgDaysOpen: number;
  };
  agingBrackets: AgingBracket[];
  longPendingJobs: LongPendingJob[];
  agingByPriority: AgingByPriority[];
  agingByResponsibility: AgingByResponsibility[];
  agingTrend: AgingTrend[];
}

// Keep old exports for backward compatibility during transition
export type SLAData = AgingData;
export const fetchSLAData = fetchAgingData;

export async function fetchAgingData(): Promise<AgingData> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    summary: {
      totalOpenJobs: 187,
      jobsUnder7Days: 97,
      jobs7to14Days: 48,
      jobsOver14Days: 42,
      avgDaysOpen: 6.8,
    },
    agingBrackets: [
      { bracket: '0-1 วัน', count: 45, percentage: 24.1, color: '#22c55e' },
      { bracket: '2-3 วัน', count: 52, percentage: 27.8, color: '#84cc16' },
      { bracket: '4-7 วัน', count: 48, percentage: 25.7, color: '#eab308' },
      { bracket: '8-14 วัน', count: 25, percentage: 13.4, color: '#f97316' },
      { bracket: '15-30 วัน', count: 12, percentage: 6.4, color: '#ef4444' },
      { bracket: '>30 วัน', count: 5, percentage: 2.7, color: '#dc2626' },
    ],
    longPendingJobs: [
      {
        id: 'MR001',
        requestNumber: 'MR-2024-001045',
        projectName: 'เสนา วิลล่า พระราม 2',
        unitNumber: 'B-1102',
        category: 'ตรวจสอบ',
        responsibilityType: 'JURISTIC_TECHNICIAN',
        priority: 'low',
        openedDate: '2023-12-10',
        daysOpen: 35,
        assignee: 'นายวิชัย ฝีมือดี',
        status: 'รอดำเนินการ',
      },
      {
        id: 'MR002',
        requestNumber: 'MR-2024-001089',
        projectName: 'เสนา พาร์ค แกรนด์ รามอินทรา',
        unitNumber: 'A-0512',
        category: 'งานซ่อม',
        responsibilityType: 'OUTSOURCE',
        priority: 'high',
        openedDate: '2023-12-20',
        daysOpen: 25,
        assignee: 'หจก. ช่างบ้าน เซอร์วิส',
        status: 'รอวัสดุ',
      },
      {
        id: 'MR003',
        requestNumber: 'MR-2024-001156',
        projectName: 'เสนา ทาวเวอร์ สุขุมวิท',
        unitNumber: 'C-2301',
        category: 'งานซ่อม',
        responsibilityType: 'JURISTIC_TECHNICIAN',
        priority: 'medium',
        openedDate: '2023-12-28',
        daysOpen: 18,
        assignee: 'นายสมชาย ช่างเก่ง',
        status: 'กำลังดำเนินการ',
      },
      {
        id: 'MR004',
        requestNumber: 'MR-2024-001198',
        projectName: 'เสนา วิลล่า พระราม 2',
        unitNumber: 'B-0803',
        category: 'ข้อร้องเรียน',
        responsibilityType: 'SENA_WARRANTY',
        priority: 'urgent',
        openedDate: '2024-01-02',
        daysOpen: 15,
        assignee: 'SENA Team',
        status: 'รอยืนยัน',
      },
      {
        id: 'MR005',
        requestNumber: 'MR-2024-001234',
        projectName: 'เสนา พาร์ค แกรนด์ รามอินทรา',
        unitNumber: 'A-1205',
        category: 'งานซ่อม',
        responsibilityType: 'OUTSOURCE',
        priority: 'high',
        openedDate: '2024-01-05',
        daysOpen: 12,
        assignee: 'บริษัท เอ็มเจ เซอร์วิส',
        status: 'รอนัดหมาย',
      },
    ],
    agingByPriority: [
      { priority: 'urgent', totalJobs: 35, avgDaysOpen: 3.2, maxDaysOpen: 15 },
      { priority: 'high', totalJobs: 68, avgDaysOpen: 5.5, maxDaysOpen: 25 },
      { priority: 'medium', totalJobs: 52, avgDaysOpen: 7.8, maxDaysOpen: 18 },
      { priority: 'low', totalJobs: 32, avgDaysOpen: 12.4, maxDaysOpen: 35 },
    ],
    agingByResponsibility: [
      { type: 'OUTSOURCE', totalJobs: 65, avgDaysOpen: 8.2, jobsUnder7Days: 28, jobs7to14Days: 22, jobsOver14Days: 15 },
      { type: 'SENA_WARRANTY', totalJobs: 42, avgDaysOpen: 5.5, jobsUnder7Days: 25, jobs7to14Days: 12, jobsOver14Days: 5 },
      { type: 'JURISTIC_TECHNICIAN', totalJobs: 80, avgDaysOpen: 6.1, jobsUnder7Days: 44, jobs7to14Days: 24, jobsOver14Days: 12 },
    ],
    agingTrend: [
      { month: 'ม.ค.', avgDaysOpen: 8.5, totalPending: 165 },
      { month: 'ก.พ.', avgDaysOpen: 8.0, totalPending: 172 },
      { month: 'มี.ค.', avgDaysOpen: 7.5, totalPending: 178 },
      { month: 'เม.ย.', avgDaysOpen: 7.2, totalPending: 180 },
      { month: 'พ.ค.', avgDaysOpen: 7.0, totalPending: 185 },
      { month: 'มิ.ย.', avgDaysOpen: 6.8, totalPending: 187 },
    ],
  };
}
