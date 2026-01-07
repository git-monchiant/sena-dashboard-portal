import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@shared/ui';
import { CollectionFilters } from './filters';
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Building2,
  Smartphone,
  CreditCard,
  RefreshCw,
  Receipt,
  Paperclip,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

interface CollectionRecord {
  id: string;
  project: string;
  unit: string;
  owner: string;
  period: string;
  billedAmount: number;
  dueDate: string;
  status: 'paid' | 'partial' | 'unpaid' | 'overdue';
  paidAmount: number | null;
  paymentDate: string | null;
  paymentChannel: 'bank' | 'qr' | 'counter' | 'auto' | null;
  receiptNo: string | null;
  attachments: string[];
}

// Simulate API response with summary from server
interface ServerResponse {
  data: CollectionRecord[];
  summary: {
    total: number;
    paid: number;
    partial: number;
    unpaid: number;
    overdue: number;
    totalBilled: number;
    totalPaid: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

// Generate mock data for 1000 units
const generateMockData = (): CollectionRecord[] => {
  const projects = ['SENA Park Grand Rama 9', 'SENA Ville Bangna', 'SENA Park Pinklao', 'SENA Grand Sukhumvit'];
  const statuses: Array<'paid' | 'partial' | 'unpaid' | 'overdue'> = ['paid', 'partial', 'unpaid', 'overdue'];
  const channels: Array<'bank' | 'qr' | 'counter' | 'auto'> = ['bank', 'qr', 'counter', 'auto'];
  const owners = ['คุณสมชาย ใจดี', 'คุณวิภา แสงทอง', 'คุณประยุทธ์ มั่นคง', 'บริษัท เอบีซี จำกัด', 'คุณนภา สดใส', 'คุณมานพ รักดี', 'คุณสุภาพร ศรีสุข', 'คุณธนากร เจริญผล'];

  const data: CollectionRecord[] = [];

  for (let i = 1; i <= 1000; i++) {
    const projectIndex = Math.floor(Math.random() * projects.length);
    const building = String.fromCharCode(65 + projectIndex);
    const unit = `${building}-${String(Math.floor(Math.random() * 30) + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}`;
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const billedAmount = [3500, 4200, 5800, 6500][Math.floor(Math.random() * 4)];

    const isPaid = status === 'paid' || status === 'partial';
    const paidAmount = status === 'paid' ? billedAmount : status === 'partial' ? Math.floor(billedAmount / 2) : null;

    data.push({
      id: `INV-2024-${String(i).padStart(4, '0')}`,
      project: projects[projectIndex],
      unit,
      owner: owners[Math.floor(Math.random() * owners.length)],
      period: 'ม.ค. 2567',
      billedAmount,
      dueDate: '2024-01-31',
      status,
      paidAmount,
      paymentDate: isPaid ? `2024-01-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}` : null,
      paymentChannel: isPaid ? channels[Math.floor(Math.random() * channels.length)] : null,
      receiptNo: isPaid ? `RCP-2024-${String(i).padStart(4, '0')}` : null,
      attachments: isPaid && Math.random() > 0.5 ? [`slip_${i}.pdf`] : [],
    });
  }

  return data;
};

const allMockData = generateMockData();

// Simulate server-side filtering and pagination
const fetchData = (
  page: number,
  pageSize: number,
  search: string,
  statusFilter: string
): ServerResponse => {
  let filtered = [...allMockData];

  // Apply search filter
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.unit.toLowerCase().includes(searchLower) ||
        d.owner.toLowerCase().includes(searchLower) ||
        d.id.toLowerCase().includes(searchLower)
    );
  }

  // Apply status filter
  if (statusFilter && statusFilter !== 'all') {
    filtered = filtered.filter((d) => d.status === statusFilter);
  }

  // Calculate summary (server-side aggregate)
  const summary = {
    total: filtered.length,
    paid: filtered.filter((d) => d.status === 'paid').length,
    partial: filtered.filter((d) => d.status === 'partial').length,
    unpaid: filtered.filter((d) => d.status === 'unpaid').length,
    overdue: filtered.filter((d) => d.status === 'overdue').length,
    totalBilled: filtered.reduce((acc, d) => acc + d.billedAmount, 0),
    totalPaid: filtered.reduce((acc, d) => acc + (d.paidAmount || 0), 0),
  };

  // Paginate
  const totalPages = Math.ceil(filtered.length / pageSize);
  const start = (page - 1) * pageSize;
  const paginatedData = filtered.slice(start, start + pageSize);

  return {
    data: paginatedData,
    summary,
    pagination: {
      page,
      pageSize,
      totalPages,
      totalItems: filtered.length,
    },
  };
};

const statusConfig = {
  paid: { label: 'ชำระแล้ว', icon: CheckCircle, className: 'bg-emerald-100 text-emerald-700' },
  partial: { label: 'ชำระบางส่วน', icon: Clock, className: 'bg-blue-100 text-blue-700' },
  unpaid: { label: 'ค้างชำระ', icon: AlertCircle, className: 'bg-amber-100 text-amber-700' },
  overdue: { label: 'เกินกำหนด', icon: XCircle, className: 'bg-red-100 text-red-700' },
};

const channelConfig = {
  bank: { label: 'โอนธนาคาร', icon: Building2, className: 'text-blue-600' },
  qr: { label: 'QR Code', icon: Smartphone, className: 'text-purple-600' },
  counter: { label: 'เคาน์เตอร์', icon: CreditCard, className: 'text-orange-600' },
  auto: { label: 'หักอัตโนมัติ', icon: RefreshCw, className: 'text-emerald-600' },
};

export function CollectionDetailPage() {
  const navigate = useNavigate();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch data with current filters
  const response = useMemo(
    () => fetchData(currentPage, pageSize, searchQuery, statusFilter),
    [currentPage, pageSize, searchQuery, statusFilter]
  );

  const { data, summary, pagination } = response;

  const handleApplyFilters = () => {
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleExport = () => {
    console.log('Exporting to Excel...');
    // In real app, this would trigger server-side export
  };

  // Pagination helpers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, pagination.totalPages)));
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const { page, totalPages } = pagination;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = page - 1; i <= page + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const startItem = (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="รายละเอียดการเรียกเก็บและชำระ"
        subtitle="ตรวจสอบการออกบิลและสถานะการชำระค่าส่วนกลางรายยูนิต"
      />

      <div className="p-8">
        {/* Back Navigation */}
        <button
          onClick={() => navigate('/reports/common-fee')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">กลับหน้าภาพรวม</span>
        </button>

        {/* Filters */}
        <CollectionFilters onApply={handleApplyFilters} />

        {/* Summary Cards - Data from server aggregate */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <button
            onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
            className={`card text-center transition-all ${statusFilter === 'all' ? 'ring-2 ring-primary-500' : 'hover:bg-slate-50'}`}
          >
            <p className="text-sm text-slate-500 mb-1">ทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-800">{summary.total.toLocaleString()}</p>
          </button>
          <button
            onClick={() => { setStatusFilter('paid'); setCurrentPage(1); }}
            className={`card text-center border-l-4 border-l-emerald-500 transition-all ${statusFilter === 'paid' ? 'ring-2 ring-emerald-500' : 'hover:bg-slate-50'}`}
          >
            <p className="text-sm text-slate-500 mb-1">ชำระแล้ว</p>
            <p className="text-2xl font-bold text-emerald-600">{summary.paid.toLocaleString()}</p>
          </button>
          <button
            onClick={() => { setStatusFilter('partial'); setCurrentPage(1); }}
            className={`card text-center border-l-4 border-l-blue-500 transition-all ${statusFilter === 'partial' ? 'ring-2 ring-blue-500' : 'hover:bg-slate-50'}`}
          >
            <p className="text-sm text-slate-500 mb-1">ชำระบางส่วน</p>
            <p className="text-2xl font-bold text-blue-600">{summary.partial.toLocaleString()}</p>
          </button>
          <button
            onClick={() => { setStatusFilter('unpaid'); setCurrentPage(1); }}
            className={`card text-center border-l-4 border-l-amber-500 transition-all ${statusFilter === 'unpaid' ? 'ring-2 ring-amber-500' : 'hover:bg-slate-50'}`}
          >
            <p className="text-sm text-slate-500 mb-1">ค้างชำระ</p>
            <p className="text-2xl font-bold text-amber-600">{summary.unpaid.toLocaleString()}</p>
          </button>
          <button
            onClick={() => { setStatusFilter('overdue'); setCurrentPage(1); }}
            className={`card text-center border-l-4 border-l-red-500 transition-all ${statusFilter === 'overdue' ? 'ring-2 ring-red-500' : 'hover:bg-slate-50'}`}
          >
            <p className="text-sm text-slate-500 mb-1">เกินกำหนด</p>
            <p className="text-2xl font-bold text-red-600">{summary.overdue.toLocaleString()}</p>
          </button>
          <div className="card text-center bg-slate-50">
            <p className="text-sm text-slate-500 mb-1">ยอดจัดเก็บได้</p>
            <p className="text-lg font-bold text-emerald-600">
              ฿{summary.totalPaid.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400">
              จาก ฿{summary.totalBilled.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Data Table */}
        <div className="card">
          {/* Table Header with Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              <h3 className="font-semibold text-slate-800">รายการเรียกเก็บและการชำระ</h3>
              {statusFilter !== 'all' && (
                <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                  กรอง: {statusConfig[statusFilter as keyof typeof statusConfig]?.label}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหา Unit, ชื่อเจ้าของ..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </form>

              {/* Export Button */}
              <button
                onClick={handleExport}
                className="btn-secondary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">Export</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    เลขที่ใบแจ้งหนี้
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    ยูนิต / เจ้าของ
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    งวด
                  </th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    ยอดเรียกเก็บ
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    สถานะ
                  </th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    ยอดชำระ
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    วันที่ชำระ
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    ช่องทาง
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    เลขที่ใบเสร็จ
                  </th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    เอกสาร
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((record) => {
                  const status = statusConfig[record.status];
                  const StatusIcon = status.icon;
                  const channel = record.paymentChannel
                    ? channelConfig[record.paymentChannel]
                    : null;

                  return (
                    <tr
                      key={record.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-primary-600">
                          {record.id}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {record.unit}
                          </p>
                          <p className="text-xs text-slate-500">{record.owner}</p>
                          <p className="text-xs text-slate-400">{record.project}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {record.period}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-slate-800 text-right">
                        ฿{record.billedAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.className}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {record.paidAmount ? (
                          <span className="text-sm font-medium text-emerald-600">
                            ฿{record.paidAmount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {record.paymentDate
                          ? new Date(record.paymentDate).toLocaleDateString('th-TH', {
                              day: 'numeric',
                              month: 'short',
                              year: '2-digit',
                            })
                          : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {channel ? (
                          <div className="flex items-center gap-1.5">
                            <channel.icon
                              className={`w-4 h-4 ${channel.className}`}
                            />
                            <span className="text-sm text-slate-600">
                              {channel.label}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {record.receiptNo ? (
                          <div className="flex items-center gap-1.5">
                            <Receipt className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-mono text-slate-700">
                              {record.receiptNo}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {record.attachments.length > 0 ? (
                          <button className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700">
                            <Paperclip className="w-4 h-4" />
                            <span className="text-sm">{record.attachments.length}</span>
                          </button>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <p className="text-sm text-slate-500">
                แสดง {startItem.toLocaleString()}-{endItem.toLocaleString()} จาก {pagination.totalItems.toLocaleString()} รายการ
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">แสดง</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
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
              {/* First Page */}
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="หน้าแรก"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Previous Page */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="ก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page Numbers */}
              {getPageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() => typeof page === 'number' && goToPage(page)}
                  disabled={page === '...'}
                  className={`min-w-[36px] h-9 px-3 rounded text-sm font-medium transition-colors ${
                    page === currentPage
                      ? 'bg-primary-600 text-white'
                      : page === '...'
                      ? 'cursor-default'
                      : 'hover:bg-slate-100'
                  }`}
                >
                  {page}
                </button>
              ))}

              {/* Next Page */}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
                className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="ถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last Page */}
              <button
                onClick={() => goToPage(pagination.totalPages)}
                disabled={currentPage === pagination.totalPages}
                className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="หน้าสุดท้าย"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
