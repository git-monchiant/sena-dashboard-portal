import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Calendar, TrendingDown, RefreshCw } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { PageHeader } from '@shared/ui';
import { responsibilityConfig, priorityConfig } from '../types';
import { fetchAgingData, AgingData } from './queries';

export function SLAPage() {
  const [data, setData] = useState<AgingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const result = await fetchAgingData();
      setData(result);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="Aging Report"
          subtitle="ติดตามอายุงานค้างและเร่งการปิดงาน"
        />
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Aging Report"
        subtitle="ติดตามอายุงานค้างและเร่งการปิดงาน"
      />

      <div className="p-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">งานเปิดอยู่</p>
                <p className="text-xl font-bold text-slate-800">{data.summary.totalOpenJobs}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">&lt; 7 วัน</p>
                <p className="text-xl font-bold text-green-600">{data.summary.jobsUnder7Days}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">7-14 วัน</p>
                <p className="text-xl font-bold text-amber-600">{data.summary.jobs7to14Days}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">&gt; 14 วัน (ต้องเร่ง)</p>
                <p className="text-xl font-bold text-red-600">{data.summary.jobsOver14Days}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">อายุเฉลี่ย</p>
                <p className="text-xl font-bold text-purple-600">{data.summary.avgDaysOpen} วัน</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Aging Distribution */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-4">การกระจายอายุงาน</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.agingBrackets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="bracket" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => [
                    `${value} งาน`,
                    'จำนวน',
                  ]}
                />
                <Bar dataKey="count" name="จำนวนงาน" radius={[4, 4, 0, 0]}>
                  {data.agingBrackets.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Aging Trend */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-4">แนวโน้มอายุงานเฉลี่ยรายเดือน</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.agingTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number, name: string) => [
                  name === 'avgDaysOpen' ? `${value} วัน` : `${value} งาน`,
                  name === 'avgDaysOpen' ? 'อายุเฉลี่ย' : 'งานค้าง'
                ]} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avgDaysOpen"
                  name="อายุเฉลี่ย (วัน)"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Aging by Priority & Responsibility */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Aging by Priority */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-4">อายุงานตามความเร่งด่วน</h3>
            <div className="space-y-4">
              {data.agingByPriority.map((item) => {
                const config = priorityConfig[item.priority];
                const barWidth = (item.avgDaysOpen / 15) * 100; // 15 days as max reference
                return (
                  <div key={item.priority} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">{config.label}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-500">{item.totalJobs} งาน</span>
                        <span className={`font-semibold ${
                          item.avgDaysOpen <= 5 ? 'text-green-600' :
                          item.avgDaysOpen <= 10 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          เฉลี่ย {item.avgDaysOpen} วัน
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.avgDaysOpen <= 5 ? 'bg-green-500' :
                          item.avgDaysOpen <= 10 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(barWidth, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Aging by Responsibility */}
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-4">อายุงานตามกลุ่มผู้รับผิดชอบ</h3>
            <div className="space-y-4">
              {data.agingByResponsibility.map((item) => {
                const config = responsibilityConfig[item.type];
                return (
                  <div key={item.type} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700">
                        {config.icon} {config.shortLabel}
                      </span>
                      <span className={`text-sm font-semibold ${
                        item.avgDaysOpen <= 5 ? 'text-green-600' :
                        item.avgDaysOpen <= 10 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        เฉลี่ย {item.avgDaysOpen} วัน
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white rounded p-2">
                        <p className="text-lg font-bold text-green-600">{item.jobsUnder7Days}</p>
                        <p className="text-xs text-slate-500">&lt; 7 วัน</p>
                      </div>
                      <div className="bg-white rounded p-2">
                        <p className="text-lg font-bold text-amber-600">{item.jobs7to14Days}</p>
                        <p className="text-xs text-slate-500">7-14 วัน</p>
                      </div>
                      <div className="bg-white rounded p-2">
                        <p className="text-lg font-bold text-red-600">{item.jobsOver14Days}</p>
                        <p className="text-xs text-slate-500">&gt; 14 วัน</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Long Pending Jobs Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">งานค้างนาน (ต้องเร่งปิด)</h3>
            <span className="text-sm text-red-600 font-medium">
              {data.longPendingJobs.length} รายการ
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">เลขที่งาน</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">โครงการ / ยูนิต</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">ประเภท</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">ผู้รับผิดชอบ</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">สถานะ</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">เปิดมา</th>
                </tr>
              </thead>
              <tbody>
                {data.longPendingJobs.map((job) => {
                  const prioConfig = priorityConfig[job.priority];
                  const respConfig = responsibilityConfig[job.responsibilityType];
                  return (
                    <tr key={job.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-primary-600">{job.requestNumber}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-slate-800">{job.projectName}</p>
                        <p className="text-xs text-slate-500">{job.unitNumber}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-slate-600">{job.category}</p>
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          job.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                          job.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                          job.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {prioConfig.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-slate-800">{job.assignee}</p>
                        <p className="text-xs text-slate-500">{respConfig.shortLabel}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-slate-600">{job.status}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`text-sm font-medium ${
                          job.daysOpen > 21 ? 'text-red-600' :
                          job.daysOpen > 14 ? 'text-orange-600' : 'text-amber-600'
                        }`}>
                          {job.daysOpen} วัน
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
