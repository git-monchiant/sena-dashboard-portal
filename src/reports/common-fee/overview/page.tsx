import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageHeader } from '@shared/ui';
import { SiteFilters, SiteFilterValues } from '../components';
import { fetchCommonFeeOverview, CommonFeeOverviewData, fetchExpenseSummary, ExpenseSummaryData, fetchInvoiceSummary, InvoiceSummaryData } from './queries';
import {
  Wallet,
  CheckCircle,
  AlertCircle,
  Users,
  ArrowRight,
  ArrowLeft,
  FileText,
  Clock,
  Database,
  Building2,
  Settings,
  XCircle,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  LabelList,
  PieChart,
  Pie,
  Cell,
  Legend,
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
              {count}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
    </button>
  );
}


// Colors for Pie Chart
const EXPENSE_COLORS = [
  '#3b82f6', // blue - ค่าส่วนกลาง
  '#06b6d4', // cyan - ค่าน้ำประปา
  '#0ea5e9', // sky - ค่ามิเตอร์น้ำ
  '#8b5cf6', // violet - ค่าบริการสาธารณะ
  '#f59e0b', // amber - ค่าเบี้ยประกัน
  '#10b981', // emerald - ค่าจอดรถ
  '#ef4444', // red - เงินเพิ่ม
  '#f97316', // orange - ค่าดอกเบี้ย
  '#ec4899', // pink - ค่าปรับ
  '#14b8a6', // teal - เงินกองทุน
  '#eab308', // yellow - ค่าไฟฟ้า
  '#6b7280', // gray - อื่นๆ
];

// ===== Invoice List Types =====
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

interface CollectionApiResponse {
  data: InvoiceRecord[];
  summary: {
    total: number;
    totalUnitCount: number;
    totalAmount: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

const invoiceStatusConfig: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
  paid: { label: 'ชำระแล้ว', icon: CheckCircle, className: 'bg-emerald-100 text-emerald-700' },
  partial_payment: { label: 'ชำระแล้วบางส่วน', icon: Clock, className: 'bg-blue-100 text-blue-700' },
  active: { label: 'รอรับชำระ', icon: AlertCircle, className: 'bg-amber-100 text-amber-700' },
  overdue: { label: 'เกินกำหนด', icon: XCircle, className: 'bg-red-100 text-red-700' },
  void: { label: 'ยกเลิก', icon: XCircle, className: 'bg-slate-100 text-slate-500' },
  draft: { label: 'แบบร่าง', icon: Clock, className: 'bg-slate-100 text-slate-500' },
  waiting_fix: { label: 'รอแก้ไข', icon: AlertCircle, className: 'bg-orange-100 text-orange-700' },
};

const defaultPagination = { page: 1, pageSize: 25, totalPages: 1, totalItems: 0 };

export function CommonFeeOverviewPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<CommonFeeOverviewData | null>(null);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummaryData | null>(null);
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Invoice list state
  const [invoiceData, setInvoiceData] = useState<InvoiceRecord[]>([]);
  const [invoicePagination, setInvoicePagination] = useState(defaultPagination);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceShowAll, setInvoiceShowAll] = useState(false);
  const [invoiceCurrentPage, setInvoiceCurrentPage] = useState(1);
  const [invoicePageSize, setInvoicePageSize] = useState(25);
  const [invoiceSortBy, setInvoiceSortBy] = useState<string>('billed_amount');
  const [invoiceSortOrder, setInvoiceSortOrder] = useState<'asc' | 'desc'>('desc');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [lineItemsLoading, setLineItemsLoading] = useState(false);
  const currentFiltersRef = useRef<SiteFilterValues | null>(null);

  const sortLabels: Record<string, string> = {
    billed_amount: 'ยอดเรียกเก็บ',
    issued_date: 'วันที่ออกบิล',
    due_date: 'กำหนดชำระ',
    paid_date: 'วันที่ชำระ',
    unit: 'ยูนิต',
    owner: 'เจ้าของ',
    doc_number: 'เลขที่บิล',
    status: 'สถานะ',
  };

  const fetchInvoiceList = useCallback(async () => {
    const filters = currentFiltersRef.current;
    if (!filters) return;
    if (invoiceData.length === 0) setInvoiceLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.siteId) params.append('site_id', filters.siteId);
      if (filters.year) params.append('year', filters.year);
      if (invoiceStatusFilter) params.append('status', invoiceStatusFilter);
      else if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.payGroup) params.append('pay_group', filters.payGroup);
      if (filters.projectType) params.append('project_type', filters.projectType);
      if (invoiceSearch) params.append('search', invoiceSearch);
      const effectiveLimit = invoiceShowAll ? invoicePageSize : 10;
      const effectiveOffset = invoiceShowAll ? (invoiceCurrentPage - 1) * invoicePageSize : 0;
      params.append('limit', String(effectiveLimit));
      params.append('offset', String(effectiveOffset));
      params.append('sort_by', invoiceSortBy);
      params.append('sort_order', invoiceSortOrder);
      const response = await fetch(`/api/common-fee/collection?${params}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const result: CollectionApiResponse = await response.json();
      setInvoiceData(result.data);
      setInvoicePagination(result.pagination);
    } catch {
      setInvoiceData([]);
      setInvoicePagination(defaultPagination);
    } finally {
      setInvoiceLoading(false);
    }
  }, [invoiceSearch, invoiceShowAll, invoicePageSize, invoiceCurrentPage, invoiceSortBy, invoiceSortOrder, invoiceStatusFilter]);

  // Fetch invoice list when sort/page/search changes
  useEffect(() => {
    if (currentFiltersRef.current) fetchInvoiceList();
  }, [fetchInvoiceList]);

  const fetchLineItemsData = useCallback(async (invoiceId: number) => {
    setLineItemsLoading(true);
    try {
      const response = await fetch(`/api/common-fee/invoice/${invoiceId}/items`);
      if (!response.ok) throw new Error('Failed to fetch items');
      const result: InvoiceItemsResponse = await response.json();
      setLineItems(result.items);
    } catch {
      setLineItems([]);
    } finally {
      setLineItemsLoading(false);
    }
  }, []);

  const handleRowClick = (recordId: number) => {
    if (expandedId === recordId) { setExpandedId(null); setLineItems([]); }
    else { setExpandedId(recordId); fetchLineItemsData(recordId); }
  };

  const formatPeriod = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const { totalPages } = invoicePagination;
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (invoiceCurrentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...', totalPages);
    } else if (invoiceCurrentPage >= totalPages - 3) {
      pages.push(1, '...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, '...');
      for (let i = invoiceCurrentPage - 1; i <= invoiceCurrentPage + 1; i++) pages.push(i);
      pages.push('...', totalPages);
    }
    return pages;
  };

  const loadData = async (filters: SiteFilterValues) => {
    if (!data) setIsLoading(true);
    currentFiltersRef.current = filters;
    try {
      const [overviewResult, expenseResult, invoiceResult] = await Promise.all([
        fetchCommonFeeOverview(filters),
        fetchExpenseSummary(filters).catch(() => null),
        fetchInvoiceSummary(filters).catch(() => null),
      ]);
      setData(overviewResult);
      setExpenseSummary(expenseResult);
      setInvoiceSummary(invoiceResult);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = (filters: SiteFilterValues) => {
    loadData(filters);
    setInvoiceCurrentPage(1);
  };

  // Use trend data directly from API (already filtered by year if specified)
  const filteredTrend = data?.trend || [];
  const trendUnit = data?.trendUnit || 'M';
  const unitLabel = trendUnit === 'M' ? 'ล้านบาท' : trendUnit === 'K' ? 'พันบาท' : 'บาท';

  return (
    <div className="min-h-screen">
      <PageHeader
        title="ภาพรวมค่าส่วนกลาง"
        subtitle="ระบบติดตามและจัดเก็บค่าส่วนกลาง"
      />

      <div className="p-8">
        {/* Back to Overview */}
        <Link
          to="/reports/common-fee/projects"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-primary-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปหน้า Overview
        </Link>
        {/* Filters */}
        <SiteFilters
          onApply={handleApplyFilters}
          storageKey="common-fee-filters"
          showYear={true}
          showStatus={true}
        />

        {/* Loading State */}
        {isLoading && (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* Main Content - only show when data is loaded */}
        {!isLoading && data && (
          <>

        {/* Summary Cards - ดึงตรงจาก invoice table */}
        {invoiceSummary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {/* ทั้งหมด */}
          <div className="card text-left">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">100%</span>
            </div>
            <p className="text-xl font-bold text-slate-800 text-left">
              ฿{invoiceSummary.total.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-slate-400 mb-1 text-left">{invoiceSummary.total.unitCount.toLocaleString()} ยูนิต ({invoiceSummary.total.count.toLocaleString()} inv)</p>
            <p className="text-xs text-slate-500 font-medium text-left">ทั้งหมด</p>
          </div>

          {/* ชำระแล้ว */}
          <div className="card text-left">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                {invoiceSummary.total.amount > 0 ? (invoiceSummary.paid.amount / invoiceSummary.total.amount * 100).toFixed(0) : 0}%
              </span>
            </div>
            <p className="text-xl font-bold text-emerald-600 text-left">
              ฿{invoiceSummary.paid.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-emerald-500 mb-1 text-left">{invoiceSummary.paid.unitCount.toLocaleString()} ยูนิต ({invoiceSummary.paid.count.toLocaleString()} inv)</p>
            <p className="text-xs text-slate-500 font-medium text-left">ชำระแล้ว (paid)</p>
          </div>

          {/* ชำระบางส่วน */}
          <div className="card text-left">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                {invoiceSummary.total.amount > 0 ? (invoiceSummary.partial.amount / invoiceSummary.total.amount * 100).toFixed(0) : 0}%
              </span>
            </div>
            <p className="text-xl font-bold text-blue-600 text-left">
              ฿{invoiceSummary.partial.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-blue-500 mb-1 text-left">{invoiceSummary.partial.unitCount.toLocaleString()} ยูนิต ({invoiceSummary.partial.count.toLocaleString()} inv)</p>
            <p className="text-xs text-slate-500 font-medium text-left">ชำระบางส่วน (partial_payment)</p>
          </div>

          {/* ค้างในรอบ */}
          <Link to="/reports/common-fee/aging" className="card text-left hover:ring-2 hover:ring-orange-300 transition-all cursor-pointer block">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                  {invoiceSummary.total.amount > 0 ? (invoiceSummary.overdue.amount / invoiceSummary.total.amount * 100).toFixed(0) : 0}%
                </span>
                <ArrowRight className="w-4 h-4 text-orange-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-orange-600 text-left">
              ฿{invoiceSummary.overdue.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-orange-500 mb-1 text-left">
              {invoiceSummary.overdue.unitCount.toLocaleString()} ยูนิต ({invoiceSummary.overdue.count.toLocaleString()} inv)
            </p>
            <p className="text-xs text-slate-500 font-medium text-left">ค้างในรอบ</p>
          </Link>

          {/* ค้างสะสม */}
          <Link to="/reports/common-fee/aging" className="card text-left hover:ring-2 hover:ring-red-300 transition-all cursor-pointer block">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-xl font-bold text-red-600 text-left">
              ฿{(invoiceSummary.overdueCumulative?.amount || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-red-500 mb-1 text-left">
              {(invoiceSummary.overdueCumulative?.unitCount || 0).toLocaleString()} ยูนิต ({(invoiceSummary.overdueCumulative?.count || 0).toLocaleString()} inv)
            </p>
            <p className="text-xs text-slate-500 font-medium text-left">ค้างสะสม (ถึง {invoiceSummary?.selectedYear || data?.selectedYear})</p>
          </Link>

        </div>
        )}

        {/* Monthly Chart (7) + Pie Chart (3) */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 mb-8">
          {/* Monthly Comparison Bar Chart - 7 cols */}
          <div className="card lg:col-span-7">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">เปรียบเทียบรายเดือน</h3>
              <p className="text-sm text-slate-500">ยอดเรียกเก็บ / ชำระ / ค้างชำระรายเดือน + เส้นค้างชำระสะสม ({unitLabel})</p>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={filteredTrend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => v.toLocaleString()} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  itemSorter={(item) => {
                    const order: Record<string, number> = { billed: 0, paid: 1, outstanding: 2, cumOutstandingYear: 3, cumOutstanding: 4 };
                    return order[item.dataKey as string] ?? 99;
                  }}
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      billed: 'เรียกเก็บ',
                      paid: 'ชำระ',
                      outstanding: 'ค้างชำระ (เดือน)',
                      cumOutstandingYear: `ค้างชำระสะสม (${data?.selectedYear})`,
                      cumOutstanding: `ค้างชำระสะสม (ถึง ${data?.selectedYear})`,
                    };
                    const v = typeof value === 'number' ? value : 0;
                    return [`฿${v.toLocaleString()} บาท`, labels[String(name)] || String(name)];
                  }}
                />
                <Bar dataKey="billed" fill="#3b82f6" name="billed" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="billed" position="top" fontSize={10} fill="#64748b" formatter={(v: number) => typeof v === 'number' && v > 0 ? v.toLocaleString() : ''} />
                </Bar>
                <Bar dataKey="paid" fill="#10b981" name="paid" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="paid" position="top" fontSize={10} fill="#64748b" formatter={(v: number) => typeof v === 'number' && v > 0 ? v.toLocaleString() : ''} />
                </Bar>
                <Bar dataKey="outstanding" fill="#f59e0b" name="outstanding" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="outstanding" position="top" fontSize={10} fill="#64748b" formatter={(v: number) => typeof v === 'number' && v > 0 ? v.toLocaleString() : ''} />
                </Bar>
                <Line
                  type="monotone"
                  dataKey="cumOutstandingYear"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#f97316' }}
                  name="cumOutstandingYear"
                >
                  <LabelList dataKey="cumOutstandingYear" position="top" fontSize={9} fill="#f97316" formatter={(v: number) => typeof v === 'number' && v > 0 ? v.toLocaleString() : ''} />
                </Line>
                <Line
                  type="monotone"
                  dataKey="cumOutstanding"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#ef4444' }}
                  name="cumOutstanding"
                >
                  <LabelList dataKey="cumOutstanding" position="top" fontSize={9} fill="#ef4444" formatter={(v: number) => typeof v === 'number' && v > 0 ? v.toLocaleString() : ''} />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex justify-center flex-wrap gap-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-sm text-slate-600">เรียกเก็บ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded" />
                <span className="text-sm text-slate-600">ชำระ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded" />
                <span className="text-sm text-slate-600">ค้างชำระ (เดือน)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full" />
                <span className="text-sm text-slate-600">สะสม ({data?.selectedYear})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-sm text-slate-600">สะสม (ถึง {data?.selectedYear})</span>
              </div>
            </div>
          </div>

          {/* Pie Chart - 3 cols */}
          <div className="card lg:col-span-3">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">สัดส่วนประเภทค่าใช้จ่าย</h3>
              <p className="text-sm text-slate-500">แยกตามประเภทรายการ ({(expenseSummary?.totalInvoices || 0).toLocaleString()} inv)</p>
            </div>
            {(expenseSummary?.data?.length || 0) > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={expenseSummary?.data?.slice(0, 8) || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="name"
                    label={({ name, percent }) => `${name.length > 6 ? name.slice(0, 6) + '..' : name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {(expenseSummary?.data?.slice(0, 8) || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [
                      `฿${value.toLocaleString()} บาท`,
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-slate-400 text-sm">
                ไม่มีข้อมูล
              </div>
            )}
          </div>
        </div>

        {/* Invoice List */}
        <div className="card mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-500" />
              <h3 className="font-semibold text-slate-800">
                {invoiceShowAll ? 'รายการทั้งหมด' : 'Top 10'} - เรียงตาม{sortLabels[invoiceSortBy]}
              </h3>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <form onSubmit={(e) => { e.preventDefault(); setInvoiceCurrentPage(1); fetchInvoiceList(); }} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="ค้นหา Unit, ชื่อเจ้าของ, เลขที่บิล..."
                  value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
              </form>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">สถานะ</span>
                <select value={invoiceStatusFilter} onChange={(e) => { setInvoiceStatusFilter(e.target.value); setInvoiceCurrentPage(1); }}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="">ทั้งหมด</option>
                  <option value="paid">ชำระแล้ว</option>
                  <option value="partial_payment">ชำระบางส่วน</option>
                  <option value="active">รอรับชำระ</option>
                  <option value="overdue">เกินกำหนด</option>
                  <option value="void">ยกเลิก</option>
                  <option value="draft">แบบร่าง</option>
                  <option value="waiting_fix">รอแก้ไข</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">เรียงตาม</span>
                <select value={invoiceSortBy} onChange={(e) => { setInvoiceSortBy(e.target.value); setInvoiceCurrentPage(1); }}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="billed_amount">ยอดเรียกเก็บ</option>
                  <option value="issued_date">วันที่ออกบิล</option>
                  <option value="due_date">กำหนดชำระ</option>
                  <option value="paid_date">วันที่ชำระ</option>
                  <option value="unit">ยูนิต</option>
                  <option value="owner">เจ้าของ</option>
                  <option value="doc_number">เลขที่บิล</option>
                  <option value="status">สถานะ</option>
                </select>
                <select value={invoiceSortOrder} onChange={(e) => { setInvoiceSortOrder(e.target.value as 'asc' | 'desc'); setInvoiceCurrentPage(1); }}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="desc">มากไปน้อย</option>
                  <option value="asc">น้อยไปมาก</option>
                </select>
              </div>
              {invoicePagination.totalItems > 10 && (
                <button onClick={() => { setInvoiceShowAll(!invoiceShowAll); setInvoiceCurrentPage(1); }}
                  className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors">
                  {invoiceShowAll ? 'แสดง Top 10' : 'ดูทั้งหมด'}
                </button>
              )}
            </div>
          </div>

          {invoiceLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              <span className="ml-3 text-slate-500">กำลังโหลดข้อมูล...</span>
            </div>
          )}

          {!invoiceLoading && invoiceData.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">ไม่พบข้อมูล</p>
            </div>
          )}

          {!invoiceLoading && invoiceData.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">เลขที่ใบแจ้งหนี้</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">ยูนิต / เจ้าของ</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">งวด</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">วันที่ออกบิล</th>
                      <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">ยอดเรียกเก็บ</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">สถานะ</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">กำหนดชำระ</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">วันที่ชำระ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.map((record) => {
                      const status = invoiceStatusConfig[record.status] || invoiceStatusConfig.active;
                      const StatusIcon = status.icon;
                      const isExpanded = expandedId === record.id;
                      return (
                        <React.Fragment key={record.id}>
                          <tr onClick={() => handleRowClick(record.id)} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
                            <td className="py-3 px-4"><span className="text-sm font-medium text-primary-600">{record.doc_number || '-'}</span></td>
                            <td className="py-3 px-4">
                              <p className="text-sm font-medium text-slate-800">{record.unit || '-'}</p>
                              <p className="text-xs text-slate-500">{record.owner || '-'}</p>
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-600">{formatPeriod(record.issued_date)}</td>
                            <td className="py-3 px-4 text-sm text-slate-600">
                              {record.issued_date ? new Date(record.issued_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\d{4}$/, (y) => String(Number(y) - 543)) : '-'}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-slate-800 text-right">
                              ฿{Number(record.billed_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.className}`}>
                                <StatusIcon className="w-3 h-3" />{status.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-600">
                              {record.due_date ? (
                                <div>
                                  <span>{new Date(record.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\d{4}$/, (y) => String(Number(y) - 543))}</span>
                                  {record.status === 'overdue' && (
                                    <span className="ml-2 text-xs text-red-600 font-medium">({Math.floor((Date.now() - new Date(record.due_date).getTime()) / (1000 * 60 * 60 * 24)).toLocaleString()} วัน)</span>
                                  )}
                                </div>
                              ) : '-'}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-600">
                              {record.paid_date ? new Date(record.paid_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\d{4}$/, (y) => String(Number(y) - 543)) : '-'}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50">
                              <td colSpan={8} className="px-4 py-4">
                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-4">
                                  <div><span className="text-slate-500">Site:</span> <span className="font-medium">{record.site_name?.split('.')[0] || '-'}</span></div>
                                  <div><span className="text-slate-500">กลุ่มชำระ:</span> <span className="font-medium">{record.pay_group || '-'}</span></div>
                                  {record.remark && <div><span className="text-slate-500">หมายเหตุ:</span> <span className="font-medium">{record.remark}</span></div>}
                                  {record.void_remark && <div><span className="text-slate-500">เหตุผลยกเลิก:</span> <span className="font-medium text-red-600">{record.void_remark}</span></div>}
                                </div>
                                <div className="border-t border-slate-200 pt-3">
                                  <h4 className="text-sm font-semibold text-slate-700 mb-2">รายละเอียดค่าใช้จ่าย</h4>
                                  {lineItemsLoading ? (
                                    <div className="flex items-center gap-2 py-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" />กำลังโหลด...</div>
                                  ) : lineItems.length === 0 ? (
                                    <p className="text-sm text-slate-400 py-2">ไม่พบรายละเอียด</p>
                                  ) : (
                                    <div className="space-y-1">
                                      {lineItems.map((item) => (
                                        <div key={item.id} className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${item.isPaid ? 'bg-emerald-50' : item.isPartial ? 'bg-blue-50' : 'bg-amber-50'}`}>
                                          <div className="flex items-center gap-2 flex-1 min-w-0">
                                            {item.isPaid ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : item.isPartial ? <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                                            {item.added && <span className="text-xs text-slate-400 flex-shrink-0">{new Date(item.added).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/\d{2}$/, (y) => String(Number(y) - 43))}</span>}
                                            <span className="truncate text-slate-700">{item.description}</span>
                                          </div>
                                          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                            <span className="text-slate-600">฿{Number(item.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            {item.isPaid ? (
                                              <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">ชำระแล้ว</span>
                                            ) : item.isPartial ? (
                                              <span className="text-xs font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">ชำระ ฿{Number(item.paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            ) : (
                                              <span className="text-xs font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">ยังไม่ชำระ</span>
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
              {invoiceShowAll && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-slate-500">
                      แสดง {((invoiceCurrentPage - 1) * invoicePageSize + 1).toLocaleString()}-{Math.min(invoiceCurrentPage * invoicePageSize, invoicePagination.totalItems).toLocaleString()} จาก {invoicePagination.totalItems.toLocaleString()} รายการ
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">แสดง</span>
                      <select value={invoicePageSize} onChange={(e) => { setInvoicePageSize(Number(e.target.value)); setInvoiceCurrentPage(1); }}
                        className="border border-slate-200 rounded px-2 py-1 text-sm">
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="text-sm text-slate-500">รายการ</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setInvoiceCurrentPage(1)} disabled={invoiceCurrentPage === 1} className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronsLeft className="w-4 h-4" /></button>
                    <button onClick={() => setInvoiceCurrentPage(Math.max(1, invoiceCurrentPage - 1))} disabled={invoiceCurrentPage === 1} className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft className="w-4 h-4" /></button>
                    {getPageNumbers().map((page, index) => (
                      <button key={index} onClick={() => typeof page === 'number' && setInvoiceCurrentPage(page)} disabled={page === '...'}
                        className={`min-w-[36px] h-9 px-3 rounded text-sm font-medium transition-colors ${page === invoiceCurrentPage ? 'bg-primary-600 text-white' : page === '...' ? 'cursor-default' : 'hover:bg-slate-100'}`}>
                        {page}
                      </button>
                    ))}
                    <button onClick={() => setInvoiceCurrentPage(Math.min(invoicePagination.totalPages, invoiceCurrentPage + 1))} disabled={invoiceCurrentPage === invoicePagination.totalPages} className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight className="w-4 h-4" /></button>
                    <button onClick={() => setInvoiceCurrentPage(invoicePagination.totalPages)} disabled={invoiceCurrentPage === invoicePagination.totalPages} className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronsRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}

              {!invoiceShowAll && invoiceData.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">แสดง {invoiceData.length} จาก {invoicePagination.totalItems.toLocaleString()} รายการ</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick Links */}
        <div className="mb-4">
          <h3 className="font-semibold text-slate-800">เมนูลัด</h3>
          <p className="text-sm text-slate-500">นำทางไปยังรายงานเชิงลึก</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLinkCard
            title="อัตราเก็บเงิน รายโครงการ"
            description="เปรียบเทียบอัตราเก็บเงินส่วนกลางทุกโครงการ"
            href="/reports/common-fee/projects"
            icon={Building2}
          />
          <QuickLinkCard
            title="รายงาน Aging"
            description="วิเคราะห์ความเสี่ยงจากหนี้ค้างชำระ"
            href="/reports/common-fee/aging"
            icon={Clock}
            count={(data.summary.overdue?.yearlyUnitCount || 0) + (data.summary.overdue?.cumulativeUnitCount || 0)}
          />
        </div>
          </>
        )}
      </div>
    </div>
  );
}
