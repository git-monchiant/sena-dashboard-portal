import { ResponsibilityType, Contractor, Technician } from '../types';

export interface ResponsibilityDetailStats {
  type: ResponsibilityType;
  totalJobs: number;
  openJobs: number;
  completedJobs: number;
  jobsUnder7Days: number;
  jobs7to14Days: number;
  jobsOver14Days: number;
  avgResolutionDays: number;
  completionRate: number;
  repeatJobs: number;
  urgentJobs: number;
  monthlyTrend: { month: string; total: number; completed: number }[];
}

export interface ByResponsibleData {
  // SENA first - main focus
  senaWarranty: {
    stats: ResponsibilityDetailStats;
    warrantyByType: { type: string; count: number; avgDays: number }[];
    pendingApproval: number;
  };
  outsource: {
    stats: ResponsibilityDetailStats;
    contractors: Contractor[];
    topCategories: { category: string; count: number }[];
  };
  juristicTechnician: {
    stats: ResponsibilityDetailStats;
    technicians: Technician[];
    workloadDistribution: { name: string; assigned: number; completed: number }[];
  };
}

export async function fetchByResponsibleData(): Promise<ByResponsibleData> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    // SENA WARRANTY - First and most jobs (focus area)
    senaWarranty: {
      stats: {
        type: 'SENA_WARRANTY',
        totalJobs: 580,
        openJobs: 125,  // มากที่สุด - ต้องเร่ง
        completedJobs: 455,
        jobsUnder7Days: 45,
        jobs7to14Days: 38,
        jobsOver14Days: 42,  // มากที่สุด - ต้องติดตาม
        avgResolutionDays: 8.5,  // ช้ากว่าทีมอื่น
        completionRate: 78.4,  // ต่ำกว่าทีมอื่น
        repeatJobs: 18,
        urgentJobs: 35,
        monthlyTrend: [
          { month: 'ม.ค.', total: 95, completed: 72 },
          { month: 'ก.พ.', total: 102, completed: 78 },
          { month: 'มี.ค.', total: 98, completed: 75 },
          { month: 'เม.ย.', total: 105, completed: 82 },
          { month: 'พ.ค.', total: 92, completed: 74 },
          { month: 'มิ.ย.', total: 88, completed: 74 },
        ],
      },
      warrantyByType: [
        { type: 'รอยร้าว/รอยแตก', count: 125, avgDays: 12.5 },
        { type: 'ระบบประปารั่ว', count: 108, avgDays: 8.2 },
        { type: 'สีลอก/สีด่าง', count: 95, avgDays: 10.5 },
        { type: 'กระเบื้องหลุด/แตก', count: 88, avgDays: 9.2 },
        { type: 'ประตู/หน้าต่าง', count: 82, avgDays: 6.5 },
        { type: 'ระบบไฟฟ้า', count: 82, avgDays: 5.8 },
      ],
      pendingApproval: 28,
    },
    // OUTSOURCE - Second
    outsource: {
      stats: {
        type: 'OUTSOURCE',
        totalJobs: 420,
        openJobs: 65,
        completedJobs: 355,
        jobsUnder7Days: 35,
        jobs7to14Days: 18,
        jobsOver14Days: 12,
        avgResolutionDays: 5.8,
        completionRate: 84.5,
        repeatJobs: 8,
        urgentJobs: 15,
        monthlyTrend: [
          { month: 'ม.ค.', total: 68, completed: 62 },
          { month: 'ก.พ.', total: 72, completed: 68 },
          { month: 'มี.ค.', total: 75, completed: 70 },
          { month: 'เม.ย.', total: 70, completed: 65 },
          { month: 'พ.ค.', total: 68, completed: 60 },
          { month: 'มิ.ย.', total: 67, completed: 62 },
        ],
      },
      contractors: [
        { id: 'C001', name: 'บริษัท เอ็มเจ เซอร์วิส จำกัด', totalJobs: 85, completedJobs: 78, avgResolutionDays: 4.5, jobsOver14Days: 2, rating: 4.5 },
        { id: 'C002', name: 'หจก. ช่างบ้าน เซอร์วิส', totalJobs: 72, completedJobs: 65, avgResolutionDays: 5.2, jobsOver14Days: 3, rating: 4.2 },
        { id: 'C003', name: 'บริษัท แอร์โปร เทคนิค จำกัด', totalJobs: 68, completedJobs: 60, avgResolutionDays: 6.1, jobsOver14Days: 5, rating: 3.8 },
        { id: 'C004', name: 'บริษัท สมาร์ท อิเลคทริค จำกัด', totalJobs: 55, completedJobs: 52, avgResolutionDays: 4.8, jobsOver14Days: 1, rating: 4.3 },
        { id: 'C005', name: 'หจก. ปลวก ไม่เอา', totalJobs: 48, completedJobs: 42, avgResolutionDays: 7.2, jobsOver14Days: 8, rating: 3.5 },
      ],
      topCategories: [
        { category: 'ระบบประปา', count: 145 },
        { category: 'ระบบไฟฟ้า', count: 98 },
        { category: 'ระบบแอร์', count: 82 },
        { category: 'งานโครงสร้าง', count: 55 },
        { category: 'อื่นๆ', count: 40 },
      ],
    },
    // JURISTIC TECHNICIAN - Third
    juristicTechnician: {
      stats: {
        type: 'JURISTIC_TECHNICIAN',
        totalJobs: 540,
        openJobs: 80,
        completedJobs: 460,
        jobsUnder7Days: 52,
        jobs7to14Days: 22,
        jobsOver14Days: 6,
        avgResolutionDays: 2.8,
        completionRate: 85.2,
        repeatJobs: 5,
        urgentJobs: 22,
        monthlyTrend: [
          { month: 'ม.ค.', total: 85, completed: 80 },
          { month: 'ก.พ.', total: 92, completed: 88 },
          { month: 'มี.ค.', total: 95, completed: 90 },
          { month: 'เม.ย.', total: 88, completed: 82 },
          { month: 'พ.ค.', total: 90, completed: 85 },
          { month: 'มิ.ย.', total: 90, completed: 85 },
        ],
      },
      technicians: [
        { id: 'T001', name: 'นายสมชาย ช่างเก่ง', totalAssigned: 125, completedJobs: 118, pendingJobs: 7, avgResolutionDays: 2.2, urgentJobs: 5 },
        { id: 'T002', name: 'นายวิชัย ฝีมือดี', totalAssigned: 112, completedJobs: 105, pendingJobs: 7, avgResolutionDays: 2.5, urgentJobs: 4 },
        { id: 'T003', name: 'นายประสิทธิ์ งานไว', totalAssigned: 98, completedJobs: 92, pendingJobs: 6, avgResolutionDays: 2.8, urgentJobs: 6 },
        { id: 'T004', name: 'นายสุรศักดิ์ ทำเร็ว', totalAssigned: 108, completedJobs: 100, pendingJobs: 8, avgResolutionDays: 3.0, urgentJobs: 4 },
        { id: 'T005', name: 'นายธนากร แก้ไขดี', totalAssigned: 97, completedJobs: 90, pendingJobs: 7, avgResolutionDays: 3.2, urgentJobs: 3 },
      ],
      workloadDistribution: [
        { name: 'นายสมชาย', assigned: 125, completed: 118 },
        { name: 'นายวิชัย', assigned: 112, completed: 105 },
        { name: 'นายประสิทธิ์', assigned: 98, completed: 92 },
        { name: 'นายสุรศักดิ์', assigned: 108, completed: 100 },
        { name: 'นายธนากร', assigned: 97, completed: 90 },
      ],
    },
  };
}
