import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, LeadFunnelCards } from '@shared/ui';
import { ArrowLeft, Building, Target, DollarSign, Users, TrendingUp, Zap } from 'lucide-react';
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
  mkt_expense: number;
  total_lead: number;
  quality_lead: number;
  walk: number;
  book: number;
  booking: number;
  livnex: number;
}

interface Project {
  projectCode: string;
  projectName: string;
  bud: string;
  months: string[];
  performance: QuarterPerformance[];
}

interface GrandTotals {
  presaleTarget: number;
  presaleActual: number;
  revenueTarget: number;
  revenueActual: number;
  mktExpense: number;
  totalLead: number;
  qualityLead: number;
  walk: number;
  book: number;
  booking: number;
  livnex: number;
}

interface KPIs {
  presaleAchievePct: number;
  revenueAchievePct: number;
  avgCPL: number;
  avgCPQL: number;
  leadToQLRatio: number;
  qlToWalkRatio: number;
  walkToBookRatio: number;
  mktPctBooking: number;
}

interface EmployeeDetail {
  name: string;
  position: string;
  roleType: string;
  department: string;
  projects: Project[];
  grandTotals: GrandTotals;
  kpis: KPIs;
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

  const { grandTotals, kpis } = data;

  // Aggregate by quarter for chart (including booking and livnex)
  const quarterMap: Record<string, {
    presaleTarget: number;
    presaleActual: number;
    revenueTarget: number;
    revenueActual: number;
    booking: number;
    livnex: number;
    mktExpense: number;
    totalLead: number;
    qualityLead: number;
    walk: number;
    book: number;
  }> = {};

  data.projects.forEach(proj => {
    proj.performance.forEach(q => {
      if (!quarterMap[q.quarter]) {
        quarterMap[q.quarter] = {
          presaleTarget: 0,
          presaleActual: 0,
          revenueTarget: 0,
          revenueActual: 0,
          booking: 0,
          livnex: 0,
          mktExpense: 0,
          totalLead: 0,
          qualityLead: 0,
          walk: 0,
          book: 0,
        };
      }
      quarterMap[q.quarter].presaleTarget += Number(q.presale_target) || 0;
      quarterMap[q.quarter].presaleActual += Number(q.presale_actual) || 0;
      quarterMap[q.quarter].revenueTarget += Number(q.revenue_target) || 0;
      quarterMap[q.quarter].revenueActual += Number(q.revenue_actual) || 0;
      quarterMap[q.quarter].booking += Number(q.booking) || 0;
      quarterMap[q.quarter].livnex += Number(q.livnex) || 0;
      quarterMap[q.quarter].mktExpense += Number(q.mkt_expense) || 0;
      quarterMap[q.quarter].totalLead += Number(q.total_lead) || 0;
      quarterMap[q.quarter].qualityLead += Number(q.quality_lead) || 0;
      quarterMap[q.quarter].walk += Number(q.walk) || 0;
      quarterMap[q.quarter].book += Number(q.book) || 0;
    });
  });

  // Prepare quarters data for funnel cards
  const funnelQuarters = Object.entries(quarterMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([quarter, vals]) => ({
      quarter,
      totalLead: vals.totalLead,
      qualityLead: vals.qualityLead,
      walk: vals.walk,
      book: vals.book,
    }));

  const chartData = Object.entries(quarterMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([quarter, vals]) => ({
      quarter,
      'Presale Target': vals.presaleTarget,
      'Presale Actual': vals.presaleActual,
      'Revenue Target': vals.revenueTarget,
      'Revenue Actual': vals.revenueActual,
      'Booking': vals.booking,
      'Livnex': vals.livnex,
    }));

  const getEmployeeTypeBadge = () => {
    if (data.department === 'Mkt') {
      return <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">MGR-Marketing</span>;
    }
    return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">MGR-Sale</span>;
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title={data.name}
        subtitle={`${data.position}`}
      />

      <div className="p-8">
        {/* Back button */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/sales-2025/employees')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft size={20} />
            <span>กลับไปรายชื่อพนักงาน</span>
          </button>
          {getEmployeeTypeBadge()}
        </div>

        {/* Sales KPI Cards */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Sales Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="card bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Building className="text-indigo-600" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-indigo-700">{data.projects.length}</div>
                  <div className="text-sm text-slate-500">Projects</div>
                </div>
              </div>
            </div>
            <div className="card bg-gradient-to-br from-purple-50 to-white border-purple-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="text-purple-600" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-700">{formatCurrency(grandTotals.booking)}</div>
                  <div className="text-sm text-slate-500">Booking</div>
                </div>
              </div>
            </div>
            <div className="card bg-gradient-to-br from-orange-50 to-white border-orange-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Zap className="text-orange-600" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-700">{formatCurrency(grandTotals.livnex)}</div>
                  <div className="text-sm text-slate-500">Livnex</div>
                </div>
              </div>
            </div>
            <div className="card bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <Target className="text-emerald-600" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-700">{formatCurrency(grandTotals.presaleActual)}</div>
                  <div className="text-sm text-slate-500">Presale ({kpis.presaleAchievePct.toFixed(0)}%)</div>
                </div>
              </div>
            </div>
            <div className="card bg-gradient-to-br from-blue-50 to-white border-blue-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <DollarSign className="text-blue-600" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-700">{formatCurrency(grandTotals.revenueActual)}</div>
                  <div className="text-sm text-slate-500">Revenue ({kpis.revenueAchievePct.toFixed(0)}%)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Marketing KPI Cards */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Marketing Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card bg-gradient-to-br from-orange-50 to-white border-orange-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <DollarSign className="text-orange-600" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-700">{formatCurrency(grandTotals.mktExpense)}</div>
                  <div className="text-sm text-slate-500">MKT Expense</div>
                </div>
              </div>
            </div>
            <div className="card bg-gradient-to-br from-purple-50 to-white border-purple-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="text-purple-600" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-700">{grandTotals.totalLead.toLocaleString()}</div>
                  <div className="text-sm text-slate-500">Total Lead (CPL: ฿{kpis.avgCPL.toFixed(0)})</div>
                </div>
              </div>
            </div>
            <div className="card bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <Target className="text-emerald-600" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-700">{grandTotals.qualityLead.toLocaleString()}</div>
                  <div className="text-sm text-slate-500">Quality Lead (CPQL: ฿{kpis.avgCPQL.toFixed(0)})</div>
                </div>
              </div>
            </div>
            <div className="card bg-gradient-to-br from-slate-50 to-white border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-100 rounded-lg">
                  <Users className="text-slate-600" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-700">
                    {grandTotals.totalLead > 0 ? ((grandTotals.qualityLead / grandTotals.totalLead) * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-sm text-slate-500">Quality Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lead Conversion Funnel - 5 Cards */}
        <LeadFunnelCards
          totals={{ lead: grandTotals.totalLead, ql: grandTotals.qualityLead, walk: grandTotals.walk, book: grandTotals.book }}
          quarters={funnelQuarters}
        />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">Sales Performance by Quarter</h3>
              <p className="text-sm text-slate-500">Presale, Revenue, Booking, Livnex</p>
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
                    fontSize: '11px',
                    padding: '8px 12px',
                  }}
                  labelStyle={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}
                  itemStyle={{ fontSize: '11px', padding: '2px 0' }}
                />
                <Legend
                  content={() => (
                    <div className="flex justify-center gap-4 pt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10b981' }} />
                        <span className="text-xs text-slate-600">Presale Actual</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
                        <span className="text-xs text-slate-600">Revenue Actual</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#8b5cf6' }} />
                        <span className="text-xs text-slate-600">Booking</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f97316' }} />
                        <span className="text-xs text-slate-600">Livnex</span>
                      </div>
                    </div>
                  )}
                />
                <Bar dataKey="Presale Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Revenue Actual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Booking" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Livnex" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">Target vs Actual</h3>
              <p className="text-sm text-slate-500">Presale & Revenue by Quarter</p>
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
                    fontSize: '11px',
                    padding: '8px 12px',
                  }}
                  labelStyle={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}
                  itemStyle={{ fontSize: '11px', padding: '2px 0' }}
                />
                <Legend
                  content={() => (
                    <div className="flex justify-center gap-4 pt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#94a3b8' }} />
                        <span className="text-xs text-slate-600">Presale Target</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10b981' }} />
                        <span className="text-xs text-slate-600">Presale Actual</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#94a3b8' }} />
                        <span className="text-xs text-slate-600">Revenue Target</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
                        <span className="text-xs text-slate-600">Revenue Actual</span>
                      </div>
                    </div>
                  )}
                />
                <Bar dataKey="Presale Target" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Presale Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Revenue Target" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Revenue Actual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Marketing Expense % Chart */}
        <div className="card mb-8">
          <h3 className="font-semibold text-slate-800 mb-4">MKT Expense % of Sales</h3>
          <div className="space-y-4">
            {[
              {
                name: 'Book + Livnex',
                value: grandTotals.booking + grandTotals.livnex,
                pct: (grandTotals.booking + grandTotals.livnex) > 0 ? (grandTotals.mktExpense / (grandTotals.booking + grandTotals.livnex)) * 100 : 0,
                color: 'bg-purple-500',
                bgColor: 'bg-purple-50',
              },
              {
                name: 'Presale',
                value: grandTotals.presaleActual,
                pct: grandTotals.presaleActual > 0 ? (grandTotals.mktExpense / grandTotals.presaleActual) * 100 : 0,
                color: 'bg-emerald-500',
                bgColor: 'bg-emerald-50',
              },
              {
                name: 'Transfer (Revenue)',
                value: grandTotals.revenueActual,
                pct: grandTotals.revenueActual > 0 ? (grandTotals.mktExpense / grandTotals.revenueActual) * 100 : 0,
                color: 'bg-blue-500',
                bgColor: 'bg-blue-50',
              },
            ].map((item, idx) => {
              const maxPct = Math.max(
                (grandTotals.booking + grandTotals.livnex) > 0 ? (grandTotals.mktExpense / (grandTotals.booking + grandTotals.livnex)) * 100 : 0,
                grandTotals.presaleActual > 0 ? (grandTotals.mktExpense / grandTotals.presaleActual) * 100 : 0,
                grandTotals.revenueActual > 0 ? (grandTotals.mktExpense / grandTotals.revenueActual) * 100 : 0
              );
              const barWidth = maxPct > 0 ? (item.pct / maxPct) * 100 : 0;
              return (
                <div key={idx} className={`p-3 rounded-lg ${item.bgColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">{item.name}</span>
                    <span className="text-sm font-bold text-slate-800">{item.pct.toFixed(2)}%</span>
                  </div>
                  <div className="relative h-6 bg-white/50 rounded-md overflow-hidden">
                    <div
                      className={`absolute left-0 top-0 h-full ${item.color} rounded-md transition-all`}
                      style={{ width: `${Math.max(barWidth, 3)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                    <span>MKT: {formatCurrency(grandTotals.mktExpense)}</span>
                    <span>{item.name}: {formatCurrency(item.value)}</span>
                  </div>
                </div>
              );
            })}
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
                acc.presaleTarget += Number(q.presale_target) || 0;
                acc.presaleActual += Number(q.presale_actual) || 0;
                acc.revenueTarget += Number(q.revenue_target) || 0;
                acc.revenueActual += Number(q.revenue_actual) || 0;
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
                      {proj.bud && <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-600">{proj.bud}</span>}
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
