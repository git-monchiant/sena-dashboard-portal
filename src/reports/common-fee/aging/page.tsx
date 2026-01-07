import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@shared/ui';
import { AgingFilters } from './filters';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  TrendingUp,
  Search,
  Download,
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
} from 'recharts';

interface AgingRecord {
  id: string;
  unit: string;
  owner: string;
  project: string;
  outstanding: number;
  daysOverdue: number;
  bucket: '0-30' | '31-60' | '61-90' | '90+';
  lastPayment?: string;
}

interface ServerResponse {
  data: AgingRecord[];
  summary: {
    total: number;
    totalAmount: number;
    buckets: {
      bucket: string;
      label: string;
      color: string;
      count: number;
      amount: number;
    }[];
  };
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

// Generate mock data
const generateMockData = (): AgingRecord[] => {
  const projects = ['SENA Park Grand Rama 9', 'SENA Ville Bangna', 'SENA Park Pinklao', 'SENA Grand Sukhumvit'];
  const buckets: Array<'0-30' | '31-60' | '61-90' | '90+'> = ['0-30', '31-60', '61-90', '90+'];
  const owners = ['คุณสมชาย ใจดี', 'คุณวิภา แสงทอง', 'คุณประยุทธ์ มั่นคง', 'บริษัท เอบีซี จำกัด', 'คุณนภา สดใส', 'คุณมานพ รักดี', 'คุณสุภาพร ศรีสุข', 'คุณธนากร เจริญผล'];

  const data: AgingRecord[] = [];

  for (let i = 1; i <= 500; i++) {
    const projectIndex = Math.floor(Math.random() * projects.length);
    const building = String.fromCharCode(65 + projectIndex);
    const unit = `${building}-${String(Math.floor(Math.random() * 30) + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}`;
    const bucket = buckets[Math.floor(Math.random() * buckets.length)];

    let daysOverdue = 0;
    switch (bucket) {
      case '0-30': daysOverdue = Math.floor(Math.random() * 30) + 1; break;
      case '31-60': daysOverdue = Math.floor(Math.random() * 30) + 31; break;
      case '61-90': daysOverdue = Math.floor(Math.random() * 30) + 61; break;
      case '90+': daysOverdue = Math.floor(Math.random() * 60) + 91; break;
    }

    const outstanding = [21000, 35000, 42000, 56000, 78000, 98000, 128000, 156000, 185000][Math.floor(Math.random() * 9)];

    data.push({
      id: `AG-${String(i).padStart(4, '0')}`,
      unit,
      owner: owners[Math.floor(Math.random() * owners.length)],
      project: projects[projectIndex],
      outstanding,
      daysOverdue,
      bucket,
      lastPayment: Math.random() > 0.3 ? `2023-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}` : undefined,
    });
  }

  return data.sort((a, b) => b.daysOverdue - a.daysOverdue);
};

const allMockData = generateMockData();

const bucketConfig = {
  '0-30': { label: '0-30 วัน', color: '#10b981', className: 'bg-emerald-100 text-emerald-700' },
  '31-60': { label: '31-60 วัน', color: '#3b82f6', className: 'bg-blue-100 text-blue-700' },
  '61-90': { label: '61-90 วัน', color: '#f59e0b', className: 'bg-amber-100 text-amber-700' },
  '90+': { label: 'มากกว่า 90 วัน', color: '#ef4444', className: 'bg-red-100 text-red-700' },
};

// Simulate server-side filtering and pagination
const fetchData = (
  page: number,
  pageSize: number,
  search: string,
  bucketFilter: string
): ServerResponse => {
  let filtered = [...allMockData];

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.unit.toLowerCase().includes(searchLower) ||
        d.owner.toLowerCase().includes(searchLower)
    );
  }

  if (bucketFilter && bucketFilter !== 'all') {
    filtered = filtered.filter((d) => d.bucket === bucketFilter);
  }

  // Calculate summary
  const buckets = Object.keys(bucketConfig).map((bucket) => {
    const items = filtered.filter((d) => d.bucket === bucket);
    return {
      bucket,
      label: bucketConfig[bucket as keyof typeof bucketConfig].label,
      color: bucketConfig[bucket as keyof typeof bucketConfig].color,
      count: items.length,
      amount: items.reduce((acc, d) => acc + d.outstanding, 0),
    };
  });

  const summary = {
    total: filtered.length,
    totalAmount: filtered.reduce((acc, d) => acc + d.outstanding, 0),
    buckets,
  };

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

export function AgingReportPage() {
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [bucketFilter, setBucketFilter] = useState('all');

  const response = useMemo(
    () => fetchData(currentPage, pageSize, searchQuery, bucketFilter),
    [currentPage, pageSize, searchQuery, bucketFilter]
  );

  const { data, summary, pagination } = response;

  const handleApplyFilters = () => {
    setCurrentPage(1);
  };

  const handleExport = () => {
    console.log('Exporting to Excel...');
  };

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
        title="รายงาน Aging"
        subtitle="วิเคราะห์ความเสี่ยงจากหนี้ค้างชำระ"
      />

      <div className="p-8">
        <button
          onClick={() => navigate('/reports/common-fee')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">กลับหน้าภาพรวม</span>
        </button>

        <AgingFilters onApply={handleApplyFilters} />

        {/* Summary Cards - Clickable */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <button
            onClick={() => { setBucketFilter('all'); setCurrentPage(1); }}
            className={`card text-left transition-all ${bucketFilter === 'all' ? 'ring-2 ring-primary-500' : 'hover:bg-slate-50'}`}
          >
            <p className="text-sm text-slate-500 mb-1">ยอดค้างรวม</p>
            <p className="text-2xl font-bold text-slate-800">
              ฿{summary.totalAmount.toLocaleString()}
            </p>
            <p className="text-sm text-slate-500 mt-1">{summary.total.toLocaleString()} ยูนิต</p>
          </button>
          {summary.buckets.map((item) => (
            <button
              key={item.bucket}
              onClick={() => { setBucketFilter(item.bucket); setCurrentPage(1); }}
              className={`card text-left transition-all ${bucketFilter === item.bucket ? 'ring-2' : 'hover:bg-slate-50'}`}
              style={{
                borderLeftColor: item.color,
                borderLeftWidth: '4px',
                ...(bucketFilter === item.bucket ? { boxShadow: `0 0 0 2px ${item.color}` } : {})
              }}
            >
              <p className="text-sm text-slate-500 mb-1">{item.label}</p>
              <p className="text-xl font-bold text-slate-800">
                ฿{item.amount.toLocaleString()}
              </p>
              <p className="text-sm text-slate-500 mt-1">{item.count.toLocaleString()} ยูนิต</p>
            </button>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-slate-500" />
              <h3 className="font-semibold text-slate-800">ยอดค้างตามช่วงอายุหนี้</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={summary.buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`฿${value.toLocaleString()}`, 'ยอดค้าง']}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {summary.buckets.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-slate-500" />
              <h3 className="font-semibold text-slate-800">สัดส่วนยอดค้าง</h3>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={summary.buckets}
                  cx="50%"
                  cy="55%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="amount"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                >
                  {summary.buckets.map((entry, index) => (
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
                          <span className="text-sm text-slate-700">{item.label}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{item.count.toLocaleString()} ยูนิต</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Data Table */}
        <div className="card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-slate-800">รายละเอียดหนี้ค้างชำระ</h3>
              {bucketFilter !== 'all' && (
                <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                  กรอง: {bucketConfig[bucketFilter as keyof typeof bucketConfig]?.label}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
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
              </div>
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
                    ยูนิต
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    เจ้าของ
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    โครงการ
                  </th>
                  <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    ยอดค้าง
                  </th>
                  <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    จำนวนวัน
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    ช่วงอายุหนี้
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    ชำระล่าสุด
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((record) => {
                  const bucket = bucketConfig[record.bucket];
                  return (
                    <tr
                      key={record.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-slate-800">
                        {record.unit}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {record.owner}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {record.project}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-slate-800 text-right">
                        ฿{record.outstanding.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {record.daysOverdue} วัน
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bucket.className}`}
                        >
                          {bucket.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">
                        {record.lastPayment
                          ? new Date(record.lastPayment).toLocaleDateString('th-TH')
                          : '-'}
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
                disabled={currentPage === pagination.totalPages}
                className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => goToPage(pagination.totalPages)}
                disabled={currentPage === pagination.totalPages}
                className="p-2 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
