export interface ContractorDetail {
  id: string;
  name: string;
  category: string;
  contactPerson: string;
  phone: string;
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  jobsOver14Days: number;
  avgResolutionDays: number;
  completionRate: number;
  rating: number;
  totalCost: number;
  avgCostPerJob: number;
  repeatJobRate: number;
  monthlyTrend: { month: string; jobs: number; completed: number; cost: number }[];
}

export interface ContractorSummary {
  totalContractors: number;
  activeContractors: number;
  totalJobs: number;
  avgCompletionRate: number;
  avgRating: number;
  totalSpend: number;
}

export interface ContractorData {
  summary: ContractorSummary;
  contractors: ContractorDetail[];
  categoryBreakdown: { category: string; contractors: number; jobs: number; avgCompletionRate: number }[];
  topPerformers: { id: string; name: string; completionRate: number; rating: number }[];
  needsAttention: { id: string; name: string; issue: string; value: number }[];
}

export async function fetchContractorData(): Promise<ContractorData> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    summary: {
      totalContractors: 12,
      activeContractors: 8,
      totalJobs: 420,
      avgCompletionRate: 82.5,
      avgRating: 4.1,
      totalSpend: 2850000,
    },
    contractors: [
      {
        id: 'C001',
        name: 'บริษัท เอ็มเจ เซอร์วิส จำกัด',
        category: 'ระบบประปา/สุขาภิบาล',
        contactPerson: 'คุณมนัส',
        phone: '081-234-5678',
        totalJobs: 85,
        completedJobs: 78,
        pendingJobs: 7,
        jobsOver14Days: 3,
        avgResolutionDays: 4.5,
        completionRate: 91.8,
        rating: 4.5,
        totalCost: 625000,
        avgCostPerJob: 8012,
        repeatJobRate: 5.2,
        monthlyTrend: [
          { month: 'ม.ค.', jobs: 14, completed: 13, cost: 105000 },
          { month: 'ก.พ.', jobs: 15, completed: 14, cost: 112000 },
          { month: 'มี.ค.', jobs: 16, completed: 15, cost: 118000 },
          { month: 'เม.ย.', jobs: 13, completed: 12, cost: 98000 },
          { month: 'พ.ค.', jobs: 14, completed: 13, cost: 102000 },
          { month: 'มิ.ย.', jobs: 13, completed: 11, cost: 90000 },
        ],
      },
      {
        id: 'C002',
        name: 'หจก. ช่างบ้าน เซอร์วิส',
        category: 'งานทั่วไป',
        contactPerson: 'คุณสมชาย',
        phone: '089-876-5432',
        totalJobs: 72,
        completedJobs: 65,
        pendingJobs: 7,
        jobsOver14Days: 5,
        avgResolutionDays: 5.2,
        completionRate: 90.3,
        rating: 4.2,
        totalCost: 485000,
        avgCostPerJob: 7462,
        repeatJobRate: 3.8,
        monthlyTrend: [
          { month: 'ม.ค.', jobs: 12, completed: 11, cost: 82000 },
          { month: 'ก.พ.', jobs: 13, completed: 12, cost: 88000 },
          { month: 'มี.ค.', jobs: 12, completed: 11, cost: 80000 },
          { month: 'เม.ย.', jobs: 11, completed: 10, cost: 75000 },
          { month: 'พ.ค.', jobs: 12, completed: 11, cost: 82000 },
          { month: 'มิ.ย.', jobs: 12, completed: 10, cost: 78000 },
        ],
      },
      {
        id: 'C003',
        name: 'บริษัท แอร์โปร เทคนิค จำกัด',
        category: 'ระบบปรับอากาศ',
        contactPerson: 'คุณวิชัย',
        phone: '02-123-4567',
        totalJobs: 68,
        completedJobs: 60,
        pendingJobs: 8,
        jobsOver14Days: 8,
        avgResolutionDays: 6.1,
        completionRate: 88.2,
        rating: 3.8,
        totalCost: 542000,
        avgCostPerJob: 9033,
        repeatJobRate: 8.5,
        monthlyTrend: [
          { month: 'ม.ค.', jobs: 11, completed: 10, cost: 90000 },
          { month: 'ก.พ.', jobs: 12, completed: 10, cost: 95000 },
          { month: 'มี.ค.', jobs: 12, completed: 11, cost: 92000 },
          { month: 'เม.ย.', jobs: 11, completed: 10, cost: 88000 },
          { month: 'พ.ค.', jobs: 11, completed: 10, cost: 90000 },
          { month: 'มิ.ย.', jobs: 11, completed: 9, cost: 87000 },
        ],
      },
      {
        id: 'C004',
        name: 'บริษัท สมาร์ท อิเลคทริค จำกัด',
        category: 'ระบบไฟฟ้า',
        contactPerson: 'คุณประสิทธิ์',
        phone: '086-543-2109',
        totalJobs: 55,
        completedJobs: 52,
        pendingJobs: 3,
        jobsOver14Days: 2,
        avgResolutionDays: 4.8,
        completionRate: 94.5,
        rating: 4.3,
        totalCost: 398000,
        avgCostPerJob: 7655,
        repeatJobRate: 2.5,
        monthlyTrend: [
          { month: 'ม.ค.', jobs: 9, completed: 9, cost: 68000 },
          { month: 'ก.พ.', jobs: 10, completed: 9, cost: 72000 },
          { month: 'มี.ค.', jobs: 9, completed: 9, cost: 65000 },
          { month: 'เม.ย.', jobs: 9, completed: 8, cost: 62000 },
          { month: 'พ.ค.', jobs: 9, completed: 9, cost: 68000 },
          { month: 'มิ.ย.', jobs: 9, completed: 8, cost: 63000 },
        ],
      },
      {
        id: 'C005',
        name: 'หจก. ปลวก ไม่เอา',
        category: 'กำจัดปลวก/แมลง',
        contactPerson: 'คุณธนา',
        phone: '095-111-2222',
        totalJobs: 48,
        completedJobs: 42,
        pendingJobs: 6,
        jobsOver14Days: 8,
        avgResolutionDays: 7.2,
        completionRate: 87.5,
        rating: 3.5,
        totalCost: 312000,
        avgCostPerJob: 7429,
        repeatJobRate: 12.5,
        monthlyTrend: [
          { month: 'ม.ค.', jobs: 8, completed: 7, cost: 52000 },
          { month: 'ก.พ.', jobs: 8, completed: 7, cost: 53000 },
          { month: 'มี.ค.', jobs: 8, completed: 7, cost: 52000 },
          { month: 'เม.ย.', jobs: 8, completed: 7, cost: 52000 },
          { month: 'พ.ค.', jobs: 8, completed: 7, cost: 52000 },
          { month: 'มิ.ย.', jobs: 8, completed: 7, cost: 51000 },
        ],
      },
    ],
    categoryBreakdown: [
      { category: 'ระบบประปา/สุขาภิบาล', contractors: 3, jobs: 145, avgCompletionRate: 88.5 },
      { category: 'ระบบไฟฟ้า', contractors: 2, jobs: 98, avgCompletionRate: 90.2 },
      { category: 'ระบบปรับอากาศ', contractors: 2, jobs: 82, avgCompletionRate: 78.5 },
      { category: 'งานโครงสร้าง', contractors: 2, jobs: 55, avgCompletionRate: 85.0 },
      { category: 'กำจัดปลวก/แมลง', contractors: 1, jobs: 48, avgCompletionRate: 72.5 },
      { category: 'อื่นๆ', contractors: 2, jobs: 40, avgCompletionRate: 82.0 },
    ],
    topPerformers: [
      { id: 'C001', name: 'บริษัท เอ็มเจ เซอร์วิส', completionRate: 91.8, rating: 4.5 },
      { id: 'C004', name: 'บริษัท สมาร์ท อิเลคทริค', completionRate: 94.5, rating: 4.3 },
      { id: 'C002', name: 'หจก. ช่างบ้าน เซอร์วิส', completionRate: 90.3, rating: 4.2 },
    ],
    needsAttention: [
      { id: 'C005', name: 'หจก. ปลวก ไม่เอา', issue: 'Completion ต่ำ', value: 72.5 },
      { id: 'C003', name: 'บริษัท แอร์โปร เทคนิค', issue: 'งานซ้ำสูง', value: 8.5 },
      { id: 'C005', name: 'หจก. ปลวก ไม่เอา', issue: 'งานซ้ำสูง', value: 12.5 },
    ],
  };
}
