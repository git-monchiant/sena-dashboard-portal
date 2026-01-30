import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import {
  ArrowLeft, Database, AlertTriangle, CheckCircle, Calendar, FileWarning,
} from 'lucide-react';
import { fetchDataQuality, DataQualityData } from './queries';

export function DataQualityPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DataQualityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDataQuality()
      .then(setData)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-red-600">ไม่สามารถโหลดข้อมูลได้</div>;
  }

  const anomaliesWithIssues = data.anomalies.filter(a => a.count > 0);
  const totalAnomalies = anomaliesWithIssues.reduce((s, a) => s + a.count, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/quality')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">คุณภาพข้อมูล</h1>
          <p className="text-sm text-slate-500">วิเคราะห์ความสมบูรณ์ของข้อมูลในตาราง trn_repair</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Database className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-sm text-slate-500">จำนวนระเบียน</p>
              <p className="text-2xl font-bold text-slate-800">{data.totalRecords.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><Calendar className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-slate-500">ช่วงข้อมูล (open_date)</p>
              <p className="text-lg font-bold text-slate-800">{data.dateRange.min || '-'}</p>
              <p className="text-xs text-slate-400">ถึง {data.dateRange.max || '-'}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${anomaliesWithIssues.length > 3 ? 'bg-red-100' : anomaliesWithIssues.length > 0 ? 'bg-amber-100' : 'bg-green-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${anomaliesWithIssues.length > 3 ? 'text-red-600' : anomaliesWithIssues.length > 0 ? 'text-amber-600' : 'text-green-600'}`} />
            </div>
            <div>
              <p className="text-sm text-slate-500">ข้อมูลผิดปกติ</p>
              <p className="text-2xl font-bold text-slate-800">{totalAnomalies.toLocaleString()}</p>
              <p className="text-xs text-slate-400">{anomaliesWithIssues.length} ประเภท</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><CheckCircle className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-sm text-slate-500">ค่าเฉลี่ยความสมบูรณ์</p>
              <p className="text-2xl font-bold text-slate-800">
                {(data.columnCompleteness.reduce((s, c) => s + c.fillRate, 0) / data.columnCompleteness.length).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Column Completeness Chart */}
      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-slate-500" />
          ความสมบูรณ์ของข้อมูลแต่ละคอลัมน์
        </h3>
        <ResponsiveContainer width="100%" height={data.columnCompleteness.length * 32 + 40}>
          <BarChart
            data={[...data.columnCompleteness].sort((a, b) => a.fillRate - b.fillRate)}
            layout="vertical"
            margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
            <YAxis
              dataKey="label"
              type="category"
              width={160}
              tick={{ fontSize: 11, fill: '#334155' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-sm">
                    <p className="font-medium text-slate-800 mb-1">{d.label} ({d.column})</p>
                    <p className="text-green-600">มีข้อมูล: {d.filled.toLocaleString()} ({d.fillRate}%)</p>
                    <p className="text-red-600">ว่าง/NULL: {d.nullCount.toLocaleString()} ({(100 - d.fillRate).toFixed(1)}%)</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="fillRate" name="Fill Rate %" radius={[0, 4, 4, 0]}>
              {[...data.columnCompleteness].sort((a, b) => a.fillRate - b.fillRate).map((entry, i) => (
                <Cell key={i} fill={entry.fillRate >= 95 ? '#22c55e' : entry.fillRate >= 80 ? '#f59e0b' : '#ef4444'} />
              ))}
              <LabelList
                dataKey="fillRate"
                position="right"
                fontSize={11}
                formatter={(v: number) => `${v}%`}
                fill="#64748b"
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Date Fields Analysis */}
      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-500" />
          วิเคราะห์ฟิลด์วันที่ - Timeline ผิดปกติ
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">ฟิลด์</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">ทั้งหมด</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">มีข้อมูล</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">NULL ทั้งหมด</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">NULL (กำลังดำเนินการ)</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Fill Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.dateFieldAnalysis.map((f, i) => {
                const fillRate = f.total > 0 ? ((f.filled / f.total) * 100).toFixed(1) : '0';
                return (
                  <tr key={f.field} className={i < data.dateFieldAnalysis.length - 1 ? 'border-b border-slate-100' : ''}>
                    <td className="py-3 px-4 text-sm font-medium text-slate-800">{f.label} <span className="text-slate-400">({f.field})</span></td>
                    <td className="py-3 px-4 text-center text-sm text-slate-600">{f.total.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center text-sm text-green-600 font-medium">{f.filled.toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-sm font-semibold ${f.nullCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {f.nullCount.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-sm font-semibold ${f.nullOpenJobs > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {f.nullOpenJobs.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${parseFloat(fillRate) >= 95 ? 'bg-green-500' : parseFloat(fillRate) >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${fillRate}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-600">{fillRate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Anomalies */}
      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileWarning className="w-5 h-5 text-slate-500" />
          ข้อมูลผิดปกติ (Anomalies)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.anomalies.map(a => (
            <div key={a.type} className={`p-4 rounded-lg border ${a.count > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-800">{a.label}</span>
                <span className={`text-lg font-bold ${a.count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {a.count.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-500">{a.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* NULL open_date by Project */}
      {data.nullOpenDateByProject.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            โครงการที่มี open_date เป็น NULL (Top 30)
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(300, data.nullOpenDateByProject.length * 26)}>
            <BarChart
              data={data.nullOpenDateByProject}
              layout="vertical"
              margin={{ top: 5, right: 80, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                dataKey="projectName"
                type="category"
                width={200}
                tick={({ x, y, payload }: any) => (
                  <foreignObject x={0} y={y - 10} width={x - 8} height={20}>
                    <div style={{ fontSize: 11, color: '#334155', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '20px' }}>
                      {payload.value?.replace(/^เสนา\s*/, '')}
                    </div>
                  </foreignObject>
                )}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-sm">
                      <p className="font-medium text-slate-800 mb-1">{d.projectName}</p>
                      <p>งานทั้งหมด: {d.totalJobs.toLocaleString()}</p>
                      <p className="text-red-600">NULL open_date: {d.nullOpenDate.toLocaleString()} ({d.nullRate}%)</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="nullOpenDate" name="NULL open_date" fill="#ef4444" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="nullOpenDate" position="right" fontSize={11} fill="#64748b" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
