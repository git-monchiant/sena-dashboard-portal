import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, KPICard, LeadFunnelCards, Top10SalesTable } from '@shared/ui';
import { SalesPerformanceFilters } from './filters';
import {
  Target,
  TrendingUp,
  DollarSign,
  Building,
  Zap,
  XCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from 'recharts';

const API_URL = 'http://localhost:3001';

interface FilterState {
  vp: string;
  mgr: string;
  project: string;
  quarter: string;
  bud: string;
}

interface ProjectRow {
  projectCode: string;
  projectName: string;
  bud: string;
  opm: string;
  segment: string;
  status: string;
  presaleTarget: number;
  presaleActual: number;
  booking: number;
  livnex: number;
  contract: number;
  revenueTarget: number;
  revenue: number;
  mktExpense: number;
  totalLead: number;
  qualityLead: number;
  leadWalk: number;
  leadBook: number;
  presaleAchievePct: number;
  revenueAchievePct: number;
}

interface SummaryRow {
  month: string;
  projectCount: number;
  presaleTarget: number;
  livnexTarget: number;
  booking: number;
  livnex: number;
  contract: number;
  cancel: number;
  revenueTarget: number;
  revenue: number;
  mktExpense: number;
  totalLead: number;
  qualityLead: number;
  leadWalk: number;
  leadBook: number;
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

export function SalesPerformance2025Page() {
  const navigate = useNavigate();
  const [data, setData] = useState<ProjectRow[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    vp: '', mgr: '', project: '', quarter: '', bud: ''
  });

  const loadData = async (f: FilterState) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.vp) params.append('vp', f.vp);
      if (f.mgr) params.append('mgr', f.mgr);
      if (f.project) params.append('project', f.project);
      if (f.quarter) params.append('quarter', f.quarter);
      if (f.bud) params.append('bud', f.bud);

      const [perfRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/sales-2025-v2/projects?${params}`),
        fetch(`${API_URL}/api/sales-2025-v2/summary?${params}`),
      ]);

      const perfData = await perfRes.json();
      const summaryData = await summaryRes.json();

      setData(perfData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't load on mount - let filter component trigger initial load with saved filters

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    loadData(newFilters);
  };

  // Calculate KPIs (presale = booking + livnex + contract)
  const totalPresaleTarget = summary.reduce((sum, r) => sum + Number(r.presaleTarget || 0), 0);
  const totalLivnexTarget = summary.reduce((sum, r) => sum + Number(r.livnexTarget || 0), 0);
  const totalBooking = summary.reduce((sum, r) => sum + Number(r.booking || 0), 0);
  const totalLivnex = summary.reduce((sum, r) => sum + Number(r.livnex || 0), 0);
  const totalContract = summary.reduce((sum, r) => sum + Number(r.contract || 0), 0);
  const totalPresaleActual = totalBooking + totalLivnex + totalContract;
  const totalRevenueTarget = summary.reduce((sum, r) => sum + Number(r.revenueTarget || 0), 0);
  const totalRevenueActual = summary.reduce((sum, r) => sum + Number(r.revenue || 0), 0);
  const totalCancel = summary.reduce((sum, r) => sum + Number(r.cancel || 0), 0);
  const projectCount = new Set(data.map(d => d.projectCode)).size;

  const bookingAchieve = totalPresaleTarget > 0 ? (totalBooking / totalPresaleTarget) * 100 : 0;
  const livnexAchieve = totalLivnexTarget > 0 ? (totalLivnex / totalLivnexTarget) * 100 : 0;
  const contractAchieve = totalPresaleTarget > 0 ? (totalContract / totalPresaleTarget) * 100 : 0;
  const revenueAchieve = totalRevenueTarget > 0 ? (totalRevenueActual / totalRevenueTarget) * 100 : 0;

  // Lead Funnel Totals
  const totalLead = summary.reduce((sum, s) => sum + Number(s.totalLead || 0), 0);
  const totalQualityLead = summary.reduce((sum, s) => sum + Number(s.qualityLead || 0), 0);
  const totalWalk = summary.reduce((sum, s) => sum + Number(s.leadWalk || 0), 0);
  const totalBook = summary.reduce((sum, s) => sum + Number(s.leadBook || 0), 0);

  // Convert monthly data to quarterly data for Lead Funnel
  const quarterMonths: Record<string, string[]> = {
    Q1: ['Jan', 'Feb', 'Mar'],
    Q2: ['Apr', 'May', 'Jun'],
    Q3: ['Jul', 'Aug', 'Sep'],
    Q4: ['Oct', 'Nov', 'Dec'],
  };

  const quarterlyLeadData = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
    const months = quarterMonths[q];
    const qData = summary.filter(s => months.includes(s.month));
    return {
      quarter: q,
      totalLead: qData.reduce((sum, s) => sum + Number(s.totalLead || 0), 0),
      qualityLead: qData.reduce((sum, s) => sum + Number(s.qualityLead || 0), 0),
      walk: qData.reduce((sum, s) => sum + Number(s.leadWalk || 0), 0),
      book: qData.reduce((sum, s) => sum + Number(s.leadBook || 0), 0),
    };
  });

  // Combined Sales Performance chart data - by month
  const salesChartData = summary.map((s, idx) => {
    const presaleTarget = Number(s.presaleTarget || 0);
    const livnexTarget = Number(s.livnexTarget || 0);
    const booking = Number(s.booking || 0);
    const livnex = Number(s.livnex || 0);
    const contract = Number(s.contract || 0);
    const cancel = Number(s.cancel || 0);
    const revenueTarget = Number(s.revenueTarget || 0);
    const revenueActual = Number(s.revenue || 0);

    // Calculate Cancel % change vs previous month (MoM)
    const prevCancel = idx > 0 ? Number(summary[idx - 1]?.cancel || 0) : 0;
    const cancelMoMPct = prevCancel > 0 ? ((cancel - prevCancel) / prevCancel * 100).toFixed(0) : '0';

    return {
      month: s.month,
      'Booking': booking,
      'Livnex': livnex,
      'Livnex Target': livnexTarget,
      'Contract': contract,
      'Cancel': cancel,
      'Booking Target': presaleTarget,
      'Revenue': revenueActual,
      'Revenue Target': revenueTarget,
      'Booking %': presaleTarget > 0 ? ((booking / presaleTarget) * 100).toFixed(0) : '0',
      'Livnex %': livnexTarget > 0 ? ((livnex / livnexTarget) * 100).toFixed(0) : '0',
      'Contract %': presaleTarget > 0 ? ((contract / presaleTarget) * 100).toFixed(0) : '0',
      'Cancel MoM %': cancelMoMPct,
      'Revenue %': revenueTarget > 0 ? ((revenueActual / revenueTarget) * 100).toFixed(0) : '0',
    };
  });

  // Cumulative Sales Trend data (ยอดสะสม)
  const cumulativeSalesData = salesChartData.reduce((acc, item, index) => {
    const prev = index > 0 ? acc[index - 1] : null;
    const cumBooking = (prev?.['Cum Booking'] || 0) + item['Booking'];
    const cumContract = (prev?.['Cum Contract'] || 0) + item['Contract'];
    const cumCancel = (prev?.['Cum Cancel'] || 0) + item['Cancel'];
    const cumRevenue = (prev?.['Cum Revenue'] || 0) + item['Revenue'];
    const cumLivnex = (prev?.['Cum Livnex'] || 0) + item['Livnex'];
    const cumBookingTarget = (prev?.['Cum Booking Target'] || 0) + item['Booking Target'];
    const cumRevenueTarget = (prev?.['Cum Revenue Target'] || 0) + item['Revenue Target'];
    const cumLivnexTarget = (prev?.['Cum Livnex Target'] || 0) + item['Livnex Target'];

    acc.push({
      month: item.month,
      'Cum Booking': cumBooking,
      'Cum Contract': cumContract,
      'Cum Cancel': cumCancel,
      'Cum Revenue': cumRevenue,
      'Cum Livnex': cumLivnex,
      'Cum Booking Target': cumBookingTarget,
      'Cum Revenue Target': cumRevenueTarget,
      'Cum Livnex Target': cumLivnexTarget,
      'Cum Booking %': cumBookingTarget > 0 ? ((cumBooking / cumBookingTarget) * 100).toFixed(0) : '0',
      'Cum Contract %': cumBookingTarget > 0 ? ((cumContract / cumBookingTarget) * 100).toFixed(0) : '0',
      'Cum Cancel %': cumBookingTarget > 0 ? ((cumCancel / cumBookingTarget) * 100).toFixed(0) : '0',
      'Cum Revenue %': cumRevenueTarget > 0 ? ((cumRevenue / cumRevenueTarget) * 100).toFixed(0) : '0',
      'Cum Livnex %': cumLivnexTarget > 0 ? ((cumLivnex / cumLivnexTarget) * 100).toFixed(0) : '0',
    });
    return acc;
  }, [] as Array<{
    month: string;
    'Cum Booking': number;
    'Cum Contract': number;
    'Cum Cancel': number;
    'Cum Revenue': number;
    'Cum Livnex': number;
    'Cum Booking Target': number;
    'Cum Revenue Target': number;
    'Cum Livnex Target': number;
    'Cum Booking %': string;
    'Cum Contract %': string;
    'Cum Cancel %': string;
    'Cum Revenue %': string;
    'Cum Livnex %': string;
  }>);


  return (
    <div className="min-h-screen">
      <PageHeader
        title="Sales Performance 2025"
        subtitle="รายงาน Performance การขายรายโครงการ"
      />

      <div className="p-8">
        {/* Filters - always visible */}
        <SalesPerformanceFilters onApply={handleApplyFilters} initialFilters={filters} />

        {isLoading ? (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="h-80 bg-slate-200 rounded-xl" />
              <div className="h-80 bg-slate-200 rounded-xl" />
            </div>
            <div className="h-96 bg-slate-200 rounded-xl" />
          </div>
        ) : (
          <>

        {/* KPI Cards - Booking, Contract, Revenue, Livnex, Cancel */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <KPICard
            title="Projects"
            value={projectCount.toString()}
            change={`${data.length} records`}
            changeType="neutral"
            icon={Building}
            color="slate"
          />
          <KPICard
            title="Booking"
            value={formatCurrency(totalBooking)}
            change={`+฿0 จากเดือนก่อน`}
            changeType={bookingAchieve >= 40 ? 'positive' : bookingAchieve >= 20 ? 'warning' : 'negative'}
            showArrow={false}
            target={{ percentage: Math.round(Math.min(bookingAchieve, 100) * 100) / 100 }}
            subtext={`${bookingAchieve.toFixed(1)}% of Target (${formatCurrency(totalPresaleTarget)})`}
            icon={TrendingUp}
            color="purple"
          />
          <KPICard
            title="Contract"
            value={formatCurrency(totalContract)}
            change={`+฿0 จากเดือนก่อน`}
            changeType={contractAchieve >= 40 ? 'positive' : contractAchieve >= 20 ? 'warning' : 'negative'}
            showArrow={false}
            target={{ percentage: Math.round(Math.min(contractAchieve, 100) * 100) / 100 }}
            subtext={`${contractAchieve.toFixed(1)}% of Target (${formatCurrency(totalPresaleTarget)})`}
            icon={Target}
            color="emerald"
          />
          <KPICard
            title="Revenue"
            value={formatCurrency(totalRevenueActual)}
            change={`+฿0 จากเดือนก่อน`}
            changeType={revenueAchieve >= 80 ? 'positive' : revenueAchieve >= 60 ? 'warning' : 'negative'}
            showArrow={false}
            target={{ percentage: Math.round(Math.min(revenueAchieve, 100) * 100) / 100 }}
            subtext={`${revenueAchieve.toFixed(1)}% of Target (${formatCurrency(totalRevenueTarget)})`}
            icon={DollarSign}
            color="blue"
          />
          <KPICard
            title="Livnex"
            value={formatCurrency(totalLivnex)}
            change={`+฿0 จากเดือนก่อน`}
            changeType={livnexAchieve >= 40 ? 'positive' : livnexAchieve >= 20 ? 'warning' : 'negative'}
            showArrow={false}
            target={{ percentage: Math.round(Math.min(livnexAchieve, 100) * 100) / 100 }}
            subtext={`${livnexAchieve.toFixed(1)}% of Target (${formatCurrency(totalLivnexTarget)})`}
            icon={Zap}
            color="orange"
          />
          <KPICard
            title="Cancel"
            value={formatCurrency(totalCancel)}
            change={`+฿0 จากเดือนก่อน`}
            changeType={totalCancel > 0 ? 'negative' : 'positive'}
            showArrow={false}
            subtext={`${totalBooking > 0 ? ((totalCancel / totalBooking) * 100).toFixed(1) : 0}% of Booking`}
            icon={XCircle}
            color="red"
          />
        </div>

        {/* Charts - Row 1: Presale + Cancel, Row 2: Transfer (full width) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Chart 1: Presale Performance (Booking, Contract) */}
          <div className="card">
            <div className="mb-2">
              <h3 className="font-semibold text-slate-800">Presale Performance</h3>
              <p className="text-sm text-slate-500">Booking (แท่ง) & Contract (เส้น)</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={salesChartData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={9} />
                <YAxis stroke="#64748b" fontSize={9} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const currentIdx = monthOrder.indexOf(label as string);
                    const colors: Record<string, string> = { 'Booking Target': '#94a3b8', 'Booking': '#8b5cf6', 'Contract': '#10b981' };
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[200px]">
                        <p className="font-semibold text-slate-800 text-sm mb-2 border-b border-slate-100 pb-1">{label}</p>
                        <div className="space-y-1.5">
                          {payload.map((entry: any) => {
                            const prevValue = currentIdx > 0 ? (salesChartData[currentIdx - 1]?.[entry.dataKey] || 0) : 0;
                            const currentValue = entry.value || 0;
                            const changePct = prevValue > 0 ? (((currentValue - prevValue) / prevValue) * 100) : 0;
                            const isPositive = changePct >= 0;
                            return (
                              <div key={entry.name} className="flex justify-between items-center text-xs gap-3">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[entry.name] || entry.color }} />
                                  <span className="text-slate-600">{entry.name}</span>
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className="font-medium text-slate-800">{formatCurrency(currentValue)}</span>
                                  {currentIdx > 0 && entry.name !== 'Booking Target' && (
                                    <span className={`text-[10px] ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                      {isPositive ? '↑' : '↓'}{Math.abs(changePct).toFixed(0)}%
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {currentIdx > 0 && <p className="text-[10px] text-slate-400 mt-2 pt-1 border-t border-slate-100">เทียบกับ {monthOrder[currentIdx - 1]}</p>}
                      </div>
                    );
                  }}
                />
                <Legend
                  content={() => (
                    <div className="flex justify-start gap-3 pt-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#94a3b8' }} />
                        <span className="text-[10px] text-slate-600">Target</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#8b5cf6' }} />
                        <span className="text-[10px] text-slate-600">Booking</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 rounded" style={{ backgroundColor: '#10b981' }} />
                        <span className="text-[10px] text-slate-600">Contract</span>
                      </div>
                    </div>
                  )}
                />
                <Bar dataKey="Booking Target" fill="#94a3b8" radius={[2, 2, 0, 0]}>
                  <LabelList position="top" fontSize={7} fill="#64748b" formatter={(v: number) => v > 0 ? `${(v / 1000000).toFixed(0)}M` : ''} />
                </Bar>
                <Bar dataKey="Booking" fill="#8b5cf6" radius={[2, 2, 0, 0]}>
                  <LabelList position="top" fontSize={7} fill="#64748b" content={({ x, y, width, value, index }: any) => {
                    if (!value || value <= 0) return null;
                    const pct = salesChartData[index]?.['Booking %'] || '0';
                    return <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={7} fill="#8b5cf6">{`${(value / 1000000).toFixed(0)}M (${pct}%)`}</text>;
                  }} />
                </Bar>
                <Line
                  type="monotone"
                  dataKey="Contract"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 1, r: 3 }}
                  activeDot={{ r: 5 }}
                >
                  <LabelList
                    position="top"
                    fontSize={7}
                    fill="#10b981"
                    content={({ x, y, value, index }: any) => {
                      if (!value || value <= 0) return null;
                      const pct = salesChartData[index]?.['Contract %'] || '0';
                      return <text x={x} y={y - 8} textAnchor="middle" fontSize={7} fill="#10b981">{`${(value / 1000000).toFixed(0)}M (${pct}%)`}</text>;
                    }}
                  />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2: Cancel */}
          <div className="card">
            <div className="mb-2">
              <h3 className="font-semibold text-slate-800">Cancel</h3>
              <p className="text-sm text-slate-500">แท่ง = รายเดือน, เส้น = สะสม</p>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart
                data={salesChartData.map((item, idx) => ({
                  ...item,
                  'Cum Cancel': cumulativeSalesData[idx]?.['Cum Cancel'] || 0,
                }))}
                margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={9} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={9} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <YAxis yAxisId="right" orientation="right" stroke="#b91c1c" fontSize={9} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const currentIdx = monthOrder.indexOf(label as string);
                    const colors: Record<string, string> = { 'Cancel': '#ef4444', 'Cum Cancel': '#b91c1c' };
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[200px]">
                        <p className="font-semibold text-slate-800 text-sm mb-2 border-b border-slate-100 pb-1">{label}</p>
                        <div className="space-y-1.5">
                          {payload.map((entry: any) => {
                            const isCum = entry.dataKey === 'Cum Cancel';
                            const prevValue = currentIdx > 0
                              ? (isCum ? (cumulativeSalesData[currentIdx - 1]?.['Cum Cancel'] || 0) : (salesChartData[currentIdx - 1]?.['Cancel'] || 0))
                              : 0;
                            const currentValue = entry.value || 0;
                            const changePct = prevValue > 0 ? (((currentValue - prevValue) / prevValue) * 100) : 0;
                            const isPositive = changePct >= 0;
                            return (
                              <div key={entry.name} className="flex justify-between items-center text-xs gap-3">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[entry.name] || entry.color }} />
                                  <span className="text-slate-600">{isCum ? 'สะสม' : 'รายเดือน'}</span>
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className="font-medium text-slate-800">{formatCurrency(currentValue)}</span>
                                  {currentIdx > 0 && (
                                    <span className={`text-[10px] ${isPositive ? 'text-red-500' : 'text-emerald-600'}`}>
                                      {isPositive ? '↑' : '↓'}{Math.abs(changePct).toFixed(0)}%
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {currentIdx > 0 && <p className="text-[10px] text-slate-400 mt-2 pt-1 border-t border-slate-100">เทียบกับ {monthOrder[currentIdx - 1]}</p>}
                      </div>
                    );
                  }}
                />
                <Legend
                  content={() => (
                    <div className="flex justify-start gap-3 pt-2">
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
                        <span className="text-[10px] text-slate-600">รายเดือน</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 rounded" style={{ backgroundColor: '#b91c1c' }} />
                        <span className="text-[10px] text-slate-600">สะสม</span>
                      </div>
                    </div>
                  )}
                />
                <Bar yAxisId="left" dataKey="Cancel" fill="#ef4444" radius={[2, 2, 0, 0]}>
                  <LabelList position="top" fontSize={7} fill="#ef4444" content={({ x, y, width, value, index }: any) => {
                    if (!value || value <= 0) return null;
                    const pct = Number(salesChartData[index]?.['Cancel MoM %'] || 0);
                    const sign = pct >= 0 ? '+' : '';
                    const pctText = index > 0 ? ` (${sign}${pct}%)` : '';
                    return <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={7} fill="#ef4444">{`${(value / 1000000).toFixed(0)}M${pctText}`}</text>;
                  }} />
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Cum Cancel"
                  stroke="#b91c1c"
                  strokeWidth={2}
                  dot={{ fill: '#b91c1c', strokeWidth: 1, r: 3 }}
                  activeDot={{ r: 5 }}
                >
                  <LabelList
                    position="top"
                    fontSize={7}
                    fill="#b91c1c"
                    content={({ x, y, value, index }: any) => {
                      if (!value || value <= 0) return null;
                      const prev = index > 0 ? (cumulativeSalesData[index - 1]?.['Cum Cancel'] || 0) : 0;
                      const pct = prev > 0 ? (((value - prev) / prev) * 100).toFixed(0) : '0';
                      const sign = Number(pct) >= 0 ? '+' : '';
                      const pctText = index > 0 ? ` (${sign}${pct}%)` : '';
                      return <text x={x} y={y - 8} textAnchor="middle" fontSize={7} fill="#b91c1c">{`${(value / 1000000).toFixed(0)}M${pctText}`}</text>;
                    }}
                  />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: Transfer (left) + empty space (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Chart 3: Transfer Performance (Revenue) */}
          <div className="card">
            <div className="mb-2">
              <h3 className="font-semibold text-slate-800">Transfer Performance</h3>
              <p className="text-sm text-slate-500">แท่ง = รายเดือน, เส้น = สะสม</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart
                data={salesChartData.map((item, idx) => ({
                  ...item,
                  'Cum Revenue': cumulativeSalesData[idx]?.['Cum Revenue'] || 0,
                }))}
                margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={9} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={9} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <YAxis yAxisId="right" orientation="right" stroke="#1d4ed8" fontSize={9} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const currentIdx = monthOrder.indexOf(label as string);
                    const colors: Record<string, string> = { 'Revenue Target': '#cbd5e1', 'Revenue': '#3b82f6', 'Cum Revenue': '#1d4ed8' };
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[200px]">
                        <p className="font-semibold text-slate-800 text-sm mb-2 border-b border-slate-100 pb-1">{label}</p>
                        <div className="space-y-1.5">
                          {payload.map((entry: any) => {
                            const isCum = entry.dataKey === 'Cum Revenue';
                            const prevValue = currentIdx > 0
                              ? (isCum ? (cumulativeSalesData[currentIdx - 1]?.['Cum Revenue'] || 0) : (salesChartData[currentIdx - 1]?.[entry.dataKey] || 0))
                              : 0;
                            const currentValue = entry.value || 0;
                            const changePct = prevValue > 0 ? (((currentValue - prevValue) / prevValue) * 100) : 0;
                            const isPositive = changePct >= 0;
                            return (
                              <div key={entry.name} className="flex justify-between items-center text-xs gap-3">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[entry.name] || entry.color }} />
                                  <span className="text-slate-600">{isCum ? 'สะสม' : entry.name}</span>
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className="font-medium text-slate-800">{formatCurrency(currentValue)}</span>
                                  {currentIdx > 0 && entry.name !== 'Revenue Target' && (
                                    <span className={`text-[10px] ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                      {isPositive ? '↑' : '↓'}{Math.abs(changePct).toFixed(0)}%
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {currentIdx > 0 && <p className="text-[10px] text-slate-400 mt-2 pt-1 border-t border-slate-100">เทียบกับ {monthOrder[currentIdx - 1]}</p>}
                      </div>
                    );
                  }}
                />
                <Legend
                  content={() => (
                    <div className="flex justify-start gap-3 pt-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#cbd5e1' }} />
                        <span className="text-[10px] text-slate-600">Target</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
                        <span className="text-[10px] text-slate-600">Revenue</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-1 rounded-full" style={{ backgroundColor: '#1d4ed8' }} />
                        <span className="text-[10px] text-slate-600">สะสม</span>
                      </div>
                    </div>
                  )}
                />
                <Bar yAxisId="left" dataKey="Revenue Target" fill="#cbd5e1" radius={[2, 2, 0, 0]}>
                  <LabelList position="top" fontSize={7} fill="#64748b" formatter={(v: number) => v > 0 ? `${(v / 1000000).toFixed(0)}M` : ''} />
                </Bar>
                <Bar yAxisId="left" dataKey="Revenue" fill="#3b82f6" radius={[2, 2, 0, 0]}>
                  <LabelList position="top" fontSize={7} fill="#64748b" content={({ x, y, width, value, index }: any) => {
                    if (!value || value <= 0) return null;
                    const pct = salesChartData[index]?.['Revenue %'] || '0';
                    return <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={7} fill="#3b82f6">{`${(value / 1000000).toFixed(0)}M (${pct}%)`}</text>;
                  }} />
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Cum Revenue"
                  stroke="#1d4ed8"
                  strokeWidth={2}
                  dot={{ fill: '#1d4ed8', strokeWidth: 1, r: 3 }}
                >
                  <LabelList
                    position="top"
                    fontSize={7}
                    fill="#1d4ed8"
                    content={({ x, y, value, index }: any) => {
                      if (!value || value <= 0) return null;
                      const prev = index > 0 ? (cumulativeSalesData[index - 1]?.['Cum Revenue'] || 0) : 0;
                      const pct = prev > 0 ? (((value - prev) / prev) * 100).toFixed(0) : '0';
                      const sign = Number(pct) >= 0 ? '+' : '';
                      const pctText = index > 0 ? ` (${sign}${pct}%)` : '';
                      return <text x={x} y={y - 8} textAnchor="middle" fontSize={7} fill="#1d4ed8">{`${(value / 1000000).toFixed(0)}M${pctText}`}</text>;
                    }}
                  />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {/* Chart 4: LivNex Performance */}
          <div className="card">
            <div className="mb-2">
              <h3 className="font-semibold text-slate-800">LivNex Performance</h3>
              <p className="text-sm text-slate-500">แท่ง = รายเดือน, เส้น = สะสม</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart
                data={salesChartData.map((item, idx) => ({
                  ...item,
                  'Cum Livnex': cumulativeSalesData[idx]?.['Cum Livnex'] || 0,
                }))}
                margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={9} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={9} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <YAxis yAxisId="right" orientation="right" stroke="#c2410c" fontSize={9} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const currentIdx = monthOrder.indexOf(label as string);
                    const colors: Record<string, string> = { 'Livnex Target': '#fed7aa', 'Livnex': '#f97316', 'Cum Livnex': '#c2410c' };
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[200px]">
                        <p className="font-semibold text-slate-800 text-sm mb-2 border-b border-slate-100 pb-1">{label}</p>
                        <div className="space-y-1.5">
                          {payload.map((entry: any) => {
                            const isCum = entry.dataKey === 'Cum Livnex';
                            const prevValue = currentIdx > 0
                              ? (isCum ? (cumulativeSalesData[currentIdx - 1]?.['Cum Livnex'] || 0) : (salesChartData[currentIdx - 1]?.[entry.dataKey] || 0))
                              : 0;
                            const currentValue = entry.value || 0;
                            const changePct = prevValue > 0 ? (((currentValue - prevValue) / prevValue) * 100) : 0;
                            const isPositive = changePct >= 0;
                            return (
                              <div key={entry.name} className="flex justify-between items-center text-xs gap-3">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[entry.name] || entry.color }} />
                                  <span className="text-slate-600">{isCum ? 'สะสม' : entry.name}</span>
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className="font-medium text-slate-800">{formatCurrency(currentValue)}</span>
                                  {currentIdx > 0 && entry.name !== 'Livnex Target' && (
                                    <span className={`text-[10px] ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                                      {isPositive ? '↑' : '↓'}{Math.abs(changePct).toFixed(0)}%
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        {currentIdx > 0 && <p className="text-[10px] text-slate-400 mt-2 pt-1 border-t border-slate-100">เทียบกับ {monthOrder[currentIdx - 1]}</p>}
                      </div>
                    );
                  }}
                />
                <Legend
                  content={() => (
                    <div className="flex justify-start gap-3 pt-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#fed7aa' }} />
                        <span className="text-[10px] text-slate-600">Target</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#f97316' }} />
                        <span className="text-[10px] text-slate-600">Livnex</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2.5 h-1 rounded-full" style={{ backgroundColor: '#c2410c' }} />
                        <span className="text-[10px] text-slate-600">สะสม</span>
                      </div>
                    </div>
                  )}
                />
                <Bar yAxisId="left" dataKey="Livnex Target" fill="#fed7aa" radius={[2, 2, 0, 0]}>
                  <LabelList position="top" fontSize={7} fill="#64748b" formatter={(v: number) => v > 0 ? `${(v / 1000000).toFixed(0)}M` : ''} />
                </Bar>
                <Bar yAxisId="left" dataKey="Livnex" fill="#f97316" radius={[2, 2, 0, 0]}>
                  <LabelList position="top" fontSize={7} fill="#64748b" content={({ x, y, width, value, index }: any) => {
                    if (!value || value <= 0) return null;
                    const pct = salesChartData[index]?.['Livnex %'] || '0';
                    return <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={7} fill="#f97316">{`${(value / 1000000).toFixed(0)}M (${pct}%)`}</text>;
                  }} />
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Cum Livnex"
                  stroke="#c2410c"
                  strokeWidth={2}
                  dot={{ fill: '#c2410c', strokeWidth: 1, r: 3 }}
                >
                  <LabelList
                    position="top"
                    fontSize={7}
                    fill="#c2410c"
                    content={({ x, y, value, index }: any) => {
                      if (!value || value <= 0) return null;
                      const prev = index > 0 ? (cumulativeSalesData[index - 1]?.['Cum Livnex'] || 0) : 0;
                      const pct = prev > 0 ? (((value - prev) / prev) * 100).toFixed(0) : '0';
                      const sign = Number(pct) >= 0 ? '+' : '';
                      const pctText = index > 0 ? ` (${sign}${pct}%)` : '';
                      return <text x={x} y={y - 8} textAnchor="middle" fontSize={7} fill="#c2410c">{`${(value / 1000000).toFixed(0)}M${pctText}`}</text>;
                    }}
                  />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Conversion Funnel Card */}
        <div className="card mb-4">
          <LeadFunnelCards
            totals={{ lead: totalLead, ql: totalQualityLead, walk: totalWalk, book: totalBook }}
            quarters={quarterlyLeadData}
            embedded
          />
        </div>

        {/* Project Detail Table - Top 10 by Booking */}
        {(() => {
          // Transform data to Top10SalesTable format
          // Booking, Livnex, Contract เทียบกับ Target เดียวกัน
          const projects = data.map(row => ({
            projectCode: row.projectCode,
            projectName: row.projectName,
            totals: {
              booking: row.booking || 0,
              livnex: row.livnex || 0,
              contract: row.contract || 0,
              presaleTarget: row.presaleTarget || 0,
              revenueTarget: row.revenueTarget || 0,
              revenueActual: row.revenue || 0,
              qualityLead: row.qualityLead || 0,
              walk: row.leadWalk || 0,
              book: row.leadBook || 0,
            },
            revenueAchievePct: row.revenueAchievePct || 0,
          }));

          return (
            <Top10SalesTable
              projects={projects}
              onRowClick={(code) => navigate(`/sales-2025/project/${code}`)}
              formatCurrency={formatCurrency}
              storageKey="sales-page-table"
            />
          );
        })()}
        </>
        )}
      </div>
    </div>
  );
}
