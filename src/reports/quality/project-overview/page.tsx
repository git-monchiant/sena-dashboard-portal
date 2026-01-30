import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, KPICard } from '@shared/ui';
import { QualityFilters, QualityFilterState } from '../overview/filters';
import {
  fetchQualityOverview,
  fetchProjects,
  QualityOverviewData,
  ProjectOption,
} from '../overview/queries';
import { FileText, Search, Wrench, Clock, TrendingUp, CheckCircle, XCircle } from 'lucide-react';

export function ProjectOverviewQualityPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<QualityOverviewData | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFilters, setCurrentFilters] = useState<QualityFilterState | null>(null);

  const SHARED_SEARCH_KEY = 'quality-project-search';
  const PO_STORAGE_KEY = 'quality-project-overview-list';
  const savedPO = (() => { try { return JSON.parse(localStorage.getItem(PO_STORAGE_KEY) || '{}'); } catch { return {}; } })();
  const [defectSortBy, setDefectSortBy] = useState<string>(savedPO.sortBy || 'openDefects');
  const [defectSortOrder, setDefectSortOrder] = useState<'asc' | 'desc'>(savedPO.sortOrder || 'desc');
  const [defectShowAll, setDefectShowAll] = useState(false);
  const [defectSearch, setDefectSearch] = useState(localStorage.getItem(SHARED_SEARCH_KEY) || '');

  useEffect(() => {
    localStorage.setItem(PO_STORAGE_KEY, JSON.stringify({ sortBy: defectSortBy, sortOrder: defectSortOrder }));
    localStorage.setItem(SHARED_SEARCH_KEY, defectSearch);
  }, [defectSortBy, defectSortOrder, defectSearch]);

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

  // Category color map from openJobsByCategory (same as Top chart)
  const topCategories = data ? data.allCategories.slice(0, 8) : [];
  const categoryColorMap: Record<string, string> = {};
  if (data) {
    for (const item of data.openJobsByCategory) {
      categoryColorMap[item.category] = item.color;
    }
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Project Overview"
        subtitle="ติดตาม Defect และงานค้างแต่ละโครงการ"
      />

      <div className="p-8">
        <QualityFilters
          projects={projects}
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
          <KPICard title="งานทั้งหมด" value={data.kpis.totalJobs.toLocaleString()} change={`${data.kpis.distinctProjects?.toLocaleString() ?? 0} โครงการ`} showArrow={false} subtext={`${data.kpis.distinctUnits?.toLocaleString() ?? 0} ยูนิต`} icon={Wrench} color="blue" onClick={() => navigate('/quality/requests', { state: { jobFilter: 'all', fromPage: true, backTo: '/quality/project-overview', backLabel: 'กลับไป Project Overview' } })} />
          <KPICard title="เสร็จสิ้น" value={(data.kpis.totalJobs - data.kpis.openJobs - (data.kpis.cancelledJobs || 0)).toLocaleString()} change={`${(data.kpis.totalJobs > 0 ? (((data.kpis.totalJobs - data.kpis.openJobs - (data.kpis.cancelledJobs || 0)) / data.kpis.totalJobs) * 100).toFixed(1) : 0)}%`} showArrow={false} subtext={`${data.kpis.closedUnits?.toLocaleString() ?? 0} ยูนิต`} icon={CheckCircle} color="emerald" onClick={() => navigate('/quality/requests', { state: { jobFilter: 'closed', fromPage: true, backTo: '/quality/project-overview', backLabel: 'กลับไป Project Overview' } })} />
          <KPICard title="ยกเลิก" value={(data.kpis.cancelledJobs || 0).toLocaleString()} change={`${(data.kpis.totalJobs > 0 ? (((data.kpis.cancelledJobs || 0) / data.kpis.totalJobs) * 100).toFixed(1) : 0)}%`} showArrow={false} subtext={`${(data.kpis.cancelledUnits || 0).toLocaleString()} ยูนิต`} icon={XCircle} color="red" />
          <KPICard title="งานเปิดอยู่" value={data.kpis.openJobs.toLocaleString()} change={`${(data.kpis.totalJobs > 0 ? ((data.kpis.openJobs / data.kpis.totalJobs) * 100).toFixed(1) : 0)}%`} showArrow={false} subtext={`${data.kpis.openUnits?.toLocaleString() ?? 0} ยูนิต`} icon={Clock} color="amber" onClick={() => navigate('/quality/aging', { state: { jobFilter: 'open', fromPage: true, backTo: '/quality/project-overview', backLabel: 'กลับไป Project Overview' } })} />
          <KPICard title="เวลาเฉลี่ยปิดงาน" value={`${data.kpis.avgResolutionDays} วัน`} icon={TrendingUp} color="purple" />
          <KPICard title="Completion Rate" value={`${data.kpis.completionRate}%`} icon={CheckCircle} color="emerald" />
        </div>

        {/* Status View */}
        {(() => {
          const sortLabels: Record<string, string> = {
            openDefects: 'งานเปิดอยู่',
            totalDefects: 'Defect ทั้งหมด',
            defectsOver30Days: 'ค้าง > 30 วัน',
            defectsOver45Days: 'ค้าง > 45 วัน',
            defectsOver60Days: 'ค้าง > 60 วัน',
            completionRate: 'Completion Rate',
            avgResolutionDays: 'เวลาเฉลี่ย',
          };
          const filtered = data.projectDefects.filter(p =>
            !defectSearch || p.projectName.toLowerCase().includes(defectSearch.toLowerCase()) || p.projectId.toLowerCase().includes(defectSearch.toLowerCase())
          );
          const sorted = [...filtered].sort((a, b) => {
            const av = (a as any)[defectSortBy] ?? 0;
            const bv = (b as any)[defectSortBy] ?? 0;
            return defectSortOrder === 'desc' ? bv - av : av - bv;
          });
          const displayed = defectShowAll ? sorted : sorted.slice(0, 10);
          return (
        <>
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              <h3 className="font-semibold text-slate-800">
                {defectShowAll ? 'ทั้งหมด' : 'Top 10'} - เรียงตาม{sortLabels[defectSortBy]} ({filtered.length} โครงการ)
              </h3>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="ค้นหาโครงการ..."
                  value={defectSearch} onChange={(e) => setDefectSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">เรียงตาม</span>
                <select value={defectSortBy} onChange={(e) => setDefectSortBy(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="openDefects">งานเปิดอยู่</option>
                  <option value="totalDefects">Defect ทั้งหมด</option>
                  <option value="defectsOver30Days">ค้าง &gt; 30 วัน</option>
                  <option value="defectsOver45Days">ค้าง &gt; 45 วัน</option>
                  <option value="defectsOver60Days">ค้าง &gt; 60 วัน</option>
                  <option value="completionRate">Completion Rate</option>
                  <option value="avgResolutionDays">เวลาเฉลี่ย</option>
                </select>
                <select value={defectSortOrder} onChange={(e) => setDefectSortOrder(e.target.value as 'asc' | 'desc')}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="desc">มากไปน้อย</option>
                  <option value="asc">น้อยไปมาก</option>
                </select>
              </div>
              {filtered.length > 20 && (
                <button onClick={() => setDefectShowAll(!defectShowAll)}
                  className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors">
                  {defectShowAll ? 'แสดง Top 20' : `ดูทั้งหมด (${filtered.length})`}
                </button>
              )}
            </div>
          </div>
          {/* Table Header */}
          <div className="flex items-center gap-2 py-2 border-b-2 border-slate-200 bg-slate-50 rounded-t-lg px-2">
            <div className="flex-1 min-w-[160px]">
              <span className="text-xs font-semibold text-slate-600 uppercase">โครงการ</span>
            </div>
            <div className="w-12 flex-shrink-0 text-center">
              <span className="text-xs font-semibold text-slate-600">ทั้งหมด</span>
            </div>
            <div className="w-12 flex-shrink-0 text-center">
              <span className="text-xs font-semibold text-emerald-600">ปิด</span>
            </div>
            <div className="w-12 flex-shrink-0 text-center">
              <span className="text-xs font-semibold text-amber-600">ค้าง</span>
            </div>
            <div className="w-32 flex-shrink-0 pl-2">
              <span className="text-xs font-semibold text-slate-600">SLA งานค้าง (วัน)</span>
              <div className="grid grid-cols-4 gap-0 mt-0.5">
                <span className="text-[10px] text-blue-500 text-center">&lt;30</span>
                <span className="text-[10px] text-amber-500 text-center">30-45</span>
                <span className="text-[10px] text-orange-500 text-center">45-60</span>
                <span className="text-[10px] text-red-500 text-center">&gt;60</span>
              </div>
            </div>
            <div className="w-48 flex-shrink-0 text-center pl-2">
              <span className="text-xs font-semibold text-slate-600">เปรียบเทียบ ปิด/ค้าง</span>
              <div className="flex justify-center gap-3 mt-0.5">
                {[
                  { label: 'ปิด', color: '#10b981' },
                  { label: 'ค้าง', color: '#f59e0b' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] text-slate-500">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-[480px] flex-shrink-0 text-center pl-2">
              <span className="text-xs font-semibold text-slate-600">เปรียบเทียบจำนวนงานค้างตามช่วงวัน</span>
              <div className="flex justify-center gap-3 mt-1">
                {[
                  { label: '<30d', color: '#60a5fa' },
                  { label: '30-45', color: '#f59e0b' },
                  { label: '45-60', color: '#f97316' },
                  { label: '>60d', color: '#ef4444' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] text-slate-500">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div>
            {displayed.map((p) => {
              const under30 = p.openDefects - (p.defectsOver30Days || 0);
              const days30to45 = (p.defectsOver30Days || 0) - (p.defectsOver45Days || 0);
              const days45to60 = (p.defectsOver45Days || 0) - (p.defectsOver60Days || 0);
              const over60 = p.defectsOver60Days || 0;

              const name = p.projectName?.replace(/^เสนา\s*/, '') || p.projectId;

              return (
                <div key={p.projectId} className={`flex items-center gap-2 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 px-2`}>
                  {/* Project Name */}
                  <div className="flex-1 min-w-[160px]">
                    <p
                      className={`text-sm font-medium truncate cursor-pointer hover:underline ${p.projectId === 'NO_PROJECT' ? 'text-red-600' : 'text-primary-700'}`}
                      title={name}
                      onClick={() => p.projectId !== 'NO_PROJECT' && goToOverview(p.projectId)}
                    >{name}</p>
                    <p className="text-[10px] text-slate-400">{p.projectId !== 'NO_PROJECT' ? p.projectId : ''}{p.totalUnits > 0 ? ` · ${p.totalUnits.toLocaleString()} unit` : ''}</p>
                  </div>

                  {/* Number columns */}
                  <div className="w-12 flex-shrink-0 text-center">
                    <span className="text-sm font-bold text-slate-700">{p.totalDefects.toLocaleString()}</span>
                  </div>
                  <div className="w-12 flex-shrink-0 text-center">
                    <span className="text-sm font-bold text-emerald-600">{(p.totalDefects - p.openDefects).toLocaleString()}</span>
                  </div>
                  <div className="w-12 flex-shrink-0 text-center">
                    <span className={`text-sm font-bold ${p.openDefects > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{p.openDefects.toLocaleString()}</span>
                  </div>
                  {/* SLA aging grid */}
                  <div className="w-32 flex-shrink-0 pl-2">
                    <div className="grid grid-cols-4 gap-0">
                      {[
                        { val: under30, color: 'text-blue-500', bg: under30 > 0 ? 'bg-blue-50' : '' },
                        { val: days30to45, color: 'text-amber-500', bg: days30to45 > 0 ? 'bg-amber-50' : '' },
                        { val: days45to60, color: 'text-orange-500', bg: days45to60 > 0 ? 'bg-orange-50' : '' },
                        { val: over60, color: 'text-red-600', bg: over60 > 0 ? 'bg-red-50' : '' },
                      ].map((c, i) => (
                        <div key={i} className={`text-center py-0.5 ${c.bg}`}>
                          <span className={`text-xs font-bold ${c.val > 0 ? c.color : 'text-slate-300'}`}>{c.val.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total vs Closed Progress Bar */}
                  {(() => {
                    const total = p.totalDefects;
                    const completed = total - p.openDefects;
                    const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;
                    return (
                      <div className="w-48 flex-shrink-0 pl-2 group/closed relative">
                        <div className="space-y-1">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-semibold text-slate-700">{total.toLocaleString()} งาน</span>
                            <span className="text-xs font-bold text-emerald-600">{completedPct}%</span>
                          </div>
                          <div className="flex h-5 overflow-hidden bg-slate-100">
                            <div className="h-full transition-all flex items-center justify-center bg-emerald-500" style={{ width: `${completedPct}%` }}>
                              {completedPct >= 15 && <span className="text-[10px] font-semibold text-white">{completed.toLocaleString()}</span>}
                            </div>
                            <div className="h-full transition-all flex items-center justify-center bg-amber-500" style={{ width: `${100 - completedPct}%` }}>
                              {(100 - completedPct) >= 15 && <span className="text-[10px] font-semibold text-white">{p.openDefects.toLocaleString()}</span>}
                            </div>
                          </div>
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-emerald-600">ปิด {completed.toLocaleString()}</span>
                            <span className="text-amber-600">ค้าง {p.openDefects.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/closed:block z-50 pointer-events-none">
                          <div className="bg-slate-800 text-white rounded-lg px-3 py-2 shadow-xl text-xs whitespace-nowrap">
                            <p className="font-semibold mb-1">{name}</p>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500" />
                              <span>ปิดแล้ว: {completed.toLocaleString()} งาน ({completedPct}%)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-block w-2 h-2 rounded-sm bg-amber-500" />
                              <span>ค้าง: {p.openDefects.toLocaleString()} งาน ({100 - completedPct}%)</span>
                            </div>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Open Jobs by Age Progress Bar */}
                  <div className="w-[480px] flex-shrink-0 pl-2 group/aging relative">
                    {p.openDefects > 0 ? (() => {
                      const openSegs = [
                        { pct: p.openDefects > 0 ? (under30 / p.openDefects) * 100 : 0, color: '#60a5fa', count: under30, label: '<30 วัน' },
                        { pct: p.openDefects > 0 ? (days30to45 / p.openDefects) * 100 : 0, color: '#f59e0b', count: days30to45, label: '30-45 วัน' },
                        { pct: p.openDefects > 0 ? (days45to60 / p.openDefects) * 100 : 0, color: '#f97316', count: days45to60, label: '45-60 วัน' },
                        { pct: p.openDefects > 0 ? (over60 / p.openDefects) * 100 : 0, color: '#ef4444', count: over60, label: '>60 วัน' },
                      ];
                      return (
                        <>
                        <div className="space-y-1">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-semibold text-amber-700">ค้าง {p.openDefects.toLocaleString()} งาน</span>
                          </div>
                          <div className="flex h-5 overflow-hidden bg-slate-100">
                            {openSegs.map((seg, i) => seg.pct > 0 ? (
                              <div
                                key={i}
                                className="h-full transition-all flex items-center justify-center"
                                style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
                              >
                                {seg.pct >= 12 && (
                                  <span className="text-[10px] font-semibold text-white">{seg.count.toLocaleString()}</span>
                                )}
                              </div>
                            ) : null)}
                          </div>
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-slate-400">&lt;30d: {under30.toLocaleString()}</span>
                            <span className="text-red-500">&gt;60d: {over60.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/aging:block z-50 pointer-events-none">
                          <div className="bg-slate-800 text-white rounded-lg px-3 py-2 shadow-xl text-xs whitespace-nowrap">
                            <p className="font-semibold mb-1">{name} — งานค้าง {p.openDefects.toLocaleString()} งาน</p>
                            {openSegs.map((seg, i) => (
                              <div key={i} className="flex items-center gap-2 mb-0.5">
                                <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: seg.color }} />
                                <span>{seg.label}: {seg.count.toLocaleString()} งาน ({seg.pct.toFixed(1)}%)</span>
                              </div>
                            ))}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                          </div>
                        </div>
                        </>
                      );
                    })() : (
                      <div className="flex items-center h-5">
                        <span className="text-xs text-emerald-600 font-medium">ไม่มีงานค้าง</span>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        </>
        );
        })()}


</>
        )}
      </div>
    </div>
  );
}
