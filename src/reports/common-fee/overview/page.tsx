import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, KPICard } from '@shared/ui';
import { SiteFilters, SiteFilterValues } from '../components';
import { fetchCommonFeeOverview, CommonFeeOverviewData } from './queries';
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


export function CommonFeeOverviewPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<CommonFeeOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async (filters: SiteFilterValues) => {
    setIsLoading(true);
    try {
      const result = await fetchCommonFeeOverview(filters);
      setData(result);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = (filters: SiteFilterValues) => {
    loadData(filters);
  };

  // Calculate percentages for paid and outstanding
  const paidPercentage = data?.kpis.totalBilled.rawValue
    ? ((data.kpis.totalPaid.rawValue || 0) / data.kpis.totalBilled.rawValue * 100).toFixed(1)
    : '0';
  const outstandingPercentage = data?.kpis.totalBilled.rawValue
    ? ((data.kpis.totalOutstanding.rawValue || 0) / data.kpis.totalBilled.rawValue * 100).toFixed(1)
    : '0';

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

        {/* KPI Cards - 4 cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard
            title="จำนวนโครงการ"
            value={data.syncInfo.totalProjects}
            icon={Building2}
            color="blue"
          />
          <KPICard
            title="ยอดเรียกเก็บ"
            value={data.kpis.totalBilled.value}
            change={data.kpis.totalBilled.change}
            changeType={data.kpis.totalBilled.changeType}
            icon={Wallet}
            color="purple"
          />
          <KPICard
            title="ยอดชำระ"
            value={data.kpis.totalPaid.value}
            change={`${paidPercentage}%`}
            changeType="positive"
            showArrow={false}
            icon={CheckCircle}
            color="emerald"
          />
          <KPICard
            title="ยอดค้างชำระ"
            value={data.kpis.totalOutstanding.value}
            change={`${outstandingPercentage}%`}
            changeType="negative"
            showArrow={false}
            icon={AlertCircle}
            color="amber"
          />
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
                <Bar dataKey="outstanding" fill="#f59e0b" name="outstanding" radius={[4, 4, 0, 0]}>
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
                <div className="w-3 h-3 bg-amber-500 rounded" />
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
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#cumOutstandingGradient)"
                name="cumOutstanding"
                dot={{ r: 3, fill: '#f59e0b' }}
              >
                <LabelList dataKey="cumOutstanding" position="top" fontSize={10} fill="#f59e0b" formatter={(v) => typeof v === 'number' && v > 0 ? v.toLocaleString() : ''} />
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
              <div className="w-3 h-3 bg-amber-500 rounded" />
              <span className="text-sm text-slate-600">สะสมค้างชำระ</span>
            </div>
          </div>
        </div>

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
            count={data.kpis.outstandingUnits.value}
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
