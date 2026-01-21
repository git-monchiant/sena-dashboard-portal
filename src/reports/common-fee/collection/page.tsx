import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@shared/ui';
import { SiteFilters, SiteFilterValues } from '../components';
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Building2,
} from 'lucide-react';

// API response types
interface InvoiceRecord {
  id: number;
  doc_number: string;
  unit: string;
  owner: string;
  billed_amount: number;
  status: string;
  due_date: string | null;
  issued_date: string | null;
  paid_date: string | null;
  site_id: number;
  site_name: string;
  pay_group: string | null;
  remark: string | null;
  void_remark: string | null;
}

interface InvoiceLineItem {
  id: number;
  description: string;
  unitItems: number;
  price: number;
  discount: number;
  vat: number;
  total: number;
  paid: number;
  status: string;
  added: string | null;
  isPaid: boolean;
  isPartial: boolean;
  remaining: number;
}

interface InvoiceItemsResponse {
  invoiceTotal: number;
  invoicePaid: number;
  invoiceRemaining: number;
  items: InvoiceLineItem[];
}

interface StatusSummary {
  count: number;
  amount: number;
}

interface OverdueSummary extends StatusSummary {
  yearlyCount?: number;        // จำนวนรายการค้างรายปี (issued ปีนี้ + เลย due)
  cumulativeAmount?: number;   // ยอดสะสมทั้งหมดที่เลย due
  cumulativeCount?: number;    // จำนวนรายการสะสมทั้งหมด
}

interface ApiResponse {
  data: InvoiceRecord[];
  summary: {
    total: number;
    totalAmount: number;
    paid: StatusSummary;
    partial: StatusSummary;
    active: StatusSummary;
    overdue: OverdueSummary;
    void: StatusSummary;
    draft: StatusSummary;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
  paid: { label: 'ชำระแล้ว', icon: CheckCircle, className: 'bg-emerald-100 text-emerald-700' },
  partial_payment: { label: 'ชำระแล้วบางส่วน', icon: Clock, className: 'bg-blue-100 text-blue-700' },
  active: { label: 'รอรับชำระ', icon: AlertCircle, className: 'bg-amber-100 text-amber-700' },
  overdue: { label: 'เกินกำหนด', icon: XCircle, className: 'bg-red-100 text-red-700' },
  void: { label: 'ยกเลิก', icon: XCircle, className: 'bg-slate-100 text-slate-500' },
  draft: { label: 'แบบร่าง', icon: Clock, className: 'bg-slate-100 text-slate-500' },
  waiting_fix: { label: 'รอแก้ไข', icon: AlertCircle, className: 'bg-orange-100 text-orange-700' },
};

const defaultSummary: ApiResponse['summary'] = {
  total: 0,
  totalAmount: 0,
  paid: { count: 0, amount: 0 },
  partial: { count: 0, amount: 0 },
  active: { count: 0, amount: 0 },
  overdue: { count: 0, amount: 0, yearlyCount: 0, cumulativeAmount: 0, cumulativeCount: 0 },
  void: { count: 0, amount: 0 },
  draft: { count: 0, amount: 0 },
};

const defaultPagination = {
  page: 1,
  pageSize: 25,
  totalPages: 1,
  totalItems: 0,
};

export function CollectionDetailPage() {
  const navigate = useNavigate();

  // Data state
  const [data, setData] = useState<InvoiceRecord[]>([]);
  const [summary, setSummary] = useState(defaultSummary);
  const [pagination, setPagination] = useState(defaultPagination);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [payGroupFilter, setPayGroupFilter] = useState('');

  // Track if we should show "select project first" message
  const needsProjectSelection = !siteFilter;

  // Expanded row state
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [lineItemsLoading, setLineItemsLoading] = useState(false);

  // Fetch line items when expanding a row
  const fetchLineItems = useCallback(async (invoiceId: number) => {
    setLineItemsLoading(true);
    try {
      const response = await fetch(`/api/common-fee/invoice/${invoiceId}/items`);
      if (!response.ok) throw new Error('Failed to fetch items');
      const result: InvoiceItemsResponse = await response.json();
      setLineItems(result.items);
    } catch (err) {
      console.error('Failed to fetch line items:', err);
      setLineItems([]);
    } finally {
      setLineItemsLoading(false);
    }
  }, []);

  const handleRowClick = (recordId: number) => {
    if (expandedId === recordId) {
      setExpandedId(null);
      setLineItems([]);
    } else {
      setExpandedId(recordId);
      fetchLineItems(recordId);
    }
  };

  // Fetch data from API
  const fetchData = useCallback(async () => {
    // Don't fetch if no project selected (performance protection)
    if (!siteFilter) {
      setLoading(false);
      setData([]);
      setSummary(defaultSummary);
      setPagination(defaultPagination);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('site_id', siteFilter);
      if (yearFilter) params.append('year', yearFilter);
      if (periodFilter) params.append('period', periodFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (payGroupFilter) params.append('pay_group', payGroupFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('limit', String(pageSize));
      params.append('offset', String((currentPage - 1) * pageSize));

      const response = await fetch(`/api/common-fee/collection?${params}`);
      if (!response.ok) throw new Error('Failed to fetch data');

      const result: ApiResponse = await response.json();
      setData(result.data);
      setSummary(result.summary);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
      setData([]);
      setSummary(defaultSummary);
      setPagination(defaultPagination);
    } finally {
      setLoading(false);
    }
  }, [siteFilter, yearFilter, periodFilter, statusFilter, payGroupFilter, searchQuery, pageSize, currentPage]);

  // Fetch when filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApplyFilters = (filters: SiteFilterValues) => {
    setSiteFilter(filters.siteId);
    setPeriodFilter(filters.period);
    setStatusFilter(filters.status);
    setYearFilter(filters.year);
    setPayGroupFilter(filters.payGroup);
    setCurrentPage(1);
  };

  const handleStatusClick = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchData();
  };

  const handleExport = () => {
    console.log('Exporting to Excel...');
  };

  // Pagination helpers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, pagination.totalPages)));
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const { totalPages } = pagination;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const startItem = pagination.totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, pagination.totalItems);

  // Format period from issued_date (match filter format: "Feb 2025")
  const formatPeriod = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

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
        <SiteFilters
          onApply={handleApplyFilters}
          storageKey="common-fee-filters"
          showYear={true}
          showPeriod={true}
          showStatus={true}
          showPayGroup={true}
        />

        {/* Summary Cards - Professional Design (Amount Only) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {/* ทั้งหมด */}
          <button
            onClick={() => handleStatusClick('all')}
            className={`card transition-all ${statusFilter === 'all' ? 'ring-2 ring-primary-500 shadow-md' : 'hover:shadow-md hover:border-primary-200'}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {summary.total.toLocaleString()}
              </span>
            </div>
            <p className="text-xl font-bold text-slate-800 mb-0.5">
              ฿{(summary.totalAmount / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K
            </p>
            <p className="text-xs text-slate-500">ทั้งหมด</p>
          </button>

          {/* ชำระแล้ว */}
          <button
            onClick={() => handleStatusClick('paid')}
            className={`card transition-all ${statusFilter === 'paid' ? 'ring-2 ring-emerald-500 shadow-md' : 'hover:shadow-md hover:border-emerald-200'}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                {summary.totalAmount > 0 ? `${(((summary.paid?.amount || 0) / summary.totalAmount) * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
            <p className="text-xl font-bold text-emerald-600 mb-0.5">
              ฿{((summary.paid?.amount || 0) / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K
            </p>
            <p className="text-xs text-slate-500">ชำระแล้ว</p>
          </button>

          {/* ชำระบางส่วน */}
          <button
            onClick={() => handleStatusClick('partial_payment')}
            className={`card transition-all ${statusFilter === 'partial_payment' ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md hover:border-blue-200'}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                {summary.totalAmount > 0 ? `${(((summary.partial?.amount || 0) / summary.totalAmount) * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
            <p className="text-xl font-bold text-blue-600 mb-0.5">
              ฿{((summary.partial?.amount || 0) / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K
            </p>
            <p className="text-xs text-slate-500">ชำระแล้วบางส่วน</p>
          </button>

          {/* รอชำระ */}
          <button
            onClick={() => handleStatusClick('active')}
            className={`card transition-all ${statusFilter === 'active' ? 'ring-2 ring-amber-500 shadow-md' : 'hover:shadow-md hover:border-amber-200'}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                {summary.totalAmount > 0 ? `${(((summary.active?.amount || 0) / summary.totalAmount) * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
            <p className="text-xl font-bold text-amber-600 mb-0.5">
              ฿{((summary.active?.amount || 0) / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K
            </p>
            <p className="text-xs text-slate-500">รอรับชำระ</p>
          </button>

          {/* ค้างชำระ - แสดง สะสม/ปีที่เลือก */}
          <button
            onClick={() => handleStatusClick('overdue')}
            className={`card transition-all ${statusFilter === 'overdue' ? 'ring-2 ring-red-500 shadow-md' : 'hover:shadow-md hover:border-red-200'}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                {(summary.overdue?.cumulativeCount || 0).toLocaleString()}/{(summary.overdue?.yearlyCount || 0).toLocaleString()}
              </span>
            </div>
            {/* แสดงยอด สะสม/ปีที่เลือก */}
            <p className="text-xl font-bold text-red-600 mb-0.5">
              {((summary.overdue?.cumulativeAmount || 0) / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}/{((summary.overdue?.amount || 0) / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K
            </p>
            <p className="text-xs text-slate-500">ค้างชำระ (สะสม/ปีนี้)</p>
          </button>

          {/* ยกเลิก */}
          <button
            onClick={() => handleStatusClick('void')}
            className={`card transition-all ${statusFilter === 'void' ? 'ring-2 ring-slate-500 shadow-md' : 'hover:shadow-md hover:border-slate-200'}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {summary.totalAmount > 0 ? `${(((summary.void?.amount || 0) / summary.totalAmount) * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
            <p className="text-xl font-bold text-slate-500 mb-0.5">
              ฿{((summary.void?.amount || 0) / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K
            </p>
            <p className="text-xs text-slate-500">ยกเลิก</p>
          </button>

        </div>

        {/* Data Table */}
        <div className="card">
          {/* Table Header with Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              <h3 className="font-semibold text-slate-800">รายการเรียกเก็บและการชำระ</h3>
              {statusFilter !== 'all' && statusConfig[statusFilter] && (
                <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                  กรอง: {statusConfig[statusFilter].label}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหา Unit, ชื่อเจ้าของ, เลขที่บิล..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              <span className="ml-3 text-slate-500">กำลังโหลดข้อมูล...</span>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
              <button onClick={fetchData} className="btn-primary">
                ลองใหม่
              </button>
            </div>
          )}

          {/* Select Project First State */}
          {!loading && !error && needsProjectSelection && (
            <div className="text-center py-16">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-600 mb-2">กรุณาเลือกโครงการ</p>
              <p className="text-sm text-slate-400">เลือกโครงการจากตัวกรองด้านบนเพื่อดูข้อมูลการเรียกเก็บ</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && !needsProjectSelection && data.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">ไม่พบข้อมูล</p>
              <p className="text-sm text-slate-400">ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
            </div>
          )}

          {/* Data Table */}
          {!loading && !error && data.length > 0 && (
            <>
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
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                        วันที่ออกบิล
                      </th>
                      <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                        ยอดเรียกเก็บ
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                        สถานะ
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                        กำหนดชำระ
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                        วันที่ชำระ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((record) => {
                      const status = statusConfig[record.status] || statusConfig.active;
                      const StatusIcon = status.icon;
                      const isExpanded = expandedId === record.id;

                      return (
                        <React.Fragment key={record.id}>
                          <tr
                            onClick={() => handleRowClick(record.id)}
                            className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                          >
                            <td className="py-3 px-4">
                              <span className="text-sm font-medium text-primary-600">
                                {record.doc_number || '-'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  {record.unit || '-'}
                                </p>
                                <p className="text-xs text-slate-500">{record.owner || '-'}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-600">
                              {formatPeriod(record.issued_date)}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-600">
                              {record.issued_date
                                ? new Date(record.issued_date).toLocaleDateString('th-TH', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  }).replace(/\d{4}$/, (y) => String(Number(y) - 543))
                                : '-'}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-slate-800 text-right">
                              ฿{(record.billed_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.className}`}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-600">
                              {record.due_date ? (
                                <div>
                                  <span>
                                    {new Date(record.due_date).toLocaleDateString('th-TH', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric',
                                    }).replace(/\d{4}$/, (y) => String(Number(y) - 543))}
                                  </span>
                                  {record.status === 'overdue' && (
                                    <span className="ml-2 text-xs text-red-600 font-medium">
                                      ({Math.floor((Date.now() - new Date(record.due_date).getTime()) / (1000 * 60 * 60 * 24)).toLocaleString()} วัน)
                                    </span>
                                  )}
                                </div>
                              ) : '-'}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-600">
                              {record.paid_date
                                ? new Date(record.paid_date).toLocaleDateString('th-TH', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                  }).replace(/\d{4}$/, (y) => String(Number(y) - 543))
                                : '-'}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${record.id}-detail`} className="bg-slate-50">
                              <td colSpan={8} className="px-4 py-4">
                                {/* Basic info row */}
                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-4">
                                  <div><span className="text-slate-500">Site:</span> <span className="font-medium">{record.site_name?.split('.')[0] || '-'}</span></div>
                                  <div><span className="text-slate-500">กลุ่มชำระ:</span> <span className="font-medium">{record.pay_group || '-'}</span></div>
                                  {record.remark && (
                                    <div><span className="text-slate-500">หมายเหตุ:</span> <span className="font-medium">{record.remark}</span></div>
                                  )}
                                  {record.void_remark && (
                                    <div><span className="text-slate-500">เหตุผลยกเลิก:</span> <span className="font-medium text-red-600">{record.void_remark}</span></div>
                                  )}
                                </div>

                                {/* Line Items */}
                                <div className="border-t border-slate-200 pt-3">
                                  <h4 className="text-sm font-semibold text-slate-700 mb-2">รายละเอียดค่าใช้จ่าย</h4>
                                  {lineItemsLoading ? (
                                    <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      กำลังโหลด...
                                    </div>
                                  ) : lineItems.length === 0 ? (
                                    <p className="text-sm text-slate-400 py-2">ไม่พบรายละเอียด</p>
                                  ) : (
                                    <div className="space-y-1">
                                      {lineItems.map((item) => (
                                        <div
                                          key={item.id}
                                          className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${
                                            item.isPaid
                                              ? 'bg-emerald-50'
                                              : item.isPartial
                                              ? 'bg-blue-50'
                                              : 'bg-amber-50'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {item.isPaid ? (
                                              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                            ) : item.isPartial ? (
                                              <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                            ) : (
                                              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                            )}
                                            {item.added && (
                                              <span className="text-xs text-slate-400 flex-shrink-0">
                                                {new Date(item.added).toLocaleDateString('th-TH', {
                                                  day: 'numeric',
                                                  month: 'short',
                                                  year: '2-digit',
                                                }).replace(/\d{2}$/, (y) => String(Number(y) - 43))}
                                              </span>
                                            )}
                                            <span className="truncate text-slate-700">{item.description}</span>
                                          </div>
                                          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                            <span className="text-slate-600">฿{item.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            {item.isPaid ? (
                                              <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                                                ชำระแล้ว
                                              </span>
                                            ) : item.isPartial ? (
                                              <span className="text-xs font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                                                ชำระ ฿{item.paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                            ) : (
                                              <span className="text-xs font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                                                ยังไม่ชำระ
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
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
                  <button
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="หน้าแรก"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="ก่อนหน้า"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

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

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="ถัดไป"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
