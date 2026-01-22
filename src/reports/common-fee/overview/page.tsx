import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@shared/ui';
import { SiteFilters, SiteFilterValues } from '../components';
import { fetchCommonFeeOverview, CommonFeeOverviewData, fetchExpenseSummary, ExpenseSummaryData } from './queries';
import {
  Wallet,
  CheckCircle,
  AlertCircle,
  Users,
  ArrowRight,
  FileText,
  Clock,
  AlertTriangle,
  Database,
  Building2,
  Settings,
  XCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
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

export function CommonFeeOverviewPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<CommonFeeOverviewData | null>(null);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async (filters: SiteFilterValues) => {
    setIsLoading(true);
    try {
      const [overviewResult, expenseResult] = await Promise.all([
        fetchCommonFeeOverview(filters),
        fetchExpenseSummary(filters).catch(() => null),
      ]);
      setData(overviewResult);
      setExpenseSummary(expenseResult);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = (filters: SiteFilterValues) => {
    loadData(filters);
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
        {/* Sync Status Bar */}
        {data && (
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-600">Last Sync:</span>
                <span className="text-sm font-medium text-slate-800">{data.syncInfo.lastSyncAt}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  <span className="text-slate-600">{data.syncInfo.totalProjects} โครงการ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span className="text-slate-600">{data.syncInfo.totalUnits.toLocaleString()} ยูนิต</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-emerald-600 font-medium">Synced</span>
              </div>
            </div>
            <button
              onClick={() => navigate('/reports/common-fee/settings')}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              จัดการโครงการ
            </button>
          </div>
        )}

        {/* Filters */}
        <SiteFilters
          onApply={handleApplyFilters}
          storageKey="common-fee-filters"
          showYear={true}
          showPeriod={true}
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

        {/* Summary Cards - 6 cards เหมือนหน้า Collection */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {/* ทั้งหมด */}
          <div className="card text-left">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">100%</span>
            </div>
            <p className="text-xl font-bold text-slate-800 text-left">
              ฿{(data.summary.totalAmount / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K
            </p>
            <p className="text-xs text-slate-400 mb-1 text-left">{(data.summary.totalUnitCount || 0).toLocaleString()} ยูนิต</p>
            <p className="text-xs text-slate-500 font-medium text-left">ทั้งหมด</p>
          </div>

          {/* ชำระแล้ว */}
          <div className="card text-left">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                {data.summary.totalAmount > 0 ? ((data.summary.paid?.amount || 0) / data.summary.totalAmount * 100).toFixed(0) : 0}%
              </span>
            </div>
            <p className="text-xl font-bold text-emerald-600 text-left">
              ฿{((data.summary.paid?.amount || 0) / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K
            </p>
            <p className="text-xs text-emerald-500 mb-1 text-left">{(data.summary.paid?.unitCount || 0).toLocaleString()} ยูนิต</p>
            <p className="text-xs text-slate-500 font-medium text-left">ชำระแล้ว</p>
          </div>

          {/* ชำระบางส่วน */}
          <div className="card text-left">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                {data.summary.totalAmount > 0 ? ((data.summary.partial?.amount || 0) / data.summary.totalAmount * 100).toFixed(0) : 0}%
              </span>
            </div>
            <p className="text-xl font-bold text-blue-600 text-left">
              ฿{((data.summary.partial?.amount || 0) / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K
            </p>
            <p className="text-xs text-blue-500 mb-1 text-left">{(data.summary.partial?.unitCount || 0).toLocaleString()} ยูนิต</p>
            <p className="text-xs text-slate-500 font-medium text-left">ชำระบางส่วน</p>
          </div>

          {/* รอชำระ */}
          <div className="card text-left">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                {data.summary.totalAmount > 0 ? ((data.summary.active?.amount || 0) / data.summary.totalAmount * 100).toFixed(0) : 0}%
              </span>
            </div>
            <p className="text-xl font-bold text-amber-600 text-left">
              ฿{((data.summary.active?.amount || 0) / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K
            </p>
            <p className="text-xs text-amber-500 mb-1 text-left">{(data.summary.active?.unitCount || 0).toLocaleString()} ยูนิต</p>
            <p className="text-xs text-slate-500 font-medium text-left">รอรับชำระ</p>
          </div>

          {/* ค้างชำระ - แสดง ปีนี้/สะสม (แตกต่างจากอันอื่น) */}
          <div className="card text-left">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            {/* ยอดเงิน พร้อม % เพิ่มขึ้นเป็นตัวห้อย */}
            <div className="flex items-baseline gap-1 justify-start">
              <p className="text-xl font-bold text-red-600 text-left">
                ฿{((data.summary.overdue?.amount || 0) / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}<span className="text-base">/</span>{(((data.summary.overdue?.amount || 0) + (data.summary.overdue?.cumulativeAmount || 0)) / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K
              </p>
              {(data.summary.overdue?.cumulativeAmount || 0) > 0 && (
                <span className="text-[10px] font-semibold text-red-500">
                  +{(((data.summary.overdue?.amount || 0) / (data.summary.overdue?.cumulativeAmount || 1)) * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <p className="text-xs text-red-500 mb-1 text-left">
              {(data.summary.overdue?.totalUnitCount || 0).toLocaleString()} ยูนิต
            </p>
            <p className="text-xs text-slate-500 font-medium text-left">ค้างชำระ (ปีนี้/สะสม)</p>
          </div>

          {/* ยกเลิก */}
          <div className="card text-left">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {data.summary.totalAmount > 0 ? ((data.summary.void?.amount || 0) / data.summary.totalAmount * 100).toFixed(0) : 0}%
              </span>
            </div>
            <p className="text-xl font-bold text-slate-500 text-left">
              ฿{((data.summary.void?.amount || 0) / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}K
            </p>
            <p className="text-xs text-slate-400 mb-1 text-left">{(data.summary.void?.unitCount || 0).toLocaleString()} ยูนิต</p>
            <p className="text-xs text-slate-500 font-medium text-left">ยกเลิก</p>
          </div>
        </div>

        {/* Monthly Comparison Bar Chart */}
        <div className="card mb-8">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">เปรียบเทียบรายเดือน</h3>
              <p className="text-sm text-slate-500">ยอดเรียกเก็บ / ชำระ / ค้างชำระ ({unitLabel})</p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={filteredTrend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
                    const order: Record<string, number> = { billed: 0, paid: 1, outstanding: 2 };
                    return order[item.dataKey as string] ?? 99;
                  }}
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      billed: 'เรียกเก็บ',
                      paid: 'ชำระ',
                      outstanding: 'ค้างชำระ',
                    };
                    const v = typeof value === 'number' ? value : 0;
                    return [`฿${v.toLocaleString()} บาท`, labels[String(name)] || String(name)];
                  }}
                />
                <Bar dataKey="billed" fill="#3b82f6" name="billed" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="billed" position="top" fontSize={10} fill="#64748b" formatter={(v) => typeof v === 'number' && v > 0 ? v.toLocaleString() : ''} />
                </Bar>
                <Bar dataKey="paid" fill="#10b981" name="paid" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="paid" position="top" fontSize={10} fill="#64748b" formatter={(v) => typeof v === 'number' && v > 0 ? v.toLocaleString() : ''} />
                </Bar>
                <Bar dataKey="outstanding" fill="#ef4444" name="outstanding" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="outstanding" position="top" fontSize={10} fill="#64748b" formatter={(v) => typeof v === 'number' && v > 0 ? v.toLocaleString() : ''} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-sm text-slate-600">เรียกเก็บ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded" />
                <span className="text-sm text-slate-600">ชำระ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span className="text-sm text-slate-600">ค้างชำระ</span>
              </div>
            </div>
        </div>

        {/* Cumulative Trend Chart */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800">ยอดสะสม</h3>
              <p className="text-sm text-slate-500">เปรียบเทียบยอดสะสมตามเดือน ({unitLabel})</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={filteredTrend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cumBilledGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cumPaidGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cumOutstandingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
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
                  const order: Record<string, number> = { cumBilled: 0, cumPaid: 1, cumOutstanding: 2 };
                  return order[item.dataKey as string] ?? 99;
                }}
                formatter={(value, name) => {
                  const labels: Record<string, string> = {
                    cumBilled: 'สะสมเรียกเก็บ',
                    cumPaid: 'สะสมชำระ',
                    cumOutstanding: 'สะสมค้างชำระ',
                  };
                  const v = typeof value === 'number' ? value : 0;
                  return [`฿${v.toLocaleString()} บาท`, labels[String(name)] || String(name)];
                }}
              />
              <Area
                type="monotone"
                dataKey="cumBilled"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#cumBilledGradient)"
                name="cumBilled"
                dot={{ r: 3, fill: '#3b82f6' }}
              >
                <LabelList dataKey="cumBilled" position="top" fontSize={10} fill="#3b82f6" formatter={(v) => typeof v === 'number' && v > 0 ? v.toLocaleString() : ''} />
              </Area>
              <Area
                type="monotone"
                dataKey="cumPaid"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#cumPaidGradient)"
                name="cumPaid"
                dot={{ r: 3, fill: '#10b981' }}
              >
                <LabelList dataKey="cumPaid" position="top" fontSize={10} fill="#10b981" formatter={(v) => typeof v === 'number' && v > 0 ? v.toLocaleString() : ''} />
              </Area>
              <Area
                type="monotone"
                dataKey="cumOutstanding"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#cumOutstandingGradient)"
                name="cumOutstanding"
                dot={{ r: 3, fill: '#ef4444' }}
              >
                <LabelList dataKey="cumOutstanding" position="top" fontSize={10} fill="#ef4444" formatter={(v) => typeof v === 'number' && v > 0 ? v.toLocaleString() : ''} />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span className="text-sm text-slate-600">สะสมเรียกเก็บ</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded" />
              <span className="text-sm text-slate-600">สะสมชำระ</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-sm text-slate-600">สะสมค้างชำระ</span>
            </div>
          </div>
        </div>

        {/* Expense Summary Pie Chart */}
        {expenseSummary && expenseSummary.data.length > 0 && (
          <div className="card mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-800">สัดส่วนประเภทค่าใช้จ่าย</h3>
                <p className="text-sm text-slate-500">แยกตามประเภทรายการใน Invoice ({expenseSummary.totalInvoices.toLocaleString()} invoices)</p>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseSummary.data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {expenseSummary.data.map((entry, index) => (
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
              {/* Legend */}
              <div className="flex flex-wrap lg:flex-col gap-2 lg:gap-1 lg:min-w-[200px]">
                {expenseSummary.data.slice(0, 8).map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: EXPENSE_COLORS[index % EXPENSE_COLORS.length] }}
                    />
                    <span className="text-slate-600 truncate">{item.name}</span>
                    <span className="text-slate-400 ml-auto">฿{(item.amount / 1000).toFixed(0)}K</span>
                  </div>
                ))}
                {expenseSummary.data.length > 8 && (
                  <div className="text-xs text-slate-400">+{expenseSummary.data.length - 8} อื่นๆ</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Risk Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* High Risk Units */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold text-slate-800">ยูนิตยอดค้างสูงสุด</h3>
              </div>
              <button
                onClick={() => navigate('/reports/common-fee/aging')}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                ดูทั้งหมด
              </button>
            </div>
            <div className="space-y-3">
              {data.highRiskUnits.slice(0, 5).map((unit, index) => (
                <div
                  key={unit.unit}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-slate-800">{unit.unit}</p>
                      <p className="text-xs text-slate-500">{unit.owner}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-800">
                      ฿{unit.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-red-500">{unit.daysOverdue} วัน</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Overdue Units Chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-slate-800">ยูนิตเกินกำหนดชำระ</h3>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.highRiskUnits.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="unit"
                  stroke="#64748b"
                  fontSize={12}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`฿${value.toLocaleString()}`, 'ยอดค้าง']}
                />
                <Bar dataKey="amount" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-4">
          <h3 className="font-semibold text-slate-800">เมนูลัด</h3>
          <p className="text-sm text-slate-500">นำทางไปยังรายงานเชิงลึก</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLinkCard
            title="รายละเอียดการเรียกเก็บ"
            description="ตรวจสอบการออกบิลและสถานะการชำระรายยูนิต"
            href="/reports/common-fee/collection"
            icon={FileText}
          />
          <QuickLinkCard
            title="รายงาน Aging"
            description="วิเคราะห์ความเสี่ยงจากหนี้ค้างชำระ"
            href="/reports/common-fee/aging"
            icon={Clock}
            count={(data.summary.overdue?.yearlyUnitCount || 0) + (data.summary.overdue?.cumulativeUnitCount || 0)}
          />
          <QuickLinkCard
            title="เคสพิเศษ / ติดตามผล"
            description="จัดการกรณีที่ต้องติดตามเป็นพิเศษ"
            href="/reports/common-fee/exception"
            icon={AlertTriangle}
            count={8}
          />
        </div>
          </>
        )}
      </div>
    </div>
  );
}
