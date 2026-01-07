import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@shared/ui';
import { PipelineFilters } from './filters';
import {
  ArrowLeft,
  TrendingUp,
  Users,
  DollarSign,
  ArrowRight,
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
} from 'recharts';

const pipelineData = [
  { stage: 'New Lead', count: 245, value: 1250, percentage: 100, color: '#94a3b8' },
  { stage: 'Contacted', count: 198, value: 1020, percentage: 81, color: '#64748b' },
  { stage: 'Qualified', count: 145, value: 780, percentage: 59, color: '#3b82f6' },
  { stage: 'Site Visit', count: 98, value: 560, percentage: 40, color: '#8b5cf6' },
  { stage: 'Proposal', count: 65, value: 420, percentage: 27, color: '#f59e0b' },
  { stage: 'Negotiation', count: 42, value: 320, percentage: 17, color: '#10b981' },
  { stage: 'Closed Won', count: 28, value: 245, percentage: 11, color: '#059669' },
];

const conversionData = [
  { from: 'Lead → Contacted', rate: 81, benchmark: 75 },
  { from: 'Contacted → Qualified', rate: 73, benchmark: 65 },
  { from: 'Qualified → Site Visit', rate: 68, benchmark: 60 },
  { from: 'Site Visit → Proposal', rate: 66, benchmark: 55 },
  { from: 'Proposal → Negotiation', rate: 65, benchmark: 50 },
  { from: 'Negotiation → Won', rate: 67, benchmark: 45 },
];

interface StageCardProps {
  stage: string;
  count: number;
  value: number;
  percentage: number;
  color: string;
  isLast?: boolean;
}

function StageCard({ stage, count, value, percentage, color, isLast }: StageCardProps) {
  return (
    <div className="relative flex-1">
      <div
        className="card text-center py-6 relative overflow-hidden"
        style={{ borderTopColor: color, borderTopWidth: '3px' }}
      >
        <p className="text-sm text-slate-500 mb-1">{stage}</p>
        <p className="text-2xl font-bold text-slate-800">{count.toLocaleString()}</p>
        <p className="text-xs text-slate-400 mt-1">฿{value.toLocaleString()}M</p>
        <div className="mt-3 flex items-center justify-center gap-1">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {percentage}%
          </span>
        </div>
      </div>
      {!isLast && (
        <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
          <ArrowRight className="w-6 h-6 text-slate-300" />
        </div>
      )}
    </div>
  );
}

export function SalesPipelinePage() {
  const navigate = useNavigate();

  const handleApplyFilters = () => {
    // Handle filter application
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Sales Pipeline"
        subtitle="Detailed pipeline analysis and stage breakdown"
      />

      <div className="p-8">
        {/* Back Navigation */}
        <button
          onClick={() => navigate('/sales')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Sales Overview</span>
        </button>

        {/* Filters */}
        <PipelineFilters onApply={handleApplyFilters} />

        {/* Pipeline Summary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Leads in Pipeline</p>
                <p className="text-2xl font-bold text-slate-800">821</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Pipeline Value</p>
                <p className="text-2xl font-bold text-slate-800">฿ 4,595M</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Overall Conversion</p>
                <p className="text-2xl font-bold text-slate-800">11.4%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Funnel Visual */}
        <div className="card mb-8">
          <h3 className="font-semibold text-slate-800 mb-6">Pipeline Stages</h3>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {pipelineData.map((stage, index) => (
              <StageCard
                key={stage.stage}
                {...stage}
                isLast={index === pipelineData.length - 1}
              />
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads by Stage Bar Chart */}
          <div className="card">
            <div className="mb-6">
              <h3 className="font-semibold text-slate-800">Leads by Stage</h3>
              <p className="text-sm text-slate-500">Number of leads at each stage</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pipelineData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  stroke="#64748b"
                  fontSize={12}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Conversion Rates */}
          <div className="card">
            <div className="mb-6">
              <h3 className="font-semibold text-slate-800">Stage Conversion Rates</h3>
              <p className="text-sm text-slate-500">Conversion rate vs benchmark</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  stroke="#64748b"
                  fontSize={12}
                  unit="%"
                />
                <YAxis
                  type="category"
                  dataKey="from"
                  stroke="#64748b"
                  fontSize={11}
                  width={140}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${value}%`, '']}
                />
                <Bar
                  dataKey="rate"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                  name="Actual Rate"
                />
                <Bar
                  dataKey="benchmark"
                  fill="#e2e8f0"
                  radius={[0, 4, 4, 0]}
                  name="Benchmark"
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-sm text-slate-600">Actual Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-slate-200 rounded" />
                <span className="text-sm text-slate-600">Benchmark</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
