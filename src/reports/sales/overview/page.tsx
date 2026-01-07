import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, KPICard } from '@shared/ui';
import { SalesFilters } from './filters';
import { fetchSalesOverview, SalesOverviewData } from './queries';
import { FilterState } from '@shared/types';
import {
  TrendingUp,
  Target,
  Users,
  DollarSign,
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

interface QuickLinkCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

function QuickLinkCard({ title, description, href, icon: Icon }: QuickLinkCardProps) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(href)}
      className="card-hover flex items-center gap-4 text-left w-full group"
    >
      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-slate-200 transition-colors">
        <Icon className="w-5 h-5 text-slate-600" />
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-slate-800">{title}</h4>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
    </button>
  );
}

export function SalesOverviewPage() {
  const [data, setData] = useState<SalesOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async (filters: FilterState) => {
    setIsLoading(true);
    try {
      const result = await fetchSalesOverview(filters);
      setData(result);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData({ projectId: '', dateRange: 'mtd' });
  }, []);

  const handleApplyFilters = (filters: FilterState) => {
    loadData(filters);
  };

  if (isLoading || !data) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="Sales Overview"
          subtitle="Sales module entry point with key metrics and insights"
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
        title="Sales Overview"
        subtitle="Sales module entry point with key metrics and insights"
      />

      <div className="p-8">
        {/* Filters */}
        <SalesFilters onApply={handleApplyFilters} />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Sales (MTD)"
            value={data.kpis.totalSales.value}
            change={data.kpis.totalSales.change}
            changeType={data.kpis.totalSales.changeType}
            target={{ percentage: data.kpis.totalSales.targetPercentage }}
            icon={DollarSign}
            color="emerald"
          />
          <KPICard
            title="Units Sold (MTD)"
            value={data.kpis.unitsSold.value}
            change={data.kpis.unitsSold.change}
            changeType={data.kpis.unitsSold.changeType}
            target={{ percentage: data.kpis.unitsSold.targetPercentage }}
            icon={Target}
            color="blue"
          />
          <KPICard
            title="Active Leads"
            value={data.kpis.activeLeads.value}
            change={data.kpis.activeLeads.change}
            changeType={data.kpis.activeLeads.changeType}
            icon={Users}
            color="purple"
          />
          <KPICard
            title="Conversion Rate"
            value={data.kpis.conversionRate.value}
            change={data.kpis.conversionRate.change}
            changeType={data.kpis.conversionRate.changeType}
            icon={TrendingUp}
            color="orange"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Trend Chart */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-slate-800">Sales Trend</h3>
                <p className="text-sm text-slate-500">Monthly sales vs target</p>
              </div>
              <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5">
                <option>Last 6 months</option>
                <option>Last 12 months</option>
                <option>This Year</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.salesTrend} margin={{ top: 15, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
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
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#salesGradient)"
                >
                  <LabelList dataKey="sales" position="top" fontSize={11} fill="#10b981" fontWeight={600} />
                </Area>
                <Area
                  type="monotone"
                  dataKey="target"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="none"
                >
                  <LabelList dataKey="target" position="bottom" fontSize={11} fill="#94a3b8" fontWeight={600} />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Sales Pipeline */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-slate-800">Sales Pipeline</h3>
                <p className="text-sm text-slate-500">Leads by stage</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.pipelineData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  stroke="#64748b"
                  fontSize={12}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Distribution & Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Channel Distribution */}
          <div className="card">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">Sales by Channel</h3>
              <p className="text-sm text-slate-500">Distribution breakdown</p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.channelData.map(item => ({
                    ...item,
                    count: Math.round((data.kpis.unitsSold.value * item.value) / 100),
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
                  {data.channelData.map((entry, index) => (
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
                        <p className="text-sm font-semibold text-slate-800 mt-1">{item.count.toLocaleString()} units</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {data.channelData.map((item) => (
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

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">Quick Links</h3>
              <p className="text-sm text-slate-500">Navigate to detailed reports</p>
            </div>
            <div className="space-y-3">
              <QuickLinkCard
                title="Sales Pipeline"
                description="Detailed pipeline analysis and stage breakdown"
                href="/sales/pipeline"
                icon={TrendingUp}
              />
              <QuickLinkCard
                title="Channel Performance"
                description="Compare performance across sales channels"
                href="/sales/channel"
                icon={Target}
              />
              <QuickLinkCard
                title="Lead Quality"
                description="Lead scoring and conversion analytics"
                href="/sales/leads"
                icon={Users}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
