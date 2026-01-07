import {
  TrendingUp,
  ArrowRightLeft,
  Wallet,
  Users,
  Building,
  LucideIcon,
} from 'lucide-react';

export interface ReportModuleConfig {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  href: string;
  tags: string[];
  highlights: string[];
  stats: {
    reports: number;
    lastUpdated: string;
  };
  disabled?: boolean;
  permissions?: string[];
}

export const reportRegistry: ReportModuleConfig[] = [
  {
    id: 'sales',
    name: 'Sales Reports',
    description:
      'Comprehensive sales analytics including pipeline, channel performance, and lead quality tracking.',
    icon: TrendingUp,
    color: 'emerald',
    href: '/sales',
    tags: ['Sales', 'Phase 1'],
    highlights: [
      'Real-time sales pipeline visualization',
      'Channel performance comparison',
      'Lead quality scoring and analysis',
      'MTD/YTD target vs actual tracking',
      'Sales trend forecasting',
    ],
    stats: {
      reports: 5,
      lastUpdated: '2 hours ago',
    },
    permissions: ['sales:read'],
  },
  {
    id: 'transfer',
    name: 'Transfer Reports',
    description:
      'Track and analyze property transfers, aging reports, and completion status across all projects.',
    icon: ArrowRightLeft,
    color: 'blue',
    href: '/transfer',
    tags: ['Transfer', 'Phase 1'],
    highlights: [
      'Transfer aging analysis by project',
      'Status tracking and bottleneck identification',
      'Document completion monitoring',
      'Transfer timeline predictions',
      'Revenue recognition tracking',
    ],
    stats: {
      reports: 4,
      lastUpdated: '1 hour ago',
    },
    permissions: ['transfer:read'],
  },
  {
    id: 'common-fee',
    name: 'Common Fee Reports',
    description:
      'ระบบติดตามและจัดเก็บค่าส่วนกลาง ครอบคลุมการเรียกเก็บ การชำระ และการติดตามหนี้',
    icon: Building,
    color: 'teal',
    href: '/reports/common-fee',
    tags: ['Common Fee', 'Phase 1'],
    highlights: [
      'ภาพรวมค่าส่วนกลางรายโครงการ',
      'รายละเอียดการเรียกเก็บและการชำระ',
      'รายงาน Aging หนี้ค้างชำระ',
      'เคสพิเศษและติดตามผล',
    ],
    stats: {
      reports: 4,
      lastUpdated: '1 hour ago',
    },
    permissions: ['common-fee:read'],
  },
  {
    id: 'finance',
    name: 'Finance Reports',
    description:
      'Financial analytics including revenue, collections, and budget tracking.',
    icon: Wallet,
    color: 'purple',
    href: '/finance',
    tags: ['Finance', 'Phase 2'],
    highlights: [
      'Revenue recognition dashboard',
      'Collection tracking',
      'Budget vs actual analysis',
      'Cash flow projections',
    ],
    stats: {
      reports: 0,
      lastUpdated: 'Coming soon',
    },
    disabled: true,
    permissions: ['finance:read'],
  },
  {
    id: 'customer',
    name: 'Customer Reports',
    description: 'Customer analytics and relationship management insights.',
    icon: Users,
    color: 'orange',
    href: '/customer',
    tags: ['Customer', 'Phase 2'],
    highlights: [
      'Customer segmentation analysis',
      'Lifetime value tracking',
      'Satisfaction surveys',
      'Retention metrics',
    ],
    stats: {
      reports: 0,
      lastUpdated: 'Coming soon',
    },
    disabled: true,
    permissions: ['customer:read'],
  },
];

export function getModuleById(id: string): ReportModuleConfig | undefined {
  return reportRegistry.find((m) => m.id === id);
}

export function getActiveModules(): ReportModuleConfig[] {
  return reportRegistry.filter((m) => !m.disabled);
}
