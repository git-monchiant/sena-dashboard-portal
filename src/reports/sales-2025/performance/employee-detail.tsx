import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '@shared/ui';
import { ArrowLeft, Building, Calendar, Target, DollarSign } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from 'recharts';

const API_URL = 'http://localhost:3001';

interface QuarterPerformance {
  quarter: string;
  presale_target: number;
  presale_actual: number;
  presale_achieve_pct: number;
  revenue_target: number;
  revenue_actual: number;
  revenue_achieve_pct: number;
}

interface Project {
  projectCode: string;
  projectName: string;
  months: string[];
  performance: QuarterPerformance[];
}

interface EmployeeDetail {
  name: string;
  position: string;
  roleType: string;
  projects: Project[];
}

function formatNumber(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0.00';
  if (n >= 1000000) {
    return `${(n / 1000000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  }
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(num: number): string {
  return `฿${formatNumber(num)}`;
}

export function EmployeeDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<EmployeeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!name) return;
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/sales-2025/employee/${encodeURIComponent(name)}`);
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error('Failed to load employee data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [name]);

  if (isLoading || !data) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Loading..." subtitle="" />
        <div className="p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-48" />
            <div className="grid grid-cols-2 gap-6">
              <div className="h-64 bg-slate-200 rounded-xl" />
              <div className="h-64 bg-slate-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals
  const totals = data.projects.reduce((acc, proj) => {
    proj.performance.forEach(q => {
      acc.presaleTarget += Number(q.presale_target);
      acc.presaleActual += Number(q.presale_actual);
      acc.revenueTarget += Number(q.revenue_target);
      acc.revenueActual += Number(q.revenue_actual);
    });
    return acc;
  }, { presaleTarget: 0, presaleActual: 0, revenueTarget: 0, revenueActual: 0 });

  const presaleAchieve = totals.presaleTarget > 0 ? (totals.presaleActual / totals.presaleTarget) * 100 : 0;
  const revenueAchieve = totals.revenueTarget > 0 ? (totals.revenueActual / totals.revenueTarget) * 100 : 0;

  // Aggregate by quarter for chart
  const quarterMap: Record<string, { presaleTarget: number; presaleActual: number; revenueTarget: number; revenueActual: number }> = {};
  data.projects.forEach(proj => {
    proj.performance.forEach(q => {
      if (!quarterMap[q.quarter]) {
        quarterMap[q.quarter] = { presaleTarget: 0, presaleActual: 0, revenueTarget: 0, revenueActual: 0 };
      }
      quarterMap[q.quarter].presaleTarget += Number(q.presale_target);
      quarterMap[q.quarter].presaleActual += Number(q.presale_actual);
      quarterMap[q.quarter].revenueTarget += Number(q.revenue_target);
      quarterMap[q.quarter].revenueActual += Number(q.revenue_actual);
    });
  });

  const chartData = Object.entries(quarterMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([quarter, vals]) => ({
      quarter,
      'Presale Target': vals.presaleTarget,
      'Presale Actual': vals.presaleActual,
      'Revenue Target': vals.revenueTarget,
      'Revenue Actual': vals.revenueActual,
    }));

  return (
    <div className="min-h-screen">
      <PageHeader
        title={data.name}
        subtitle={`${data.position} (${data.roleType})`}
      />

      <div className="p-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/sales-2025/employees')}
          className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft size={20} />
          <span>กลับไปรายชื่อพนักงาน</span>
        </button>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Building className="text-purple-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{data.projects.length}</div>
                <div className="text-sm text-slate-500">Projects</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Target className="text-emerald-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{formatCurrency(totals.presaleActual)}</div>
                <div className="text-sm text-slate-500">Presale Actual ({presaleAchieve.toFixed(0)}%)</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="text-blue-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{formatCurrency(totals.revenueActual)}</div>
                <div className="text-sm text-slate-500">Revenue Actual ({revenueAchieve.toFixed(0)}%)</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Calendar className="text-orange-600" size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{chartData.length}</div>
                <div className="text-sm text-slate-500">Quarters</div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">Presale Performance</h3>
              <p className="text-sm text-slate-500">Target vs Actual by Quarter</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="quarter" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={formatNumber} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="Presale Target" fill="#94a3b8" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Presale Target" position="top" formatter={formatNumber} fontSize={11} fill="#64748b" />
                </Bar>
                <Bar dataKey="Presale Actual" fill="#10b981" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Presale Actual" position="top" formatter={formatNumber} fontSize={11} fill="#059669" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">Revenue Performance</h3>
              <p className="text-sm text-slate-500">Target vs Actual by Quarter</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="quarter" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={formatNumber} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="Revenue Target" fill="#94a3b8" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Revenue Target" position="top" formatter={formatNumber} fontSize={11} fill="#64748b" />
                </Bar>
                <Bar dataKey="Revenue Actual" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Revenue Actual" position="top" formatter={formatNumber} fontSize={11} fill="#2563eb" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Projects List */}
        <div className="card">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800">โครงการที่รับผิดชอบ</h3>
            <p className="text-sm text-slate-500">รายละเอียดโครงการและเดือนที่รับผิดชอบ</p>
          </div>
          <div className="space-y-4">
            {data.projects.map((proj, idx) => {
              const projTotals = proj.performance.reduce((acc, q) => {
                acc.presaleTarget += Number(q.presale_target);
                acc.presaleActual += Number(q.presale_actual);
                acc.revenueTarget += Number(q.revenue_target);
                acc.revenueActual += Number(q.revenue_actual);
                return acc;
              }, { presaleTarget: 0, presaleActual: 0, revenueTarget: 0, revenueActual: 0 });

              const projPresaleAchieve = projTotals.presaleTarget > 0
                ? (projTotals.presaleActual / projTotals.presaleTarget) * 100
                : 0;
              const projRevenueAchieve = projTotals.revenueTarget > 0
                ? (projTotals.revenueActual / projTotals.revenueTarget) * 100
                : 0;

              return (
                <div
                  key={idx}
                  className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/sales-2025/project/${proj.projectCode}`)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-medium text-blue-600 hover:underline">{proj.projectCode}</div>
                      <div className="text-sm text-slate-500">{proj.projectName}</div>
                    </div>
                    <div className="flex gap-2">
                      {proj.months.map(m => (
                        <span key={m} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-slate-500">Presale Target</div>
                      <div className="font-mono">{formatCurrency(projTotals.presaleTarget)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Presale Actual</div>
                      <div className="font-mono">
                        {formatCurrency(projTotals.presaleActual)}
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                          projPresaleAchieve >= 80 ? 'bg-emerald-100 text-emerald-700' :
                          projPresaleAchieve >= 50 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {projPresaleAchieve.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Revenue Target</div>
                      <div className="font-mono">{formatCurrency(projTotals.revenueTarget)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Revenue Actual</div>
                      <div className="font-mono">
                        {formatCurrency(projTotals.revenueActual)}
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                          projRevenueAchieve >= 80 ? 'bg-emerald-100 text-emerald-700' :
                          projRevenueAchieve >= 50 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {projRevenueAchieve.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
