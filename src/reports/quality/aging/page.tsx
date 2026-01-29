import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, TrendingUp, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Wrench, CheckCircle, X, AlertTriangle, Star, Phone, Mail, Image, ArrowLeft } from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, LabelList,
} from 'recharts';
import { PageHeader, KPICard } from '@shared/ui';
import { fetchAgingData, AgingData, AgingSortField, SortOrder, JobFilter, JobDetail, fetchJobDetail } from './queries';
import { fetchQualityOverview, QualityOverviewData, fetchProjects, ProjectOption } from '../overview/queries';
import { QualityFilters, QualityFilterState } from '../overview/filters';

const bucketConfig = {
  '0-30': { label: '0-30 วัน', color: '#3b82f6', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
  '31-45': { label: '31-45 วัน', color: '#eab308', bgClass: 'bg-amber-100', textClass: 'text-amber-700' },
  '46-60': { label: '46-60 วัน', color: '#f97316', bgClass: 'bg-orange-100', textClass: 'text-orange-700' },
  '61-120': { label: '61-120 วัน', color: '#ef4444', bgClass: 'bg-red-100', textClass: 'text-red-700' },
  '120+': { label: '120+ วัน', color: '#991b1b', bgClass: 'bg-red-200', textClass: 'text-red-900' },
};

type BucketKey = keyof typeof bucketConfig;

const sortLabels: Record<AgingSortField, string> = {
  daysOpen: 'อายุงาน',
  requestNumber: 'เลขที่งาน',
  projectName: 'โครงการ',
  unitNumber: 'ยูนิต',
  category: 'หมวดหมู่',
  assignee: 'ช่าง',
  status: 'สถานะ',
  openDate: 'วันเปิด',
};

export function AgingPage() {
  const location = useLocation();
  const isRequestsPage = location.pathname.includes('/quality/requests');
  const [overviewData, setOverviewData] = useState<QualityOverviewData | null>(null);
  const [tableData, setTableData] = useState<AgingData | null>(null);
  const [currentFilters, setCurrentFilters] = useState<QualityFilterState | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  useEffect(() => { fetchProjects().then(setProjects).catch(() => {}); }, []);

  const navigate = useNavigate();
  // Apply jobFilter from navigation state (e.g. from overview KPI cards)
  const navState = location.state as { jobFilter?: JobFilter; fromPage?: boolean; backTo?: string; backLabel?: string } | null;
  const fromPage = !!navState?.fromPage;
  const backTo = navState?.backTo || '/quality';
  const backLabel = navState?.backLabel || 'กลับไป Overview';

  // Table controls
  const [jobFilter, setJobFilter] = useState<JobFilter>(navState?.jobFilter || 'open');
  const [searchQuery, setSearchQuery] = useState('');
  const [bucketFilter, setBucketFilter] = useState<BucketKey | 'all'>('all');
  const [sortBy, setSortBy] = useState<AgingSortField>('daysOpen');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showAll, setShowAll] = useState(false);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Job detail modal
  const [jobDetail, setJobDetail] = useState<JobDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openJobDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const detail = await fetchJobDetail(id);
      setJobDetail(detail);
    } catch { }
    setDetailLoading(false);
  };

  const loadOverview = async (filters: QualityFilterState) => {
    setCurrentFilters(filters);
    const result = await fetchQualityOverview(filters);
    setOverviewData(result);
  };

  // Load table data whenever filters/search/sort/page change
  useEffect(() => {
    if (!currentFilters) return;
    const effectiveLimit = showAll ? pageSize : 10;
    const effectiveOffset = showAll ? (currentPage - 1) * pageSize : 0;
    fetchAgingData({
      projectId: currentFilters.projectId || undefined,
      projectType: currentFilters.projectType || undefined,
      category: currentFilters.category || undefined,
      dateFrom: currentFilters.dateFrom || undefined,
      dateTo: currentFilters.dateTo || undefined,
      jobFilter: jobFilter,
      bucket: bucketFilter !== 'all' ? bucketFilter : undefined,
      search: searchQuery || undefined,
      sortBy,
      sortOrder,
      limit: effectiveLimit,
      offset: effectiveOffset,
    }).then(setTableData);
  }, [currentFilters, jobFilter, bucketFilter, searchQuery, sortBy, sortOrder, pageSize, currentPage, showAll]);

  const handleApplyFilters = (filters: QualityFilterState) => {
    loadOverview(filters);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleShowAllToggle = () => {
    setShowAll(!showAll);
    setCurrentPage(1);
  };

  const totalPages = tableData ? Math.ceil(tableData.pagination.total / pageSize) : 0;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = tableData ? Math.min(currentPage * pageSize, tableData.pagination.total) : 0;

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title={isRequestsPage ? 'All Requests' : 'Aging Report'}
        subtitle={isRequestsPage ? 'รายการงานซ่อมทั้งหมดในระบบ' : 'ติดตามอายุงานค้างและเร่งการปิดงาน'}
      />

      <div className="p-8 space-y-6">
        {fromPage && (
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(backTo)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <span className="text-sm text-slate-500">{backLabel}</span>
          </div>
        )}
        <QualityFilters onApply={handleApplyFilters} projects={projects} />

        {/* Overview KPI Cards */}
        {overviewData && (
        <div className="grid grid-cols-5 gap-4">
          <div onClick={() => { setJobFilter(jobFilter === 'all' ? 'open' : 'all'); setBucketFilter('all'); setCurrentPage(1); setShowAll(true); }} className={`cursor-pointer transition-all hover:opacity-80 rounded-xl ${jobFilter === 'all' ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}>
            <KPICard title="งานทั้งหมด" value={overviewData.kpis.totalJobs.toLocaleString()} change={`${overviewData.kpis.distinctProjects?.toLocaleString() ?? 0} โครงการ`} showArrow={false} subtext={`${overviewData.kpis.distinctUnits?.toLocaleString() ?? 0} ยูนิต`} icon={Wrench} color="blue" />
          </div>
          <div onClick={() => { setJobFilter(jobFilter === 'closed' ? 'open' : 'closed'); setBucketFilter('all'); setCurrentPage(1); setShowAll(true); }} className={`cursor-pointer transition-all hover:opacity-80 rounded-xl ${jobFilter === 'closed' ? 'ring-2 ring-offset-1 ring-emerald-400' : ''}`}>
            <KPICard title="งานปิดแล้ว" value={(overviewData.kpis.totalJobs - overviewData.kpis.openJobs).toLocaleString()} change={`${(overviewData.kpis.totalJobs > 0 ? (((overviewData.kpis.totalJobs - overviewData.kpis.openJobs) / overviewData.kpis.totalJobs) * 100).toFixed(1) : 0)}%`} showArrow={false} subtext={`${overviewData.kpis.closedUnits?.toLocaleString() ?? 0} ยูนิต`} icon={CheckCircle} color="emerald" />
          </div>
          {/* งานเปิดอยู่ + SLA breakdown */}
          <div className="col-span-3 card">
            <div className="grid grid-cols-6 gap-3 items-center">
              <div
                onClick={() => { setJobFilter('open'); setBucketFilter('all'); setCurrentPage(1); setShowAll(true); }}
                className={`cursor-pointer transition-all hover:opacity-80 ${bucketFilter === 'all' ? '' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xl font-bold text-amber-600">{overviewData.kpis.openJobs.toLocaleString()}</p>
                <p className="text-xs text-amber-500">{overviewData.kpis.openUnits?.toLocaleString() ?? 0} ยูนิต</p>
                <p className="text-xs text-slate-500 font-medium">งานเปิดอยู่</p>
              </div>
              {(() => {
                const aging = overviewData.kpis.aging;
                if (!aging) return null;
                const buckets = [
                  { label: '< 30 วัน', value: aging.under30 ?? 0, color: 'text-blue-500', bg: 'bg-blue-50', bucket: '0-30' as BucketKey },
                  { label: '30-45 วัน', value: aging.days30to45 ?? 0, color: 'text-red-400', bg: 'bg-red-50', bucket: '31-45' as BucketKey },
                  { label: '45-60 วัน', value: aging.days45to60 ?? 0, color: 'text-red-500', bg: 'bg-red-100', bucket: '46-60' as BucketKey },
                  { label: '> 60 วัน', value: aging.over60 ?? 0, color: 'text-red-700', bg: 'bg-red-200', bucket: '61-120' as BucketKey },
                  { label: '> 120 วัน', value: aging.over120 ?? 0, color: 'text-red-900', bg: 'bg-red-300', bucket: '120+' as BucketKey },
                ];
                return buckets.map((b) => (
                  <div
                    key={b.label}
                    onClick={() => { setBucketFilter(bucketFilter === b.bucket ? 'all' : b.bucket); setCurrentPage(1); setShowAll(true); }}
                    className={`${b.bg} rounded-lg py-4 text-center cursor-pointer transition-all hover:scale-105 hover:shadow-md ${bucketFilter === b.bucket ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                  >
                    <p className={`text-base font-bold ${b.color}`}>{b.value.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 whitespace-nowrap">{b.label}</p>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
        )}

        {/* Bar Charts: Closed + Open side by side */}
        {!isRequestsPage && overviewData?.agingScatter && (() => {
          const closedBuckets = [
            { key: 'under30', label: '0-30', color: '#86efac' },
            { key: 'd30to45', label: '31-45', color: '#22c55e' },
            { key: 'd45to60', label: '46-60', color: '#16a34a' },
            { key: 'd60to120', label: '61-120', color: '#166534' },
            { key: 'over120', label: '120+', color: '#052e16' },
          ];
          const openBuckets = [
            { key: 'under30', label: '0-30', color: '#3b82f6' },
            { key: 'd30to45', label: '31-45', color: '#eab308' },
            { key: 'd45to60', label: '46-60', color: '#f97316' },
            { key: 'd60to120', label: '61-120', color: '#ef4444' },
            { key: 'over120', label: '120+', color: '#991b1b' },
          ];
          const aggregate = (items: { day: number; count: number }[]) => {
            const b = { under30: 0, d30to45: 0, d45to60: 0, d60to120: 0, over120: 0 };
            items.forEach((d) => {
              if (d.day <= 30) b.under30 += d.count;
              else if (d.day <= 45) b.d30to45 += d.count;
              else if (d.day <= 60) b.d45to60 += d.count;
              else if (d.day <= 120) b.d60to120 += d.count;
              else b.over120 += d.count;
            });
            return b;
          };
          const closedB = aggregate(overviewData.agingScatter.closed);
          const openB = aggregate(overviewData.agingScatter.open);
          const closedTotal = Object.values(closedB).reduce((a, b) => a + b, 0);
          const openTotal = Object.values(openB).reduce((a, b) => a + b, 0);

          const closedBarData = closedBuckets.map((s) => ({ label: s.label, value: closedB[s.key as keyof typeof closedB], color: s.color, pct: closedTotal > 0 ? ((closedB[s.key as keyof typeof closedB] / closedTotal) * 100).toFixed(1) : '0' }));
          const openBarData = openBuckets.map((s) => ({ label: s.label, value: openB[s.key as keyof typeof openB], color: s.color, pct: openTotal > 0 ? ((openB[s.key as keyof typeof openB] / openTotal) * 100).toFixed(1) : '0' }));

          const renderBar = (barData: typeof closedBarData) => (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 30, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => v.toLocaleString()} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  formatter={(value: any, _: any, props: any) => {
                    const pct = barData[props?.index]?.pct ?? '0';
                    return [`${Number(value).toLocaleString()} งาน (${pct}%)`, 'จำนวน'];
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="top"
                    fontSize={10}
                    fill="#64748b"
                    content={({ x, y, width, value, index }: any) => {
                      if (!value || Number(value) === 0) return null;
                      const pct = barData[index]?.pct;
                      return (
                        <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={10} fill="#64748b">
                          {Number(value).toLocaleString()} ({pct}%)
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          );

          const openDonutData = openBuckets.map((s) => {
            const v = openB[s.key as keyof typeof openB];
            return { name: s.label, value: v, color: s.color };
          }).filter((d) => d.value > 0);

          return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-slate-800">งานปิดแล้ว ({closedTotal.toLocaleString()})</h3>
            </div>
            {renderBar(closedBarData)}
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-slate-800">งานเปิดอยู่ ({openTotal.toLocaleString()})</h3>
            </div>
            {renderBar(openBarData)}
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-slate-500" />
              <h3 className="font-semibold text-slate-800">สัดส่วนงานค้าง</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={openDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                >
                  {openDonutData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-slate-700">{item.name} วัน</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mt-1">
                          {Number(item.value).toLocaleString()} งาน
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
          );
        })()}

        {/* Jobs Table */}
        {tableData && (
        <div className="card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-slate-800">
                  {showAll
                    ? jobFilter === 'all' ? 'รายการงานทั้งหมด' : jobFilter === 'closed' ? 'รายการงานปิดแล้ว' : 'รายการงานเปิดอยู่ทั้งหมด'
                    : `Top 10 ${jobFilter === 'all' ? 'งานทั้งหมด' : jobFilter === 'closed' ? 'งานปิดแล้ว' : 'งานค้างนาน'} (เรียงตาม${sortLabels[sortBy]})`}
                </h3>
                {bucketFilter !== 'all' && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${bucketConfig[bucketFilter].bgClass} ${bucketConfig[bucketFilter].textClass}`}>
                    กรอง: {bucketConfig[bucketFilter].label}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                ทั้งหมด {tableData.pagination.total.toLocaleString()} รายการ · เรียงตาม {sortLabels[sortBy]} {sortOrder === 'desc' ? 'มากไปน้อย' : 'น้อยไปมาก'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as AgingSortField); setCurrentPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="daysOpen">อายุงาน</option>
                <option value="openDate">วันเปิด</option>
                <option value="projectName">โครงการ</option>
                <option value="category">หมวดหมู่</option>
                <option value="assignee">ช่าง</option>
                <option value="status">สถานะ</option>
              </select>
              <select
                value={sortOrder}
                onChange={(e) => { setSortOrder(e.target.value as SortOrder); setCurrentPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="desc">มากไปน้อย</option>
                <option value="asc">น้อยไปมาก</option>
              </select>
              <select
                value={bucketFilter}
                onChange={(e) => { setBucketFilter(e.target.value as BucketKey | 'all'); setCurrentPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="all">ทุกช่วง</option>
                <option value="0-30">0-30 วัน</option>
                <option value="31-45">31-45 วัน</option>
                <option value="46-60">46-60 วัน</option>
                <option value="61-120">61-120 วัน</option>
                <option value="120+">120+ วัน</option>
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหา เลขที่งาน, โครงการ, ยูนิต..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              {tableData.pagination.total > 10 && (
                <button
                  onClick={handleShowAllToggle}
                  className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  {showAll ? 'แสดง Top 10' : 'ดูทั้งหมด'}
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-xs font-semibold text-slate-600 py-3 px-4">เลขที่งาน</th>
                  <th className="text-left text-xs font-semibold text-slate-600 py-3 px-4">โครงการ</th>
                  <th className="text-left text-xs font-semibold text-slate-600 py-3 px-4">ยูนิต</th>
                  <th className="text-left text-xs font-semibold text-slate-600 py-3 px-4">ลูกค้า</th>
                  <th className="text-left text-xs font-semibold text-slate-600 py-3 px-4">หมวดหมู่</th>
                  <th className="text-left text-xs font-semibold text-slate-600 py-3 px-4">ช่าง/ผู้รับผิดชอบ</th>
                  <th className="text-left text-xs font-semibold text-slate-600 py-3 px-4">สถานะ</th>
                  <th className="text-center text-xs font-semibold text-slate-600 py-3 px-4">วันเปิด</th>
                  <th className="text-center text-xs font-semibold text-slate-600 py-3 px-4">อายุงาน</th>
                  <th className="text-left text-xs font-semibold text-slate-600 py-3 px-4">SLA</th>
                </tr>
              </thead>
              <tbody>
                {tableData.jobs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500">ไม่พบข้อมูล</td>
                  </tr>
                ) : (
                  tableData.jobs.map((job) => {
                    const bucket = bucketConfig[job.bucket] || bucketConfig['120+'];
                    const pct = Math.min(job.daysOpen / 120, 1) * 100;
                    const barColor = job.daysOpen <= 30 ? '#3b82f6' : job.daysOpen <= 45 ? '#eab308' : job.daysOpen <= 60 ? '#f97316' : job.daysOpen <= 120 ? '#ef4444' : '#991b1b';
                    return (
                      <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => openJobDetail(job.id)}>
                        <td className="py-3 px-4 text-sm font-mono text-primary-600">{job.requestNumber}</td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-800">{job.projectName}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{job.unitNumber}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{job.customerName}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{job.category}</td>
                        <td className="py-3 px-4 text-sm text-slate-800">{job.assignee}</td>
                        <td className="py-3 px-4">
                          {(() => {
                            const s = job.status?.toLowerCase() || '';
                            const isCompleted = s === 'completed';
                            const isCancelled = s === 'cancel';
                            const isInProgress = s.includes('inprogress') || s.includes('in progress') || s.includes('in_progress');
                            const isWaiting = s.includes('wait') || s.includes('pending') || s.includes('assess');
                            const isAssigned = s.includes('assign');
                            const dotClass = isCompleted ? 'bg-emerald-500' : isCancelled ? 'bg-red-400' : isInProgress ? 'bg-blue-500 animate-pulse' : isAssigned ? 'bg-violet-400' : isWaiting ? 'bg-amber-400' : 'bg-slate-400';
                            return (
                              <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`}></span>
                                {job.status}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 text-center">
                          {job.openDate ? new Date(job.openDate).toLocaleDateString('th-TH') : '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-xs font-bold ${bucket.textClass}`}>{job.daysOpen} วัน</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bucket.bgClass} ${bucket.textClass}`}>
                            {bucket.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {showAll && tableData.pagination.total > 0 && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-4">
                <p className="text-sm text-slate-500">
                  แสดง {startItem.toLocaleString()}-{endItem.toLocaleString()} จาก {tableData.pagination.total.toLocaleString()} รายการ
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">แสดง</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="border border-slate-200 rounded px-2 py-1 text-sm"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <span className="text-sm text-slate-500">รายการ</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {getPageNumbers().map((page, index) => (
                  <button
                    key={index}
                    onClick={() => typeof page === 'number' && goToPage(page)}
                    disabled={page === '...'}
                    className={`min-w-[36px] h-9 px-3 rounded text-sm font-medium transition-colors ${
                      page === currentPage ? 'bg-primary-600 text-white' : page === '...' ? 'cursor-default' : 'hover:bg-slate-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed">
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Loading overlay */}
      {detailLoading && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl px-6 py-4 shadow-xl flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-600">กำลังโหลดข้อมูล...</span>
          </div>
        </div>
      )}

      {/* Job Detail Modal */}
      {jobDetail && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setJobDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-primary-600">{jobDetail.requestNumber}</span>
                {jobDetail.isUrgent && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                    <AlertTriangle className="w-3 h-3" /> เร่งด่วน
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  jobDetail.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                  jobDetail.status === 'cancel' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {jobDetail.status}
                </span>
                {jobDetail.slaExceeded && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">เกิน SLA</span>
                )}
              </div>
              <button onClick={() => setJobDetail(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">โครงการ</p>
                  <p className="text-sm font-medium text-slate-800">{jobDetail.projectName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">ยูนิต</p>
                  <p className="text-sm font-medium text-slate-800">{jobDetail.unitNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">ลูกค้า</p>
                  <p className="text-sm font-medium text-slate-800">{jobDetail.customerName}</p>
                  {jobDetail.customerPhone && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{jobDetail.customerPhone}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">หมวดงาน</p>
                  <p className="text-sm font-medium text-slate-800">{jobDetail.category}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">ช่องทางแจ้ง</p>
                  <p className="text-sm text-slate-700">{jobDetail.requestChannel || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">ประกัน</p>
                  <p className="text-sm text-slate-700">{jobDetail.warrantyStatus || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">อายุงาน</p>
                  <p className="text-sm font-bold text-slate-800">{jobDetail.daysOpen} วัน</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">สถานะหลัก</p>
                  <p className="text-sm text-slate-700">{jobDetail.jobStatus}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Symptom & Notes */}
                <div className="space-y-4">
                  {(jobDetail.issue || jobDetail.symptom || jobDetail.symptomDetail) && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">อาการ / ปัญหา</h4>
                      <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm text-slate-700">
                        {jobDetail.issue && <p><span className="text-slate-400">ประเภท:</span> {jobDetail.issue}</p>}
                        {jobDetail.symptom && <p><span className="text-slate-400">อาการ:</span> {jobDetail.symptom}</p>}
                        {jobDetail.symptomDetail && <p><span className="text-slate-400">รายละเอียด:</span> {jobDetail.symptomDetail}</p>}
                      </div>
                    </div>
                  )}

                  {jobDetail.technicianNote && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">หมายเหตุช่าง</h4>
                      <div className="bg-blue-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">{jobDetail.technicianNote}</div>
                    </div>
                  )}

                  {jobDetail.adminNote && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">หมายเหตุ Admin</h4>
                      <div className="bg-amber-50 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">{jobDetail.adminNote}</div>
                    </div>
                  )}

                  {jobDetail.jobHistory && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">ประวัติงาน</h4>
                      <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 whitespace-pre-wrap max-h-48 overflow-y-auto">{jobDetail.jobHistory}</div>
                    </div>
                  )}
                </div>

                {/* Right: Timeline & Technician */}
                <div className="space-y-4">
                  {/* Timeline */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Timeline</h4>
                    <div className="space-y-0">
                      {[
                        { label: 'เปิดงาน', date: jobDetail.openDate, color: 'bg-blue-500' },
                        { label: 'ประเมิน', date: jobDetail.assessmentDate, color: 'bg-violet-500' },
                        { label: 'มอบหมาย', date: jobDetail.assignDate, color: 'bg-amber-500' },
                        { label: 'เข้าซ่อม', date: jobDetail.serviceDate, color: 'bg-orange-500' },
                        { label: 'ปิดงาน', date: jobDetail.closeDate, color: 'bg-emerald-500' },
                        { label: 'SLA ครบ', date: jobDetail.slaDate, color: jobDetail.slaExceeded ? 'bg-red-500' : 'bg-slate-400' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 py-1.5">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${item.date ? item.color : 'bg-slate-200'}`} />
                          <span className="text-xs text-slate-500 w-16">{item.label}</span>
                          <span className={`text-sm ${item.date ? 'text-slate-800' : 'text-slate-300'}`}>
                            {item.date ? new Date(item.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Technician */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">ช่าง / ผู้รับผิดชอบ</h4>
                    <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                      <p className="font-medium text-slate-800">{jobDetail.assignee}</p>
                      {jobDetail.technicianEmail && (
                        <p className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" />{jobDetail.technicianEmail}</p>
                      )}
                      {jobDetail.technicianDetail && (
                        <p className="text-xs text-slate-600 mt-1">{jobDetail.technicianDetail}</p>
                      )}
                    </div>
                  </div>

                  {/* Review */}
                  {jobDetail.reviewScore !== null && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">รีวิวจากลูกค้า</h4>
                      <div className="bg-amber-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-bold text-amber-700">{jobDetail.reviewScore}</span>
                          {jobDetail.reviewDate && (
                            <span className="text-xs text-slate-400 ml-auto">{new Date(jobDetail.reviewDate).toLocaleDateString('th-TH')}</span>
                          )}
                        </div>
                        {jobDetail.reviewComment && (
                          <p className="text-sm text-slate-700 mt-1">{jobDetail.reviewComment}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Images */}
              {(jobDetail.beforeImageUrl || jobDetail.afterImageUrl || jobDetail.customerImageUrl) && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1"><Image className="w-4 h-4" /> รูปภาพ</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {jobDetail.customerImageUrl && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">รูปจากลูกค้า</p>
                        <img src={jobDetail.customerImageUrl} alt="customer" className="rounded-lg border border-slate-200 w-full h-48 object-cover" />
                      </div>
                    )}
                    {jobDetail.beforeImageUrl && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">ก่อนซ่อม</p>
                        <img src={jobDetail.beforeImageUrl} alt="before" className="rounded-lg border border-slate-200 w-full h-48 object-cover" />
                      </div>
                    )}
                    {jobDetail.afterImageUrl && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">หลังซ่อม</p>
                        <img src={jobDetail.afterImageUrl} alt="after" className="rounded-lg border border-slate-200 w-full h-48 object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
