import { useState, useEffect } from 'react';
import { MessageSquareWarning, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, Building2, User, Landmark } from 'lucide-react';
import { PageHeader, KPICard } from '@shared/ui';
import { fetchComplaintData, ComplaintData, ComplaintRecord } from './queries';
import { fetchProjects, ProjectOption } from '../overview/queries';
import { QualityFilters, QualityFilterState } from '../overview/filters';

const categoryKPI = [
  { key: 'โครงการ', label: 'โครงการ', icon: Building2, color: 'blue' as const, bg: 'bg-blue-50', text: 'text-blue-700' },
  { key: 'บุคคล', label: 'บุคคล', icon: User, color: 'amber' as const, bg: 'bg-amber-50', text: 'text-amber-700' },
  { key: 'สำนักงานใหญ่', label: 'สำนักงานใหญ่', icon: Landmark, color: 'purple' as const, bg: 'bg-purple-50', text: 'text-purple-700' },
];

export function ComplainPage() {
  const [data, setData] = useState<ComplaintData | null>(null);
  const [currentFilters, setCurrentFilters] = useState<QualityFilterState | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<ComplaintRecord | null>(null);
  const [showAllProjects, setShowAllProjects] = useState(false);

  useEffect(() => { fetchProjects().then(setProjects).catch(() => {}); }, []);

  useEffect(() => {
    if (!currentFilters) return;
    fetchComplaintData({
      projectId: currentFilters.projectId || undefined,
      projectType: currentFilters.projectType || undefined,
      category: categoryFilter || undefined,
      search: searchQuery || undefined,
      sortBy,
      sortOrder,
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
    }).then(setData).catch(() => {});
  }, [currentFilters, categoryFilter, searchQuery, sortBy, sortOrder, pageSize, currentPage]);

  const totalPages = data ? Math.ceil(data.pagination.total / pageSize) : 0;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = data ? Math.min(currentPage * pageSize, data.pagination.total) : 0;

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

  const totalCount = data ? data.pagination.total : 0;
  const summaryMap = new Map((data?.summary || []).map(s => [s.category, parseInt(s.count)]));

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen">
      <PageHeader title="Complaints" subtitle="ข้อร้องเรียนจากลูกค้าคอนโด (QR Survey)" />

      <div className="p-8 space-y-6">
        <QualityFilters onApply={(f) => { setCurrentFilters(f); setCurrentPage(1); }} projects={projects} hideFields={['category']} />

        {/* KPI Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <KPICard
              title="ข้อร้องเรียนทั้งหมด"
              value={totalCount.toLocaleString()}
              change={`${data.distinctProjects} โครงการ`}
              showArrow={false}
              icon={MessageSquareWarning}
              color={categoryFilter ? 'slate' : 'blue'}
              onClick={() => { setCategoryFilter(''); setCurrentPage(1); }}
            />
            {categoryKPI.map(({ key, label, icon, color }) => {
              const count = summaryMap.get(key) || 0;
              return (
                <KPICard
                  key={key}
                  title={label}
                  value={count.toLocaleString()}
                  change={`${totalCount > 0 ? ((count / totalCount) * 100).toFixed(0) : 0}%`}
                  showArrow={false}
                  icon={icon}
                  color={categoryFilter === key ? color : 'slate'}
                  onClick={() => { setCategoryFilter(categoryFilter === key ? '' : key); setCurrentPage(1); }}
                />
              );
            })}
          </div>
        )}

        {/* Top Projects */}
        {data && data.topProjects.length > 0 && (() => {
          const visibleProjects = showAllProjects ? data.topProjects : data.topProjects.slice(0, 10);
          const maxCount = parseInt(data.topProjects[0].count);
          return (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">
                  {showAllProjects ? 'โครงการทั้งหมด' : 'Top 10 โครงการ'} ที่มี Complaints มากที่สุด
                </h3>
                {data.topProjects.length > 10 && (
                  <button
                    onClick={() => setShowAllProjects(!showAllProjects)}
                    className="text-xs text-primary-600 hover:text-primary-800 font-medium"
                  >
                    {showAllProjects ? 'แสดง Top 10' : `ดูทั้งหมด (${data.topProjects.length})`}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {visibleProjects.map((p, i) => {
                  const count = parseInt(p.count);
                  return (
                    <div key={p.project_id} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-5 text-right">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-700 truncate">{p.project_name}</span>
                          <span className="text-sm font-semibold text-slate-800 ml-2">{count}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Table */}
        {data && (
          <div className="card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <MessageSquareWarning className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-slate-800">รายการ Complaints ทั้งหมด</h3>
                </div>
                <p className="text-sm text-slate-500 mt-1">ทั้งหมด {data.pagination.total.toLocaleString()} รายการ</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder="ค้นหา..."
                    className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 w-8">#</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-800" onClick={() => handleSort('project_name')}>
                      โครงการ {sortBy === 'project_name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-800" onClick={() => handleSort('category')}>
                      หมวด {sortBy === 'category' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-800" onClick={() => handleSort('complaint_topic')}>
                      หัวข้อร้องเรียน {sortBy === 'complaint_topic' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-slate-600">สรุป</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((r, idx) => {
                    const cfgItem = categoryKPI.find(c => c.key === r.category);
                    const cfg = cfgItem ? { bg: cfgItem.bg, text: cfgItem.text } : { bg: 'bg-slate-50', text: 'text-slate-600' };
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-slate-100 hover:bg-blue-50/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedRecord(r)}
                      >
                        <td className="px-3 py-2.5 text-slate-400 text-xs">{startItem + idx}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-slate-800 text-xs">{r.project_name}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${cfg.bg} ${cfg.text}`}>{r.category}</span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-700 max-w-xs truncate">{r.complaint_topic}</td>
                        <td className="px-3 py-2.5 text-slate-500 max-w-sm truncate">{r.topic_summary}</td>
                      </tr>
                    );
                  })}
                  {data.records.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-12 text-slate-400">ไม่พบข้อมูล</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">แสดง {startItem}-{endItem} จาก {data.pagination.total.toLocaleString()}</span>
                  <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="px-2 py-1 border border-slate-200 rounded text-sm bg-white">
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"><ChevronsLeft className="w-4 h-4" /></button>
                  <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  {getPageNumbers().map((p, i) =>
                    typeof p === 'number' ? (
                      <button key={i} onClick={() => goToPage(p)} className={`px-3 py-1 rounded text-sm ${currentPage === p ? 'bg-primary-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>{p}</button>
                    ) : (
                      <span key={i} className="px-1 text-slate-400">...</span>
                    )
                  )}
                  <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                  <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30"><ChevronsRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedRecord(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-slate-800">รายละเอียด Complaint</h3>
                <button onClick={() => setSelectedRecord(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-500" /></button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">โครงการ</p>
                    <p className="text-sm font-medium text-slate-800">{selectedRecord.project_name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedRecord.original_project_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">หมวด</p>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${(categoryKPI.find(c => c.key === selectedRecord.category) || { bg: 'bg-slate-50', text: 'text-slate-600' }).bg} ${(categoryKPI.find(c => c.key === selectedRecord.category) || { bg: 'bg-slate-50', text: 'text-slate-600' }).text}`}>
                      {selectedRecord.category}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1">หัวข้อร้องเรียน</p>
                  <p className="text-sm text-slate-800">{selectedRecord.complaint_topic}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1">สรุปเรื่อง</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedRecord.topic_summary}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1">รายละเอียดที่ Extract</p>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedRecord.extracted_detail}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-400 mb-1">ข้อความต้นฉบับ</p>
                  <div className="bg-slate-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{selectedRecord.original_detail}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
