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

const API_URL = ''; // Use Vite proxy

interface QuarterlyData {
  quarter: string;
  presaleTarget: number;
  presaleActual: number;
  booking: number;
  contract: number;
  revenueTarget: number;
  revenue: number;
  mktExpense: number;
  totalLead: number;
  qualityLead: number;
  walk: number;
  book: number;
  projectName?: string;
  bud?: string;
}

interface TeamMember {
  department: string;
  roleType: string;
  name: string;
  position: string;
  months: string[];
}

function formatNumber(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0.00M';
  return `${(n / 1000000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
}

function formatCurrency(num: number): string {
  return `฿${formatNumber(num)}`;
}

export function ProjectDetailPage() {
  const { projectCode } = useParams<{ projectCode: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<QuarterlyData[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectCode) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/sales-2025-v2/project/${projectCode}`);
        const projectData = await res.json();

        // Transform to quarterly data format for chart
        const quarterlyData = projectData.quarterlyData || [];
        setData(quarterlyData);
        setTeam(projectData.team || []);
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

  const projectName = data[0]?.projectName || projectCode;
  const bud = data[0]?.bud || '';

  // Calculate totals from quarterlyData (camelCase)
  const totalPresaleTarget = data.reduce((sum, r) => sum + Number(r.presaleTarget || 0), 0);
  const totalPresaleActual = data.reduce((sum, r) => sum + Number(r.presaleActual || 0), 0);
  const totalRevenueTarget = data.reduce((sum, r) => sum + Number(r.revenueTarget || 0), 0);
  const totalRevenueActual = data.reduce((sum, r) => sum + Number(r.revenue || 0), 0);
  const totalBooking = data.reduce((sum, r) => sum + Number(r.booking || 0), 0);
  const totalMktExpense = data.reduce((sum, r) => sum + Number(r.mktExpense || 0), 0);

  // Marketing totals
  const totalLead = data.reduce((sum, r) => sum + Number(r.totalLead || 0), 0);
  const totalQualityLead = data.reduce((sum, r) => sum + Number(r.qualityLead || 0), 0);
  const totalWalk = data.reduce((sum, r) => sum + Number(r.walk || 0), 0);
  const totalBook = data.reduce((sum, r) => sum + Number(r.book || 0), 0);

  const presaleAchieve = totalPresaleTarget > 0 ? (totalPresaleActual / totalPresaleTarget) * 100 : 0;
  const revenueAchieve = totalRevenueTarget > 0 ? (totalRevenueActual / totalRevenueTarget) * 100 : 0;

  // Marketing metrics
  const avgCPL = totalLead > 0 ? totalMktExpense / totalLead : 0;
  const avgCPQL = totalQualityLead > 0 ? totalMktExpense / totalQualityLead : 0;
  const avgCPB = totalBook > 0 ? totalMktExpense / totalBook : 0;
  const mktPctBooking = totalBooking > 0 ? (totalMktExpense / totalBooking) * 100 : 0;
  const mktPctPresale = totalPresaleActual > 0 ? (totalMktExpense / totalPresaleActual) * 100 : 0;
  const mktPctRevenue = totalRevenueActual > 0 ? (totalMktExpense / totalRevenueActual) * 100 : 0;
  const leadToWalkPct = totalQualityLead > 0 ? (totalWalk / totalQualityLead) * 100 : 0;
  const walkToBookPct = totalWalk > 0 ? (totalBook / totalWalk) * 100 : 0;

  // Chart data by quarter (camelCase from API)
  const chartData = data.map(d => ({
    quarter: d.quarter,
    'Presale Target': Number(d.presaleTarget || 0),
    'Presale Actual': Number(d.presaleActual || 0),
    'Revenue Target': Number(d.revenueTarget || 0),
    'Revenue Actual': Number(d.revenue || 0),
    'Booking': Number(d.booking || 0),
  }));

  // Lead Funnel chart data with ratios
  const leadFunnelData = data.map(d => {
    const totalLead = Number(d.totalLead || 0);
    const qualityLead = Number(d.qualityLead || 0);
    const walk = Number(d.walk || 0);
    const book = Number(d.book || 0);
    const leadToQLPct = totalLead > 0 ? ((qualityLead / totalLead) * 100).toFixed(1) : '0';
    const qlToWalkPct = qualityLead > 0 ? ((walk / qualityLead) * 100).toFixed(1) : '0';
    const walkToBookPctVal = walk > 0 ? ((book / walk) * 100).toFixed(1) : '0';
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
      'Walk to Book %': walkToBookPctVal,
      'Lead to QL Ratio': leadToQLRatio,
      'QL to Walk Ratio': qlToWalkRatio,
      'Walk to Book Ratio': walkToBookRatio,
    };
  });

  // Split team by department and role
  const vpTeam = team.filter(t => t.department === 'Sale' && t.roleType === 'VP');
  const mgrTeam = team.filter(t => t.department === 'Sale' && t.roleType === 'MGR');
  const mktTeam = team.filter(t => t.department === 'Mkt' && t.roleType === 'MGR');

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
                    fontSize: '11px',
                    padding: '8px 12px',
                  }}
                  labelStyle={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}
                  itemStyle={{ fontSize: '11px', padding: '2px 0' }}
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
              <BarChart data={leadFunnelData} margin={{ top: 35, right: 5, left: 5, bottom: 5 }}>
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

              {/* CPL/CPQL/CPB */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-700">฿{avgCPL.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                  <div className="text-sm text-purple-600">CPL (Cost per Lead)</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-700">฿{avgCPQL.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                  <div className="text-sm text-orange-600">CPQL (Cost per Q.Lead)</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-700">฿{avgCPB.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                  <div className="text-sm text-blue-600">CPB (Cost per Book)</div>
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
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-center py-2 px-3 font-semibold text-slate-600 w-20">Quarter</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 min-w-[160px]">Booking</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 min-w-[160px]">Contract</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 min-w-[160px]">Revenue</th>
                  <th className="text-right py-2 px-3 font-semibold text-orange-600">MKT Expense</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => {
                  const bookingPct = row.presaleTarget > 0 ? (row.booking / row.presaleTarget) * 100 : 0;
                  const contractPct = row.presaleTarget > 0 ? (row.contract / row.presaleTarget) * 100 : 0;
                  const revenuePct = row.revenueTarget > 0 ? (row.revenue / row.revenueTarget) * 100 : 0;
                  return (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 text-center">
                        <span className="px-3 py-1 bg-slate-100 rounded-lg text-sm font-medium">{row.quarter}</span>
                      </td>
                      {/* Booking */}
                      <td className="py-2 px-3">
                        <div className="space-y-1">
                          <div className="flex items-baseline justify-between">
                            <span className="text-sm font-semibold text-purple-700">{formatCurrency(row.booking)}</span>
                            <span className={`text-xs font-semibold ${
                              bookingPct >= 40 ? 'text-purple-600' :
                              bookingPct >= 20 ? 'text-yellow-600' :
                              'text-red-500'
                            }`}>
                              {bookingPct.toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`absolute h-full rounded-full ${
                                  bookingPct >= 40 ? 'bg-purple-500' :
                                  bookingPct >= 20 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(bookingPct, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Target: {formatCurrency(row.presaleTarget)}
                          </div>
                        </div>
                      </td>
                      {/* Contract */}
                      <td className="py-2 px-3">
                        <div className="space-y-1">
                          <div className="flex items-baseline justify-between">
                            <span className="text-sm font-semibold text-emerald-700">{formatCurrency(row.contract)}</span>
                            <span className={`text-xs font-semibold ${
                              contractPct >= 40 ? 'text-emerald-600' :
                              contractPct >= 20 ? 'text-yellow-600' :
                              'text-red-500'
                            }`}>
                              {contractPct.toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`absolute h-full rounded-full ${
                                  contractPct >= 40 ? 'bg-emerald-500' :
                                  contractPct >= 20 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(contractPct, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Target: {formatCurrency(row.presaleTarget)}
                          </div>
                        </div>
                      </td>
                      {/* Revenue */}
                      <td className="py-2 px-3">
                        <div className="space-y-1">
                          <div className="flex items-baseline justify-between">
                            <span className="text-sm font-semibold text-blue-700">{formatCurrency(row.revenue)}</span>
                            <span className={`text-xs font-semibold ${
                              revenuePct >= 80 ? 'text-blue-600' :
                              revenuePct >= 50 ? 'text-yellow-600' :
                              'text-red-500'
                            }`}>
                              {revenuePct.toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`absolute h-full rounded-full ${
                                  revenuePct >= 80 ? 'bg-blue-500' :
                                  revenuePct >= 50 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(revenuePct, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Target: {formatCurrency(row.revenueTarget)}
                          </div>
                        </div>
                      </td>
                      {/* MKT Expense */}
                      <td className="py-2 px-3">
                        <div className="space-y-1">
                          <div className="flex items-baseline justify-end">
                            <span className="text-sm font-semibold text-orange-700">{formatCurrency(row.mktExpense)}</span>
                          </div>
                          <div className="h-2" />
                          <div className="h-[10px]" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {/* Total Row */}
                {(() => {
                  const totalContract = data.reduce((sum, r) => sum + Number(r.contract || 0), 0);
                  const totalBookingPct = totalPresaleTarget > 0 ? (totalBooking / totalPresaleTarget) * 100 : 0;
                  const totalContractPct = totalPresaleTarget > 0 ? (totalContract / totalPresaleTarget) * 100 : 0;
                  const totalRevenuePct = totalRevenueTarget > 0 ? (totalRevenueActual / totalRevenueTarget) * 100 : 0;
                  return (
                    <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                      <td className="py-2 px-3 text-center">Total</td>
                      {/* Booking Total */}
                      <td className="py-2 px-3">
                        <div className="space-y-1">
                          <div className="flex items-baseline justify-between">
                            <span className="text-sm font-semibold text-purple-700">{formatCurrency(totalBooking)}</span>
                            <span className={`text-xs font-semibold ${
                              totalBookingPct >= 40 ? 'text-purple-600' :
                              totalBookingPct >= 20 ? 'text-yellow-600' :
                              'text-red-500'
                            }`}>
                              {totalBookingPct.toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`absolute h-full rounded-full ${
                                  totalBookingPct >= 40 ? 'bg-purple-500' :
                                  totalBookingPct >= 20 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(totalBookingPct, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Target: {formatCurrency(totalPresaleTarget)}
                          </div>
                        </div>
                      </td>
                      {/* Contract Total */}
                      <td className="py-2 px-3">
                        <div className="space-y-1">
                          <div className="flex items-baseline justify-between">
                            <span className="text-sm font-semibold text-emerald-700">{formatCurrency(totalContract)}</span>
                            <span className={`text-xs font-semibold ${
                              totalContractPct >= 40 ? 'text-emerald-600' :
                              totalContractPct >= 20 ? 'text-yellow-600' :
                              'text-red-500'
                            }`}>
                              {totalContractPct.toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`absolute h-full rounded-full ${
                                  totalContractPct >= 40 ? 'bg-emerald-500' :
                                  totalContractPct >= 20 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(totalContractPct, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Target: {formatCurrency(totalPresaleTarget)}
                          </div>
                        </div>
                      </td>
                      {/* Revenue Total */}
                      <td className="py-2 px-3">
                        <div className="space-y-1">
                          <div className="flex items-baseline justify-between">
                            <span className="text-sm font-semibold text-blue-700">{formatCurrency(totalRevenueActual)}</span>
                            <span className={`text-xs font-semibold ${
                              totalRevenuePct >= 80 ? 'text-blue-600' :
                              totalRevenuePct >= 50 ? 'text-yellow-600' :
                              'text-red-500'
                            }`}>
                              {totalRevenuePct.toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`absolute h-full rounded-full ${
                                  totalRevenuePct >= 80 ? 'bg-blue-500' :
                                  totalRevenuePct >= 50 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(totalRevenuePct, 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Target: {formatCurrency(totalRevenueTarget)}
                          </div>
                        </div>
                      </td>
                      {/* MKT Total */}
                      <td className="py-2 px-3">
                        <div className="space-y-1">
                          <div className="flex items-baseline justify-end">
                            <span className="text-sm font-semibold text-orange-700">{formatCurrency(totalMktExpense)}</span>
                          </div>
                          <div className="h-2" />
                          <div className="h-[10px]" />
                        </div>
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
