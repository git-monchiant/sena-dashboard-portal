// Maintenance & Complaint Reports - Shared Types

// Core Dimension: Responsibility Type
export type ResponsibilityType = 'OUTSOURCE' | 'SENA_WARRANTY' | 'JURISTIC_TECHNICIAN';

export const responsibilityConfig: Record<
  ResponsibilityType,
  { label: string; shortLabel: string; icon: string; color: string }
> = {
  OUTSOURCE: {
    label: 'จ้างให้แก้ไข',
    shortLabel: 'ผู้รับเหมา',
    icon: '🏗️',
    color: 'blue',
  },
  SENA_WARRANTY: {
    label: 'ส่งให้ SENA แก้ไข (งานรับประกัน)',
    shortLabel: 'SENA',
    icon: '🏠',
    color: 'purple',
  },
  JURISTIC_TECHNICIAN: {
    label: 'ทีมช่างนิติบุคคล',
    shortLabel: 'ทีมช่าง',
    icon: '🛠️',
    color: 'orange',
  },
};

// Request Status
export type RequestStatus = 'open' | 'in_progress' | 'pending_parts' | 'pending_approval' | 'completed' | 'cancelled';

export const statusConfig: Record<
  RequestStatus,
  { label: string; variant: 'info' | 'warning' | 'success' | 'danger' | 'default' }
> = {
  open: { label: 'เปิดงาน', variant: 'info' },
  in_progress: { label: 'กำลังดำเนินการ', variant: 'warning' },
  pending_parts: { label: 'รออะไหล่', variant: 'default' },
  pending_approval: { label: 'รออนุมัติ', variant: 'default' },
  completed: { label: 'เสร็จสิ้น', variant: 'success' },
  cancelled: { label: 'ยกเลิก', variant: 'danger' },
};

// Request Type / Category
export type RequestCategory =
  | 'electrical'
  | 'plumbing'
  | 'structure'
  | 'architecture'
  | 'aircon'
  | 'elevator'
  | 'security'
  | 'fire_system'
  | 'it_comm'
  | 'common_area'
  | 'sanitation'
  | 'landscape'
  | 'general_complaint'
  | 'other';

export const categoryConfig: Record<RequestCategory, { label: string; color: string }> = {
  electrical: { label: 'ไฟฟ้า', color: 'yellow' },
  plumbing: { label: 'ประปา', color: 'blue' },
  structure: { label: 'โครงสร้าง', color: 'slate' },
  architecture: { label: 'สถาปัตยกรรม', color: 'stone' },
  aircon: { label: 'ระบบปรับอากาศ', color: 'cyan' },
  elevator: { label: 'ลิฟต์และบันไดเลื่อน', color: 'purple' },
  security: { label: 'ระบบรักษาความปลอดภัย', color: 'indigo' },
  fire_system: { label: 'ระบบดับเพลิง', color: 'red' },
  it_comm: { label: 'ระบบสื่อสารและ IT', color: 'teal' },
  common_area: { label: 'พื้นที่ส่วนกลาง', color: 'emerald' },
  sanitation: { label: 'ความสะอาดและสุขาภิบาล', color: 'lime' },
  landscape: { label: 'ภูมิทัศน์', color: 'green' },
  general_complaint: { label: 'งานร้องเรียนทั่วไป', color: 'orange' },
  other: { label: 'อื่น ๆ', color: 'gray' },
};

// Job Type (ประเภทงาน)
export type JobType = 'repair' | 'complaint' | 'inspection' | 'preventive';

export const jobTypeConfig: Record<JobType, { label: string; color: string }> = {
  repair: { label: 'งานซ่อม', color: 'blue' },
  complaint: { label: 'ข้อร้องเรียน', color: 'red' },
  inspection: { label: 'ตรวจสอบ', color: 'amber' },
  preventive: { label: 'บำรุงรักษา', color: 'green' },
};

// Priority
export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export const priorityConfig: Record<Priority, { label: string; color: string; targetDays: number }> = {
  urgent: { label: 'เร่งด่วน', color: 'red', targetDays: 1 },
  high: { label: 'สูง', color: 'orange', targetDays: 3 },
  medium: { label: 'ปานกลาง', color: 'amber', targetDays: 7 },
  low: { label: 'ต่ำ', color: 'green', targetDays: 14 },
};

// Job Sub-Status (from DB job_sub_status field)
export const subStatusLabels: Record<string, string> = {
  completed: 'เสร็จสิ้น',
  cancel: 'ยกเลิก',
  serviceInProgress: 'อยู่ระหว่างดำเนินการ',
  technicianDispatchPending: 'รอส่งช่าง',
  confirmAppointmentPending: 'รอยืนยันนัดหมาย',
  appointmentPending: 'รอนัดหมาย',
  inspectionPending: 'รอตรวจสอบ',
  repairInProgress: 'ซ่อมอยู่',
  '': 'ไม่ระบุ',
};

export const subStatusColors: Record<string, string> = {
  completed: '#10b981',
  cancel: '#ef4444',
  serviceInProgress: '#d97706',
  technicianDispatchPending: '#f59e0b',
  confirmAppointmentPending: '#8b5cf6',
  appointmentPending: '#a78bfa',
  inspectionPending: '#06b6d4',
  repairInProgress: '#2563eb',
  '': '#9ca3af',
};

// Maintenance Request
export interface MaintenanceRequest {
  id: string;
  requestNumber: string;
  createdAt: string;
  unitNumber: string;
  building: string;
  projectName: string;
  category: RequestCategory;
  description: string;
  responsibilityType: ResponsibilityType;
  assignee: string;
  vendorName?: string;
  status: RequestStatus;
  priority: Priority;
  targetDueDate: string;
  completedAt?: string;
  daysOpen: number;
  resolutionDays?: number;
}

// Responsibility Stats
export interface ResponsibilityStats {
  type: ResponsibilityType;
  totalJobs: number;
  openJobs: number;
  completedJobs: number;
  jobsUnder7Days: number;
  jobs7to14Days: number;
  jobsOver14Days: number;
  avgResolutionDays: number;
}

// Contractor/Vendor
export interface Contractor {
  id: string;
  name: string;
  totalJobs: number;
  completedJobs: number;
  avgResolutionDays: number;
  jobsOver14Days: number;
  rating: number;
}

// Technician (Juristic Team)
export interface Technician {
  id: string;
  name: string;
  totalAssigned: number;
  completedJobs: number;
  pendingJobs: number;
  avgResolutionDays: number;
  urgentJobs: number;
}
