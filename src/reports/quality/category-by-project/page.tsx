import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageHeader, KPICard } from '@shared/ui';
import { QualityFilters, QualityFilterState } from '../overview/filters';
import {
  fetchQualityOverview,
  fetchProjects,
  QualityOverviewData,
  ProjectOption,
} from '../overview/queries';
import { FileText, Search, Wrench, Clock, TrendingUp, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

export function CategoryByProjectPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromPage = !!(location.state as any)?.fromPage;
  const [data, setData] = useState<QualityOverviewData | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFilters, setCurrentFilters] = useState<QualityFilterState | null>(null);

  const SHARED_SEARCH_KEY = 'quality-project-search';
  const STORAGE_KEY = 'quality-category-by-project-list';
  const savedList = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } })();
  const [search, setSearch] = useState(localStorage.getItem(SHARED_SEARCH_KEY) || '');
  const [sortBy, setSortBy] = useState<string>(savedList.sortBy || 'total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(savedList.sortOrder || 'desc');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sortBy, sortOrder }));
    localStorage.setItem(SHARED_SEARCH_KEY, search);
  }, [search, sortBy, sortOrder]);

  useEffect(() => {
    fetchProjects().then(setProjects).catch(console.error);
  }, []);

  useEffect(() => {
    if (!currentFilters) return;
    setIsLoading(true);
    fetchQualityOverview(currentFilters)
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [currentFilters]);

  const goToOverview = (projectId: string) => {
    const saved = JSON.parse(localStorage.getItem('quality-overview-filters') || '{}');
    localStorage.setItem('quality-overview-filters', JSON.stringify({ ...saved, projectId }));
    navigate('/quality');
  };

  // Category color map
  const topCategories = data ? data.allCategories.slice(0, 8) : [];
  const categoryColorMap: Record<string, string> = {};
  if (data) {
    for (const item of data.openJobsByCategory) {
      categoryColorMap[item.category] = item.color;
    }
  }

  // Filter + sort
  const allProjects = data?.projectDefectsByCategory || [];
  const filtered = allProjects.filter(p =>
    !search || p.projectName?.toLowerCase().includes(search.toLowerCase()) || p.projectId.toLowerCase().includes(search.toLowerCase())
  );
  const sorted = [...filtered].sort((a, b) => {
    const av = sortBy === 'total' ? a.total : (a.categories[sortBy] || 0);
    const bv = sortBy === 'total' ? b.total : (b.categories[sortBy] || 0);
    return sortOrder === 'desc' ? bv - av : av - bv;
  });
  const displayed = showAll ? sorted : sorted.slice(0, 20);

  // Sort options: total + top categories
  const sortOptions = [
    { value: 'total', label: 'จำนวนทั้งหมด' },
    ...topCategories.map(cat => ({ value: cat, label: cat })),
  ];

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Category by Project"
        subtitle="เปรียบเทียบสัดส่วนประเภทซ่อมแต่ละโครงการ"
      />

      <div className="p-8">
        {fromPage && (
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate('/quality')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <span className="text-sm text-slate-500">กลับไป Overview</span>
          </div>
        )}
        <QualityFilters
          projects={projects}
          hideProject={false}
          onApply={(filters) => setCurrentFilters(filters)}
        />

        {!data ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : (
        <>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <KPICard title="งานทั้งหมด" value={data.kpis.totalJobs.toLocaleString()} change={`${data.kpis.distinctProjects?.toLocaleString() ?? 0} โครงการ`} showArrow={false} subtext={`${data.kpis.distinctUnits?.toLocaleString() ?? 0} ยูนิต`} icon={Wrench} color="blue" />
          <KPICard title="เสร็จสิ้น" value={(data.kpis.totalJobs - data.kpis.openJobs - (data.kpis.cancelledJobs || 0)).toLocaleString()} change={`${(data.kpis.totalJobs > 0 ? (((data.kpis.totalJobs - data.kpis.openJobs - (data.kpis.cancelledJobs || 0)) / data.kpis.totalJobs) * 100).toFixed(1) : 0)}%`} showArrow={false} subtext={`${data.kpis.closedUnits?.toLocaleString() ?? 0} ยูนิต`} icon={CheckCircle} color="emerald" />
          <KPICard title="ยกเลิก" value={(data.kpis.cancelledJobs || 0).toLocaleString()} change={`${(data.kpis.totalJobs > 0 ? (((data.kpis.cancelledJobs || 0) / data.kpis.totalJobs) * 100).toFixed(1) : 0)}%`} showArrow={false} subtext={`${(data.kpis.cancelledUnits || 0).toLocaleString()} ยูนิต`} icon={XCircle} color="red" />
          <KPICard title="งานเปิดอยู่" value={data.kpis.openJobs.toLocaleString()} change={`${(data.kpis.totalJobs > 0 ? ((data.kpis.openJobs / data.kpis.totalJobs) * 100).toFixed(1) : 0)}%`} showArrow={false} subtext={`${data.kpis.openUnits?.toLocaleString() ?? 0} ยูนิต`} icon={Clock} color="amber" />
          <KPICard title="เวลาเฉลี่ยปิดงาน" value={`${data.kpis.avgResolutionDays} วัน`} icon={TrendingUp} color="purple" />
          <KPICard title="Completion Rate" value={`${data.kpis.completionRate}%`} icon={CheckCircle} color="emerald" />
        </div>

        {/* Category Table */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              <h3 className="font-semibold text-slate-800">
                {showAll ? 'ทั้งหมด' : 'Top 20'} ({filtered.length} โครงการ)
              </h3>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="ค้นหาโครงการ..."
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">เรียงตาม</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  {sortOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="desc">มากไปน้อย</option>
                  <option value="asc">น้อยไปมาก</option>
                </select>
              </div>
              {filtered.length > 20 && (
                <button onClick={() => setShowAll(!showAll)}
                  className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors">
                  {showAll ? 'แสดง Top 20' : `ดูทั้งหมด (${filtered.length})`}
                </button>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mb-3">
            {topCategories.map((cat) => (
              <div key={cat} className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: categoryColorMap[cat] || '#9ca3af' }} />
                <span className="text-[11px] text-slate-600">{cat}</span>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-400" />
              <span className="text-[11px] text-slate-600">อื่นๆ</span>
            </div>
          </div>

          {/* Table Header */}
          <div className="flex items-center gap-2 py-2 border-b-2 border-slate-200 bg-slate-50 rounded-t-lg px-2">
            <div className="w-48 flex-shrink-0">
              <span className="text-xs font-semibold text-slate-600 uppercase">โครงการ</span>
            </div>
            <div className="w-14 flex-shrink-0 text-right">
              <span className="text-xs font-semibold text-slate-600">รวม</span>
            </div>
            <div className="flex-1 min-w-0 text-right">
              <span className="text-xs font-semibold text-slate-600">สัดส่วนประเภทซ่อม</span>
            </div>
          </div>

          {/* Table Body */}
          <div>
            {displayed.map((p) => {
              const name = p.projectName?.replace(/^เสนา\s*/, '') || p.projectId;
              const catEntries = topCategories.map((cat) => ({
                cat,
                count: p.categories[cat] || 0,
                color: categoryColorMap[cat] || '#9ca3af',
              }));
              let otherSum = 0;
              for (const [cat, cnt] of Object.entries(p.categories)) {
                if (!topCategories.includes(cat)) otherSum += cnt;
              }
              if (otherSum > 0) catEntries.push({ cat: 'อื่นๆ', count: otherSum, color: '#9ca3af' });
              const maxVal = p.total;

              return (
                <div key={p.projectId} className="flex items-center gap-2 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 px-2">
                  <div className="w-48 flex-shrink-0">
                    <p
                      className="text-sm font-medium text-primary-700 truncate cursor-pointer hover:underline"
                      title={name}
                      onClick={() => goToOverview(p.projectId)}
                    >{name}</p>
                    <p className="text-[10px] text-slate-400">{p.projectId}</p>
                  </div>
                  <div className="w-14 flex-shrink-0 text-right">
                    <span className="text-sm font-bold text-slate-700">{p.total.toLocaleString()}</span>
                  </div>
                  <div className="flex-1 min-w-0 group/cat relative">
                    <div className="flex h-5 overflow-hidden bg-slate-100 rounded">
                      {catEntries.filter(e => e.count > 0).map((e, i) => {
                        const pct = maxVal > 0 ? (e.count / maxVal) * 100 : 0;
                        return (
                          <div
                            key={i}
                            className="h-full flex items-center justify-center transition-all"
                            style={{ width: `${pct}%`, backgroundColor: e.color }}
                          >
                            {pct >= 10 && <span className="text-[10px] font-semibold text-white truncate px-0.5">{e.count}</span>}
                          </div>
                        );
                      })}
                    </div>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cat:block z-50 pointer-events-none">
                      <div className="bg-slate-800 text-white rounded-lg px-3 py-2 shadow-xl text-xs whitespace-nowrap">
                        <p className="font-semibold mb-1">{name} ({p.total} งาน)</p>
                        {catEntries.filter(e => e.count > 0).map((e, i) => (
                          <div key={i} className="flex items-center gap-2 mb-0.5">
                            <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: e.color }} />
                            <span>{e.cat}: {e.count.toLocaleString()} ({maxVal > 0 ? ((e.count / maxVal) * 100).toFixed(0) : 0}%)</span>
                          </div>
                        ))}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
