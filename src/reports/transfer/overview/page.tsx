import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, KPICard } from '@shared/ui';
import { TransferFilters } from './filters';
import { fetchTransferOverview, TransferOverviewData } from './queries';
import { FilterState } from '@shared/types';
import {
  ArrowRightLeft,
  CheckCircle,
  Timer,
  AlertCircle,
  Clock,
  FileCheck,
  ArrowRight,
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
  PieChart,
  Pie,
  Cell,
  LabelList,
} from 'recharts';

interface StatusBadgeProps {
  status: 'completed' | 'inProgress' | 'pending' | 'delayed';
  count: string;
}

function StatusBadge({ status, count }: StatusBadgeProps) {
  const statusConfig = {
    completed: { icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
    inProgress: { icon: Clock, color: 'text-blue-600 bg-blue-50' },
    pending: { icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
    delayed: { icon: AlertCircle, color: 'text-red-600 bg-red-50' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.color}`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{count}</span>
    </div>
  );
}

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

export function TransferOverviewPage() {
  const [data, setData] = useState<TransferOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async (filters: FilterState) => {
    setIsLoading(true);
    try {
      const result = await fetchTransferOverview(filters);
      setData(result);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData({ projectId: '', dateRange: 'mtd' });
  }, []);

  const handleApplyFilters = (filters: FilterState & { status: string }) => {
    loadData(filters);
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="Transfer Overview"
          subtitle="Transfer module entry point with status tracking and aging analysis"
        />
        <div className="p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-slate-200 rounded-xl" />
            <div className="grid grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Transfer Overview"
        subtitle="Transfer module entry point with status tracking and aging analysis"
      />

      <div className="p-8">
        {/* Filters */}
        <TransferFilters onApply={handleApplyFilters} />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Transfers (MTD)"
            value={data.kpis.totalTransfers.value}
            change={data.kpis.totalTransfers.change}
            changeType={data.kpis.totalTransfers.changeType}
            subtext={data.kpis.totalTransfers.subtext}
            icon={ArrowRightLeft}
            color="blue"
          />
          <KPICard
            title="Completed"
            value={data.kpis.completed.value}
            change={data.kpis.completed.change}
            changeType={data.kpis.completed.changeType}
            subtext={data.kpis.completed.subtext}
            icon={CheckCircle}
            color="emerald"
          />
          <KPICard
            title="Avg. Transfer Time"
            value={data.kpis.avgTime.value}
            change={data.kpis.avgTime.change}
            changeType={data.kpis.avgTime.changeType}
            subtext={data.kpis.avgTime.subtext}
            icon={Timer}
            color="amber"
          />
          <KPICard
            title="Delayed Transfers"
            value={data.kpis.delayed.value}
            change={data.kpis.delayed.change}
            changeType={data.kpis.delayed.changeType}
            subtext={data.kpis.delayed.subtext}
            icon={AlertCircle}
            color="red"
          />
        </div>

        {/* Status Overview Bar */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">
              Transfer Status Distribution
            </h3>
            <div className="flex items-center gap-3">
              <StatusBadge status="completed" count={`${data.statusDistribution.completed}%`} />
              <StatusBadge status="inProgress" count={`${data.statusDistribution.inProgress}%`} />
              <StatusBadge status="pending" count={`${data.statusDistribution.pending}%`} />
              <StatusBadge status="delayed" count={`${data.statusDistribution.delayed}%`} />
            </div>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${data.statusDistribution.completed}%` }}
            />
            <div
              className="h-full bg-blue-500"
              style={{ width: `${data.statusDistribution.inProgress}%` }}
            />
            <div
              className="h-full bg-amber-500"
              style={{ width: `${data.statusDistribution.pending}%` }}
            />
            <div
              className="h-full bg-red-500"
              style={{ width: `${data.statusDistribution.delayed}%` }}
            />
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Transfer Trend Chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-slate-800">Transfer Trend</h3>
                <p className="text-sm text-slate-500">Completed vs pending transfers</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.transferTrend} margin={{ top: 15, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="completedGradient2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                />
                <Area
                  type="linear"
                  dataKey="completed"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#completedGradient2)"
                  dot={{ r: 2.5, fill: '#10b981' }}
                >
                  <LabelList dataKey="completed" position="top" fontSize={11} fill="#10b981" fontWeight={600} />
                </Area>
                <Area
                  type="linear"
                  dataKey="pending"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#pendingGradient)"
                  dot={{ r: 2.5, fill: '#f59e0b' }}
                >
                  <LabelList dataKey="pending" position="bottom" fontSize={11} fill="#f59e0b" fontWeight={600} />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Aging Distribution */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-slate-800">Transfer Aging</h3>
                <p className="text-sm text-slate-500">Days since booking</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.agingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.agingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Chart & Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status Distribution */}
          <div className="card">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">Status Breakdown</h3>
              <p className="text-sm text-slate-500">Current status distribution</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.statusData.map(item => ({
                    ...item,
                    count: Math.round((data.kpis.totalTransfers.value * item.value) / 100),
                  }))}
                  cx="50%"
                  cy="55%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}%`}
                  labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                >
                  {data.statusData.map((entry, index) => (
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
                          <span className="text-sm text-slate-700">{item.status}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-800 mt-1">{item.count.toLocaleString()} transfers</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">Quick Links</h3>
              <p className="text-sm text-slate-500">Navigate to detailed reports</p>
            </div>
            <div className="space-y-3">
              <QuickLinkCard
                title="Transfer Aging"
                description="Detailed aging analysis by project and date range"
                href="/transfer/aging"
                icon={Clock}
              />
              <QuickLinkCard
                title="Transfer Status"
                description="Track status changes and completion progress"
                href="/transfer/status"
                icon={FileCheck}
              />
              <QuickLinkCard
                title="Document Tracking"
                description="Monitor document completion status"
                href="/transfer/documents"
                icon={ArrowRightLeft}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
