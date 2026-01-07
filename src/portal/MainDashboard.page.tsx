import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@shared/ui';
import {
  ArrowRight,
  TrendingUp,
  Users,
  DollarSign,
  Building,
  BarChart3,
  PieChart,
  Activity,
  LineChart,
  LucideIcon,
} from 'lucide-react';

interface SkeletonChartProps {
  icon: LucideIcon;
  title: string;
  height?: string;
}

function SkeletonChart({ icon: Icon, title, height = 'h-48' }: SkeletonChartProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">{title}</h3>
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <div
        className={`${height} bg-slate-100 rounded-lg flex items-center justify-center relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 animate-pulse" />
        <div className="z-10 text-center">
          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-2">
            <Icon className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">Chart data coming soon</p>
        </div>
      </div>
    </div>
  );
}

interface SkeletonKPIProps {
  label: string;
  icon: LucideIcon;
}

function SkeletonKPI({ label, icon: Icon }: SkeletonKPIProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{label}</p>
          <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
          <div className="h-4 w-16 bg-slate-100 rounded mt-2 animate-pulse" />
        </div>
        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
          <Icon className="w-6 h-6 text-slate-400" />
        </div>
      </div>
    </div>
  );
}

export function MainDashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Main Dashboard"
        subtitle="Welcome to SENA Dashboard Portal"
        badge="Under Development"
      />

      <div className="p-8">
        {/* Alert Banner */}
        <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-800">
              Dashboard Under Development
            </h3>
            <p className="text-sm text-amber-700 mt-1">
              The main dashboard with executive KPIs and graphs is currently being
              developed. In the meantime, you can access individual report modules
              through the Report Catalog.
            </p>
          </div>
          <button
            onClick={() => navigate('/reports')}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            Go to Report Catalog
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* KPI Placeholders */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <SkeletonKPI label="Total Revenue" icon={DollarSign} />
          <SkeletonKPI label="Active Projects" icon={Building} />
          <SkeletonKPI label="Total Customers" icon={Users} />
          <SkeletonKPI label="Sales Growth" icon={TrendingUp} />
        </div>

        {/* Chart Placeholders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SkeletonChart icon={LineChart} title="Revenue Trend" height="h-64" />
          <SkeletonChart icon={BarChart3} title="Sales by Project" height="h-64" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonChart icon={PieChart} title="Revenue by Category" height="h-56" />
          <SkeletonChart icon={Activity} title="Transfer Progress" height="h-56" />
          <SkeletonChart icon={TrendingUp} title="Sales Performance" height="h-56" />
        </div>

        {/* Quick Access Section */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/sales')}
              className="card-hover flex items-center gap-4 text-left group"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">Sales Reports</h3>
                <p className="text-sm text-slate-500">
                  View sales metrics and analytics
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </button>

            <button
              onClick={() => navigate('/transfer')}
              className="card-hover flex items-center gap-4 text-left group"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <ArrowRight className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">Transfer Reports</h3>
                <p className="text-sm text-slate-500">
                  Track transfer status and aging
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
