import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@shared/ui';
import { AgingFilters } from './filters';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  LucideIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  LabelList,
} from 'recharts';

const agingByProject = [
  { project: 'SENA Park Grand Rama 9', '0-30': 15, '31-60': 8, '61-90': 4, '90+': 2 },
  { project: 'SENA Ville Bangna', '0-30': 12, '31-60': 6, '61-90': 3, '90+': 1 },
  { project: 'SENA Ecotown Chiang Mai', '0-30': 8, '31-60': 4, '61-90': 2, '90+': 0 },
  { project: 'SENA Park Pinklao', '0-30': 10, '31-60': 5, '61-90': 3, '90+': 2 },
  { project: 'SENA Grand Sukhumvit', '0-30': 6, '31-60': 3, '61-90': 1, '90+': 1 },
];

const agingSummary = [
  { range: '0-30 days', count: 51, value: 285, color: '#10b981', status: 'On Track' as const },
  { range: '31-60 days', count: 26, value: 165, color: '#3b82f6', status: 'Monitor' as const },
  { range: '61-90 days', count: 13, value: 98, color: '#f59e0b', status: 'At Risk' as const },
  { range: '90+ days', count: 6, value: 42, color: '#ef4444', status: 'Critical' as const },
];

const trendData = [
  { month: 'Jan', avg: 48, target: 45 },
  { month: 'Feb', avg: 52, target: 45 },
  { month: 'Mar', avg: 45, target: 45 },
  { month: 'Apr', avg: 43, target: 45 },
  { month: 'May', avg: 41, target: 45 },
  { month: 'Jun', avg: 38, target: 45 },
];

const delayedTransfers = [
  { id: 'TF001', unit: 'Unit A-1201', project: 'SENA Park Grand Rama 9', days: 125, value: 8.5, reason: 'Document pending' },
  { id: 'TF002', unit: 'Unit B-803', project: 'SENA Ville Bangna', days: 112, value: 6.2, reason: 'Bank approval' },
  { id: 'TF003', unit: 'Unit C-505', project: 'SENA Park Pinklao', days: 98, value: 5.8, reason: 'Customer request' },
  { id: 'TF004', unit: 'Unit D-1502', project: 'SENA Grand Sukhumvit', days: 95, value: 12.5, reason: 'Legal review' },
  { id: 'TF005', unit: 'Unit E-401', project: 'SENA Park Grand Rama 9', days: 92, value: 4.2, reason: 'Document pending' },
];

type StatusType = 'On Track' | 'Monitor' | 'At Risk' | 'Critical';

interface AgingCardProps {
  range: string;
  count: number;
  value: number;
  color: string;
  status: StatusType;
}

function AgingCard({ range, count, value, color, status }: AgingCardProps) {
  const statusConfig: Record<StatusType, { icon: LucideIcon; textColor: string }> = {
    'On Track': { icon: CheckCircle, textColor: 'text-emerald-600' },
    'Monitor': { icon: Clock, textColor: 'text-blue-600' },
    'At Risk': { icon: AlertTriangle, textColor: 'text-amber-600' },
    'Critical': { icon: XCircle, textColor: 'text-red-600' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="card" style={{ borderLeftColor: color, borderLeftWidth: '4px' }}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-slate-700">{range}</p>
        <Icon className={`w-5 h-5 ${config.textColor}`} />
      </div>
      <p className="text-3xl font-bold text-slate-800">{count.toLocaleString()}</p>
      <p className="text-sm text-slate-500 mt-1">฿ {value.toLocaleString()}M</p>
      <div className={`text-xs font-medium mt-2 ${config.textColor}`}>{status}</div>
    </div>
  );
}

export function TransferAgingPage() {
  const navigate = useNavigate();

  const handleApplyFilters = () => {
    // Handle filter application
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Transfer Aging"
        subtitle="Detailed aging analysis by project and date range"
      />

      <div className="p-8">
        {/* Back Navigation */}
        <button
          onClick={() => navigate('/transfer')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Transfer Overview</span>
        </button>

        {/* Filters */}
        <AgingFilters onApply={handleApplyFilters} />

        {/* Aging Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {agingSummary.map((item) => (
            <AgingCard key={item.range} {...item} />
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Aging by Project */}
          <div className="card">
            <div className="mb-6">
              <h3 className="font-semibold text-slate-800">Aging by Project</h3>
              <p className="text-sm text-slate-500">
                Transfer count by aging range per project
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agingByProject} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis
                  type="category"
                  dataKey="project"
                  stroke="#64748b"
                  fontSize={11}
                  width={150}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="0-30" stackId="a" fill="#10b981" name="0-30 days" />
                <Bar dataKey="31-60" stackId="a" fill="#3b82f6" name="31-60 days" />
                <Bar dataKey="61-90" stackId="a" fill="#f59e0b" name="61-90 days" />
                <Bar dataKey="90+" stackId="a" fill="#ef4444" name="90+ days" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded" />
                <span className="text-xs text-slate-600">0-30 days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-xs text-slate-600">31-60 days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded" />
                <span className="text-xs text-slate-600">61-90 days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span className="text-xs text-slate-600">90+ days</span>
              </div>
            </div>
          </div>

          {/* Average Transfer Time Trend */}
          <div className="card">
            <div className="mb-6">
              <h3 className="font-semibold text-slate-800">Average Transfer Time</h3>
              <p className="text-sm text-slate-500">Days trend vs target (45 days)</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[30, 60]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="linear"
                  dataKey="avg"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#3b82f6' }}
                  name="Avg Days"
                >
                  <LabelList dataKey="avg" position="top" fontSize={11} fill="#3b82f6" fontWeight={600} />
                </Line>
                <Line
                  type="linear"
                  dataKey="target"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Target"
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-blue-500" />
                <span className="text-sm text-slate-600">Avg Days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-red-500" style={{ borderStyle: 'dashed' }} />
                <span className="text-sm text-slate-600">Target (45 days)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Delayed Transfers Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-800">
                Delayed Transfers (90+ days)
              </h3>
              <p className="text-sm text-slate-500">
                Transfers requiring immediate attention
              </p>
            </div>
            <button className="btn-secondary text-sm">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    ID
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    Unit
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    Project
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    Days
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    Value (M)
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody>
                {delayedTransfers.map((transfer) => (
                  <tr
                    key={transfer.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-slate-800">
                      {transfer.id}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {transfer.unit}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {transfer.project}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        {transfer.days} days
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-800">
                      ฿ {transfer.value}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-500">
                      {transfer.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
