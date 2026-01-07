import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, KPICard } from '@shared/ui';
import { CommonFeeFilters, CommonFeeFilterState } from './filters';
import { fetchCommonFeeOverview, CommonFeeOverviewData } from './queries';
import {
  Wallet,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  ArrowRight,
  FileText,
  Clock,
  AlertTriangle,
  RefreshCw,
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
  PieChart,
  Pie,
  Cell,
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

const statusColors = {
  paid: '#10b981',
  partial: '#3b82f6',
  unpaid: '#f59e0b',
  overdue: '#ef4444',
};

const statusLabels = {
  paid: 'ชำระแล้ว',
  partial: 'ชำระบางส่วน',
  unpaid: 'ค้างชำระ',
  overdue: 'เกินกำหนด',
};

export function CommonFeeOverviewPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<CommonFeeOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async (filters: CommonFeeFilterState) => {
    setIsLoading(true);
    try {
      const result = await fetchCommonFeeOverview(filters);
      setData(result);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData({ projectId: '', period: 'monthly', status: 'all' });
  }, []);

  const handleApplyFilters = (filters: CommonFeeFilterState) => {
    loadData(filters);
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="ภาพรวมค่าส่วนกลาง"
          subtitle="ระบบติดตามและจัดเก็บค่าส่วนกลาง"
        />
        <div className="p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-slate-200 rounded-xl" />
            <div className="grid grid-cols-5 gap-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pieData = Object.entries(data.statusDistribution).map(([key, value]) => ({
    name: statusLabels[key as keyof typeof statusLabels],
    value,
    color: statusColors[key as keyof typeof statusColors],
    count: Math.round((data.syncInfo.totalUnits * value) / 100),
  }));

  return (
    <div className="min-h-screen">
      <PageHeader
        title="ภาพรวมค่าส่วนกลาง"
        subtitle="ระบบติดตามและจัดเก็บค่าส่วนกลาง"
      />

      <div className="p-8">
        {/* Sync Status Bar */}
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

        {/* Filters */}
        <CommonFeeFilters onApply={handleApplyFilters} />

        {/* KPI Cards - 5 cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <KPICard
            title="ยอดเรียกเก็บทั้งหมด"
            value={data.kpis.totalBilled.value}
            change={data.kpis.totalBilled.change}
            changeType={data.kpis.totalBilled.changeType}
            icon={Wallet}
            color="blue"
          />
          <KPICard
            title="ยอดชำระแล้ว"
            value={data.kpis.totalPaid.value}
            change={data.kpis.totalPaid.change}
            changeType={data.kpis.totalPaid.changeType}
            icon={CheckCircle}
            color="emerald"
          />
          <KPICard
            title="ยอดค้างชำระ"
            value={data.kpis.totalOutstanding.value}
            change={data.kpis.totalOutstanding.change}
            changeType={data.kpis.totalOutstanding.changeType}
            icon={AlertCircle}
            color="amber"
          />
          <KPICard
            title="อัตราการจัดเก็บ"
            value={data.kpis.collectionRate.value}
            change={data.kpis.collectionRate.change}
            changeType={data.kpis.collectionRate.changeType}
            target={{ percentage: data.kpis.collectionRate.percentage }}
            icon={TrendingUp}
            color="purple"
          />
          <KPICard
            title="ยูนิตค้างชำระ"
            value={data.kpis.outstandingUnits.value}
            change={data.kpis.outstandingUnits.change}
            changeType={data.kpis.outstandingUnits.changeType}
            icon={Users}
            color="orange"
          />
        </div>

        {/* Status Distribution & Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Status Distribution Pie Chart */}
          <div className="card">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">สถานะการจัดเก็บ</h3>
              <p className="text-sm text-slate-500">สัดส่วนตามสถานะการชำระ</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="55%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}%`}
                  labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                >
                  {pieData.map((entry, index) => (
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
                          <span className="text-sm text-slate-700">{item.name}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{item.count.toLocaleString()} ยูนิต</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-slate-600">{item.name}</span>
                  <span className="text-sm font-medium text-slate-800 ml-auto">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Trend Chart */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-800">แนวโน้มการจัดเก็บ</h3>
                <p className="text-sm text-slate-500">เปรียบเทียบยอดเรียกเก็บ vs ชำระแล้ว</p>
              </div>
              <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5">
                <option>6 เดือนล่าสุด</option>
                <option>12 เดือนล่าสุด</option>
                <option>ปีนี้</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.trend} margin={{ top: 15, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="billedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`฿${value.toLocaleString()}K`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="billed"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#billedGradient)"
                  name="เรียกเก็บ"
                >
                  <LabelList dataKey="billed" position="top" fontSize={11} fill="#3b82f6" fontWeight={600} />
                </Area>
                <Area
                  type="monotone"
                  dataKey="paid"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#paidGradient)"
                  name="ชำระแล้ว"
                >
                  <LabelList dataKey="paid" position="bottom" fontSize={11} fill="#10b981" fontWeight={600} />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-sm text-slate-600">ยอดเรียกเก็บ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded" />
                <span className="text-sm text-slate-600">ยอดชำระแล้ว</span>
              </div>
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
      </div>
    </div>
  );
}
