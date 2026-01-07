import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  Scale,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ExceptionFilters, CaseType, CaseStatus } from './filters';
import { PageHeader, Card, Badge } from '@shared/ui';

interface ExceptionCase {
  id: string;
  caseType: CaseType;
  unitNumber: string;
  ownerName: string;
  projectName: string;
  problemSummary: string;
  responsiblePerson: string;
  lastActionDate: string;
  nextActionDate: string;
  caseStatus: CaseStatus;
  totalDebt: number;
  notes: string;
}

// Generate 150 mock cases
const generateMockCases = (): ExceptionCase[] => {
  const caseTypes: CaseType[] = ['legal', 'dispute', 'hardship', 'other'];
  const statuses: CaseStatus[] = ['open', 'in_progress', 'pending', 'resolved', 'closed'];
  const projects = ['เสนา พาร์ค แกรนด์', 'เสนา วิลล่า', 'เสนา ทาวเวอร์', 'เสนา เรสซิเดนซ์'];
  const responsiblePersons = ['คุณวิชัย', 'คุณสมหญิง', 'คุณอนุชา', 'คุณพิมพ์', 'คุณกรณ์'];
  const firstNames = ['สมชาย', 'สมหญิง', 'วิชัย', 'มณี', 'ประสิทธิ์', 'สุดา', 'อนุชา', 'พิมพ์', 'กรณ์', 'วิทยา'];
  const lastNames = ['ใจดี', 'รุ่งเรือง', 'มั่นคง', 'สุขใจ', 'พงษ์ไทย', 'ศรีสุข', 'วงศ์ดี', 'เจริญผล'];
  const problemTemplates = {
    legal: [
      'ค้างชำระค่าส่วนกลางเกิน 12 เดือน',
      'ติดต่อไม่ได้และค้างชำระ',
      'ปฏิเสธการชำระและติดต่อไม่ได้',
      'เจ้าของย้ายไปต่างประเทศ ค้างชำระ',
    ],
    dispute: [
      'โต้แย้งค่าใช้จ่ายพิเศษในการซ่อมบำรุง',
      'โต้แย้งค่าปรับการชำระล่าช้า',
      'โต้แย้งการคำนวณพื้นที่ส่วนกลาง',
      'ร้องเรียนคุณภาพบริการ',
    ],
    hardship: [
      'ขอผ่อนชำระเนื่องจากตกงาน',
      'ขอผ่อนผันเนื่องจากปัญหาสุขภาพ',
      'ขอลดค่าปรับเนื่องจากความยากลำบาก',
      'ขอแบ่งชำระเนื่องจากรายได้ลด',
    ],
    other: [
      'ขอเปลี่ยนแปลงวันชำระ',
      'ขอเอกสารชำระย้อนหลัง',
      'ขอตรวจสอบยอดค้างชำระ',
      'ขอเปลี่ยนช่องทางการชำระ',
    ],
  };
  const notesTemplates = {
    open: ['รอนัดหมายพูดคุย', 'รอติดต่อกลับ', 'รอเอกสารเพิ่มเติม'],
    in_progress: ['อยู่ระหว่างเจรจา', 'ส่งหนังสือทวงถามแล้ว', 'อยู่ระหว่างดำเนินคดี', 'รอผลการประชุม'],
    pending: ['รอผลการประชุมคณะกรรมการ', 'รออนุมัติจากผู้บริหาร', 'รอเอกสารจากลูกบ้าน'],
    resolved: ['ชำระครบแล้ว', 'ตกลงผ่อนชำระสำเร็จ', 'ยกเลิกค่าปรับตามมติ'],
    closed: ['ปิดเคสเนื่องจากชำระครบ', 'ปิดเคสตามคำสั่งศาล', 'ปิดเคสเนื่องจากขายยูนิต'],
  };

  const cases: ExceptionCase[] = [];
  const buildings = ['A', 'B', 'C', 'D', 'E'];

  for (let i = 1; i <= 150; i++) {
    const caseType = caseTypes[Math.floor(Math.random() * caseTypes.length)];
    const caseStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const project = projects[Math.floor(Math.random() * projects.length)];
    const building = buildings[Math.floor(Math.random() * buildings.length)];
    const floor = Math.floor(Math.random() * 30) + 1;
    const room = Math.floor(Math.random() * 20) + 1;
    const unitNumber = `${building}-${floor.toString().padStart(2, '0')}${room.toString().padStart(2, '0')}`;

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const isCompany = Math.random() > 0.85;
    const ownerName = isCompany
      ? `บริษัท ${firstName}${lastName} จำกัด`
      : `${Math.random() > 0.5 ? 'นาย' : 'นาง'}${firstName} ${lastName}`;

    const problems = problemTemplates[caseType];
    const notes = notesTemplates[caseStatus];

    // Generate dates
    const baseDate = new Date(2024, 0, 1);
    const lastActionDays = Math.floor(Math.random() * 60);
    const lastActionDate = new Date(baseDate);
    lastActionDate.setDate(lastActionDate.getDate() + lastActionDays);

    const hasNextAction = caseStatus !== 'closed' && caseStatus !== 'resolved';
    const nextActionDate = hasNextAction
      ? new Date(lastActionDate.getTime() + Math.floor(Math.random() * 30 + 7) * 24 * 60 * 60 * 1000)
      : null;

    // Debt amount based on status
    let totalDebt = 0;
    if (caseStatus !== 'resolved' && caseStatus !== 'closed') {
      if (caseType === 'legal') {
        totalDebt = Math.floor(Math.random() * 300000) + 100000;
      } else if (caseType === 'dispute' || caseType === 'hardship') {
        totalDebt = Math.floor(Math.random() * 150000) + 20000;
      } else {
        totalDebt = Math.floor(Math.random() * 50000);
      }
    }

    cases.push({
      id: `CASE-${i.toString().padStart(3, '0')}`,
      caseType,
      unitNumber,
      ownerName,
      projectName: project,
      problemSummary: problems[Math.floor(Math.random() * problems.length)],
      responsiblePerson: responsiblePersons[Math.floor(Math.random() * responsiblePersons.length)],
      lastActionDate: lastActionDate.toISOString().split('T')[0],
      nextActionDate: nextActionDate ? nextActionDate.toISOString().split('T')[0] : '',
      caseStatus,
      totalDebt,
      notes: notes[Math.floor(Math.random() * notes.length)],
    });
  }

  return cases;
};

const allCases = generateMockCases();

interface FetchResponse {
  data: ExceptionCase[];
  total: number;
  summary: {
    total: number;
    open: number;
    inProgress: number;
    pending: number;
    resolved: number;
    closed: number;
    totalDebt: number;
  };
}

function fetchExceptionCases(
  page: number,
  pageSize: number,
  search: string,
  statusFilter: CaseStatus,
  typeFilter: CaseType
): FetchResponse {
  let filtered = [...allCases];

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.id.toLowerCase().includes(searchLower) ||
        c.unitNumber.toLowerCase().includes(searchLower) ||
        c.ownerName.toLowerCase().includes(searchLower) ||
        c.problemSummary.toLowerCase().includes(searchLower)
    );
  }

  // Apply status filter
  if (statusFilter !== 'all') {
    filtered = filtered.filter((c) => c.caseStatus === statusFilter);
  }

  // Apply type filter
  if (typeFilter !== 'all') {
    filtered = filtered.filter((c) => c.caseType === typeFilter);
  }

  // Calculate summary from all filtered data (before pagination)
  const summary = {
    total: filtered.length,
    open: filtered.filter((c) => c.caseStatus === 'open').length,
    inProgress: filtered.filter((c) => c.caseStatus === 'in_progress').length,
    pending: filtered.filter((c) => c.caseStatus === 'pending').length,
    resolved: filtered.filter((c) => c.caseStatus === 'resolved').length,
    closed: filtered.filter((c) => c.caseStatus === 'closed').length,
    totalDebt: filtered.reduce((sum, c) => sum + c.totalDebt, 0),
  };

  // Apply pagination
  const startIndex = (page - 1) * pageSize;
  const paginatedData = filtered.slice(startIndex, startIndex + pageSize);

  return {
    data: paginatedData,
    total: filtered.length,
    summary,
  };
}

const caseTypeConfig: Record<CaseType, { label: string; color: string; icon: React.ElementType }> = {
  all: { label: 'ทั้งหมด', color: 'gray', icon: FileText },
  legal: { label: 'ดำเนินการทางกฎหมาย', color: 'red', icon: Scale },
  dispute: { label: 'ข้อพิพาท', color: 'orange', icon: AlertTriangle },
  hardship: { label: 'ขอผ่อนผัน', color: 'blue', icon: Users },
  other: { label: 'อื่นๆ', color: 'gray', icon: FileText },
};

const caseStatusConfig: Record<
  CaseStatus,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }
> = {
  all: { label: 'ทั้งหมด', variant: 'default' },
  open: { label: 'เปิดเคส', variant: 'info' },
  in_progress: { label: 'กำลังดำเนินการ', variant: 'warning' },
  pending: { label: 'รอดำเนินการ', variant: 'default' },
  resolved: { label: 'แก้ไขแล้ว', variant: 'success' },
  closed: { label: 'ปิดเคส', variant: 'danger' },
};

export function ExceptionPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CaseStatus>('all');
  const [typeFilter, setTypeFilter] = useState<CaseType>('all');

  const response = useMemo(
    () => fetchExceptionCases(currentPage, pageSize, searchQuery, statusFilter, typeFilter),
    [currentPage, pageSize, searchQuery, statusFilter, typeFilter]
  );

  const totalPages = Math.ceil(response.total / pageSize);
  const stats = response.summary;

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: CaseStatus) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleApplyFilters = (filters: { projectId: string; caseType: CaseType; caseStatus: CaseStatus }) => {
    setTypeFilter(filters.caseType);
    setStatusFilter(filters.caseStatus);
    setCurrentPage(1);
  };

  const handleExport = () => {
    console.log('Exporting exception cases...');
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Generate page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="เคสพิเศษ / ติดตามผล"
        subtitle="จัดการเคสพิเศษและติดตามผลการดำเนินการ"
      />

      <div className="p-8">
        <Link
          to="/reports/common-fee"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปหน้าภาพรวม
        </Link>

        <ExceptionFilters onApply={handleApplyFilters} onExport={handleExport} />

      {/* Summary Cards - Clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        <button
          onClick={() => handleStatusFilter('all')}
          className={`text-center p-4 rounded-lg border transition-all ${
            statusFilter === 'all'
              ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
          <div className="text-sm text-slate-500">ทั้งหมด</div>
        </button>
        <button
          onClick={() => handleStatusFilter('open')}
          className={`text-center p-4 rounded-lg border transition-all ${
            statusFilter === 'open'
              ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-400'
              : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="text-2xl font-bold text-blue-600">{stats.open}</span>
          </div>
          <div className="text-sm text-blue-600">เปิดเคส</div>
        </button>
        <button
          onClick={() => handleStatusFilter('in_progress')}
          className={`text-center p-4 rounded-lg border transition-all ${
            statusFilter === 'in_progress'
              ? 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-400'
              : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <span className="text-2xl font-bold text-yellow-600">{stats.inProgress}</span>
          </div>
          <div className="text-sm text-yellow-600">กำลังดำเนินการ</div>
        </button>
        <button
          onClick={() => handleStatusFilter('pending')}
          className={`text-center p-4 rounded-lg border transition-all ${
            statusFilter === 'pending'
              ? 'bg-slate-200 border-slate-400 ring-2 ring-slate-400'
              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-5 h-5 text-slate-600" />
            <span className="text-2xl font-bold text-slate-600">{stats.pending}</span>
          </div>
          <div className="text-sm text-slate-600">รอดำเนินการ</div>
        </button>
        <button
          onClick={() => handleStatusFilter('resolved')}
          className={`text-center p-4 rounded-lg border transition-all ${
            statusFilter === 'resolved'
              ? 'bg-green-100 border-green-400 ring-2 ring-green-400'
              : 'bg-green-50 border-green-200 hover:bg-green-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-2xl font-bold text-green-600">{stats.resolved}</span>
          </div>
          <div className="text-sm text-green-600">แก้ไขแล้ว</div>
        </button>
        <button
          onClick={() => handleStatusFilter('closed')}
          className={`text-center p-4 rounded-lg border transition-all ${
            statusFilter === 'closed'
              ? 'bg-red-100 border-red-400 ring-2 ring-red-400'
              : 'bg-red-50 border-red-200 hover:bg-red-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-2xl font-bold text-red-600">{stats.closed}</span>
          </div>
          <div className="text-sm text-red-600">ปิดเคส</div>
        </button>
        <div className="text-center p-4 rounded-lg border bg-purple-50 border-purple-200">
          <div className="text-lg font-bold text-purple-600">{formatCurrency(stats.totalDebt)}</div>
          <div className="text-sm text-purple-600">ยอดหนี้รวม</div>
        </div>
      </div>

      {/* Search and Export */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหารหัสเคส, ยูนิต, เจ้าของ, ปัญหา..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">แสดง</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-slate-600">รายการ</span>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </Card>

      {/* Cases Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">
            รายการเคส
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({response.total.toLocaleString()} รายการ)
            </span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-600">รหัสเคส</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">ประเภท</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">ยูนิต</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">เจ้าของ</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">สรุปปัญหา</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">ผู้รับผิดชอบ</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">ดำเนินการล่าสุด</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">ยอดหนี้</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {response.data.map((caseItem) => {
                const typeConfig = caseTypeConfig[caseItem.caseType];
                const statusConfig = caseStatusConfig[caseItem.caseStatus];
                const TypeIcon = typeConfig.icon;

                return (
                  <tr key={caseItem.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-medium text-primary-600">{caseItem.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <TypeIcon className={`w-4 h-4 text-${typeConfig.color}-500`} />
                        <span className="text-slate-700">{typeConfig.label}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-slate-800">{caseItem.unitNumber}</div>
                        <div className="text-xs text-slate-500">{caseItem.projectName}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{caseItem.ownerName}</td>
                    <td className="py-3 px-4">
                      <div className="max-w-xs">
                        <div className="text-slate-700 truncate">{caseItem.problemSummary}</div>
                        <div className="text-xs text-slate-400 truncate">{caseItem.notes}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{caseItem.responsiblePerson}</td>
                    <td className="py-3 px-4">
                      <div className="text-slate-700">{formatDate(caseItem.lastActionDate)}</div>
                      {caseItem.nextActionDate && (
                        <div className="text-xs text-slate-400">ถัดไป: {formatDate(caseItem.nextActionDate)}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={caseItem.totalDebt > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}>
                        {caseItem.totalDebt > 0 ? formatCurrency(caseItem.totalDebt) : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {response.data.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>ไม่พบข้อมูลที่ตรงกับเงื่อนไข</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
            <div className="text-sm text-slate-600">
              แสดง {((currentPage - 1) * pageSize + 1).toLocaleString()} -{' '}
              {Math.min(currentPage * pageSize, response.total).toLocaleString()} จาก{' '}
              {response.total.toLocaleString()} รายการ
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {getPageNumbers().map((page, index) =>
                typeof page === 'number' ? (
                  <button
                    key={index}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      currentPage === page
                        ? 'bg-primary-600 text-white'
                        : 'border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ) : (
                  <span key={index} className="px-2 text-slate-400">
                    {page}
                  </span>
                )
              )}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
}
