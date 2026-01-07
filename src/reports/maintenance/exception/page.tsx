import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, XCircle, Clock, UserX, ArrowUpCircle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { PageHeader } from '@shared/ui';
import { responsibilityConfig, priorityConfig, statusConfig } from '../types';
import { fetchExceptionData, ExceptionData, ExceptionJob } from './queries';

type ExceptionType = 'all' | 'repeat' | 'cancelled' | 'long_pending' | 'escalated' | 'no_assignee';

const exceptionTypeConfig: Record<ExceptionType, { label: string; icon: React.ElementType; color: string }> = {
  all: { label: 'ทั้งหมด', icon: AlertTriangle, color: 'slate' },
  repeat: { label: 'งานซ้ำ', icon: RefreshCw, color: 'orange' },
  cancelled: { label: 'ยกเลิก', icon: XCircle, color: 'red' },
  long_pending: { label: 'ค้างนาน', icon: Clock, color: 'amber' },
  escalated: { label: 'Escalated', icon: ArrowUpCircle, color: 'purple' },
  no_assignee: { label: 'ไม่มีผู้รับผิดชอบ', icon: UserX, color: 'blue' },
};

export function ExceptionPage() {
  const [data, setData] = useState<ExceptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<ExceptionType>('all');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const result = await fetchExceptionData();
      setData(result);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="งานผิดปกติ (Exception)"
          subtitle="ติดตามงานที่ต้องให้ความสนใจเป็นพิเศษ"
        />
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        </div>
      </div>
    );
  }

  const filteredJobs = selectedType === 'all'
    ? data.jobs
    : data.jobs.filter(job => job.exceptionType === selectedType);

  const pieData = [
    { name: 'งานซ้ำ', value: data.summary.repeatJobs, color: '#f97316' },
    { name: 'ยกเลิก', value: data.summary.cancelledJobs, color: '#ef4444' },
    { name: 'ค้างนาน', value: data.summary.longPendingJobs, color: '#eab308' },
    { name: 'Escalated', value: data.summary.escalatedJobs, color: '#8b5cf6' },
    { name: 'ไม่มีผู้รับผิดชอบ', value: data.summary.noAssigneeJobs, color: '#3b82f6' },
  ];

  return (
    <div className="min-h-screen">
      <PageHeader
        title="งานผิดปกติ (Exception)"
        subtitle="ติดตามงานที่ต้องให้ความสนใจเป็นพิเศษ"
      />

      <div className="p-8 space-y-6">
        {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <SummaryCard
          icon={AlertTriangle}
          label="Exception ทั้งหมด"
          value={data.summary.totalExceptions}
          color="slate"
          onClick={() => setSelectedType('all')}
          isActive={selectedType === 'all'}
        />
        <SummaryCard
          icon={RefreshCw}
          label="งานซ้ำ"
          value={data.summary.repeatJobs}
          color="orange"
          onClick={() => setSelectedType('repeat')}
          isActive={selectedType === 'repeat'}
        />
        <SummaryCard
          icon={XCircle}
          label="ยกเลิก"
          value={data.summary.cancelledJobs}
          color="red"
          onClick={() => setSelectedType('cancelled')}
          isActive={selectedType === 'cancelled'}
        />
        <SummaryCard
          icon={Clock}
          label="ค้างนาน"
          value={data.summary.longPendingJobs}
          color="amber"
          onClick={() => setSelectedType('long_pending')}
          isActive={selectedType === 'long_pending'}
        />
        <SummaryCard
          icon={ArrowUpCircle}
          label="Escalated"
          value={data.summary.escalatedJobs}
          color="purple"
          onClick={() => setSelectedType('escalated')}
          isActive={selectedType === 'escalated'}
        />
        <SummaryCard
          icon={UserX}
          label="ไม่มีผู้รับผิดชอบ"
          value={data.summary.noAssigneeJobs}
          color="blue"
          onClick={() => setSelectedType('no_assignee')}
          isActive={selectedType === 'no_assignee'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4">แนวโน้ม Exception รายเดือน</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="repeat" name="งานซ้ำ" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cancelled" name="ยกเลิก" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="longPending" name="ค้างนาน" fill="#eab308" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribution Pie Chart */}
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4">สัดส่วน Exception</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} งาน`, 'จำนวน']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* By Project & By Responsibility */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4">Exception ตามโครงการ</h3>
          <div className="space-y-3">
            {data.byProject.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-700">{item.project}</span>
                    <span className="text-sm font-medium text-slate-600">{item.exceptions}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${(item.exceptions / data.byProject[0].exceptions) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4">Exception ตามกลุ่มความรับผิดชอบ</h3>
          <div className="space-y-3">
            {data.byResponsibility.map((item) => {
              const config = responsibilityConfig[item.type];
              return (
                <div key={item.type} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-slate-700">
                        {config.icon} {config.shortLabel}
                      </span>
                      <span className="text-sm font-medium text-slate-600">
                        {item.exceptions} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Exception Jobs Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">
            รายการ Exception {selectedType !== 'all' && `- ${exceptionTypeConfig[selectedType].label}`}
          </h3>
          <span className="text-sm text-slate-500">{filteredJobs.length} รายการ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">ประเภท</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">เลขที่งาน</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">โครงการ / ยูนิต</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">รายละเอียด</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">ผู้รับผิดชอบ</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">สถานะ</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">เปิดมา</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
                <ExceptionJobRow key={job.id} job={job} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
  onClick,
  isActive,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: 'slate' | 'orange' | 'red' | 'amber' | 'purple' | 'blue';
  onClick: () => void;
  isActive: boolean;
}) {
  const colorClasses = {
    slate: { bg: 'bg-slate-50', text: 'text-slate-600', activeBorder: 'border-slate-500' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', activeBorder: 'border-orange-500' },
    red: { bg: 'bg-red-50', text: 'text-red-600', activeBorder: 'border-red-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', activeBorder: 'border-amber-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', activeBorder: 'border-purple-500' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', activeBorder: 'border-blue-500' },
  };

  const colors = colorClasses[color];

  return (
    <button
      onClick={onClick}
      className={`card text-left transition-all ${
        isActive ? `ring-2 ring-offset-1 ${colors.activeBorder.replace('border', 'ring')}` : ''
      } hover:shadow-md`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors.bg} ${colors.text}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className={`text-lg font-bold ${colors.text}`}>{value.toLocaleString()}</p>
        </div>
      </div>
    </button>
  );
}

function ExceptionJobRow({ job }: { job: ExceptionJob }) {
  const typeConfig = exceptionTypeConfig[job.exceptionType];
  const prioConfig = priorityConfig[job.priority];
  const statConfig = statusConfig[job.status];
  const respConfig = responsibilityConfig[job.responsibilityType];
  const TypeIcon = typeConfig.icon;

  const typeColorClasses: Record<string, string> = {
    orange: 'bg-orange-100 text-orange-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
    purple: 'bg-purple-100 text-purple-700',
    blue: 'bg-blue-100 text-blue-700',
  };

  const statusColorClasses: Record<string, string> = {
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-amber-100 text-amber-700',
    success: 'bg-green-100 text-green-700',
    danger: 'bg-red-100 text-red-700',
    default: 'bg-slate-100 text-slate-700',
  };

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="py-3 px-4">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${typeColorClasses[typeConfig.color]}`}>
          <TypeIcon className="w-3 h-3" />
          {typeConfig.label}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm font-medium text-primary-600">{job.requestNumber}</span>
      </td>
      <td className="py-3 px-4">
        <p className="text-sm text-slate-800">{job.projectName}</p>
        <p className="text-xs text-slate-500">{job.unitNumber}</p>
      </td>
      <td className="py-3 px-4">
        <p className="text-sm text-slate-800">{job.description}</p>
        <p className="text-xs text-red-500">{job.exceptionReason}</p>
      </td>
      <td className="py-3 px-4">
        <p className="text-sm text-slate-800">{job.assignee}</p>
        <p className="text-xs text-slate-500">{respConfig.shortLabel}</p>
      </td>
      <td className="py-3 px-4">
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColorClasses[statConfig.variant]}`}>
          {statConfig.label}
        </span>
      </td>
      <td className="py-3 px-4 text-right">
        {job.daysOpen > 0 ? (
          <span className={`text-sm font-medium ${job.daysOpen > 14 ? 'text-red-600' : 'text-slate-600'}`}>
            {job.daysOpen} วัน
          </span>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )}
      </td>
    </tr>
  );
}
