import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, KPICard } from '@shared/ui';
import {
  ArrowLeft,
  Target,
  DollarSign,
  TrendingUp,
  Users,
  UserCheck,
} from 'lucide-react';
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

interface PerformanceRow {
  bud: string;
  opm: string;
  project_code: string;
  project_name: string;
  quarter: string;
  booking_actual: number;
  presale_target: number;
  presale_actual: number;
  presale_achieve_pct: number;
  revenue_target: number;
  revenue_actual: number;
  revenue_achieve_pct: number;
  mkt_expense_actual: number;
}

interface TeamMember {
  roleType: string;
  name: string;
  position: string;
  months: string[];
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

export function ProjectDetailPage() {
  const { projectCode } = useParams<{ projectCode: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PerformanceRow[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectCode) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [perfRes, teamRes] = await Promise.all([
          fetch(`${API_URL}/api/sales-2025/performance?project=${projectCode}`),
          fetch(`${API_URL}/api/sales-2025/team/${projectCode}`),
        ]);

        const perfData = await perfRes.json();
        const teamData = await teamRes.json();

        setData(perfData);
        setTeam(teamData);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [projectCode]);

  if (isLoading || data.length === 0) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="Loading..."
          subtitle="กำลังโหลดข้อมูลโครงการ"
        />
        <div className="p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-slate-200 rounded-xl" />
            <div className="grid grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const projectName = data[0]?.project_name || projectCode;
  const bud = data[0]?.bud || '';

  // Calculate totals
  const totalPresaleTarget = data.reduce((sum, r) => sum + Number(r.presale_target), 0);
  const totalPresaleActual = data.reduce((sum, r) => sum + Number(r.presale_actual), 0);
  const totalRevenueTarget = data.reduce((sum, r) => sum + Number(r.revenue_target), 0);
  const totalRevenueActual = data.reduce((sum, r) => sum + Number(r.revenue_actual), 0);
  const totalBooking = data.reduce((sum, r) => sum + Number(r.booking_actual), 0);
  const totalMktExpense = data.reduce((sum, r) => sum + Number(r.mkt_expense_actual), 0);

  const presaleAchieve = totalPresaleTarget > 0 ? (totalPresaleActual / totalPresaleTarget) * 100 : 0;
  const revenueAchieve = totalRevenueTarget > 0 ? (totalRevenueActual / totalRevenueTarget) * 100 : 0;

  // Chart data by quarter
  const chartData = data.map(d => ({
    quarter: d.quarter,
    'Presale Target': Number(d.presale_target),
    'Presale Actual': Number(d.presale_actual),
    'Revenue Target': Number(d.revenue_target),
    'Revenue Actual': Number(d.revenue_actual),
    'Booking': Number(d.booking_actual),
  }));

  // Split team by role
  const vpTeam = team.filter(t => t.roleType === 'VP');
  const mgrTeam = team.filter(t => t.roleType === 'MGR');

  return (
    <div className="min-h-screen">
      <PageHeader
        title={projectCode || ''}
        subtitle={projectName}
      />

      <div className="p-8">
        {/* Back Button & Info */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/sales-2025/performance')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>กลับหน้ารายงาน</span>
          </button>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-slate-100 rounded-lg text-sm font-medium text-slate-600">
              {bud}
            </span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Presale Actual (YTD)"
            value={formatCurrency(totalPresaleActual)}
            change={`${presaleAchieve.toFixed(1)}% of target`}
            changeType={presaleAchieve >= 80 ? 'positive' : 'negative'}
            target={{ percentage: Math.min(presaleAchieve, 100) }}
            icon={Target}
            color="emerald"
          />
          <KPICard
            title="Revenue Actual (YTD)"
            value={formatCurrency(totalRevenueActual)}
            change={`${revenueAchieve.toFixed(1)}% of target`}
            changeType={revenueAchieve >= 80 ? 'positive' : 'negative'}
            target={{ percentage: Math.min(revenueAchieve, 100) }}
            icon={DollarSign}
            color="blue"
          />
          <KPICard
            title="Total Booking (YTD)"
            value={formatCurrency(totalBooking)}
            change="ยอดจอง"
            changeType="positive"
            icon={TrendingUp}
            color="purple"
          />
          <KPICard
            title="Marketing Expense"
            value={formatCurrency(totalMktExpense)}
            change="ค่าใช้จ่าย MKT"
            changeType="positive"
            icon={Users}
            color="orange"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">Performance by Quarter</h3>
              <p className="text-sm text-slate-500">Presale & Revenue - Target vs Actual</p>
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
                <Bar dataKey="Presale Target" fill="#d1d5db" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Presale Target" position="top" formatter={formatNumber} fontSize={10} fill="#64748b" />
                </Bar>
                <Bar dataKey="Presale Actual" fill="#10b981" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Presale Actual" position="top" formatter={formatNumber} fontSize={10} fill="#059669" />
                </Bar>
                <Bar dataKey="Revenue Target" fill="#94a3b8" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Revenue Target" position="top" formatter={formatNumber} fontSize={10} fill="#64748b" />
                </Bar>
                <Bar dataKey="Revenue Actual" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Revenue Actual" position="top" formatter={formatNumber} fontSize={10} fill="#2563eb" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sales Team */}
          <div className="card">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">ทีมขาย</h3>
              <p className="text-sm text-slate-500">ผู้รับผิดชอบโครงการ</p>
            </div>

            {/* VP Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-slate-700">VP (หัวหน้า)</span>
              </div>
              {vpTeam.length === 0 ? (
                <p className="text-sm text-slate-400 ml-6">ไม่มีข้อมูล</p>
              ) : (
                <div className="space-y-2 ml-6">
                  {vpTeam.map((member, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <div className="font-medium text-slate-800">{member.name}</div>
                        <div className="text-xs text-slate-500">{member.position}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">เดือนที่รับผิดชอบ</div>
                        <div className="text-sm font-medium text-blue-600">
                          {member.months.join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MGR Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-slate-700">MGR (ผู้จัดการ)</span>
              </div>
              {mgrTeam.length === 0 ? (
                <p className="text-sm text-slate-400 ml-6">ไม่มีข้อมูล</p>
              ) : (
                <div className="space-y-2 ml-6">
                  {mgrTeam.map((member, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3 bg-emerald-50 rounded-lg">
                      <div>
                        <div className="font-medium text-slate-800">{member.name}</div>
                        <div className="text-xs text-slate-500">{member.position}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">เดือนที่รับผิดชอบ</div>
                        <div className="text-sm font-medium text-emerald-600">
                          {member.months.join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quarterly Detail Table */}
        <div className="card">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800">รายละเอียดรายไตรมาส</h3>
            <p className="text-sm text-slate-500">ข้อมูล Performance แยกตามไตรมาส</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Quarter</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Booking</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Presale Target</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Presale Actual</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Achieve %</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Revenue Target</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Revenue Actual</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Achieve %</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">MKT Expense</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-center">
                      <span className="px-3 py-1 bg-slate-100 rounded-lg text-sm font-medium">{row.quarter}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(row.booking_actual)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">{formatCurrency(row.presale_target)}</td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-emerald-600">{formatCurrency(row.presale_actual)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        row.presale_achieve_pct >= 0.8 ? 'bg-emerald-100 text-emerald-700' :
                        row.presale_achieve_pct >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {(row.presale_achieve_pct * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">{formatCurrency(row.revenue_target)}</td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-blue-600">{formatCurrency(row.revenue_actual)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        row.revenue_achieve_pct >= 0.8 ? 'bg-emerald-100 text-emerald-700' :
                        row.revenue_achieve_pct >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {(row.revenue_achieve_pct * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-orange-600">{formatCurrency(row.mkt_expense_actual)}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-slate-50 font-semibold">
                  <td className="py-3 px-4 text-center">Total</td>
                  <td className="py-3 px-4 text-right font-mono">{formatCurrency(totalBooking)}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-500">{formatCurrency(totalPresaleTarget)}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-600">{formatCurrency(totalPresaleActual)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      presaleAchieve >= 80 ? 'bg-emerald-100 text-emerald-700' :
                      presaleAchieve >= 50 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {presaleAchieve.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-500">{formatCurrency(totalRevenueTarget)}</td>
                  <td className="py-3 px-4 text-right font-mono text-blue-600">{formatCurrency(totalRevenueActual)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      revenueAchieve >= 80 ? 'bg-emerald-100 text-emerald-700' :
                      revenueAchieve >= 50 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {revenueAchieve.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-orange-600">{formatCurrency(totalMktExpense)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
