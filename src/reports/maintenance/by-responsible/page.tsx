import { useState, useEffect } from 'react';
import {
  Clock,
  AlertTriangle,
  RefreshCw,
  HardHat,
  Home,
  Hammer,
  CheckCircle,
  ArrowRight,
  Target,
  TrendingUp,
  Calendar,
  Timer,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { PageHeader } from '@shared/ui';
import { responsibilityConfig, ResponsibilityType } from '../types';
import { fetchByResponsibleData, ByResponsibleData, ResponsibilityDetailStats } from './queries';
import { useNavigate } from 'react-router-dom';

const groupConfig: Record<
  ResponsibilityType,
  { icon: React.ElementType; color: string; bgColor: string; borderColor: string; chartColor: string }
> = {
  SENA_WARRANTY: {
    icon: Home,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    chartColor: '#8b5cf6',
  },
  OUTSOURCE: {
    icon: HardHat,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    chartColor: '#3b82f6',
  },
  JURISTIC_TECHNICIAN: {
    icon: Hammer,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    chartColor: '#f97316',
  },
};

export function ByResponsiblePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ByResponsibleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const result = await fetchByResponsibleData();
      setData(result);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="กลุ่มความรับผิดชอบ"
          subtitle="ติดตามและเร่งประสิทธิภาพการปิดงาน"
        />
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        </div>
      </div>
    );
  }

  // Summary totals - SENA first
  const totalOpen = data.senaWarranty.stats.openJobs + data.outsource.stats.openJobs + data.juristicTechnician.stats.openJobs;
  const totalOver14Days = data.senaWarranty.stats.jobsOver14Days + data.outsource.stats.jobsOver14Days + data.juristicTechnician.stats.jobsOver14Days;
  const totalCompleted = data.senaWarranty.stats.completedJobs + data.outsource.stats.completedJobs + data.juristicTechnician.stats.completedJobs;
  const totalJobs = data.senaWarranty.stats.totalJobs + data.outsource.stats.totalJobs + data.juristicTechnician.stats.totalJobs;

  // Prepare data for each group - SENA FIRST (focus area)
  const groupsData = [
    {
      type: 'SENA_WARRANTY' as ResponsibilityType,
      stats: data.senaWarranty.stats,
      linkTo: null,
      isFocus: true,
    },
    {
      type: 'OUTSOURCE' as ResponsibilityType,
      stats: data.outsource.stats,
      linkTo: '/maintenance/contractor',
      isFocus: false,
    },
    {
      type: 'JURISTIC_TECHNICIAN' as ResponsibilityType,
      stats: data.juristicTechnician.stats,
      linkTo: null,
      isFocus: false,
    },
  ];

  // Monthly completion trend (combined)
  const completionTrend = data.senaWarranty.stats.monthlyTrend.map((item, index) => ({
    month: item.month,
    total: item.total + (data.outsource.stats.monthlyTrend[index]?.total || 0) + (data.juristicTechnician.stats.monthlyTrend[index]?.total || 0),
    completed: item.completed + (data.outsource.stats.monthlyTrend[index]?.completed || 0) + (data.juristicTechnician.stats.monthlyTrend[index]?.completed || 0),
  }));

  return (
    <div className="min-h-screen">
      <PageHeader
        title="กลุ่มความรับผิดชอบ"
        subtitle="ติดตามและเร่งประสิทธิภาพการปิดงาน"
      />

      <div className="p-8 space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">งานเปิดอยู่ทั้งหมด</p>
                <p className="text-2xl font-bold text-amber-600">{totalOpen}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">ค้าง &gt; 14 วัน (ต้องเร่ง)</p>
                <p className="text-2xl font-bold text-red-600">{totalOver14Days}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">เสร็จสิ้นแล้ว</p>
                <p className="text-2xl font-bold text-green-600">{totalCompleted}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Completion Rate</p>
                <p className="text-2xl font-bold text-blue-600">{((totalCompleted / totalJobs) * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Groups Cards - SENA First with emphasis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {groupsData.map(({ type, stats, linkTo, isFocus }) => (
            <TrackingCard
              key={type}
              type={type}
              stats={stats}
              onViewDetails={linkTo ? () => navigate(linkTo) : undefined}
              isFocus={isFocus}
            />
          ))}
        </div>

        {/* Completion Trend Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-600" />
                แนวโน้มการปิดงาน
              </h3>
              <p className="text-sm text-slate-500">ติดตามความก้าวหน้าในการปิดงานรายเดือน</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={completionTrend}>
              <defs>
                <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="total"
                name="งานทั้งหมด"
                stroke="#94a3b8"
                strokeWidth={2}
                fill="url(#totalGradient)"
              />
              <Area
                type="monotone"
                dataKey="completed"
                name="ปิดงานแล้ว"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#completedGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/maintenance/aging')}
            className="card hover:shadow-lg transition-shadow flex items-center justify-between group border-l-4 border-amber-500"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-800">Aging Report</p>
                <p className="text-sm text-slate-500">ดูงานค้างตามอายุ</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition-colors" />
          </button>
          <button
            onClick={() => navigate('/maintenance/exception')}
            className="card hover:shadow-lg transition-shadow flex items-center justify-between group border-l-4 border-red-500"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-800">งานผิดปกติ</p>
                <p className="text-sm text-slate-500">งานซ้ำ, ยกเลิก, ค้างนาน</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-red-600 transition-colors" />
          </button>
          <button
            onClick={() => navigate('/maintenance/contractor')}
            className="card hover:shadow-lg transition-shadow flex items-center justify-between group border-l-4 border-blue-500"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <HardHat className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-800">จัดการผู้รับเหมา</p>
                <p className="text-sm text-slate-500">ติดตามงานผู้รับเหมา</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Redesigned card for tracking - cleaner and more actionable
function TrackingCard({
  type,
  stats,
  onViewDetails,
  isFocus,
}: {
  type: ResponsibilityType;
  stats: ResponsibilityDetailStats;
  onViewDetails?: () => void;
  isFocus?: boolean;
}) {
  const config = responsibilityConfig[type];
  const visual = groupConfig[type];
  const Icon = visual.icon;

  // Status indicators
  const hasUrgent = stats.jobsOver14Days > 10;
  const completionGood = stats.completionRate >= 80;
  const resolutionFast = stats.avgResolutionDays <= 5;

  return (
    <div className={`card ${isFocus ? 'ring-2 ring-purple-400 shadow-lg' : ''}`}>
      {/* Header with Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${visual.bgColor}`}>
            <Icon className={`w-6 h-6 ${visual.color}`} />
          </div>
          <div>
            <h3 className={`text-lg font-bold ${visual.color}`}>{config.shortLabel}</h3>
            <p className="text-xs text-slate-500">{config.label}</p>
          </div>
        </div>
        {isFocus && (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            เร่งด่วน
          </span>
        )}
      </div>

      {/* Main Stats - Big Numbers */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-3xl font-bold text-slate-800">{stats.openJobs}</p>
          <p className="text-xs text-slate-500 mt-1">งานเปิดอยู่</p>
        </div>
        <div className={`rounded-xl p-3 text-center ${hasUrgent ? 'bg-red-50' : 'bg-green-50'}`}>
          <p className={`text-3xl font-bold ${hasUrgent ? 'text-red-600' : 'text-green-600'}`}>
            {stats.jobsOver14Days}
          </p>
          <p className="text-xs text-slate-500 mt-1">ค้าง &gt; 14 วัน</p>
        </div>
      </div>

      {/* Aging Breakdown - Visual Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">อายุงานค้าง</span>
          <span className="text-xs text-slate-500">{stats.openJobs} งาน</span>
        </div>
        <div className="flex gap-1 h-6 rounded-lg overflow-hidden">
          <div
            className="bg-green-500 flex items-center justify-center"
            style={{ width: `${(stats.jobsUnder7Days / stats.openJobs) * 100}%` }}
          >
            {stats.jobsUnder7Days > 0 && (
              <span className="text-xs font-bold text-white">{stats.jobsUnder7Days}</span>
            )}
          </div>
          <div
            className="bg-amber-500 flex items-center justify-center"
            style={{ width: `${(stats.jobs7to14Days / stats.openJobs) * 100}%` }}
          >
            {stats.jobs7to14Days > 0 && (
              <span className="text-xs font-bold text-white">{stats.jobs7to14Days}</span>
            )}
          </div>
          <div
            className="bg-red-500 flex items-center justify-center"
            style={{ width: `${(stats.jobsOver14Days / stats.openJobs) * 100}%` }}
          >
            {stats.jobsOver14Days > 0 && (
              <span className="text-xs font-bold text-white">{stats.jobsOver14Days}</span>
            )}
          </div>
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            &lt; 7 วัน
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            7-14 วัน
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            &gt; 14 วัน
          </span>
        </div>
      </div>

      {/* Performance Metrics - Clean Row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-center gap-1">
            <Timer className={`w-3.5 h-3.5 ${resolutionFast ? 'text-green-500' : 'text-amber-500'}`} />
            <span className={`text-sm font-bold ${resolutionFast ? 'text-green-600' : 'text-amber-600'}`}>
              {stats.avgResolutionDays}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">วันเฉลี่ย</p>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-center gap-1">
            <Target className={`w-3.5 h-3.5 ${completionGood ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-sm font-bold ${completionGood ? 'text-green-600' : 'text-red-600'}`}>
              {stats.completionRate}%
            </span>
          </div>
          <p className="text-[10px] text-slate-500">Completion</p>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-sm font-bold text-blue-600">{stats.completedJobs}</span>
          </div>
          <p className="text-[10px] text-slate-500">เสร็จแล้ว</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-600">ความคืบหน้า</span>
          <span className="font-medium text-slate-700">{stats.completedJobs}/{stats.totalJobs}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              completionGood ? 'bg-green-500' : 'bg-amber-500'
            }`}
            style={{ width: `${(stats.completedJobs / stats.totalJobs) * 100}%` }}
          />
        </div>
      </div>

      {/* Action */}
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 ${visual.bgColor} ${visual.color} hover:opacity-80`}
        >
          ดูรายละเอียด
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
