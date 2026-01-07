import { ResponsibilityType, Priority, RequestStatus } from '../types';

export interface ExceptionJob {
  id: string;
  requestNumber: string;
  projectName: string;
  unitNumber: string;
  category: string;
  description: string;
  responsibilityType: ResponsibilityType;
  priority: Priority;
  status: RequestStatus;
  assignee: string;
  createdAt: string;
  exceptionType: 'repeat' | 'cancelled' | 'long_pending' | 'escalated' | 'no_assignee';
  exceptionReason: string;
  daysOpen: number;
}

export interface ExceptionSummary {
  repeatJobs: number;
  cancelledJobs: number;
  longPendingJobs: number;
  escalatedJobs: number;
  noAssigneeJobs: number;
  totalExceptions: number;
}

export interface ExceptionTrend {
  month: string;
  repeat: number;
  cancelled: number;
  longPending: number;
}

export interface ExceptionData {
  summary: ExceptionSummary;
  jobs: ExceptionJob[];
  trend: ExceptionTrend[];
  byProject: { project: string; exceptions: number }[];
  byResponsibility: { type: ResponsibilityType; exceptions: number; percentage: number }[];
}

export async function fetchExceptionData(): Promise<ExceptionData> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    summary: {
      repeatJobs: 25,
      cancelledJobs: 18,
      longPendingJobs: 15,
      escalatedJobs: 8,
      noAssigneeJobs: 5,
      totalExceptions: 71,
    },
    jobs: [
      {
        id: 'EX001',
        requestNumber: 'MR-2024-001234',
        projectName: 'เสนา พาร์ค แกรนด์ รามอินทรา',
        unitNumber: 'A-1205',
        category: 'งานซ่อม',
        description: 'ท่อน้ำรั่วซ้ำเป็นครั้งที่ 3',
        responsibilityType: 'OUTSOURCE',
        priority: 'high',
        status: 'in_progress',
        assignee: 'บริษัท เอ็มเจ เซอร์วิส',
        createdAt: '2024-01-08',
        exceptionType: 'repeat',
        exceptionReason: 'งานซ่อมซ้ำ 3 ครั้งในปัญหาเดียวกัน',
        daysOpen: 7,
      },
      {
        id: 'EX002',
        requestNumber: 'MR-2024-001198',
        projectName: 'เสนา วิลล่า พระราม 2',
        unitNumber: 'B-0803',
        category: 'ข้อร้องเรียน',
        description: 'ลูกบ้านยกเลิกเนื่องจากย้ายออก',
        responsibilityType: 'SENA_WARRANTY',
        priority: 'medium',
        status: 'cancelled',
        assignee: 'SENA Team',
        createdAt: '2024-01-05',
        exceptionType: 'cancelled',
        exceptionReason: 'ลูกบ้านย้ายออก - ยกเลิกงาน',
        daysOpen: 0,
      },
      {
        id: 'EX003',
        requestNumber: 'MR-2024-001156',
        projectName: 'เสนา ทาวเวอร์ สุขุมวิท',
        unitNumber: 'C-2301',
        category: 'งานซ่อม',
        description: 'รออะไหล่นานเกิน 14 วัน',
        responsibilityType: 'JURISTIC_TECHNICIAN',
        priority: 'medium',
        status: 'pending_parts',
        assignee: 'นายสมชาย ช่างเก่ง',
        createdAt: '2023-12-20',
        exceptionType: 'long_pending',
        exceptionReason: 'รออะไหล่นานเกิน 14 วัน',
        daysOpen: 25,
      },
      {
        id: 'EX004',
        requestNumber: 'MR-2024-001089',
        projectName: 'เสนา พาร์ค แกรนด์ รามอินทรา',
        unitNumber: 'A-0512',
        category: 'ข้อร้องเรียน',
        description: 'ปัญหาเสียงดังจากห้องข้างบน - escalated',
        responsibilityType: 'JURISTIC_TECHNICIAN',
        priority: 'urgent',
        status: 'in_progress',
        assignee: 'ผู้จัดการนิติบุคคล',
        createdAt: '2024-01-02',
        exceptionType: 'escalated',
        exceptionReason: 'Escalated จากลูกบ้านร้องเรียนซ้ำ',
        daysOpen: 13,
      },
      {
        id: 'EX005',
        requestNumber: 'MR-2024-001045',
        projectName: 'เสนา วิลล่า พระราม 2',
        unitNumber: 'B-1102',
        category: 'ตรวจสอบ',
        description: 'งานยังไม่มีผู้รับผิดชอบ',
        responsibilityType: 'OUTSOURCE',
        priority: 'low',
        status: 'open',
        assignee: '-',
        createdAt: '2024-01-10',
        exceptionType: 'no_assignee',
        exceptionReason: 'ยังไม่มีการมอบหมายผู้รับผิดชอบ',
        daysOpen: 5,
      },
      {
        id: 'EX006',
        requestNumber: 'MR-2024-000998',
        projectName: 'เสนา ทาวเวอร์ สุขุมวิท',
        unitNumber: 'C-1508',
        category: 'งานซ่อม',
        description: 'แอร์เสียซ้ำหลังซ่อม',
        responsibilityType: 'OUTSOURCE',
        priority: 'high',
        status: 'in_progress',
        assignee: 'บริษัท แอร์โปร เทคนิค',
        createdAt: '2024-01-12',
        exceptionType: 'repeat',
        exceptionReason: 'งานซ่อมซ้ำ 2 ครั้งในปัญหาเดียวกัน',
        daysOpen: 3,
      },
      {
        id: 'EX007',
        requestNumber: 'MR-2024-000876',
        projectName: 'เสนา พาร์ค แกรนด์ รามอินทรา',
        unitNumber: 'A-0801',
        category: 'บำรุงรักษา',
        description: 'ยกเลิกเนื่องจากซ้ำกับงานอื่น',
        responsibilityType: 'JURISTIC_TECHNICIAN',
        priority: 'low',
        status: 'cancelled',
        assignee: 'นายวิชัย ฝีมือดี',
        createdAt: '2024-01-03',
        exceptionType: 'cancelled',
        exceptionReason: 'ซ้ำกับงานหมายเลข MR-2024-000854',
        daysOpen: 0,
      },
      {
        id: 'EX008',
        requestNumber: 'MR-2024-001301',
        projectName: 'เสนา วิลล่า พระราม 2',
        unitNumber: 'B-0205',
        category: 'งานซ่อม',
        description: 'รอการอนุมัติงบประมาณ',
        responsibilityType: 'OUTSOURCE',
        priority: 'medium',
        status: 'pending_approval',
        assignee: 'รอมอบหมาย',
        createdAt: '2023-12-28',
        exceptionType: 'long_pending',
        exceptionReason: 'รอการอนุมัติงบประมาณนานเกิน 14 วัน',
        daysOpen: 18,
      },
    ],
    trend: [
      { month: 'ม.ค.', repeat: 3, cancelled: 2, longPending: 4 },
      { month: 'ก.พ.', repeat: 4, cancelled: 3, longPending: 3 },
      { month: 'มี.ค.', repeat: 5, cancelled: 2, longPending: 2 },
      { month: 'เม.ย.', repeat: 4, cancelled: 4, longPending: 3 },
      { month: 'พ.ค.', repeat: 5, cancelled: 3, longPending: 2 },
      { month: 'มิ.ย.', repeat: 4, cancelled: 4, longPending: 1 },
    ],
    byProject: [
      { project: 'เสนา พาร์ค แกรนด์ รามอินทรา', exceptions: 28 },
      { project: 'เสนา วิลล่า พระราม 2', exceptions: 25 },
      { project: 'เสนา ทาวเวอร์ สุขุมวิท', exceptions: 18 },
    ],
    byResponsibility: [
      { type: 'OUTSOURCE', exceptions: 32, percentage: 45.1 },
      { type: 'JURISTIC_TECHNICIAN', exceptions: 24, percentage: 33.8 },
      { type: 'SENA_WARRANTY', exceptions: 15, percentage: 21.1 },
    ],
  };
}
