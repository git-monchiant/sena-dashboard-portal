import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@shared/ui';
import { SiteFilters, SiteFilterValues } from '../components';
import { fetchAgingData, AgingData, AgingFilters, AgingSortField, SortOrder } from './queries';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  TrendingUp,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LabelList,
} from 'recharts';

const bucketConfig = {
  '0-30': { label: '0-30 วัน', color: '#10b981', bgClass: 'bg-emerald-100', textClass: 'text-emerald-700', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', amountText: 'text-emerald-600', countText: 'text-emerald-500', badgeBg: 'bg-emerald-50' },
  '31-60': { label: '31-60 วัน', color: '#f59e0b', bgClass: 'bg-amber-100', textClass: 'text-amber-700', iconBg: 'bg-amber-100', iconText: 'text-amber-600', amountText: 'text-amber-600', countText: 'text-amber-500', badgeBg: 'bg-amber-50' },
  '61-90': { label: '61-90 วัน', color: '#f97316', bgClass: 'bg-orange-100', textClass: 'text-orange-700', iconBg: 'bg-orange-100', iconText: 'text-orange-600', amountText: 'text-orange-600', countText: 'text-orange-500', badgeBg: 'bg-orange-50' },
  '91-180': { label: '91-180 วัน', color: '#ef4444', bgClass: 'bg-red-100', textClass: 'text-red-700', iconBg: 'bg-red-100', iconText: 'text-red-600', amountText: 'text-red-600', countText: 'text-red-500', badgeBg: 'bg-red-50' },
  '181-360': { label: '181-360 วัน', color: '#dc2626', bgClass: 'bg-red-200', textClass: 'text-red-800', iconBg: 'bg-red-200', iconText: 'text-red-700', amountText: 'text-red-700', countText: 'text-red-600', badgeBg: 'bg-red-100' },
  '360+': { label: '360+ วัน', color: '#991b1b', bgClass: 'bg-red-300', textClass: 'text-red-900', iconBg: 'bg-red-300', iconText: 'text-red-800', amountText: 'text-red-800', countText: 'text-red-700', badgeBg: 'bg-red-200' },
};

export function AgingReportPage() {
  const navigate = useNavigate();

  const [data, setData] = useState<AgingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<AgingFilters | null>(null); // null = not initialized
  const [searchQuery, setSearchQuery] = useState('');
  const [bucketFilter, setBucketFilter] = useState<'0-30' | '31-60' | '61-90' | '91-180' | '181-360' | '360+' | 'all'>('all');
  const [showAll, setShowAll] = useState(false);
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<AgingSortField>('amount');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Sort labels for display
  const sortLabels: Record<AgingSortField, string> = {
    daysOverdue: 'อายุหนี้',
    amount: 'ยอดค้าง',
    dueDate: 'วันครบกำหนด',
    unit: 'ห้อง/ยูนิต',
    owner: 'เจ้าของ',
    project: 'โครงการ',
    docNumber: 'เลขที่เอกสาร',
  };

  const loadData = async (newFilters: AgingFilters) => {
    setIsLoading(true);
    try {
      const effectiveLimit = showAll ? pageSize : 10;
      const effectiveOffset = showAll ? (currentPage - 1) * pageSize : 0;
      const result = await fetchAgingData({
        ...newFilters,
        bucket: bucketFilter !== 'all' ? bucketFilter : undefined,
        search: searchQuery || undefined,
        limit: effectiveLimit,
        offset: effectiveOffset,
        sortBy,
        sortOrder,
      });
      setData(result);
    } catch (error) {
      console.error('Failed to fetch aging data:', error);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Wait for filters to be initialized by SiteFilters
    if (filters !== null) {
      loadData(filters);
    }
  }, [filters, bucketFilter, searchQuery, pageSize, currentPage, sortBy, sortOrder, showAll]);

  const handleApplyFilters = (newFilters: SiteFilterValues) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleBucketClick = (bucket: '0-30' | '31-60' | '61-90' | '91-180' | '181-360' | '360+' | 'all') => {
    setBucketFilter(bucket);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleSortByChange = (value: AgingSortField) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handleSortOrderChange = (value: SortOrder) => {
    setSortOrder(value);
    setCurrentPage(1);
  };

  const handleShowAllToggle = () => {
    setShowAll(!showAll);
    setCurrentPage(1);
  };

  // Prepare chart data from summary
  const chartData = data ? [
    { bucket: '0-30', label: '0-30', amount: data.summary.buckets['0-30']?.amount || 0, count: data.summary.buckets['0-30']?.count || 0, color: bucketConfig['0-30'].color },
    { bucket: '31-60', label: '31-60', amount: data.summary.buckets['31-60']?.amount || 0, count: data.summary.buckets['31-60']?.count || 0, color: bucketConfig['31-60'].color },
    { bucket: '61-90', label: '61-90', amount: data.summary.buckets['61-90']?.amount || 0, count: data.summary.buckets['61-90']?.count || 0, color: bucketConfig['61-90'].color },
    { bucket: '91-180', label: '91-180', amount: data.summary.buckets['91-180']?.amount || 0, count: data.summary.buckets['91-180']?.count || 0, color: bucketConfig['91-180'].color },
    { bucket: '181-360', label: '181-360', amount: data.summary.buckets['181-360']?.amount || 0, count: data.summary.buckets['181-360']?.count || 0, color: bucketConfig['181-360'].color },
    { bucket: '360+', label: '360+', amount: data.summary.buckets['360+']?.amount || 0, count: data.summary.buckets['360+']?.count || 0, color: bucketConfig['360+'].color },
  ] : [];

  // Pagination
  const totalPages = data ? Math.ceil(data.pagination.total / pageSize) : 0;
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = data ? Math.min(currentPage * pageSize, data.pagination.total) : 0;

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
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

  return (
    <div className="min-h-screen">
      <PageHeader
        title="รายงาน Aging"
        subtitle="ติดตามใบแจ้งหนี้ค้างชำระ"
      />

      <div className="p-8">
        <button
          onClick={() => navigate('/reports/common-fee')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">กลับหน้าภาพรวม</span>
        </button>

        <SiteFilters
          onApply={handleApplyFilters}
          storageKey="common-fee-filters"
          showYear={true}
          showPayGroup={true}
        />

        {/* Loading State */}
        {isLoading && (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="h-24 bg-slate-200 rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && data && (
          <>
            {/* Summary Cards - เหมือน Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
              {/* Total Card */}
              <button
                onClick={() => handleBucketClick('all')}
                className={`card text-left transition-all bg-red-600 ${bucketFilter === 'all' ? 'ring-2 ring-red-800' : 'hover:bg-red-700'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-white bg-red-500 px-1.5 py-0.5 rounded-full">100%</span>
                </div>
                <p className="text-lg font-bold text-white">
                  ฿{Number(data.summary.total.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-red-100 mb-1">{data.summary.total.count.toLocaleString()} unit</p>
                <p className="text-xs text-white font-medium">ค้างชำระทั้งหมด (ถึงปี {filters?.year || new Date().getFullYear()})</p>
              </button>

              {/* Bucket Cards */}
              {(['0-30', '31-60', '61-90', '91-180', '181-360', '360+'] as const).map((bucket) => {
                const config = bucketConfig[bucket];
                const bucketData = data.summary.buckets[bucket] || { count: 0, amount: 0 };
                const percentage = data.summary.total.amount > 0
                  ? ((bucketData.amount / data.summary.total.amount) * 100).toFixed(0)
                  : 0;

                return (
                  <button
                    key={bucket}
                    onClick={() => handleBucketClick(bucket)}
                    className={`card text-left transition-all ${bucketFilter === bucket ? 'ring-2' : 'hover:bg-slate-50'}`}
                    style={bucketFilter === bucket ? { boxShadow: `0 0 0 2px ${config.color}` } : {}}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className={`w-8 h-8 ${config.iconBg} ${config.iconText} rounded-lg flex items-center justify-center`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <span className={`text-xs font-medium ${config.textClass} ${config.badgeBg} px-1.5 py-0.5 rounded-full`}>
                        {percentage}%
                      </span>
                    </div>
                    <p className={`text-lg font-bold ${config.amountText}`}>
                      ฿{Number(bucketData.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className={`text-xs ${config.countText} mb-1`}>{bucketData.count.toLocaleString()} unit</p>
                    <p className="text-xs text-slate-500 font-medium">{config.label}</p>
                  </button>
                );
              })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Bar Chart */}
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-slate-500" />
                  <h3 className="font-semibold text-slate-800">ยอดค้างตามช่วงอายุหนี้</h3>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 30, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => v.toLocaleString()} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`฿${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'ยอดค้าง']}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <LabelList
                        dataKey="amount"
                        position="top"
                        fontSize={10}
                        fill="#64748b"
                        formatter={(value: number) => value > 0 ? `฿${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : ''}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart */}
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-slate-500" />
                  <h3 className="font-semibold text-slate-800">สัดส่วนยอดค้าง</h3>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={chartData.filter(d => d.amount > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="amount"
                      nameKey="label"
                      label={({ label, percent }) => `${label} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                    >
                      {chartData.filter(d => d.amount > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-sm text-slate-700">{item.label} วัน</span>
                            </div>
                            <p className="text-sm font-semibold text-slate-800 mt-1">
                              ฿{Number(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({item.count} unit)
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Invoice Table */}
            <div className="card">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h3 className="font-semibold text-slate-800">
                      {showAll ? 'รายการใบแจ้งหนี้ค้างชำระทั้งหมด' : `Top 10 ใบแจ้งหนี้ค้างชำระ (เรียงตาม${sortLabels[sortBy]})`}
                    </h3>
                    {bucketFilter !== 'all' && (
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${bucketConfig[bucketFilter].bgClass} ${bucketConfig[bucketFilter].textClass}`}>
                        กรอง: {bucketConfig[bucketFilter].label}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    เรียงตาม {sortLabels[sortBy]} {sortOrder === 'desc' ? 'มากไปน้อย' : 'น้อยไปมาก'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={sortBy}
                    onChange={(e) => handleSortByChange(e.target.value as AgingSortField)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="daysOverdue">อายุหนี้</option>
                    <option value="amount">ยอดค้าง</option>
                    <option value="dueDate">วันครบกำหนด</option>
                    <option value="unit">ห้อง/ยูนิต</option>
                    <option value="owner">เจ้าของ</option>
                    <option value="project">โครงการ</option>
                    <option value="docNumber">เลขที่เอกสาร</option>
                  </select>
                  <select
                    value={sortOrder}
                    onChange={(e) => handleSortOrderChange(e.target.value as SortOrder)}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="desc">มากไปน้อย</option>
                    <option value="asc">น้อยไปมาก</option>
                  </select>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหา ห้อง, เจ้าของ, เลขที่เอกสาร..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  {data && data.pagination.total > 10 && (
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
                      <th className="text-left text-xs font-semibold text-slate-600 py-3 px-4">
                        เลขที่เอกสาร
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-600 py-3 px-4">
                        ห้อง/ยูนิต
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-600 py-3 px-4">
                        เจ้าของ
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-600 py-3 px-4">
                        โครงการ
                      </th>
                      <th className="text-right text-xs font-semibold text-slate-600 py-3 px-4">
                        ยอดค้าง
                      </th>
                      <th className="text-center text-xs font-semibold text-slate-600 py-3 px-4">
                        วันครบกำหนด
                      </th>
                      <th className="text-center text-xs font-semibold text-slate-600 py-3 px-4">
                        อายุหนี้
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-600 py-3 px-4">
                        ช่วง
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.invoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          ไม่พบข้อมูลใบแจ้งหนี้ค้างชำระ
                        </td>
                      </tr>
                    ) : (
                      data.invoices.map((invoice) => {
                        const bucket = bucketConfig[invoice.bucket as keyof typeof bucketConfig] || bucketConfig['360+'];
                        return (
                          <tr
                            key={invoice.id}
                            className="border-b border-slate-100 hover:bg-slate-50"
                          >
                            <td className="py-3 px-4 text-sm text-slate-600">
                              {invoice.docNumber || '-'}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-slate-800">
                              {invoice.unit}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-600">
                              {invoice.owner}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-600">
                              {invoice.project}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-slate-800 text-right">
                              ฿{Number(invoice.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-600 text-center">
                              {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('th-TH') : '-'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                {invoice.daysOverdue} วัน
                              </span>
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

              {/* Pagination - only show when viewing all */}
              {showAll && data.pagination.total > 0 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-slate-500">
                      แสดง {startItem.toLocaleString()}-{endItem.toLocaleString()} จาก {data.pagination.total.toLocaleString()} รายการ
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
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      disabled={currentPage === totalPages}
                      className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
