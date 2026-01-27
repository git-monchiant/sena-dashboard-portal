import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, KPICard } from '@shared/ui';
import { QualityFilters, QualityFilterState } from './filters';
import {
  fetchQualityOverview,
  fetchProjects,
  fetchCategoryTrend,
  QualityOverviewData,
  ProjectDefect,
  ProjectOption,
  CategoryTrendPoint,
} from './queries';
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
} from 'lucide-react';
import {
  ComposedChart,
  Line,
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
              {count.toLocaleString()}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
    </button>
  );
}

function ProjectDefectRow({ project, isLast }: { project: ProjectDefect; isLast: boolean }) {
  const hasUrgent = project.defectsOver14Days > 10;
  const completionGood = project.completionRate >= 85;
  const resolutionSlow = project.avgResolutionDays > 7;

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

// Group small pie slices (< threshold%) into "อื่นๆ"
// _otherDetails stores the breakdown for tooltip display
interface OtherDetail { name: string; value: number }
const _otherDetails = new Map<string, OtherDetail[]>();

function groupSmallSlices<T extends Record<string, unknown>>(
  data: T[],
  valueKey: string,
  nameKey: string,
  groupKey: string,
  threshold = 2,
  otherColor = '#9ca3af',
): T[] {
  const total = data.reduce((sum, d) => sum + (d[valueKey] as number), 0);
  if (total === 0) return data;
  const big: T[] = [];
  let otherSum = 0;
  const details: OtherDetail[] = [];
  for (const d of data) {
    const pct = ((d[valueKey] as number) / total) * 100;
    if (pct < threshold) {
      otherSum += d[valueKey] as number;
      details.push({ name: d[nameKey] as string, value: d[valueKey] as number });
    } else {
      big.push(d);
    }
  }
  if (otherSum > 0) {
    _otherDetails.set(groupKey, details);
    big.push({
      [nameKey]: 'อื่นๆ',
      [valueKey]: otherSum,
      color: otherColor,
      label: 'อื่นๆ',
      channel: 'อื่นๆ',
      _isOther: true,
      _groupKey: groupKey,
    } as unknown as T);
  }
  return big;
}

function getOtherDetails(groupKey: string): OtherDetail[] {
  return _otherDetails.get(groupKey) || [];
}

type DefectViewMode = 'status' | 'category';

const subStatusColors: Record<string, string> = {
  completed: '#22c55e',
  cancel: '#ef4444',
  serviceInProgress: '#3b82f6',
  '': '#9ca3af',
};
const subStatusLabels: Record<string, string> = {
  completed: 'เสร็จสิ้น',
  cancel: 'ยกเลิก',
  serviceInProgress: 'กำลังดำเนินการ',
  '': 'ไม่ระบุ',
};

export function QualityOverviewPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<QualityOverviewData | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [defectViewMode, setDefectViewMode] = useState<DefectViewMode>('status');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryTrend, setCategoryTrend] = useState<CategoryTrendPoint[]>([]);
  const [categoryTrendLoading, setCategoryTrendLoading] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<QualityFilterState>({ projectId: '', projectType: '', dateFrom: '', dateTo: '' });

  const loadCategoryTrend = async (category: string, filters: QualityFilterState) => {
    setCategoryTrendLoading(true);
    try {
      const trend = await fetchCategoryTrend(category, filters);
      setCategoryTrend(trend);
    } catch {
      setCategoryTrend([]);
    } finally {
      setCategoryTrendLoading(false);
    }
  };

  const loadData = async (filters: QualityFilterState) => {
    try {
      const result = await fetchQualityOverview(filters);
      setData(result);
      // Auto-select first category for drilldown
      if (result.openJobsByCategory.length > 0) {
        const sorted = [...result.openJobsByCategory]
          .filter(d => d.category !== 'ไม่ระบุ')
          .sort((a, b) => b.openJobs - a.openJobs);
        if (sorted.length > 0) {
          const first = sorted[0].category;
          setSelectedCategory(first);
          loadCategoryTrend(first, filters);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial data load is triggered by QualityFilters emitting saved filters on mount
    fetchProjects().then(setProjects).catch(() => {});
  }, []);

  const handleApplyFilters = (filters: QualityFilterState) => {
    setCurrentFilters(filters);
    loadData(filters);
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    loadCategoryTrend(category, currentFilters);
  };

  // Status distribution pie data
  if (!data) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="ภาพรวมงานซ่อม / ร้องเรียน"
          subtitle="ระบบบริหารจัดการงานซ่อมและข้อร้องเรียนพื้นที่ส่วนกลาง"
        />
        <div className="p-8">
          <QualityFilters onApply={handleApplyFilters} projects={projects} />
          <div className="animate-pulse space-y-6">
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
  const statusPieData = data.statusDistribution
    .reduce((acc, s) => {
      const key = s.jobSubStatus;
      const existing = acc.find(a => a.status === key);
      if (existing) {
        existing.value += s.count;
      } else {
        acc.push({
          status: key,
          name: subStatusLabels[key] || key,
          value: s.count,
          color: subStatusColors[key] || '#9ca3af',
        });
      }
      return acc;
    }, [] as { status: string; name: string; value: number; color: string }[])
    .sort((a, b) => b.value - a.value);

  const groupedStatusPieData = groupSmallSlices(statusPieData, 'value', 'name', 'status');
  const groupedWarrantyData = groupSmallSlices(data.warrantyDistribution, 'total', 'label', 'warranty');
  const groupedChannelData = groupSmallSlices(data.requestChannelDistribution, 'total', 'channel', 'channel');

  // Category stacked bar data
  const topCategories = data.allCategories.slice(0, 8);
  const categoryBarColors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];

  const projectCategoryData = data.projectDefectsByCategory.slice(0, 20).map((p) => {
    const row: Record<string, unknown> = { name: p.projectName?.replace(/^เสนา\s*/, '') || p.projectId, total: p.total };
    for (const cat of topCategories) {
      row[cat] = p.categories[cat] || 0;
    }
    let otherSum = 0;
    for (const [cat, cnt] of Object.entries(p.categories)) {
      if (!topCategories.includes(cat)) otherSum += cnt as number;
    }
    if (otherSum > 0) row['อื่นๆ'] = otherSum;
    return row;
  });

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
              <span className="text-sm text-slate-600">ข้อมูลล่าสุด:</span>
              <span className="text-sm font-medium text-slate-800">
                {data.syncInfo.lastDataDate ? new Date(data.syncInfo.lastDataDate).toLocaleDateString('th-TH') : '-'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-blue-500" />
                <span className="text-slate-600">{data.syncInfo.totalProjects.toLocaleString()} โครงการ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-600">{data.syncInfo.totalUnits.toLocaleString()} ยูนิต</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-emerald-600 font-medium">Connected</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/quality/settings')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            ตั้งค่า
          </button>
        </div>

        {/* Filters */}
        <QualityFilters onApply={handleApplyFilters} projects={projects} />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <KPICard
            title="งานทั้งหมด"
            value={data.kpis.totalJobs.toLocaleString()}
            icon={Wrench}
            color="blue"
            href="/quality/requests"
          />
          <KPICard
            title="งานเปิดอยู่"
            value={data.kpis.openJobs.toLocaleString()}
            change={data.kpis.totalJobs > 0 ? `${((data.kpis.openJobs / data.kpis.totalJobs) * 100).toFixed(1)}%` : undefined}
            changeType="negative"
            showArrow={false}
            icon={Clock}
            color="amber"
          />
          <KPICard
            title="งานปิดแล้ว"
            value={(data.kpis.totalJobs - data.kpis.openJobs).toLocaleString()}
            change={data.kpis.totalJobs > 0 ? `${(((data.kpis.totalJobs - data.kpis.openJobs) / data.kpis.totalJobs) * 100).toFixed(1)}%` : undefined}
            changeType="positive"
            showArrow={false}
            icon={CheckCircle}
            color="emerald"
          />
          <KPICard
            title="เวลาเฉลี่ยปิดงาน"
            value={`${data.kpis.avgResolutionDays} วัน`}
            icon={TrendingUp}
            color="purple"
          />
          <KPICard
            title="Completion Rate"
            value={`${data.kpis.completionRate}%`}
            icon={CheckCircle}
            color="emerald"
          />
        </div>

        {/* 3 Pies + Trend Chart in one row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
          {/* All 3 Pie Charts stacked */}
          <div className="card p-3 flex flex-col justify-between" style={{ minHeight: 0 }}>
            {/* Status Distribution Pie */}
            <div className="flex-1 min-h-0">
              <h3 className="font-semibold text-slate-800 text-xs mb-0">สถานะงาน</h3>
              <ResponsiveContainer width="100%" height={105}>
                <PieChart>
                  <Pie
                    data={groupedStatusPieData}
                    cx="30%"
                    cy="50%"
                    innerRadius={15}
                    outerRadius={35}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {groupedStatusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 10, lineHeight: '16px', paddingLeft: 4 }}
                    formatter={(value: string, entry: any) => {
                      const item = entry.payload;
                      const total = groupedStatusPieData.reduce((s, d) => s + d.value, 0);
                      const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                      return `${item.name} ${item.value.toLocaleString()} (${pct}%)`;
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload;
                      const details = item._isOther ? getOtherDetails(item._groupKey) : [];
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm text-slate-700">{item.name}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-800 mt-1">{item.value.toLocaleString()} งาน</p>
                          {details.length > 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-100 space-y-0.5">
                              {details.map((d, i) => (
                                <p key={i} className="text-xs text-slate-500">{d.name}: {d.value.toLocaleString()}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <hr className="border-slate-100" />

            {/* Warranty Distribution Pie */}
            <div className="flex-1 min-h-0">
              <h3 className="font-semibold text-slate-800 text-xs mb-0">ประเภทประกัน</h3>
              <ResponsiveContainer width="100%" height={105}>
                <PieChart>
                  <Pie
                    data={groupedWarrantyData}
                    cx="30%"
                    cy="50%"
                    innerRadius={15}
                    outerRadius={35}
                    paddingAngle={2}
                    dataKey="total"
                    nameKey="label"
                  >
                    {groupedWarrantyData.map((entry, index) => (
                      <Cell key={`wc-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 10, lineHeight: '16px', paddingLeft: 4 }}
                    formatter={(value: string, entry: any) => {
                      const item = entry.payload;
                      const total = groupedWarrantyData.reduce((s, d) => s + (d.total as number), 0);
                      const pct = total > 0 ? ((item.total / total) * 100).toFixed(0) : 0;
                      return `${item.label} ${item.total.toLocaleString()} (${pct}%)`;
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload;
                      const details = item._isOther ? getOtherDetails(item._groupKey) : [];
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm text-slate-700">{item.label}</span>
                          </div>
                          <p className="text-sm text-slate-800 mt-1">ทั้งหมด: <span className="font-semibold">{item.total.toLocaleString()}</span> งาน</p>
                          {item.openJobs !== undefined && (
                            <p className="text-sm text-slate-800">เปิดอยู่: <span className="font-semibold">{item.openJobs.toLocaleString()}</span> งาน</p>
                          )}
                          {details.length > 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-100 space-y-0.5">
                              <p className="text-xs font-medium text-slate-600">ประกอบด้วย:</p>
                              {details.map((d, i) => (
                                <p key={i} className="text-xs text-slate-500">{d.name}: {d.value.toLocaleString()}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <hr className="border-slate-100" />

            {/* Request Channel Pie */}
            <div className="flex-1 min-h-0">
              <h3 className="font-semibold text-slate-800 text-xs mb-0">ช่องทางแจ้งงาน</h3>
              <ResponsiveContainer width="100%" height={105}>
                <PieChart>
                  <Pie
                    data={groupedChannelData}
                    cx="30%"
                    cy="50%"
                    innerRadius={15}
                    outerRadius={35}
                    paddingAngle={2}
                    dataKey="total"
                    nameKey="channel"
                  >
                    {groupedChannelData.map((entry, index) => (
                      <Cell key={`rc-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 10, lineHeight: '16px', paddingLeft: 4 }}
                    formatter={(value: string, entry: any) => {
                      const item = entry.payload;
                      const total = groupedChannelData.reduce((s, d) => s + (d.total as number), 0);
                      const pct = total > 0 ? ((item.total / total) * 100).toFixed(0) : 0;
                      return `${item.channel} ${item.total.toLocaleString()} (${pct}%)`;
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload;
                      const details = item._isOther ? getOtherDetails(item._groupKey) : [];
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-sm text-slate-700">{item.channel}</span>
                          </div>
                          <p className="text-sm text-slate-800 mt-1">ทั้งหมด: <span className="font-semibold">{item.total.toLocaleString()}</span> งาน</p>
                          {item.openJobs !== undefined && (
                            <p className="text-sm text-slate-800">เปิดอยู่: <span className="font-semibold">{item.openJobs.toLocaleString()}</span> งาน</p>
                          )}
                          {details.length > 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-100 space-y-0.5">
                              <p className="text-xs font-medium text-slate-600">ประกอบด้วย:</p>
                              {details.map((d, i) => (
                                <p key={i} className="text-xs text-slate-500">{d.name}: {d.value.toLocaleString()}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trend Chart - Stacked Bar + Cumulative Backlog Line */}
          <div className="card lg:col-span-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-800">เปรียบเทียบปริมาณงาน และการปิดงาน</h3>
                <p className="text-sm text-slate-500">งานเปิดใหม่ / งานคงค้าง / งานปิด รายเดือน + เส้นคงค้างสะสม</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart
                data={(() => {
                  // Generate last 12 months
                  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                  const now = new Date();

                  // Build a set of the 12 display month labels
                  const displayLabels = new Set<string>();
                  for (let i = 11; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    displayLabels.add(thaiMonths[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2));
                  }

                  // Compute cumulative backlog from ALL months before the display window
                  // + jobs with NULL open_date (not in trend at all)
                  let cumBacklog = data.nullDateOpenJobs || 0;
                  for (const t of data.trend) {
                    if (!displayLabels.has(t.month)) {
                      cumBacklog += t.total - t.completed;
                    }
                  }

                  // Build the 12 display months
                  const months: { month: string; total: number; completed: number }[] = [];
                  for (let i = 11; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const label = thaiMonths[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2);
                    const matched = data.trend.find(t => t.month === label);
                    months.push({
                      month: label,
                      total: matched?.total ?? 0,
                      completed: matched?.completed ?? 0,
                    });
                  }

                  let prevTotal = 0;
                  return months.map((t, i) => {
                    const newJobs = t.total;
                    const closed = t.completed;
                    const backlog = newJobs - closed;
                    cumBacklog += backlog;
                    const delta = i === 0 ? 0 : newJobs - prevTotal;
                    const deltaPct = i === 0 || prevTotal === 0 ? 0 : Math.round((delta / prevTotal) * 100);
                    prevTotal = newJobs;
                    const deltaSign = delta > 0 ? '+' : '';
                    return {
                      month: t.month,
                      งานเปิดใหม่: newJobs,
                      งานคงค้าง: backlog > 0 ? backlog : 0,
                      งานปิด: closed,
                      คงค้างสะสม: cumBacklog,
                      _delta: delta,
                      _deltaPct: deltaPct,
                      _isFirst: i === 0,
                      _deltaLabel: i === 0 ? '' : `${deltaSign}${delta.toLocaleString()} (${deltaSign}${deltaPct}%)`,
                    };
                  });
                })()}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={12} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-slate-800 mb-2">{label}</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-blue-500" />
                            <span className="text-slate-600">งานเปิดใหม่:</span>
                            <span className="font-medium">{d.งานเปิดใหม่?.toLocaleString()}</span>
                            {!d._isFirst && (
                              <span className={`text-xs font-semibold ${d._delta > 0 ? 'text-red-500' : d._delta < 0 ? 'text-green-500' : 'text-slate-400'}`}>
                                ({d._delta > 0 ? '+' : ''}{d._delta.toLocaleString()}, {d._delta > 0 ? '+' : ''}{d._deltaPct}%)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-amber-500" />
                            <span className="text-slate-600">งานคงค้าง:</span>
                            <span className="font-medium">{d.งานคงค้าง?.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-emerald-500" />
                            <span className="text-slate-600">งานปิด:</span>
                            <span className="font-medium">{d.งานปิด?.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                            <div className="w-3 h-0.5 bg-red-500 rounded" />
                            <span className="text-slate-600">คงค้างสะสม:</span>
                            <span className="font-semibold text-red-600">{d.คงค้างสะสม?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar yAxisId="left" dataKey="งานเปิดใหม่" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]}>
                  <LabelList dataKey="งานเปิดใหม่" position="center" fontSize={10} fill="#fff" fontWeight={600} formatter={(v: number) => v > 0 ? v.toLocaleString() : ''} />
                </Bar>
                <Bar yAxisId="left" dataKey="งานคงค้าง" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]}>
                  <LabelList dataKey="งานคงค้าง" position="center" fontSize={10} fill="#fff" fontWeight={600} formatter={(v: number) => v > 0 ? v.toLocaleString() : ''} />
                </Bar>
                <Bar yAxisId="left" dataKey="งานปิด" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="งานปิด" position="center" fontSize={10} fill="#fff" fontWeight={600} formatter={(v: number) => v > 0 ? v.toLocaleString() : ''} />
                  <LabelList dataKey="_deltaLabel" position="top" fontSize={9} fontWeight={600} fill="#64748b" formatter={(v: string) => v || ''} />
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="คงค้างสะสม"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#ef4444' }}
                  label={{ position: 'top', fontSize: 10, fill: '#ef4444', fontWeight: 600, formatter: (v: number) => v.toLocaleString() }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-sm text-slate-600">งานเปิดใหม่</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded" />
                <span className="text-sm text-slate-600">งานคงค้าง</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded" />
                <span className="text-sm text-slate-600">งานปิด</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-red-500 rounded" />
                <span className="text-sm text-slate-600">คงค้างสะสม</span>
              </div>
            </div>
          </div>
        </div>


        {/* Open Jobs by Category - Top 10 */}
        <div className="card mb-8">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800">Top 20 งานซ่อมตามหมวดงาน</h3>
            <p className="text-sm text-slate-500">จำนวนงานเปิดอยู่แยกตาม repair_category (สูงสุด 20 อันดับ)</p>
          </div>
          {/* Clickable category chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {(() => {
              const named = data.openJobsByCategory.filter(d => d.category !== 'ไม่ระบุ');
              const sorted = [...named].sort((a, b) => b.openJobs - a.openJobs);
              return sorted.slice(0, 20).map((item) => (
                <button
                  key={item.category}
                  onClick={() => handleCategoryClick(item.category)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                    selectedCategory === item.category
                      ? 'bg-primary-100 border-primary-300 text-primary-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.label} ({item.openJobs.toLocaleString()})
                </button>
              ));
            })()}
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={(() => {
                const named = data.openJobsByCategory.filter(d => d.category !== 'ไม่ระบุ');
                const unnamed = data.openJobsByCategory.filter(d => d.category === 'ไม่ระบุ');
                const sorted = [...named].sort((a, b) => b.openJobs - a.openJobs);
                const top20 = sorted.slice(0, 20);
                const rest = sorted.slice(20);
                const othersTotal = rest.reduce((s, d) => s + d.openJobs, 0) + unnamed.reduce((s, d) => s + d.openJobs, 0);
                if (othersTotal > 0) {
                  top20.push({ category: 'อื่นๆ', label: 'อื่นๆ', openJobs: othersTotal, color: '#9ca3af' });
                }
                return top20;
              })()}
              margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
              onClick={(state: any) => {
                if (state?.activePayload?.[0]?.payload?.category) {
                  handleCategoryClick(state.activePayload[0].payload.category);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                fontSize={11}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={80}
                tick={({ x, y, payload }: any) => {
                  const cat = (() => {
                    const named = data.openJobsByCategory.filter(d => d.category !== 'ไม่ระบุ');
                    const sorted = [...named].sort((a, b) => b.openJobs - a.openJobs);
                    const top20 = sorted.slice(0, 20);
                    const rest = sorted.slice(20);
                    const unnamed = data.openJobsByCategory.filter(d => d.category === 'ไม่ระบุ');
                    const othersTotal = rest.reduce((s, d) => s + d.openJobs, 0) + unnamed.reduce((s, d) => s + d.openJobs, 0);
                    const all = [...top20];
                    if (othersTotal > 0) all.push({ category: 'อื่นๆ', label: 'อื่นๆ', openJobs: othersTotal, color: '#9ca3af' });
                    return all.find(d => d.label === payload.value)?.category;
                  })();
                  const isSelected = selectedCategory === cat;
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text
                        x={0} y={0} dy={8}
                        textAnchor="end"
                        fill={isSelected ? '#6366f1' : '#64748b'}
                        fontSize={11}
                        fontWeight={isSelected ? 700 : 400}
                        transform="rotate(-35)"
                        style={{ cursor: cat ? 'pointer' : 'default' }}
                        onClick={() => cat && handleCategoryClick(cat)}
                      >
                        {payload.value}
                      </text>
                    </g>
                  );
                }}
              />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
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
              <Bar
                dataKey="openJobs"
                cursor="pointer"
                onClick={(entry: any) => handleCategoryClick(entry.category)}
                shape={(props: any) => {
                  const { x, width, y, height, fill, background } = props;
                  const bgY = background?.y ?? 0;
                  const bgH = background?.height ?? 0;
                  return (
                    <g>
                      <rect x={x} y={bgY} width={width} height={bgH} fill="transparent" cursor="pointer" />
                      <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} cursor="pointer" />
                    </g>
                  );
                }}
              >
                {(() => {
                  const named = data.openJobsByCategory.filter(d => d.category !== 'ไม่ระบุ');
                  const unnamed = data.openJobsByCategory.filter(d => d.category === 'ไม่ระบุ');
                  const sorted = [...named].sort((a, b) => b.openJobs - a.openJobs);
                  const top20 = sorted.slice(0, 20);
                  const rest = sorted.slice(20);
                  const othersTotal = rest.reduce((s, d) => s + d.openJobs, 0) + unnamed.reduce((s, d) => s + d.openJobs, 0);
                  const colors = top20.map((e, i) => ({
                    color: e.color,
                    selected: selectedCategory === e.category,
                  }));
                  if (othersTotal > 0) colors.push({ color: '#9ca3af', selected: false });
                  return colors.map((c, i) => <Cell key={`cell-${i}`} fill={c.color} opacity={selectedCategory && !c.selected ? 0.4 : 1} />);
                })()}
                <LabelList
                  dataKey="openJobs"
                  position="top"
                  fontSize={11}
                  fill="#64748b"
                  fontWeight={600}
                  formatter={(v: number) => {
                    const total = data.openJobsByCategory.reduce((s, d) => s + d.openJobs, 0);
                    const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
                    return `${v.toLocaleString()} (${pct}%)`;
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Drilldown: Category Monthly Trend */}
          {selectedCategory && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="mb-4">
                <h4 className="font-semibold text-slate-800">
                  Trend รายเดือน: <span className="text-primary-600">{selectedCategory}</span>
                </h4>
                <p className="text-sm text-slate-500">คลิกชื่อหมวดงานด้านบนเพื่อเปลี่ยน</p>
              </div>
              {categoryTrendLoading ? (
                <div className="h-48 flex items-center justify-center text-slate-400">กำลังโหลด...</div>
              ) : categoryTrend.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400">ไม่มีข้อมูล</div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart
                    data={(() => {
                      const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                      const now = new Date();
                      const months: { month: string; total: number; completed: number; openJobs: number }[] = [];
                      for (let i = 11; i >= 0; i--) {
                        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        const label = thaiMonths[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2);
                        const matched = categoryTrend.find(t => t.month === label);
                        months.push({
                          month: label,
                          total: matched?.total ?? 0,
                          completed: matched?.completed ?? 0,
                          openJobs: matched?.openJobs ?? 0,
                        });
                      }
                      return months;
                    })()}
                    margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg text-sm">
                            <p className="font-medium text-slate-700 mb-1">{label}</p>
                            <p className="text-blue-600">งานทั้งหมด: {d.total.toLocaleString()}</p>
                            <p className="text-emerald-600">ปิดแล้ว: {d.completed.toLocaleString()}</p>
                            <p className="text-amber-600">ยังเปิด: {d.openJobs.toLocaleString()}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="งานทั้งหมด">
                      <LabelList dataKey="total" position="top" fontSize={10} fill="#64748b" formatter={(v: number) => v > 0 ? v.toLocaleString() : ''} />
                    </Bar>
                    <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} name="ปิดแล้ว" />
                    <Line type="monotone" dataKey="openJobs" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} name="ยังเปิด" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded" />
                  <span className="text-sm text-slate-600">งานทั้งหมด</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-emerald-500 rounded" />
                  <span className="text-sm text-slate-600">ปิดแล้ว</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-amber-500 rounded" />
                  <span className="text-sm text-slate-600">ยังเปิด</span>
                </div>
              </div>
            </div>
          )}
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
            </div>
          </div>

          {/* Status View */}
          {defectViewMode === 'status' && (
          <>
          <div className="card mb-6">
            <h4 className="font-medium text-slate-700 mb-4">สัดส่วน Defect รายโครงการ (%)</h4>
            <ResponsiveContainer width="100%" height={Math.max(400, Math.min(data.projectDefects.length, 20) * 28)}>
              <BarChart
                data={[...data.projectDefects].slice(0, 20).sort((a, b) => b.openDefects - a.openDefects).map(p => {
                  const total = p.totalDefects;
                  const completed = p.totalDefects - p.openDefects;
                  const openUnder14 = p.openDefects - p.defectsOver14Days;
                  const over14Days = p.defectsOver14Days;
                  const completedPct = Math.floor((completed / total) * 100);
                  const openUnder14Pct = Math.floor((openUnder14 / total) * 100);
                  const over14DaysPct = Math.max(0, 100 - completedPct - openUnder14Pct);
                  return {
                    name: p.projectName?.replace(/^เสนา\s*/, '') || p.projectId,
                    completedPct,
                    openUnder14Pct,
                    over14DaysPct,
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
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={180} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-slate-800 mb-2">{label}</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-green-500" />
                            <span className="text-slate-600">เสร็จแล้ว:</span>
                            <span className="font-medium">{d.completedPct}% ({d.completed.toLocaleString()} งาน)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-amber-500" />
                            <span className="text-slate-600">เปิดอยู่ &lt; 14 วัน:</span>
                            <span className="font-medium">{d.openUnder14Pct}% ({d.openUnder14.toLocaleString()} งาน)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-red-500" />
                            <span className="text-slate-600">ค้าง &gt; 14 วัน:</span>
                            <span className="font-medium">{d.over14DaysPct}% ({d.over14Days.toLocaleString()} งาน)</span>
                          </div>
                          <div className="pt-2 mt-2 border-t border-slate-100">
                            <span className="text-slate-500">รวม: </span>
                            <span className="font-semibold text-slate-800">{d.total.toLocaleString()} งาน</span>
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

          {/* Project Table */}
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
          </>
          )}

          {/* Category View */}
          {defectViewMode === 'category' && (
          <div className="card mb-6">
            <h4 className="font-medium text-slate-700 mb-4">งานเปิดตามประเภทซ่อม รายโครงการ</h4>
            <ResponsiveContainer width="100%" height={Math.max(400, projectCategoryData.length * 28)}>
              <BarChart
                data={projectCategoryData}
                layout="vertical"
                margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={180} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                {topCategories.map((cat, i) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    name={cat}
                    stackId="a"
                    fill={categoryBarColors[i % categoryBarColors.length]}
                  />
                ))}
                {projectCategoryData.some((d) => (d as Record<string, unknown>)['อื่นๆ']) && (
                  <Bar dataKey="อื่นๆ" name="อื่นๆ" stackId="a" fill="#9ca3af" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="total" position="right" fontSize={11} fill="#64748b" fontWeight={600} />
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
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
            href="/quality/requests"
            icon={FileText}
            count={data.kpis.openJobs}
          />
          <QuickLinkCard
            title="Aging Report"
            description="ติดตามอายุงานค้างและเร่งการปิดงาน"
            href="/quality/aging"
            icon={Clock}
            count={data.kpis.jobsOver14Days}
          />
          <QuickLinkCard
            title="งานหลุด / เคสพิเศษ"
            description="จัดการงานที่ต้องติดตามเป็นพิเศษ"
            href="/quality/exception"
            icon={AlertTriangle}
          />
        </div>
      </div>
    </div>
  );
}
