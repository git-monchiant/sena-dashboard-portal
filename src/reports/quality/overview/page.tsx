import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageHeader, KPICard } from '@shared/ui';
import { QualityFilters, QualityFilterState } from './filters';
import {
  fetchQualityOverview,
  fetchProjects,
  fetchCategoryTrend,
  QualityOverviewData,
  ProjectOption,
  CategoryTrendPoint,
} from './queries';
import {
  Wrench,
  Clock,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  XCircle,
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
      onClick={() => navigate(href, { state: { fromPage: true } })}
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
  let otherUnits = 0;
  const details: OtherDetail[] = [];
  for (const d of data) {
    const pct = ((d[valueKey] as number) / total) * 100;
    if (pct < threshold) {
      otherSum += d[valueKey] as number;
      otherUnits += (d as any).units || 0;
      details.push({ name: d[nameKey] as string, value: d[valueKey] as number });
    } else {
      big.push(d);
    }
  }
  big.sort((a, b) => (b[valueKey] as number) - (a[valueKey] as number));
  if (otherSum > 0) {
    _otherDetails.set(groupKey, details);
    big.push({
      [nameKey]: 'อื่นๆ',
      [valueKey]: otherSum,
      units: otherUnits,
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

function LegendItem({ color, label, isOther, groupKey }: { color: string; label: string; isOther?: boolean; groupKey?: string }) {
  const [show, setShow] = useState(false);
  const details = isOther && groupKey ? getOtherDetails(groupKey) : [];
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2, position: 'relative', cursor: isOther ? 'help' : 'default' }}
      onMouseEnter={() => isOther && setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, backgroundColor: color, flexShrink: 0 }} />
      <span>{label}</span>
      {show && details.length > 0 && (
        <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 4, zIndex: 50 }}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
          <p className="text-[10px] font-semibold text-slate-600 mb-1">ประกอบด้วย:</p>
          {details.map((d, i) => (
            <p key={i} className="text-[10px] text-slate-500">{d.name}: {d.value.toLocaleString()}</p>
          ))}
        </div>
      )}
    </div>
  );
}



const subStatusColors: Record<string, string> = {
  completed: '#22c55e',
  cancel: '#ef4444',
  serviceInProgress: '#3b82f6',
  technicianDispatchPending: '#f59e0b',
  confirmAppointmentPending: '#8b5cf6',
  appointmentPending: '#a78bfa',
  inspectionPending: '#06b6d4',
  repairInProgress: '#2563eb',
  '': '#9ca3af',
};
const subStatusLabels: Record<string, string> = {
  completed: 'เสร็จสิ้น',
  cancel: 'ยกเลิก',
  serviceInProgress: 'กำลังซ่อม',
  technicianDispatchPending: 'รอส่งช่าง',
  confirmAppointmentPending: 'รอยืนยันนัดหมาย',
  appointmentPending: 'รอนัดหมาย',
  inspectionPending: 'รอตรวจสอบ',
  repairInProgress: 'ซ่อมอยู่',
  '': 'ไม่ระบุ',
};

export function QualityOverviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPage = !!(location.state as any)?.fromPage;

  const [data, setData] = useState<QualityOverviewData | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryTrend, setCategoryTrend] = useState<CategoryTrendPoint[]>([]);
  const [categoryTrendLoading, setCategoryTrendLoading] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<QualityFilterState>({ projectId: '', projectType: '', category: '', dateFrom: '', dateTo: '' });


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
          .sort((a, b) => b.totalJobs - a.totalJobs);
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
        existing.units = (existing.units || 0) + ((s as any).units || 0);
      } else {
        acc.push({
          status: key,
          name: subStatusLabels[key] || key,
          value: s.count,
          units: (s as any).units || 0,
          color: subStatusColors[key] || '#9ca3af',
        });
      }
      return acc;
    }, [] as { status: string; name: string; value: number; units: number; color: string }[])
    .sort((a, b) => b.value - a.value);

  const groupedStatusPieData = groupSmallSlices(statusPieData, 'value', 'name', 'status');
  const groupedWarrantyData = groupSmallSlices(data.warrantyDistribution, 'total', 'label', 'warranty');
  const groupedChannelData = groupSmallSlices(data.requestChannelDistribution, 'total', 'channel', 'channel');




  return (
    <div className="min-h-screen">
      <PageHeader
        title="Overview"
        subtitle="ภาพรวมงานซ่อม / ร้องเรียนพื้นที่ส่วนกลาง"
      />

      <div className="p-8">
        {/* Filters */}
        <QualityFilters onApply={handleApplyFilters} projects={projects} />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div
            className="card text-left cursor-pointer hover:shadow-md hover:border-primary-200 transition-all"
            onClick={() => navigate('/quality/requests', { state: { jobFilter: 'all', fromPage: true } })}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-blue-600">{data.kpis.totalJobs.toLocaleString()}</p>
            <p className="text-xs text-slate-500 font-medium mb-1">งานทั้งหมด</p>
            {(data.workAreaBreakdown || []).map((wa) => {
              const labels: Record<string, string> = { customer_room: 'ห้องลูกค้า', sales_office: 'สนง.ขาย', common_area: 'ส่วนกลาง', central_area: 'ซ่อมส่วนกลาง' };
              const colors: Record<string, string> = { customer_room: 'text-blue-500', sales_office: 'text-amber-500', common_area: 'text-emerald-500', central_area: 'text-purple-500' };
              return (
                <div key={wa.workArea} className="flex items-center justify-between" style={{ fontSize: '10px' }}>
                  <span className={`${colors[wa.workArea] || 'text-slate-400'}`}>{labels[wa.workArea] || wa.workArea}</span>
                  <span className="text-slate-600 font-medium">{wa.total.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
          <KPICard
            title="เสร็จสิ้น"
            value={(data.kpis.totalJobs - data.kpis.openJobs - (data.kpis.cancelledJobs || 0)).toLocaleString()}
            change={`${(data.kpis.totalJobs > 0 ? (((data.kpis.totalJobs - data.kpis.openJobs - (data.kpis.cancelledJobs || 0)) / data.kpis.totalJobs) * 100).toFixed(1) : 0)}%`}
            showArrow={false}
            subtext={`${data.kpis.closedUnits?.toLocaleString() ?? 0} ยูนิต`}
            icon={CheckCircle}
            color="emerald"
            onClick={() => navigate('/quality/requests', { state: { jobFilter: 'closed', fromPage: true } })}
          />
          <KPICard
            title="ยกเลิก"
            value={(data.kpis.cancelledJobs || 0).toLocaleString()}
            change={`${(data.kpis.totalJobs > 0 ? (((data.kpis.cancelledJobs || 0) / data.kpis.totalJobs) * 100).toFixed(1) : 0)}%`}
            showArrow={false}
            subtext={`${(data.kpis.cancelledUnits || 0).toLocaleString()} ยูนิต`}
            icon={XCircle}
            color="red"
            onClick={() => navigate('/quality/requests', { state: { jobFilter: 'cancelled', fromPage: true } })}
          />
          <KPICard
            title="งานเปิดอยู่"
            value={data.kpis.openJobs.toLocaleString()}
            change={`${(data.kpis.totalJobs > 0 ? ((data.kpis.openJobs / data.kpis.totalJobs) * 100).toFixed(1) : 0)}%`}
            showArrow={false}
            subtext={`${data.kpis.openUnits?.toLocaleString() ?? 0} ยูนิต`}
            icon={Clock}
            color="amber"
            onClick={() => navigate('/quality/requests', { state: { jobFilter: 'open', fromPage: true } })}
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
          <div className="card p-3 flex flex-col justify-start lg:row-span-2" style={{ minHeight: 0 }}>
            {/* Status Distribution Pie */}
            <div className="flex-1 min-h-0">
              <h3 className="font-semibold text-slate-800 text-xs mb-0">สถานะงาน <span className="font-normal text-slate-400">({groupedStatusPieData.reduce((s, d) => s + (d.value as number), 0).toLocaleString()} งาน, {data.kpis.distinctUnits?.toLocaleString() ?? 0} ยูนิต)</span></h3>
              <div className="flex items-center gap-3" style={{ height: 90 }}>
                <div style={{ width: 90, minWidth: 90, height: 90 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={groupedStatusPieData} cx="50%" cy="50%" innerRadius={15} outerRadius={35} paddingAngle={2} dataKey="value">
                        {groupedStatusPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0].payload;
                        const details = item._isOther ? getOtherDetails(item._groupKey) : [];
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-sm text-slate-700">{item.name}</span></div>
                            <p className="text-sm font-semibold text-slate-800 mt-1">{item.value.toLocaleString()} งาน</p>
                            {details.length > 0 && (<div className="mt-1.5 pt-1.5 border-t border-slate-100 space-y-0.5">{details.map((d, i) => <p key={i} className="text-xs text-slate-500">{d.name}: {d.value.toLocaleString()}</p>)}</div>)}
                          </div>
                        );
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ fontSize: 10, lineHeight: '16px' }}>
                  {(() => {
                    const total = groupedStatusPieData.reduce((s, d) => s + (d.value as number), 0);
                    return [...groupedStatusPieData].sort((a, b) => (b.value as number) - (a.value as number)).map((item, i) => {
                      const pct = total > 0 ? (((item.value as number) / total) * 100).toFixed(0) : 0;
                      return <LegendItem key={i} color={item.color} label={`${item.name} ${(item.value as number).toLocaleString()} (${pct}%)`} isOther={(item as any)._isOther} groupKey={(item as any)._groupKey} />;
                    });
                  })()}
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Warranty Distribution Pie */}
            <div className="flex-1 min-h-0">
              <h3 className="font-semibold text-slate-800 text-xs mb-0">ประเภทประกัน <span className="font-normal text-slate-400">({groupedWarrantyData.reduce((s, d) => s + (d.total as number), 0).toLocaleString()} งาน, {data.kpis.distinctUnits?.toLocaleString() ?? 0} ยูนิต)</span></h3>
              <div className="flex items-center gap-3" style={{ height: 90 }}>
                <div style={{ width: 90, minWidth: 90, height: 90 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={groupedWarrantyData} cx="50%" cy="50%" innerRadius={15} outerRadius={35} paddingAngle={2} dataKey="total" nameKey="label">
                        {groupedWarrantyData.map((entry, index) => <Cell key={`wc-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0].payload;
                        const details = item._isOther ? getOtherDetails(item._groupKey) : [];
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-sm text-slate-700">{item.label}</span></div>
                            <p className="text-sm text-slate-800 mt-1">ทั้งหมด: <span className="font-semibold">{item.total.toLocaleString()}</span> งาน</p>
                            {item.openJobs !== undefined && <p className="text-sm text-slate-800">เปิดอยู่: <span className="font-semibold">{item.openJobs.toLocaleString()}</span> งาน</p>}
                            {details.length > 0 && (<div className="mt-1.5 pt-1.5 border-t border-slate-100 space-y-0.5"><p className="text-xs font-medium text-slate-600">ประกอบด้วย:</p>{details.map((d, i) => <p key={i} className="text-xs text-slate-500">{d.name}: {d.value.toLocaleString()}</p>)}</div>)}
                          </div>
                        );
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ fontSize: 10, lineHeight: '16px' }}>
                  {(() => {
                    const total = groupedWarrantyData.reduce((s, d) => s + (d.total as number), 0);
                    return [...groupedWarrantyData].sort((a, b) => (b.total as number) - (a.total as number)).map((item, i) => {
                      const pct = total > 0 ? (((item.total as number) / total) * 100).toFixed(0) : 0;
                      return <LegendItem key={i} color={item.color as string} label={`${item.label as string} ${(item.total as number).toLocaleString()} (${pct}%)`} isOther={(item as any)._isOther} groupKey={(item as any)._groupKey} />;
                    });
                  })()}
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Request Channel Pie */}
            <div className="flex-1 min-h-0">
              <h3 className="font-semibold text-slate-800 text-xs mb-0">ช่องทางแจ้งงาน <span className="font-normal text-slate-400">({groupedChannelData.reduce((s, d) => s + (d.total as number), 0).toLocaleString()} งาน)</span></h3>
              <div className="flex items-center gap-3" style={{ height: 90 }}>
                <div style={{ width: 90, minWidth: 90, height: 90 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={groupedChannelData} cx="50%" cy="50%" innerRadius={15} outerRadius={35} paddingAngle={2} dataKey="total" nameKey="channel">
                        {groupedChannelData.map((entry, index) => <Cell key={`rc-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0].payload;
                        const details = item._isOther ? getOtherDetails(item._groupKey) : [];
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-sm text-slate-700">{item.channel}</span></div>
                            <p className="text-sm text-slate-800 mt-1">ทั้งหมด: <span className="font-semibold">{item.total.toLocaleString()}</span> งาน</p>
                            {item.openJobs !== undefined && <p className="text-sm text-slate-800">เปิดอยู่: <span className="font-semibold">{item.openJobs.toLocaleString()}</span> งาน</p>}
                            {details.length > 0 && (<div className="mt-1.5 pt-1.5 border-t border-slate-100 space-y-0.5"><p className="text-xs font-medium text-slate-600">ประกอบด้วย:</p>{details.map((d, i) => <p key={i} className="text-xs text-slate-500">{d.name}: {d.value.toLocaleString()}</p>)}</div>)}
                          </div>
                        );
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ fontSize: 10, lineHeight: '16px' }}>
                  {(() => {
                    const total = groupedChannelData.reduce((s, d) => s + (d.total as number), 0);
                    return [...groupedChannelData].sort((a, b) => (b.total as number) - (a.total as number)).map((item, i) => {
                      const pct = total > 0 ? (((item.total as number) / total) * 100).toFixed(0) : 0;
                      return <LegendItem key={i} color={item.color as string} label={`${item.channel as string} ${(item.total as number).toLocaleString()} (${pct}%)`} isOther={(item as any)._isOther} groupKey={(item as any)._groupKey} />;
                    });
                  })()}
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Urgent Pie */}
            <div className="flex-1 min-h-0">
              {(() => {
                const urgentData = data.urgentDistribution.map(d => ({ ...d, value: d.total }));
                const totalUrgent = urgentData.reduce((s, d) => s + d.value, 0);
                return (
                  <>
                    <h3 className="font-semibold text-slate-800 text-xs mb-0">งานเร่งด่วน <span className="font-normal text-slate-400">({totalUrgent.toLocaleString()} งาน)</span></h3>
                    <div className="flex items-center gap-3" style={{ height: 90 }}>
                      <div style={{ width: 90, minWidth: 90, height: 90 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={urgentData} cx="50%" cy="50%" innerRadius={15} outerRadius={35} paddingAngle={2} dataKey="value">
                              {urgentData.map((entry, i) => <Cell key={`urg-${i}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0].payload;
                              return (
                                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
                                  <p className="text-sm font-medium text-slate-700">{d.label}</p>
                                  <p className="text-sm text-slate-800">ทั้งหมด: <span className="font-semibold">{d.value.toLocaleString()}</span></p>
                                  <p className="text-xs text-amber-600">เปิดอยู่: {d.openJobs.toLocaleString()}</p>
                                  <p className="text-xs text-emerald-600">ปิดแล้ว: {d.closedJobs.toLocaleString()}</p>
                                </div>
                              );
                            }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ fontSize: 10, lineHeight: '16px' }}>
                        {urgentData.map((item, i) => {
                          const pct = totalUrgent > 0 ? ((item.value / totalUrgent) * 100).toFixed(0) : 0;
                          return (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, backgroundColor: item.color, flexShrink: 0 }} /><span>{item.label} {item.value.toLocaleString()} ({pct}%)</span></div>);
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <hr className="border-slate-100" />

            {/* Work Area Pie */}
            <div className="flex-1 min-h-0">
              {(() => {
                const waLabels: Record<string, string> = { customer_room: 'ห้องลูกค้า', sales_office: 'สนง.ขาย', central_area: 'ซ่อมส่วนกลาง' };
                const waColors: Record<string, string> = { customer_room: '#3b82f6', sales_office: '#f59e0b', central_area: '#8b5cf6' };
                const waData = (data.workAreaBreakdown || []).map(w => ({ name: waLabels[w.workArea] || w.workArea, value: w.total, color: waColors[w.workArea] || '#9ca3af' })).sort((a, b) => b.value - a.value);
                const waTotal = waData.reduce((s, d) => s + d.value, 0);
                return (
                  <>
                    <h3 className="font-semibold text-slate-800 text-xs mb-0">ประเภทพื้นที่ <span className="font-normal text-slate-400">({waTotal.toLocaleString()} งาน)</span></h3>
                    <div className="flex items-center gap-3" style={{ height: 90 }}>
                      <div style={{ width: 90, minWidth: 90, height: 90 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={waData} cx="50%" cy="50%" innerRadius={18} outerRadius={38} paddingAngle={2} dataKey="value">
                              {waData.map((entry, i) => <Cell key={`wa-${i}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0].payload;
                              return (
                                <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
                                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} /><span className="text-sm text-slate-700">{d.name}</span></div>
                                  <p className="text-sm font-semibold text-slate-800 mt-1">{d.value.toLocaleString()} งาน</p>
                                </div>
                              );
                            }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ fontSize: 10, lineHeight: '16px' }}>
                        {waData.map((item, i) => {
                          const pct = waTotal > 0 ? ((item.value / waTotal) * 100).toFixed(0) : 0;
                          return (<div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, backgroundColor: item.color, flexShrink: 0 }} /><span>{item.name} {item.value.toLocaleString()} ({pct}%)</span></div>);
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

          </div>

          {/* Trend Chart - Stacked Bar + Cumulative Backlog Line */}
          <div className="card lg:col-span-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-800">เปรียบเทียบงานเปิด / งานปิด รายเดือน</h3>
                <p className="text-sm text-slate-500">Grouped bar: งานเปิด vs งานปิด + เส้นคงค้างสะสม (13 เดือนล่าสุด)</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart
                data={(() => {
                  // Generate last 13 months
                  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                  const now = new Date();

                  // Build a set of the 13 display month labels (11 past + current + 1 future)
                  const displayLabels = new Set<string>();
                  for (let i = 11; i >= -1; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    displayLabels.add(thaiMonths[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2));
                  }

                  // Closed by month lookup
                  const closedByMonthMap = new Map<string, number>();
                  for (const ct of (data.closedTrend || [])) {
                    closedByMonthMap.set(ct.month, ct.closed);
                  }

                  // Parse filter range
                  const fromYM = currentFilters.dateFrom || '';
                  const toYM = currentFilters.dateTo || '';

                  // Build 13 months (11 past + current + 1 future)
                  const months: { label: string; opened: number; closed: number; inRange: boolean }[] = [];
                  for (let i = 11; i >= -1; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const label = thaiMonths[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2);
                    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                    const inRange = (!fromYM || ym >= fromYM) && (!toYM || ym <= toYM);
                    const matched = data.trend.find(t => t.month === label);
                    months.push({
                      label,
                      opened: matched?.total ?? 0,
                      closed: closedByMonthMap.get(label) || 0,
                      inRange,
                    });
                  }

                  // Cumulative backlog: use trend's own completed count (same open_date grouping)
                  // so that total - completed = still open, and final cumBacklog = openJobs KPI
                  const trendCompletedMap = new Map<string, number>();
                  for (const t of data.trend) {
                    trendCompletedMap.set(t.month, t.completed);
                  }

                  let cumBacklog = data.nullDateOpenJobs || 0;
                  for (const t of data.trend) {
                    if (!displayLabels.has(t.month)) {
                      cumBacklog += t.total - t.completed;
                    }
                  }

                  return months.map(m => {
                    const trendCompleted = trendCompletedMap.get(m.label) || 0;
                    const opened = m.opened; // total jobs opened this month
                    cumBacklog += opened - trendCompleted;
                    return {
                      month: m.label,
                      งานเปิด: m.opened,
                      งานปิด: m.closed, // still show closedTrend for the bar (actual close month)
                      คงค้างสะสม: cumBacklog,
                      inRange: m.inRange,
                    };
                  });
                })()}
                margin={{ top: 20, right: 50, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#ef4444" fontSize={12} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload;
                    const diff = (d?.งานเปิด ?? 0) - (d?.งานปิด ?? 0);
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-slate-800 mb-2">{label}</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-blue-500" />
                            <span className="text-slate-600">งานเปิด:</span>
                            <span className="font-medium">{d?.งานเปิด?.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-emerald-500" />
                            <span className="text-slate-600">งานปิด:</span>
                            <span className="font-medium">{d?.งานปิด?.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                            <span className="text-slate-600">ผลต่าง:</span>
                            <span className={`font-semibold ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-emerald-500' : 'text-slate-500'}`}>
                              {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-0.5 bg-red-500 rounded" />
                            <span className="text-slate-600">คงค้างสะสม:</span>
                            <span className="font-semibold text-red-600">{d?.คงค้างสะสม?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar yAxisId="left" dataKey="งานเปิด" radius={[4, 4, 0, 0]} barSize={32}>
                  {(() => {
                    const n = new Date();
                    const f = currentFilters.dateFrom || '';
                    const t = currentFilters.dateTo || '';
                    return Array.from({ length: 13 }, (_, idx) => {
                      const d = new Date(n.getFullYear(), n.getMonth() - (11 - idx), 1);
                      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      const inR = (!f || ym >= f) && (!t || ym <= t);
                      return <Cell key={idx} fill={inR ? '#3b82f6' : '#cbd5e1'} />;
                    });
                  })()}
                  <LabelList dataKey="งานเปิด" position="top" fontSize={10} fill="#3b82f6" fontWeight={600} formatter={(v) => Number(v) > 0 ? Number(v).toLocaleString() : ''} />
                </Bar>
                <Bar yAxisId="left" dataKey="งานปิด" radius={[4, 4, 0, 0]} barSize={32}>
                  {(() => {
                    const n = new Date();
                    const f = currentFilters.dateFrom || '';
                    const t = currentFilters.dateTo || '';
                    return Array.from({ length: 13 }, (_, idx) => {
                      const d = new Date(n.getFullYear(), n.getMonth() - (11 - idx), 1);
                      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      const inR = (!f || ym >= f) && (!t || ym <= t);
                      return <Cell key={idx} fill={inR ? '#10b981' : '#d1d5db'} />;
                    });
                  })()}
                  <LabelList dataKey="งานปิด" position="top" fontSize={10} fill="#10b981" fontWeight={600} formatter={(v) => Number(v) > 0 ? Number(v).toLocaleString() : ''} />
                </Bar>
                <Line
                  yAxisId="right"
                  type="linear"
                  dataKey="คงค้างสะสม"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#ef4444' }}
                  label={{ position: 'top', fontSize: 10, fill: '#ef4444', fontWeight: 600, formatter: (v) => Number(v).toLocaleString() }}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-sm text-slate-600">งานเปิด</span>
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

          {/* Work Area Monthly Trend - 3 charts, same width as trend chart */}
          <div className="card lg:col-span-4 lg:col-start-2">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">งานแยกตามประเภทพื้นที่ รายเดือน</h3>
              <p className="text-sm text-slate-500">เปิด / ปิด / ค้างสะสม (12 เดือนล่าสุด)</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {([
                { key: 'customer_room', label: 'ห้องลูกค้า', color: '#3b82f6' },
                { key: 'central_area', label: 'ซ่อมส่วนกลาง', color: '#8b5cf6' },
                { key: 'sales_office', label: 'สนง.ขาย', color: '#f59e0b' },
              ] as const).map(({ key, label, color }) => {
                const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                const now = new Date();

                // Build display labels (12 months)
                const displayLabels = new Set<string>();
                for (let i = 11; i >= 0; i--) {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  displayLabels.add(thaiMonths[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2));
                }

                // Initial backlog = nullDateOpenJobs for this work_area + pre-display-range accumulation
                let cumOpen = (data.workAreaNullDateOpen || {})[key] || 0;
                for (const t of (data.workAreaTrend || [])) {
                  if (!displayLabels.has(t.month as string)) {
                    const opened = Number(t[key + '_opened'] || 0);
                    const completed = Number(t[key + '_completed'] || 0);
                    cumOpen += opened - completed;
                  }
                }

                const chartData: { month: string; closed: number; open: number; total: number; backlog: number }[] = [];
                for (let i = 11; i >= 0; i--) {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  const ml = thaiMonths[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2);
                  const found = (data.workAreaTrend || []).find(t => t.month === ml);
                  const opened = Number(found?.[key + '_opened'] || 0);
                  const closed = Number(found?.[key + '_closed'] || 0);
                  const completed = Number(found?.[key + '_completed'] || 0);
                  cumOpen += opened - completed;
                  chartData.push({ month: ml, closed, open: opened, total: closed + opened, backlog: cumOpen });
                }
                return (
                  <div key={key}>
                    <h4 className="text-sm font-semibold mb-2" style={{ color }}>{label}</h4>
                    <ResponsiveContainer width="100%" height={150}>
                      <ComposedChart data={chartData} margin={{ top: 20, right: 5, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 9 }} interval={1} />
                        <YAxis yAxisId="left" tick={{ fontSize: 9 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} />
                        <Tooltip formatter={(value: any, name: any) => {
                          const n: Record<string, string> = { open: 'เปิดใหม่', closed: 'ปิดแล้ว', backlog: 'ค้างสะสม' };
                          return [Number(value).toLocaleString(), n[name] || name];
                        }} />
                        <Bar dataKey="open" yAxisId="left" fill="#3b82f6" name="open">
                          <LabelList dataKey="open" position="top" style={{ fontSize: 8, fill: '#3b82f6' }} formatter={(v: any) => Number(v) > 0 ? Number(v).toLocaleString() : ''} />
                        </Bar>
                        <Bar dataKey="closed" yAxisId="left" fill="#10b981" name="closed">
                          <LabelList dataKey="closed" position="top" style={{ fontSize: 8, fill: '#10b981' }} formatter={(v: any) => Number(v) > 0 ? Number(v).toLocaleString() : ''} />
                        </Bar>
                        <Line type="linear" dataKey="backlog" yAxisId="right" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} name="backlog"
                          label={({ x, y, value, index }: any) => {
                            if (index !== 0 && index !== chartData.length - 1) return null;
                            return <text x={x} y={y - 8} textAnchor="middle" fontSize={9} fill="#ef4444" fontWeight={600}>{Number(value).toLocaleString()}</text>;
                          }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-6 mt-3">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }} /><span className="text-xs text-slate-600">เปิดใหม่</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: '#10b981' }} /><span className="text-xs text-slate-600">ปิดแล้ว</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-red-500 rounded" /><span className="text-xs text-slate-600">ค้างสะสม</span></div>
            </div>
          </div>
        </div>

        {/* Open Jobs by Category - Top 10 */}
        <div className="card mb-8">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800">Top 20 งานซ่อมตามหมวดงาน</h3>
            <p className="text-sm text-slate-500">จำนวนงานทั้งหมดแยกตาม repair_category (สูงสุด 20 อันดับ)</p>
          </div>
          {/* Clickable category chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {(() => {
              const named = data.openJobsByCategory.filter(d => d.category !== 'ไม่ระบุ' && d.category !== 'อื่นๆ');
              const sorted = [...named].sort((a, b) => b.totalJobs - a.totalJobs);
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
                  {item.label} ({item.totalJobs.toLocaleString()})
                </button>
              ));
            })()}
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={(() => {
                const named = data.openJobsByCategory.filter(d => d.category !== 'ไม่ระบุ' && d.category !== 'อื่นๆ');
                const unnamed = data.openJobsByCategory.filter(d => d.category === 'ไม่ระบุ' || d.category === 'อื่นๆ');
                const sorted = [...named].sort((a, b) => b.totalJobs - a.totalJobs);
                const top20 = sorted.slice(0, 20);
                const rest = sorted.slice(20);
                const othersTotalJobs = rest.reduce((s, d) => s + d.totalJobs, 0) + unnamed.reduce((s, d) => s + d.totalJobs, 0);
                const othersOpenJobs = rest.reduce((s, d) => s + d.openJobs, 0) + unnamed.reduce((s, d) => s + d.openJobs, 0);
                if (othersTotalJobs > 0) {
                  top20.push({ category: 'อื่นๆ', label: 'อื่นๆ', totalJobs: othersTotalJobs, openJobs: othersOpenJobs, color: '#9ca3af' });
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
                    const named = data.openJobsByCategory.filter(d => d.category !== 'ไม่ระบุ' && d.category !== 'อื่นๆ');
                    const sorted = [...named].sort((a, b) => b.totalJobs - a.totalJobs);
                    const top20 = sorted.slice(0, 20);
                    const rest = sorted.slice(20);
                    const unnamed = data.openJobsByCategory.filter(d => d.category === 'ไม่ระบุ' || d.category === 'อื่นๆ');
                    const othersTotalJobs = rest.reduce((s, d) => s + d.totalJobs, 0) + unnamed.reduce((s, d) => s + d.totalJobs, 0);
                    const all = [...top20];
                    if (othersTotalJobs > 0) all.push({ category: 'อื่นๆ', label: 'อื่นๆ', totalJobs: othersTotalJobs, openJobs: 0, color: '#9ca3af' });
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
                      <p className="text-sm text-slate-800 mt-1">ทั้งหมด: {item.totalJobs.toLocaleString()} งาน</p>
                      <p className="text-sm text-amber-600">เปิดอยู่: {item.openJobs.toLocaleString()} งาน</p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="totalJobs"
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
                  const named = data.openJobsByCategory.filter(d => d.category !== 'ไม่ระบุ' && d.category !== 'อื่นๆ');
                  const unnamed = data.openJobsByCategory.filter(d => d.category === 'ไม่ระบุ' || d.category === 'อื่นๆ');
                  const sorted = [...named].sort((a, b) => b.totalJobs - a.totalJobs);
                  const top20 = sorted.slice(0, 20);
                  const rest = sorted.slice(20);
                  const othersTotalJobs = rest.reduce((s, d) => s + d.totalJobs, 0) + unnamed.reduce((s, d) => s + d.totalJobs, 0);
                  const colors = top20.map((e, i) => ({
                    color: e.color,
                    selected: selectedCategory === e.category,
                  }));
                  if (othersTotalJobs > 0) colors.push({ color: '#9ca3af', selected: false });
                  return colors.map((c, i) => <Cell key={`cell-${i}`} fill={c.color} opacity={selectedCategory && !c.selected ? 0.4 : 1} />);
                })()}
                <LabelList
                  dataKey="totalJobs"
                  position="top"
                  fontSize={11}
                  fill="#64748b"
                  fontWeight={600}
                  formatter={(v) => {
                    const n = Number(v);
                    const total = data.openJobsByCategory.reduce((s, d) => s + d.totalJobs, 0);
                    const pct = total > 0 ? ((n / total) * 100).toFixed(1) : '0';
                    return `${n.toLocaleString()} (${pct}%)`;
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
                      // Parse filter range to YYYY-MM for comparison
                      const fromYM = currentFilters.dateFrom || '';
                      const toYM = currentFilters.dateTo || '';
                      const months: { month: string; total: number; completed: number; openJobs: number; inRange: boolean }[] = [];
                      for (let i = 11; i >= 0; i--) {
                        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        const label = thaiMonths[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2);
                        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const inRange = (!fromYM || ym >= fromYM) && (!toYM || ym <= toYM);
                        const matched = categoryTrend.find(t => t.month === label);
                        months.push({
                          month: label,
                          total: matched?.total ?? 0,
                          completed: matched?.completed ?? 0,
                          openJobs: matched?.openJobs ?? 0,
                          inRange,
                        });
                      }
                      return months;
                    })()}
                    margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
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
                    <Bar dataKey="total" radius={[4, 4, 0, 0]} name="งานทั้งหมด">
                      {(() => {
                        const now2 = new Date();
                        const fromYM2 = currentFilters.dateFrom || '';
                        const toYM2 = currentFilters.dateTo || '';
                        return Array.from({ length: 12 }, (_, idx) => {
                          const d = new Date(now2.getFullYear(), now2.getMonth() - (11 - idx), 1);
                          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                          const inRange = (!fromYM2 || ym >= fromYM2) && (!toYM2 || ym <= toYM2);
                          const catColor = selectedCategory ? (data.openJobsByCategory.find(c => c.category === selectedCategory)?.color || '#3b82f6') : '#3b82f6';
                        return <Cell key={idx} fill={inRange ? catColor : '#cbd5e1'} />;
                        });
                      })()}
                      <LabelList dataKey="total" position="top" fontSize={10} fill="#64748b" offset={10} formatter={(v: any) => v > 0 ? Number(v).toLocaleString() : ''} />
                    </Bar>
                    <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} name="ปิดแล้ว" />
                    <Line type="monotone" dataKey="openJobs" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} name="ยังเปิด" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: selectedCategory ? (data.openJobsByCategory.find(c => c.category === selectedCategory)?.color || '#3b82f6') : '#3b82f6' }} />
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


        {/* Monthly SLA Breakdown Table */}
        <div className="card mb-8">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800">งานค้างรายเดือน แยกตาม SLA Range</h3>
            <p className="text-sm text-slate-500">จำนวนงานที่ยังเปิดอยู่ จำแนกตามเดือนที่เปิดงานและช่วงอายุงาน</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-50">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">เดือน</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-blue-500">&lt;30 วัน</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-amber-500">30-45 วัน</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-orange-500">45-60 วัน</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-red-500">&gt;60 วัน</th>
                  <th className="text-center px-3 py-2 text-xs font-semibold text-slate-700">รวม</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                  const now = new Date();
                  const monthLabels: string[] = [];
                  for (let i = 11; i >= -1; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    monthLabels.push(thaiMonths[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2));
                  }
                  const lookup = new Map((data.monthlySlaBreakdown || []).map(r => [r.month, r]));
                  const totals = { under30: 0, d30to45: 0, d45to60: 0, over60: 0, total: 0 };

                  const rows = monthLabels.map((label) => {
                    const r = lookup.get(label);
                    if (r) {
                      totals.under30 += r.under30;
                      totals.d30to45 += r.d30to45;
                      totals.d45to60 += r.d45to60;
                      totals.over60 += r.over60;
                      totals.total += r.total;
                    }
                    return (
                      <tr key={label} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-700">{label}</td>
                        <td className="text-center px-3 py-2">
                          <span className={r?.under30 ? 'font-bold text-blue-500' : 'text-slate-300'}>
                            {(r?.under30 ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="text-center px-3 py-2">
                          <span className={r?.d30to45 ? 'font-bold text-amber-500' : 'text-slate-300'}>
                            {(r?.d30to45 ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="text-center px-3 py-2">
                          <span className={r?.d45to60 ? 'font-bold text-orange-500' : 'text-slate-300'}>
                            {(r?.d45to60 ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="text-center px-3 py-2">
                          <span className={r?.over60 ? 'font-bold text-red-600' : 'text-slate-300'}>
                            {(r?.over60 ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="text-center px-3 py-2">
                          <span className={r?.total ? 'font-bold text-slate-700' : 'text-slate-300'}>
                            {(r?.total ?? 0).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  });

                  rows.push(
                    <tr key="total" className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                      <td className="px-3 py-2 text-slate-800">รวม</td>
                      <td className="text-center px-3 py-2 text-blue-600">{totals.under30.toLocaleString()}</td>
                      <td className="text-center px-3 py-2 text-amber-600">{totals.d30to45.toLocaleString()}</td>
                      <td className="text-center px-3 py-2 text-orange-600">{totals.d45to60.toLocaleString()}</td>
                      <td className="text-center px-3 py-2 text-red-600">{totals.over60.toLocaleString()}</td>
                      <td className="text-center px-3 py-2 text-slate-800">{totals.total.toLocaleString()}</td>
                    </tr>
                  );

                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-4">
          <h3 className="font-semibold text-slate-800">เมนูลัด</h3>
          <p className="text-sm text-slate-500">นำทางไปยังรายงานเชิงลึก</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLinkCard
            title="Project Overview"
            description="ติดตาม Defect และงานค้างแต่ละโครงการ"
            href="/quality/project-overview"
            icon={Building2}
          />
          <QuickLinkCard
            title="Category by Project"
            description="เปรียบเทียบสัดส่วนประเภทซ่อมแต่ละโครงการ"
            href="/quality/category-by-project"
            icon={TrendingUp}
          />
          <QuickLinkCard
            title="All Requests"
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
            title="Settings"
            description="จัดการ Sync โครงการและตั้งค่าระบบ"
            href="/quality/settings"
            icon={Settings}
          />
        </div>
      </div>
    </div>
  );
}
