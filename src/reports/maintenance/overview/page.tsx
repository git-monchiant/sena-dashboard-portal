import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, KPICard } from '@shared/ui';
import { MaintenanceFilters, MaintenanceFilterState } from './filters';
import { fetchMaintenanceOverview, MaintenanceOverviewData, ProjectDefect } from './queries';
import { responsibilityConfig, jobTypeConfig, ResponsibilityStats } from '../types';
import {
  Wrench,
  Clock,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  FileText,
  Users,
  Building2,
  Database,
  Settings,
  HardHat,
  Home,
  Hammer,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  LabelList,
  LineChart,
  Line,
} from 'recharts';

interface QuickLinkCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

function QuickLinkCard({ title, description, href, icon: Icon, count }: QuickLinkCardProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(href)}
      className="card-hover flex items-center gap-4 text-left w-full group"
    >
      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-slate-200 transition-colors">
        <Icon className="w-6 h-6 text-slate-600" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-slate-800">{title}</h4>
          {count !== undefined && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
              {count}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
    </button>
  );
}

const responsibilityIcons = {
  OUTSOURCE: HardHat,
  SENA_WARRANTY: Home,
  JURISTIC_TECHNICIAN: Hammer,
};

const responsibilityColors = {
  OUTSOURCE: '#3b82f6',
  SENA_WARRANTY: '#8b5cf6',
  JURISTIC_TECHNICIAN: '#f97316',
};

function ResponsibilityCard({ stat }: { stat: ResponsibilityStats }) {
  const config = responsibilityConfig[stat.type];
  const Icon = responsibilityIcons[stat.type];
  const color = responsibilityColors[stat.type];
  const bgColor = stat.type === 'OUTSOURCE' ? 'bg-blue-50' : stat.type === 'SENA_WARRANTY' ? 'bg-purple-50' : 'bg-orange-50';
  const textColor = stat.type === 'OUTSOURCE' ? 'text-blue-600' : stat.type === 'SENA_WARRANTY' ? 'text-purple-600' : 'text-orange-600';

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgColor}`}>
          <Icon className={`w-5 h-5 ${textColor}`} />
        </div>
        <div>
          <h4 className={`font-semibold ${textColor}`}>{config.icon} {config.shortLabel}</h4>
          <p className="text-xs text-slate-500">{config.label}</p>
        </div>
      </div>
      <div className="flex gap-8 mb-4">
        <div>
          <p className="text-3xl font-bold text-slate-800">{stat.totalJobs.toLocaleString()}</p>
          <p className="text-xs text-slate-500">งานทั้งหมด</p>
        </div>
        <div>
          <p className={`text-3xl font-bold ${textColor}`}>{stat.openJobs.toLocaleString()}</p>
          <p className="text-xs text-slate-500">งานเปิดอยู่</p>
        </div>
      </div>
      <div className="flex gap-8">
        <div>
          <p className="text-lg font-semibold text-slate-700">{stat.avgResolutionDays} วัน</p>
          <p className="text-xs text-slate-500">เวลาเฉลี่ย</p>
        </div>
        <div>
          <p className={`text-lg font-semibold ${stat.jobsOver14Days > 10 ? 'text-red-600' : stat.jobsOver14Days > 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {stat.jobsOver14Days}
          </p>
          <p className="text-xs text-slate-500">ค้าง &gt; 14 วัน</p>
        </div>
      </div>
      {stat.jobsOver14Days > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">{stat.jobsOver14Days} งานค้างนาน</span>
          </div>
        </div>
      )}
    </div>
  );
}

const jobTypeColors = {
  repair: '#3b82f6',
  complaint: '#ef4444',
  inspection: '#f59e0b',
  preventive: '#10b981',
};

function ProjectDefectRow({ project, isLast }: { project: ProjectDefect; isLast: boolean }) {
  const hasUrgent = project.defectsOver14Days > 10;
  const completionGood = project.completionRate >= 85;
  const resolutionSlow = project.avgResolutionDays > 7;

  // Determine status
  let status: 'critical' | 'warning' | 'good' = 'good';
  if (hasUrgent || project.completionRate < 80) {
    status = 'critical';
  } else if (project.defectsOver14Days > 5 || project.completionRate < 85) {
    status = 'warning';
  }

  const statusConfig = {
    critical: { label: 'ต้องเร่ง', bg: 'bg-red-100', text: 'text-red-700' },
    warning: { label: 'ติดตาม', bg: 'bg-amber-100', text: 'text-amber-700' },
    good: { label: 'ปกติ', bg: 'bg-green-100', text: 'text-green-700' },
  };

  return (
    <tr className={`hover:bg-slate-50 transition-colors ${!isLast ? 'border-b border-slate-100' : ''}`}>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-purple-600" />
          </div>
          <span className="font-medium text-slate-800">{project.projectName}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-lg font-bold text-slate-800">{project.totalDefects.toLocaleString()}</span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className="text-lg font-bold text-amber-600">{project.openDefects.toLocaleString()}</span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className={`text-lg font-bold ${hasUrgent ? 'text-red-600' : 'text-slate-600'}`}>
          {project.defectsOver14Days.toLocaleString()}
        </span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className={`text-sm font-semibold ${resolutionSlow ? 'text-red-600' : 'text-slate-600'}`}>
          {project.avgResolutionDays} วัน
        </span>
      </td>
      <td className="py-3 px-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${completionGood ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${project.completionRate}%` }}
            />
          </div>
          <span className={`text-sm font-semibold ${completionGood ? 'text-green-600' : 'text-amber-600'}`}>
            {project.completionRate}%
          </span>
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${statusConfig[status].bg} ${statusConfig[status].text}`}>
          {statusConfig[status].label}
        </span>
      </td>
    </tr>
  );
}

type DefectViewMode = 'status' | 'category' | 'jobType';

const categoryColors = {
  electrical: '#eab308',
  plumbing: '#3b82f6',
  structure: '#64748b',
  aircon: '#06b6d4',
  elevator: '#a855f7',
  commonArea: '#10b981',
  other: '#9ca3af',
};

const categoryLabels = {
  electrical: 'ไฟฟ้า',
  plumbing: 'ประปา',
  structure: 'โครงสร้าง',
  aircon: 'ปรับอากาศ',
  elevator: 'ลิฟต์',
  commonArea: 'ส่วนกลาง',
  other: 'อื่นๆ',
};

const jobTypeChartColors = {
  repair: '#3b82f6',
  complaint: '#ef4444',
  inspection: '#f59e0b',
  preventive: '#10b981',
};

const jobTypeChartLabels = {
  repair: 'งานซ่อม',
  complaint: 'ร้องเรียน',
  inspection: 'ตรวจสอบ',
  preventive: 'บำรุงรักษา',
};

export function MaintenanceOverviewPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<MaintenanceOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [defectViewMode, setDefectViewMode] = useState<DefectViewMode>('status');

  const loadData = async (filters: MaintenanceFilterState) => {
    setIsLoading(true);
    try {
      const result = await fetchMaintenanceOverview(filters);
      setData(result);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData({ projectId: '', responsibilityType: 'all', category: 'all', period: 'monthly' });
  }, []);

  const handleApplyFilters = (filters: MaintenanceFilterState) => {
    loadData(filters);
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="ภาพรวมงานซ่อม / ร้องเรียน"
          subtitle="ระบบบริหารจัดการงานซ่อมและข้อร้องเรียนพื้นที่ส่วนกลาง"
        />
        <div className="p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-slate-200 rounded-xl" />
            <div className="grid grid-cols-5 gap-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pieData = Object.entries(data.jobTypeDistribution).map(([key, value]) => ({
    name: jobTypeConfig[key as keyof typeof jobTypeConfig].label,
    value,
    color: jobTypeColors[key as keyof typeof jobTypeColors],
    count: Math.round((data.kpis.totalJobs.value * value) / 100),
  }));

  return (
    <div className="min-h-screen">
      <PageHeader
        title="ภาพรวมงานซ่อม / ร้องเรียน"
        subtitle="ระบบบริหารจัดการงานซ่อมและข้อร้องเรียนพื้นที่ส่วนกลาง"
      />

      <div className="p-8">
        {/* Sync Status Bar */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600">Last Sync:</span>
              <span className="text-sm font-medium text-slate-800">{data.syncInfo.lastSyncAt}</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-500" />
                <span className="text-slate-600">{data.syncInfo.totalProjects} โครงการ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-600">{data.syncInfo.totalUnits.toLocaleString()} ยูนิต</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-emerald-600 font-medium">Synced</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/maintenance/settings')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            ตั้งค่า
          </button>
        </div>

        {/* Filters */}
        <MaintenanceFilters onApply={handleApplyFilters} />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <KPICard
            title="งานทั้งหมด"
            value={data.kpis.totalJobs.value}
            change={data.kpis.totalJobs.change}
            changeType={data.kpis.totalJobs.changeType}
            icon={Wrench}
            color="blue"
            href="/maintenance/requests"
          />
          <KPICard
            title="งานเปิดอยู่"
            value={data.kpis.openJobs.value}
            change={data.kpis.openJobs.change}
            changeType={data.kpis.openJobs.changeType}
            icon={Clock}
            color="amber"
            href="/maintenance/requests?status=open"
          />
          <KPICard
            title="งานค้าง > 14 วัน"
            value={data.kpis.jobsOver14Days?.value || 0}
            change={data.kpis.jobsOver14Days?.change || 0}
            changeType={data.kpis.jobsOver14Days?.changeType || 'neutral'}
            icon={AlertTriangle}
            color="red"
            href="/maintenance/requests?overdue=true"
          />
          <KPICard
            title="เวลาเฉลี่ยปิดงาน"
            value={`${data.kpis.avgResolutionDays.value} วัน`}
            change={data.kpis.avgResolutionDays.change}
            changeType={data.kpis.avgResolutionDays.changeType}
            icon={TrendingUp}
            color="purple"
          />
          <KPICard
            title="Completion Rate"
            value={`${data.kpis.completionRate?.value || 0}%`}
            change={data.kpis.completionRate?.change || 0}
            changeType={data.kpis.completionRate?.changeType || 'neutral'}
            icon={CheckCircle}
            color="emerald"
            href="/maintenance/requests?status=completed"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Category Distribution */}
          <div className="card">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">สัดส่วนประเภทงาน</h3>
              <p className="text-sm text-slate-500">งานซ่อม / ข้อร้องเรียน / ตรวจสอบ / บำรุงรักษา</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="55%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}%`}
                  labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-slate-700">{item.name}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{item.count.toLocaleString()} งาน</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Trend Chart */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-800">เปรียบเทียบปริมาณงาน และการปิดงาน</h3>
                <p className="text-sm text-slate-500">งานทั้งหมด / เสร็จสิ้น</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.trend} margin={{ top: 15, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="linear"
                  dataKey="total"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#totalGradient)"
                  name="งานทั้งหมด"
                  dot={{ r: 2.5, fill: '#3b82f6' }}
                >
                  <LabelList dataKey="total" position="top" fontSize={11} fill="#3b82f6" fontWeight={600} />
                </Area>
                <Area
                  type="linear"
                  dataKey="completed"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#completedGradient)"
                  name="เสร็จสิ้น"
                  dot={{ r: 2.5, fill: '#10b981' }}
                >
                  <LabelList dataKey="completed" position="bottom" fontSize={11} fill="#10b981" fontWeight={600} />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-sm text-slate-600">งานทั้งหมด</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded" />
                <span className="text-sm text-slate-600">เสร็จสิ้น</span>
              </div>
            </div>
          </div>
        </div>

        {/* Open Jobs by Category */}
        <div className="card mb-8">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800">งานค้างตามประเภทงานซ่อม</h3>
            <p className="text-sm text-slate-500">จำนวนงานเปิดอยู่แยกตามประเภทงาน</p>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={[...data.openJobsByCategory].sort((a, b) => b.openJobs - a.openJobs)}
              layout="vertical"
              margin={{ top: 5, right: 50, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" fontSize={12} />
              <YAxis
                dataKey="label"
                type="category"
                stroke="#64748b"
                fontSize={11}
                width={150}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm font-medium text-slate-700">{item.label}</span>
                      </div>
                      <p className="text-sm text-slate-800 mt-1">{item.openJobs.toLocaleString()} งาน</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="openJobs" radius={[0, 4, 4, 0]}>
                {data.openJobsByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <LabelList dataKey="openJobs" position="right" fontSize={11} fill="#64748b" fontWeight={600} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Defect by Project Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Defect รายโครงการ</h3>
              <p className="text-sm text-slate-500">ติดตาม Defect และงานค้างแต่ละโครงการ ({data.projectDefects.length} โครงการ)</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setDefectViewMode('status')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  defectViewMode === 'status'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                ตามสถานะ
              </button>
              <button
                onClick={() => setDefectViewMode('category')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  defectViewMode === 'category'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                ตามประเภทซ่อม
              </button>
              <button
                onClick={() => setDefectViewMode('jobType')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  defectViewMode === 'jobType'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                ตามประเภทงาน
              </button>
            </div>
          </div>

          {/* Project Defect Chart - Status View */}
          {defectViewMode === 'status' && (
          <div className="card mb-6">
            <h4 className="font-medium text-slate-700 mb-4">สัดส่วน Defect รายโครงการ (%)</h4>
            <ResponsiveContainer width="100%" height={550}>
              <BarChart
                data={[...data.projectDefects].sort((a, b) => b.openDefects - a.openDefects).map(p => {
                  const total = p.totalDefects;
                  const completed = p.totalDefects - p.openDefects;
                  const openUnder14 = p.openDefects - p.defectsOver14Days;
                  const over14Days = p.defectsOver14Days;
                  // Calculate percentages using floor to prevent exceeding 100%
                  const completedPct = Math.floor((completed / total) * 100);
                  const openUnder14Pct = Math.floor((openUnder14 / total) * 100);
                  const over14DaysPct = Math.max(0, 100 - completedPct - openUnder14Pct);
                  return {
                    name: p.projectName.replace('SENA ', ''),
                    completedPct,
                    openUnder14Pct,
                    over14DaysPct,
                    // Raw values for tooltip and labels
                    completed,
                    openUnder14,
                    over14Days,
                    total,
                    openDefects: p.openDefects,
                  };
                })}
                layout="vertical"
                margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11 }}
                  width={180}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  itemSorter={() => 0}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0]?.payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-slate-800 mb-2">{label}</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-green-500" />
                            <span className="text-slate-600">เสร็จแล้ว:</span>
                            <span className="font-medium">{data.completedPct}% ({data.completed} งาน)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-amber-500" />
                            <span className="text-slate-600">เปิดอยู่ &lt; 14 วัน:</span>
                            <span className="font-medium">{data.openUnder14Pct}% ({data.openUnder14} งาน)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-red-500" />
                            <span className="text-slate-600">ค้าง &gt; 14 วัน:</span>
                            <span className="font-medium">{data.over14DaysPct}% ({data.over14Days} งาน)</span>
                          </div>
                          <div className="pt-2 mt-2 border-t border-slate-100">
                            <span className="text-slate-500">รวม: </span>
                            <span className="font-semibold text-slate-800">{data.total} งาน</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  payload={[
                    { value: 'เสร็จแล้ว', type: 'square', color: '#22c55e' },
                    { value: 'เปิดอยู่ < 14 วัน', type: 'square', color: '#f59e0b' },
                    { value: 'ค้าง > 14 วัน', type: 'square', color: '#ef4444' },
                  ]}
                />
                <Bar dataKey="completedPct" name="เสร็จแล้ว" stackId="a" fill="#22c55e" />
                <Bar dataKey="openUnder14Pct" name="เปิดอยู่ < 14 วัน" stackId="a" fill="#f59e0b" />
                <Bar dataKey="over14DaysPct" name="ค้าง > 14 วัน" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]}>
                  <LabelList
                    dataKey="openDefects"
                    position="right"
                    fontSize={11}
                    fill="#f59e0b"
                    fontWeight={600}
                    formatter={(value: number) => value}
                  />
                  <LabelList
                    dataKey="total"
                    position="right"
                    fontSize={11}
                    fill="#64748b"
                    fontWeight={500}
                    offset={35}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}

          {/* Project Defect Chart - Category View (100% Stacked) */}
          {defectViewMode === 'category' && (
          <div className="card mb-6">
            <h4 className="font-medium text-slate-700 mb-4">สัดส่วนงานเปิดตามประเภทงานซ่อม รายโครงการ (%)</h4>
            <ResponsiveContainer width="100%" height={550}>
              <BarChart
                data={[...data.projectDefectsByCategory].sort((a, b) => b.total - a.total).map(p => {
                  const total = p.total;
                  return {
                    name: p.projectName.replace('SENA ', ''),
                    electricalPct: Math.round((p.electrical / total) * 100),
                    plumbingPct: Math.round((p.plumbing / total) * 100),
                    structurePct: Math.round((p.structure / total) * 100),
                    airconPct: Math.round((p.aircon / total) * 100),
                    elevatorPct: Math.round((p.elevator / total) * 100),
                    commonAreaPct: Math.round((p.commonArea / total) * 100),
                    otherPct: Math.max(0, 100 - Math.round((p.electrical / total) * 100) - Math.round((p.plumbing / total) * 100) - Math.round((p.structure / total) * 100) - Math.round((p.aircon / total) * 100) - Math.round((p.elevator / total) * 100) - Math.round((p.commonArea / total) * 100)),
                    // Raw values for tooltip
                    electrical: p.electrical,
                    plumbing: p.plumbing,
                    structure: p.structure,
                    aircon: p.aircon,
                    elevator: p.elevator,
                    commonArea: p.commonArea,
                    other: p.other,
                    total: p.total,
                  };
                })}
                layout="vertical"
                margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11 }}
                  width={180}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-slate-800 mb-2">{label}</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: categoryColors.electrical }} />
                            <span className="text-slate-600">{categoryLabels.electrical}:</span>
                            <span className="font-medium">{d.electricalPct}% ({d.electrical} งาน)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: categoryColors.plumbing }} />
                            <span className="text-slate-600">{categoryLabels.plumbing}:</span>
                            <span className="font-medium">{d.plumbingPct}% ({d.plumbing} งาน)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: categoryColors.structure }} />
                            <span className="text-slate-600">{categoryLabels.structure}:</span>
                            <span className="font-medium">{d.structurePct}% ({d.structure} งาน)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: categoryColors.aircon }} />
                            <span className="text-slate-600">{categoryLabels.aircon}:</span>
                            <span className="font-medium">{d.airconPct}% ({d.aircon} งาน)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: categoryColors.elevator }} />
                            <span className="text-slate-600">{categoryLabels.elevator}:</span>
                            <span className="font-medium">{d.elevatorPct}% ({d.elevator} งาน)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: categoryColors.commonArea }} />
                            <span className="text-slate-600">{categoryLabels.commonArea}:</span>
                            <span className="font-medium">{d.commonAreaPct}% ({d.commonArea} งาน)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: categoryColors.other }} />
                            <span className="text-slate-600">{categoryLabels.other}:</span>
                            <span className="font-medium">{d.otherPct}% ({d.other} งาน)</span>
                          </div>
                          <div className="pt-2 mt-2 border-t border-slate-100">
                            <span className="text-slate-500">รวม: </span>
                            <span className="font-semibold text-slate-800">{d.total} งาน</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  payload={[
                    { value: categoryLabels.electrical, type: 'square', color: categoryColors.electrical },
                    { value: categoryLabels.plumbing, type: 'square', color: categoryColors.plumbing },
                    { value: categoryLabels.structure, type: 'square', color: categoryColors.structure },
                    { value: categoryLabels.aircon, type: 'square', color: categoryColors.aircon },
                    { value: categoryLabels.elevator, type: 'square', color: categoryColors.elevator },
                    { value: categoryLabels.commonArea, type: 'square', color: categoryColors.commonArea },
                    { value: categoryLabels.other, type: 'square', color: categoryColors.other },
                  ]}
                />
                <Bar dataKey="electricalPct" name={categoryLabels.electrical} stackId="a" fill={categoryColors.electrical} />
                <Bar dataKey="plumbingPct" name={categoryLabels.plumbing} stackId="a" fill={categoryColors.plumbing} />
                <Bar dataKey="structurePct" name={categoryLabels.structure} stackId="a" fill={categoryColors.structure} />
                <Bar dataKey="airconPct" name={categoryLabels.aircon} stackId="a" fill={categoryColors.aircon} />
                <Bar dataKey="elevatorPct" name={categoryLabels.elevator} stackId="a" fill={categoryColors.elevator} />
                <Bar dataKey="commonAreaPct" name={categoryLabels.commonArea} stackId="a" fill={categoryColors.commonArea} />
                <Bar dataKey="otherPct" name={categoryLabels.other} stackId="a" fill={categoryColors.other} radius={[0, 4, 4, 0]}>
                  <LabelList
                    dataKey="total"
                    position="right"
                    fontSize={11}
                    fill="#64748b"
                    fontWeight={600}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}

          {/* Project Defect Chart - JobType View (100% Stacked) */}
          {defectViewMode === 'jobType' && (
          <div className="card mb-6">
            <h4 className="font-medium text-slate-700 mb-4">สัดส่วนงานเปิดตามประเภทงาน รายโครงการ (%)</h4>
            <ResponsiveContainer width="100%" height={550}>
              <BarChart
                data={[...data.projectDefectsByJobType].sort((a, b) => b.total - a.total).map(p => {
                  const total = p.total;
                  return {
                    name: p.projectName.replace('SENA ', ''),
                    repairPct: Math.round((p.repair / total) * 100),
                    complaintPct: Math.round((p.complaint / total) * 100),
                    inspectionPct: Math.round((p.inspection / total) * 100),
                    preventivePct: Math.max(0, 100 - Math.round((p.repair / total) * 100) - Math.round((p.complaint / total) * 100) - Math.round((p.inspection / total) * 100)),
                    // Raw values for tooltip
                    repair: p.repair,
                    complaint: p.complaint,
                    inspection: p.inspection,
                    preventive: p.preventive,
                    total: p.total,
                  };
                })}
                layout="vertical"
                margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11 }}
                  width={180}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-slate-800 mb-2">{label}</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: jobTypeChartColors.repair }} />
                            <span className="text-slate-600">{jobTypeChartLabels.repair}:</span>
                            <span className="font-medium">{d.repairPct}% ({d.repair} งาน)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: jobTypeChartColors.complaint }} />
                            <span className="text-slate-600">{jobTypeChartLabels.complaint}:</span>
                            <span className="font-medium">{d.complaintPct}% ({d.complaint} งาน)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: jobTypeChartColors.inspection }} />
                            <span className="text-slate-600">{jobTypeChartLabels.inspection}:</span>
                            <span className="font-medium">{d.inspectionPct}% ({d.inspection} งาน)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: jobTypeChartColors.preventive }} />
                            <span className="text-slate-600">{jobTypeChartLabels.preventive}:</span>
                            <span className="font-medium">{d.preventivePct}% ({d.preventive} งาน)</span>
                          </div>
                          <div className="pt-2 mt-2 border-t border-slate-100">
                            <span className="text-slate-500">รวม: </span>
                            <span className="font-semibold text-slate-800">{d.total} งาน</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  payload={[
                    { value: jobTypeChartLabels.repair, type: 'square', color: jobTypeChartColors.repair },
                    { value: jobTypeChartLabels.complaint, type: 'square', color: jobTypeChartColors.complaint },
                    { value: jobTypeChartLabels.inspection, type: 'square', color: jobTypeChartColors.inspection },
                    { value: jobTypeChartLabels.preventive, type: 'square', color: jobTypeChartColors.preventive },
                  ]}
                />
                <Bar dataKey="repairPct" name={jobTypeChartLabels.repair} stackId="a" fill={jobTypeChartColors.repair} />
                <Bar dataKey="complaintPct" name={jobTypeChartLabels.complaint} stackId="a" fill={jobTypeChartColors.complaint} />
                <Bar dataKey="inspectionPct" name={jobTypeChartLabels.inspection} stackId="a" fill={jobTypeChartColors.inspection} />
                <Bar dataKey="preventivePct" name={jobTypeChartLabels.preventive} stackId="a" fill={jobTypeChartColors.preventive} radius={[0, 4, 4, 0]}>
                  <LabelList
                    dataKey="total"
                    position="right"
                    fontSize={11}
                    fill="#64748b"
                    fontWeight={600}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}

          {/* Project Table - Status View */}
          {defectViewMode === 'status' && (
          <div className="card overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">โครงการ</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Defect ทั้งหมด</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">เปิดอยู่</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">ค้าง &gt; 14 วัน</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">เวลาเฉลี่ย</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Completion</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {[...data.projectDefects].sort((a, b) => b.openDefects - a.openDefects).map((project, index) => (
                  <ProjectDefectRow key={project.projectId} project={project} isLast={index === data.projectDefects.length - 1} />
                ))}
              </tbody>
            </table>
            </div>
          </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="mb-4">
          <h3 className="font-semibold text-slate-800">เมนูลัด</h3>
          <p className="text-sm text-slate-500">นำทางไปยังรายงานเชิงลึก</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLinkCard
            title="รายการงานทั้งหมด"
            description="ดูและจัดการคำร้องแจ้งซ่อม / ร้องเรียน"
            href="/maintenance/requests"
            icon={FileText}
            count={data.kpis.openJobs.value}
          />
          <QuickLinkCard
            title="Aging Report"
            description="ติดตามอายุงานค้างและเร่งการปิดงาน"
            href="/maintenance/aging"
            icon={Clock}
            count={data.kpis.jobsOver14Days?.value || 0}
          />
          <QuickLinkCard
            title="งานหลุด / เคสพิเศษ"
            description="จัดการงานที่ต้องติดตามเป็นพิเศษ"
            href="/maintenance/exception"
            icon={AlertTriangle}
          />
        </div>
      </div>
    </div>
  );
}
