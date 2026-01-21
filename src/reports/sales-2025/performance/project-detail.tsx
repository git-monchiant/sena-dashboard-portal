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
  Megaphone,
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
  // Marketing fields
  total_lead: number;
  quality_lead: number;
  walk: number;
  book: number;
  lead_to_walk: number;
  walk_to_book: number;
  cpl: number;
  cpql: number;
  mkt_pct_booking: number;
  mkt_pct_presale_livnex: number;
  mkt_pct_revenue: number;
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

  // Marketing totals
  const totalLead = data.reduce((sum, r) => sum + Number(r.total_lead || 0), 0);
  const totalQualityLead = data.reduce((sum, r) => sum + Number(r.quality_lead || 0), 0);
  const totalWalk = data.reduce((sum, r) => sum + Number(r.walk || 0), 0);
  const totalBook = data.reduce((sum, r) => sum + Number(r.book || 0), 0);

  const presaleAchieve = totalPresaleTarget > 0 ? (totalPresaleActual / totalPresaleTarget) * 100 : 0;
  const revenueAchieve = totalRevenueTarget > 0 ? (totalRevenueActual / totalRevenueTarget) * 100 : 0;

  // Marketing metrics
  const avgCPL = totalLead > 0 ? totalMktExpense / totalLead : 0;
  const avgCPQL = totalQualityLead > 0 ? totalMktExpense / totalQualityLead : 0;
  const mktPctBooking = totalBooking > 0 ? (totalMktExpense / totalBooking) * 100 : 0;
  const mktPctPresale = totalPresaleActual > 0 ? (totalMktExpense / totalPresaleActual) * 100 : 0;
  const mktPctRevenue = totalRevenueActual > 0 ? (totalMktExpense / totalRevenueActual) * 100 : 0;
  const leadToWalkPct = totalQualityLead > 0 ? (totalWalk / totalQualityLead) * 100 : 0;
  const walkToBookPct = totalWalk > 0 ? (totalBook / totalWalk) * 100 : 0;

  // Chart data by quarter
  const chartData = data.map(d => ({
    quarter: d.quarter,
    'Presale Target': Number(d.presale_target),
    'Presale Actual': Number(d.presale_actual),
    'Revenue Target': Number(d.revenue_target),
    'Revenue Actual': Number(d.revenue_actual),
    'Booking': Number(d.booking_actual),
  }));

  // Lead Funnel chart data with ratios
  const leadFunnelData = data.map(d => {
    const totalLead = Number(d.total_lead || 0);
    const qualityLead = Number(d.quality_lead || 0);
    const walk = Number(d.walk || 0);
    const book = Number(d.book || 0);
    const leadToQLPct = totalLead > 0 ? ((qualityLead / totalLead) * 100).toFixed(1) : '0';
    const qlToWalkPct = qualityLead > 0 ? ((walk / qualityLead) * 100).toFixed(1) : '0';
    const walkToBookPct = walk > 0 ? ((book / walk) * 100).toFixed(1) : '0';
    const leadToQLRatio = qualityLead > 0 ? (totalLead / qualityLead).toFixed(1) : '-';
    const qlToWalkRatio = walk > 0 ? (qualityLead / walk).toFixed(1) : '-';
    const walkToBookRatio = book > 0 ? (walk / book).toFixed(1) : '-';
    return {
      quarter: d.quarter,
      'Total Lead': totalLead,
      'Quality Lead': qualityLead,
      'Walk': walk,
      'Book': book,
      'Lead to QL %': leadToQLPct,
      'QL to Walk %': qlToWalkPct,
      'Walk to Book %': walkToBookPct,
      'Lead to QL Ratio': leadToQLRatio,
      'QL to Walk Ratio': qlToWalkRatio,
      'Walk to Book Ratio': walkToBookRatio,
    };
  });

  // Split team by role
  const vpTeam = team.filter(t => t.roleType === 'VP');
  const mgrTeam = team.filter(t => t.roleType === 'MGR');
  const mktTeam = team.filter(t => t.roleType === 'MKT');

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
            title="Total Booking (YTD)"
            value={formatCurrency(totalBooking)}
            change="ยอดจอง"
            changeType="positive"
            icon={TrendingUp}
            color="purple"
          />
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
                <span className="text-sm font-semibold text-slate-700">BUD-Head (หัวหน้า)</span>
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
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-slate-700">MGR-Sale (ผู้จัดการขาย)</span>
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

            {/* MKT Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Megaphone className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-semibold text-slate-700">MGR-Marketing (ผู้จัดการการตลาด)</span>
              </div>
              {mktTeam.length === 0 ? (
                <p className="text-sm text-slate-400 ml-6">ไม่มีข้อมูล</p>
              ) : (
                <div className="space-y-2 ml-6">
                  {mktTeam.map((member, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3 bg-orange-50 rounded-lg">
                      <div>
                        <div className="font-medium text-slate-800">{member.name}</div>
                        <div className="text-xs text-slate-500">{member.position}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">เดือนที่รับผิดชอบ</div>
                        <div className="text-sm font-medium text-orange-600">
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

        {/* Marketing Performance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Lead Funnel Chart */}
          <div className="card">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Megaphone className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-slate-800">Lead Conversion Funnel</h3>
              </div>
              <p className="text-sm text-slate-500">Total Lead → Quality Lead → Walk → Book</p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={leadFunnelData} margin={{ top: 25, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="quarter" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload) return null;
                    const orderedKeys = ['Total Lead', 'Quality Lead', 'Walk', 'Book'];
                    const colors: Record<string, string> = {
                      'Total Lead': '#64748b',
                      'Quality Lead': '#8b5cf6',
                      'Walk': '#10b981',
                      'Book': '#3b82f6',
                    };
                    const data = payload[0]?.payload;
                    const leadToQLRatio = data?.['Lead to QL Ratio'] || '-';
                    const qlToWalkRatio = data?.['QL to Walk Ratio'] || '-';
                    const walkToBookRatio = data?.['Walk to Book Ratio'] || '-';
                    const leadToQLPct = data?.['Lead to QL %'] || '0';
                    const qlToWalkPct = data?.['QL to Walk %'] || '0';
                    const walkToBookPct = data?.['Walk to Book %'] || '0';
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-slate-700 mb-2">{label}</p>
                        {orderedKeys.map((key) => {
                          const item = payload.find((p) => p.dataKey === key);
                          if (!item) return null;
                          return (
                            <div key={key} className="flex items-center gap-2 text-sm">
                              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[key] }} />
                              <span className="text-slate-600">{key}:</span>
                              <span className="font-medium">{Number(item.value).toLocaleString()}</span>
                            </div>
                          );
                        })}
                        <hr className="my-2 border-slate-200" />
                        <div className="text-xs text-slate-500 space-y-1">
                          <div>Lead→QL: <span className="font-medium text-slate-700">{leadToQLRatio} : 1</span> ({leadToQLPct}%)</div>
                          <div>QL→Walk: <span className="font-medium text-slate-700">{qlToWalkRatio} : 1</span> ({qlToWalkPct}%)</div>
                          <div>Walk→Book: <span className="font-medium text-slate-700">{walkToBookRatio} : 1</span> ({walkToBookPct}%)</div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  content={() => (
                    <div className="flex justify-center gap-4 pt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#64748b' }} />
                        <span className="text-xs text-slate-600">Total Lead</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#8b5cf6' }} />
                        <span className="text-xs text-slate-600">Q.Lead</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10b981' }} />
                        <span className="text-xs text-slate-600">Walk</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
                        <span className="text-xs text-slate-600">Book</span>
                      </div>
                    </div>
                  )}
                />
                <Bar dataKey="Total Lead" fill="#64748b" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Total Lead" position="top" fontSize={10} fill="#475569" formatter={(v) => Number(v).toLocaleString()} />
                </Bar>
                <Bar dataKey="Quality Lead" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                  <LabelList
                    position="top"
                    fontSize={9}
                    fill="#7c3aed"
                    content={(props) => {
                      const { x, y, width, index } = props as { x?: number | string; y?: number | string; width?: number | string; index?: number };
                      const qlValue = typeof index === 'number' ? leadFunnelData[index]?.['Quality Lead'] : 0;
                      const ratio = typeof index === 'number' ? leadFunnelData[index]?.['Lead to QL Ratio'] : '-';
                      const pct = typeof index === 'number' ? leadFunnelData[index]?.['Lead to QL %'] : '0';
                      return (
                        <text x={Number(x || 0) + Number(width || 0) / 2} y={Number(y || 0) - 5} textAnchor="middle" fontSize={9} fill="#7c3aed">
                          {qlValue.toLocaleString()} ({ratio} : 1 / {pct}%)
                        </text>
                      );
                    }}
                  />
                </Bar>
                <Bar dataKey="Walk" fill="#10b981" radius={[4, 4, 0, 0]}>
                  <LabelList
                    position="top"
                    fontSize={9}
                    fill="#059669"
                    content={(props) => {
                      const { x, y, width, index } = props as { x?: number | string; y?: number | string; width?: number | string; index?: number };
                      const walkValue = typeof index === 'number' ? leadFunnelData[index]?.['Walk'] : 0;
                      const ratio = typeof index === 'number' ? leadFunnelData[index]?.['QL to Walk Ratio'] : '-';
                      const pct = typeof index === 'number' ? leadFunnelData[index]?.['QL to Walk %'] : '0';
                      return (
                        <text x={Number(x || 0) + Number(width || 0) / 2} y={Number(y || 0) - 5} textAnchor="middle" fontSize={9} fill="#059669">
                          {walkValue.toLocaleString()} ({ratio} : 1 / {pct}%)
                        </text>
                      );
                    }}
                  />
                </Bar>
                <Bar dataKey="Book" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  <LabelList
                    position="top"
                    fontSize={9}
                    fill="#2563eb"
                    content={(props) => {
                      const { x, y, width, index } = props as { x?: number | string; y?: number | string; width?: number | string; index?: number };
                      const bookValue = typeof index === 'number' ? leadFunnelData[index]?.['Book'] : 0;
                      const ratio = typeof index === 'number' ? leadFunnelData[index]?.['Walk to Book Ratio'] : '-';
                      const pct = typeof index === 'number' ? leadFunnelData[index]?.['Walk to Book %'] : '0';
                      return (
                        <text x={Number(x || 0) + Number(width || 0) / 2} y={Number(y || 0) - 5} textAnchor="middle" fontSize={9} fill="#2563eb">
                          {bookValue.toLocaleString()} ({ratio} : 1 / {pct}%)
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Marketing Metrics Card */}
          <div className="card">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Megaphone className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-slate-800">Marketing Metrics (YTD)</h3>
              </div>
              <p className="text-sm text-slate-500">CPL, CPQL และ MKT%</p>
            </div>

            <div className="space-y-4">
              {/* Lead Summary */}
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-sm font-medium text-slate-600 mb-3">Lead Funnel Summary</div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-xl font-bold text-slate-700">{totalLead.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Total Lead</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-purple-600">{totalQualityLead.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Q.Lead</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-emerald-600">{totalWalk.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Walk</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-blue-600">{totalBook.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">Book</div>
                  </div>
                </div>
                <div className="flex justify-center gap-6 mt-3 pt-3 border-t border-slate-200">
                  <div className="text-center">
                    <div className="text-sm font-semibold text-emerald-600">{leadToWalkPct.toFixed(1)}%</div>
                    <div className="text-xs text-slate-500">Q.L → Walk</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-blue-600">{walkToBookPct.toFixed(1)}%</div>
                    <div className="text-xs text-slate-500">Walk → Book</div>
                  </div>
                </div>
              </div>

              {/* CPL/CPQL */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-700">฿{avgCPL.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                  <div className="text-sm text-purple-600">CPL (Cost per Lead)</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-700">฿{avgCPQL.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                  <div className="text-sm text-orange-600">CPQL (Cost per Q.Lead)</div>
                </div>
              </div>

              {/* MKT % */}
              <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg">
                <div className="text-sm font-medium text-slate-600 mb-3">MKT % (ค่าใช้จ่าย MKT / ยอดขาย)</div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-lg font-bold text-purple-700">{mktPctBooking.toFixed(2)}%</div>
                    <div className="text-xs text-slate-500">vs Booking</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-700">{mktPctPresale.toFixed(2)}%</div>
                    <div className="text-xs text-slate-500">vs Presale</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-700">{mktPctRevenue.toFixed(2)}%</div>
                    <div className="text-xs text-slate-500">vs Revenue</div>
                  </div>
                </div>
              </div>
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
                  <th className="text-right py-3 px-4 font-semibold text-emerald-500">Presale Target</th>
                  <th className="text-right py-3 px-4 font-semibold text-emerald-700">Presale Actual</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Achieve %</th>
                  <th className="text-right py-3 px-4 font-semibold text-blue-500">Revenue Target</th>
                  <th className="text-right py-3 px-4 font-semibold text-blue-700">Revenue Actual</th>
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
                    <td className="py-3 px-4 text-right font-mono text-emerald-500">{formatCurrency(row.presale_target)}</td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-emerald-700">{formatCurrency(row.presale_actual)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        row.presale_achieve_pct >= 0.8 ? 'bg-emerald-100 text-emerald-700' :
                        row.presale_achieve_pct >= 0.6 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {(row.presale_achieve_pct * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-blue-500">{formatCurrency(row.revenue_target)}</td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-blue-700">{formatCurrency(row.revenue_actual)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        row.revenue_achieve_pct >= 0.8 ? 'bg-emerald-100 text-emerald-700' :
                        row.revenue_achieve_pct >= 0.6 ? 'bg-amber-100 text-amber-700' :
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
                  <td className="py-3 px-4 text-right font-mono text-emerald-500">{formatCurrency(totalPresaleTarget)}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-700">{formatCurrency(totalPresaleActual)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      presaleAchieve >= 80 ? 'bg-emerald-100 text-emerald-700' :
                      presaleAchieve >= 50 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {presaleAchieve.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-blue-500">{formatCurrency(totalRevenueTarget)}</td>
                  <td className="py-3 px-4 text-right font-mono text-blue-700">{formatCurrency(totalRevenueActual)}</td>
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
