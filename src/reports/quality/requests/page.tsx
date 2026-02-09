import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, AlertTriangle, Star, Phone, Mail, Image, ArrowLeft } from 'lucide-react';
import { PageHeader } from '@shared/ui';
import { fetchAgingData, AgingData, AgingSortField, SortOrder, JobFilter, JobDetail, fetchJobDetail } from '../aging/queries';
import { fetchProjects, ProjectOption } from '../overview/queries';
import { subStatusLabels } from '../types';
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

export function RequestsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tableData, setTableData] = useState<AgingData | null>(null);
  const [currentFilters, setCurrentFilters] = useState<QualityFilterState | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  useEffect(() => { fetchProjects().then(setProjects).catch(() => {}); }, []);

  const navState = location.state as { jobFilter?: JobFilter; courtesyOnly?: boolean; fromPage?: boolean; backTo?: string; backLabel?: string } | null;
  const fromPage = !!navState?.fromPage;
  const backTo = navState?.backTo || '/quality';
  const backLabel = navState?.backLabel || 'กลับไป Overview';

  // Table controls
  const [jobFilter, setJobFilter] = useState<JobFilter>(navState?.jobFilter || 'all');
  const [courtesyOnly, setCourtesyOnly] = useState(!!navState?.courtesyOnly);
  const [searchQuery, setSearchQuery] = useState('');
  const [bucketFilter, setBucketFilter] = useState<BucketKey | 'all'>('all');
  const [sortBy, setSortBy] = useState<AgingSortField>('openDate');
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

  const loadFilters = (filters: QualityFilterState) => {
    setCurrentFilters(filters);
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
      workArea: currentFilters.workArea || undefined,
      warrantyStatus: currentFilters.warrantyStatus || undefined,
      dateFrom: currentFilters.dateFrom || undefined,
      dateTo: currentFilters.dateTo || undefined,
      jobFilter: jobFilter,
      courtesyOnly: courtesyOnly || undefined,
      bucket: bucketFilter !== 'all' ? bucketFilter : undefined,
      search: searchQuery || undefined,
      sortBy,
      sortOrder,
      limit: effectiveLimit,
      offset: effectiveOffset,
    }).then(setTableData);
  }, [currentFilters, jobFilter, courtesyOnly, bucketFilter, searchQuery, sortBy, sortOrder, pageSize, currentPage, showAll]);

  const handleApplyFilters = (filters: QualityFilterState) => {
    loadFilters(filters);
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
        title="All Requests"
        subtitle="รายการงานซ่อมทั้งหมดในระบบ"
      />

      <div className="p-8 space-y-6">
        {fromPage && (
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(backTo)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <span className="text-sm text-slate-500">{backLabel}</span>
          </div>
        )}
        <QualityFilters onApply={handleApplyFilters} projects={projects} hideFields={['category']} />

        {/* Jobs Table */}
        {tableData && (
        <div className="card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-slate-800">
                  {showAll
                    ? jobFilter === 'all' ? 'รายการงานทั้งหมด' : jobFilter === 'closed' ? 'รายการงานปิดแล้ว' : 'รายการกำลังดำเนินการทั้งหมด'
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
                value={jobFilter}
                onChange={(e) => { setJobFilter(e.target.value as JobFilter); setCurrentPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="all">ทั้งหมด</option>
                <option value="open">กำลังดำเนินการ</option>
                <option value="closed">เสร็จแล้ว</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
              <select
                value={courtesyOnly ? 'courtesy' : 'all'}
                onChange={(e) => { setCourtesyOnly(e.target.value === 'courtesy'); setCurrentPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="all">ทุกประเภท</option>
                <option value="courtesy">ขอความอนุเคราะห์</option>
              </select>
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

          {/* Request List */}
          <div className="divide-y divide-slate-100">
            {/* Header */}
            <div className="px-4 py-2 flex items-center gap-2 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wide sticky top-0 z-10">
              <span className="w-[120px] flex-shrink-0">โครงการ</span>
              <span className="w-[90px] flex-shrink-0">ลูกค้า</span>
              <span className="flex-1 min-w-0">รายละเอียด</span>
              <span className="w-[80px] flex-shrink-0">ช่าง</span>
              <span className="w-[650px] flex-shrink-0 text-center ml-auto">Timeline</span>
              <span className="w-[100px] flex-shrink-0 text-center">สถานะ</span>
              <span className="w-[40px] flex-shrink-0 text-right">อายุ</span>
            </div>
            {tableData.jobs.length === 0 ? (
              <div className="py-8 text-center text-slate-500">ไม่พบข้อมูล</div>
            ) : (
              tableData.jobs.map((job) => {
                const bucket = bucketConfig[job.bucket] || bucketConfig['120+'];
                const s = job.status?.toLowerCase() || '';
                const isCompleted = s === 'completed';
                const isCancelled = s === 'cancel';
                const isInProgress = s.includes('inprogress') || s.includes('in progress') || s.includes('in_progress');
                const isWaiting = s.includes('wait') || s.includes('pending') || s.includes('assess');
                const isAssigned = s.includes('assign');
                const dotClass = isCompleted ? 'bg-emerald-500' : isCancelled ? 'bg-red-400' : isInProgress ? 'bg-blue-500 animate-pulse' : isAssigned ? 'bg-violet-400' : isWaiting ? 'bg-amber-400' : 'bg-slate-400';
                const statusBg = isCompleted ? 'bg-emerald-50 text-emerald-700' : isCancelled ? 'bg-red-50 text-red-600' : isInProgress ? 'bg-blue-50 text-blue-700' : isAssigned ? 'bg-violet-50 text-violet-700' : isWaiting ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600';

                const fmtDate = (d: string | null) => {
                  if (!d) return null;
                  const dt = new Date(d);
                  const date = dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
                  const hrs = dt.getHours();
                  const mins = dt.getMinutes();
                  const hasTime = hrs !== 0 || mins !== 0;
                  return hasTime ? `${date} ${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}` : date;
                };

                // Calculate days between two dates
                const daysBetween = (a: string | null, b: string | null) => {
                  if (!a || !b) return null;
                  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
                };

                // Parse dates from jobHistory (use latest occurrence per step)
                // ดึงวันที่นัดจริงจากเนื้อหา history เช่น "วันที่ 23/01/2568 เวลา 09:30 น."
                const histDates = (() => {
                  const lines = (job.jobHistory || '').split('\n');
                  // แปลง "วันที่ DD/MM/BBBB | HH:MM" หรือ "วันที่ DD/MM/BBBB เวลา HH:MM น." เป็น ISO
                  const parseInlineDate = (text: string): string | null => {
                    const m = text.match(/วันที่\s+(\d{2})\/(\d{2})\/(\d{4})\s*(?:\|\s*|เวลา\s*)(\d{2}):(\d{2})/);
                    if (!m) return null;
                    const yyyy = parseInt(m[3]) > 2500 ? parseInt(m[3]) - 543 : parseInt(m[3]);
                    return `${yyyy}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00`;
                  };
                  const parseLogDate = (dateStr: string, timeStr: string) => {
                    const [dd, mm, yyyy] = dateStr.split('/');
                    return `${yyyy}-${mm}-${dd}T${timeStr}:00`;
                  };

                  let assign: { date: string; person: string | null } | null = null;
                  let assess: { date: string; person: string | null } | null = null;
                  let service: { date: string; person: string | null } | null = null;
                  let cancel: { date: string; person: string | null } | null = null;
                  let closed: { date: string; person: string | null } | null = null;
                  let review: { date: string; person: string | null } | null = null;

                  for (const line of lines) {
                    const m = line.match(/^\[(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\]\s*(.+)$/);
                    if (!m) continue;
                    const logDate = parseLogDate(m[1], m[2]);
                    const text = m[3];

                    // มอบหมายช่าง
                    if (/เพิ่มทีมผู้ให้บริการ|เปลี่ยนทีมผู้ให้บริการ/.test(text)) {
                      const personMatch = text.match(/(?:เพิ่มทีมผู้ให้บริการ|เปลี่ยนทีมผู้ให้บริการเป็น)\s+(.+?)\s+เข้าใบงาน/);
                      assign = { date: logDate, person: personMatch?.[1] || null };
                    }
                    // นัดประเมิน - ใช้วันที่นัดจากเนื้อหา
                    if (/เลือกวันที่นัดเข้าประเมิน/.test(text)) {
                      assess = { date: parseInlineDate(text) || logDate, person: null };
                    }
                    if (/ยืนยัน.*ประเมิน/.test(text) && !assess) {
                      assess = { date: logDate, person: null };
                    }
                    // นัดเข้าให้บริการ - ใช้วันที่นัดจากเนื้อหา
                    if (/เลือกวันที่นัดเข้าให้บริการ/.test(text)) {
                      service = { date: parseInlineDate(text) || logDate, person: null };
                    }
                    if (/ยืนยัน.*ให้บริการ/.test(text) && !service) {
                      service = { date: logDate, person: null };
                    }
                    // ปิดงาน
                    if (/ปิดงาน/.test(text)) {
                      closed = { date: logDate, person: null };
                    }
                    // ยกเลิก
                    if (/ยกเลิก/.test(text)) {
                      cancel = { date: logDate, person: null };
                    }
                  }

                  // นัดประเมิน = วันที่ช่างไปเห็นหน้างานจริง
                  // ถ้ามีวันนัดเข้าให้บริการ (confirm) ให้ใช้เป็นวันประเมินแทนเสมอ
                  // เพราะการประเมินจริงเกิดตอนช่างเข้าพื้นที่
                  if (service) {
                    assess = { date: service.date, person: assess?.person || null };
                  }
                  return { assign, assess, service, cancel, closed, review };
                })();

                const assessDate = histDates.assess?.date || null;
                const serviceDate = histDates.service?.date || null;

                const timeline = [
                  { label: 'เปิดใบงาน', date: job.openDate, color: 'bg-blue-500', lineColor: 'bg-blue-300', person: null as string | null },
                  { label: 'มอบหมายช่าง', date: histDates.assign?.date || job.assignDate, color: 'bg-amber-500', lineColor: 'bg-amber-300', person: histDates.assign?.person || (job.assignee !== '-' ? job.assignee : null) },
                  { label: 'นัดประเมิน', date: assessDate, color: 'bg-violet-500', lineColor: 'bg-violet-300', person: null as string | null },
                  { label: 'นัดเข้าซ่อม', date: serviceDate, color: 'bg-orange-500', lineColor: 'bg-orange-300', person: histDates.assign?.person || (job.assignee !== '-' ? job.assignee : null) },
                  { label: isCancelled ? 'ยกเลิก' : 'ปิดงาน', date: isCancelled ? (histDates.cancel?.date || job.closeDate) : (job.closeDate || histDates.closed?.date || null), color: isCancelled ? 'bg-red-500' : 'bg-emerald-500', lineColor: isCancelled ? 'bg-red-300' : 'bg-emerald-300', person: null as string | null },
                  { label: 'รีวิว', date: job.reviewDate, color: 'bg-pink-500', lineColor: 'bg-pink-300', person: job.reviewScore != null ? `★ ${job.reviewScore} คะแนน` : null},
                ];

                // Figure out where work is stuck
                const lastDoneIdx = timeline.reduce((acc, t, i) => t.date ? i : acc, -1);
                const stuckAtIdx = lastDoneIdx < timeline.length - 1 ? lastDoneIdx + 1 : -1;

                // Days stuck at current step
                const stuckSince = lastDoneIdx >= 0 && stuckAtIdx >= 0
                  ? timeline[lastDoneIdx].date
                  : null;
                const stuckDays = stuckSince
                  ? Math.floor((Date.now() - new Date(stuckSince).getTime()) / 86400000)
                  : 0;

                // Severity for stuck indicator
                const stuckSeverity = stuckDays > 30 ? 'text-red-600 font-bold' : stuckDays > 14 ? 'text-red-500 font-semibold' : stuckDays > 7 ? 'text-orange-500 font-medium' : 'text-amber-500';

                return (
                  <div
                    key={job.id}
                    onClick={() => openJobDetail(job.id)}
                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-2 text-xs"
                  >
                    <span className="w-[120px] flex-shrink-0">
                      <span className="block font-medium text-slate-800 truncate text-xs">{job.projectName}</span>
                      <span className={`block font-mono text-[10px] truncate ${isCompleted ? 'text-emerald-500' : isCancelled ? 'text-red-400' : isInProgress ? 'text-blue-500' : isWaiting ? 'text-amber-500' : 'text-primary-500'}`}>{job.requestNumber}</span>
                    </span>
                    <span className="w-[90px] flex-shrink-0">
                      <span className="block text-slate-600 truncate">{job.customerName}</span>
                      <span className="block text-[10px] text-slate-400 truncate">{job.unitNumber && job.unitNumber !== '-' ? job.unitNumber : ''}</span>
                    </span>
                    <span className="flex-1 min-w-0 text-slate-500 truncate">{job.symptomDetail || '-'}</span>
                    <span className="w-[80px] flex-shrink-0 text-slate-600 truncate">{job.assignee !== '-' ? job.assignee : '-'}</span>
                    {/* Timeline with details */}
                    <span className="w-[650px] flex-shrink-0 flex items-start justify-center gap-0 ml-auto bg-blue-50/40 border border-blue-100/50 rounded-lg py-1">
                      {timeline.map((step, i) => {
                        const isStuck = i === stuckAtIdx;
                        const nextStep = timeline[i + 1];
                        const isStuckLine = step.date && !nextStep?.date && !isCompleted && !isCancelled;
                        const isReviewEmpty = step.label === 'รีวิว' && !step.date;
                        return (
                          <span key={i} className="flex items-start">
                            {isReviewEmpty ? (
                              <span className="flex flex-col items-center justify-center w-[90px] text-[9px] text-slate-300 pt-1">-</span>
                            ) : (
                            <span className="flex flex-col items-center w-[90px]">
                              <span className={`block w-2.5 h-2.5 rounded-full flex-shrink-0 ${step.date ? step.color : isStuck ? 'ring-2 ring-offset-1 ring-red-300 bg-slate-200' : 'bg-slate-200'}`} />
                              <span className="block text-[9px] text-slate-400 mt-0.5 leading-tight text-center">{step.label}</span>
                              <span className={`block text-[9px] leading-tight text-center ${isStuck && !isCompleted && !isCancelled ? 'text-red-500 font-medium' : 'text-slate-500'}`}>
                                {step.date ? fmtDate(step.date) : '-'}
                              </span>
                              {step.person && <span className={`block text-[9px] leading-tight text-center font-medium ${step.label === 'รีวิว' ? 'text-pink-600' : 'text-slate-500'}`}>{step.person}</span>}
                            </span>
                            )}
                            {i < timeline.length - 1 && nextStep?.label !== 'รีวิว' && (() => {
                              const gapDays = step.date && nextStep?.date
                                ? Math.floor((new Date(nextStep.date).getTime() - new Date(step.date).getTime()) / 86400000)
                                : step.date && !nextStep?.date
                                  ? Math.floor((Date.now() - new Date(step.date).getTime()) / 86400000)
                                  : null;
                              const isWaiting = step.date && !nextStep?.date;
                              return (
                                <span className="flex flex-col items-center flex-shrink-0 mt-[2px]">
                                  {gapDays !== null && (
                                    <span className={`text-[8px] tabular-nums leading-none mb-0.5 ${isWaiting ? (gapDays > 14 ? 'text-red-500 font-bold' : gapDays > 7 ? 'text-orange-500 font-medium' : 'text-amber-500') : (gapDays > 14 ? 'text-red-500 font-bold' : gapDays > 7 ? 'text-orange-500 font-medium' : 'text-slate-400')}`}>{Math.max(gapDays, 1)}d</span>
                                  )}
                                  <span className={`block h-0.5 w-3 ${isStuckLine ? 'bg-red-400' : step.date && nextStep?.date ? step.lineColor : 'bg-slate-100'}`} />
                                </span>
                              );
                            })()}
                          </span>
                        );
                      })}
                    </span>
                    <span className="w-[100px] flex-shrink-0 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
                        {subStatusLabels[job.status] || job.status}
                      </span>
                    </span>
                    <span className={`w-[40px] flex-shrink-0 text-right font-bold tabular-nums ${bucket.textClass}`}>
                      {job.daysOpen}d
                    </span>
                  </div>
                );
              })
            )}
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
        <div className="fixed inset-0 bg-black/40 z-50 overflow-y-auto p-4" onClick={() => setJobDetail(null)}>
          <div className="min-h-full flex items-start justify-center py-8">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
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

                </div>

                {/* Right: Timeline & Technician */}
                <div className="space-y-4">
                  {/* Timeline from jobHistory */}
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">ประวัติงาน</h4>
                    <div className="space-y-0">
                      {(() => {
                        const lines = (jobDetail.jobHistory || '').split('\n').filter((l: string) => l.trim());
                        const parsed = lines.map((line: string) => {
                          const m = line.match(/^\[(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\]\s*(.+)$/);
                          if (!m) return null;
                          const [dd, mm, yyyy] = m[1].split('/');
                          const dt = new Date(`${yyyy}-${mm}-${dd}T${m[2]}:00`);
                          const text = m[3];
                          // Categorize
                          let color = 'bg-slate-400';
                          if (text.includes('เปิดใบงาน')) color = 'bg-blue-500';
                          else if (text.includes('เพิ่มทีมผู้ให้บริการ') || text.includes('เปลี่ยนทีมผู้ให้บริการ')) color = 'bg-amber-500';
                          else if (text.includes('ประเมิน')) color = 'bg-violet-500';
                          else if (text.includes('ให้บริการ') || text.includes('ซ่อม')) color = 'bg-orange-500';
                          else if (text.includes('ปิดงาน')) color = 'bg-emerald-500';
                          else if (text.includes('รีวิว')) color = 'bg-pink-500';
                          else if (text.includes('ยกเลิก')) color = 'bg-red-500';
                          else if (text.includes('ประกัน') || text.includes('สถานะ')) color = 'bg-sky-400';
                          return { dt, text, color };
                        }).filter(Boolean) as { dt: Date; text: string; color: string }[];

                        if (parsed.length === 0) return <span className="text-xs text-slate-300">ไม่มีประวัติ</span>;

                        return parsed.map((entry, i) => {
                          const prevDt = i > 0 ? parsed[i - 1].dt : null;
                          const gapMs = prevDt ? entry.dt.getTime() - prevDt.getTime() : 0;
                          const gapDays = Math.floor(gapMs / 86400000);
                          const gapHrs = Math.floor((gapMs % 86400000) / 3600000);
                          const gapLabel = gapDays > 0 ? `+${gapDays}d${gapHrs > 0 ? ` ${gapHrs}h` : ''}` : gapMs > 3600000 ? `+${gapHrs}h` : null;
                          const dateStr = entry.dt.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
                          const timeStr = `${String(entry.dt.getHours()).padStart(2, '0')}:${String(entry.dt.getMinutes()).padStart(2, '0')}`;
                          return (
                            <div key={i} className="flex items-start gap-2 py-1">
                              <div className="flex flex-col items-center mt-1">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${entry.color}`} />
                                {i < parsed.length - 1 && <div className="w-px h-full bg-slate-200 min-h-[16px]" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-[10px] text-slate-400 tabular-nums whitespace-nowrap">{dateStr} {timeStr}</span>
                                  {gapLabel && (
                                    <span className={`text-[9px] tabular-nums ${gapDays > 7 ? 'text-red-400' : gapDays > 1 ? 'text-orange-400' : 'text-slate-300'}`}>
                                      {gapLabel}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-700 leading-snug">{entry.text}</p>
                              </div>
                            </div>
                          );
                        });
                      })()}
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
        </div>
      )}
    </div>
  );
}
