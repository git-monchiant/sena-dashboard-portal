import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, KPICard, Top10SalesTable, Top10MarketingTable, LeadFunnelCards } from '@shared/ui';
import {
  Target,
  DollarSign,
  Briefcase,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Zap,
  Megaphone,
  XCircle,
  BookCheck,
  Building,
} from 'lucide-react';
import {
  ComposedChart,
  Line,
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

interface PersonData {
  name: string;
  position: string;
  roleType: string;
  department?: string; // 'Sale' or 'Mkt'
  projectCount: number;
  grandTotals: {
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
  };
  kpis: {
    presaleAchievePct: number;
    revenueAchievePct: number;
    avgCPL: number;
    avgCPQL: number;
    leadToQLRatio: number;
    qlToWalkRatio: number;
    walkToBookRatio: number;
    mktPctBooking: number;
  };
  quarterlyPerformance: {
    quarter: string;
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
  }[];
  projects: {
    projectCode: string;
    projectName: string;
    bud: string;
    months: string[];
    responsibleQuarters: string[];
    totals: {
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
    };
    presaleAchievePct: number;
    revenueAchievePct: number;
  }[];
  team?: {
    salesManagers: { name: string; position: string; projects: { projectCode: string; projectName: string }[] }[];
    marketingManagers: { name: string; position: string; projects: { projectCode: string; projectName: string }[] }[];
  };
  monthlyData?: {
    month: string;
    presaleTarget: number;
    booking: number;
    contract: number;
    livnex: number;
    livnexTarget: number;
    revenueTarget: number;
    revenue: number;
    cancel: number;
    // Marketing fields
    mktExpense: number;
    totalLead: number;
    qualityLead: number;
    walk: number;
    book: number;
  }[];
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

export function PersonDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [personData, setPersonData] = useState<PersonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!name) return;
      setIsLoading(true);
      try {
        // Try VP endpoint first
        let res = await fetch(`${API_URL}/api/sales-2025-v2/vp/${encodeURIComponent(name)}`);
        if (res.ok) {
          const data = await res.json();
          setPersonData(data);
        } else {
          // Fallback to employee endpoint (for MGR)
          res = await fetch(`${API_URL}/api/sales-2025-v2/employee/${encodeURIComponent(name)}`);
          if (res.ok) {
            const empData = await res.json();
            // Transform employee data to match PersonData structure
            const grandTotals = empData.grandTotals || {
              presaleTarget: 0, presaleActual: 0,
              revenueTarget: 0, revenueActual: 0,
              mktExpense: 0, totalLead: 0, qualityLead: 0,
              walk: 0, book: 0, booking: 0, livnex: 0,
            };
            const kpis = empData.kpis || {
              presaleAchievePct: 0, revenueAchievePct: 0,
              avgCPL: 0, avgCPQL: 0,
              leadToQLRatio: 0, qlToWalkRatio: 0, walkToBookRatio: 0,
              mktPctBooking: 0,
            };
            // Transform projects to match the expected format
            // Employee API returns projects with totals object directly
            const projects = (empData.projects || []).map((p: Record<string, unknown>) => {
              // Use totals directly from API response
              const apiTotals = p.totals as Record<string, unknown> || {};
              const totals = {
                presaleTarget: Number(apiTotals.presaleTarget) || 0,
                presaleActual: Number(apiTotals.presaleActual) || 0,
                revenueTarget: Number(apiTotals.revenueTarget) || 0,
                revenueActual: Number(apiTotals.revenueActual) || 0,
                mktExpense: Number(apiTotals.mktExpense) || 0,
                totalLead: Number(apiTotals.totalLead) || 0,
                qualityLead: Number(apiTotals.qualityLead) || 0,
                walk: Number(apiTotals.walk) || 0,
                book: Number(apiTotals.book) || 0,
                booking: Number(apiTotals.booking) || 0,
                livnex: Number(apiTotals.livnex) || 0,
              };

              return {
                projectCode: p.projectCode || p.project_code,
                projectName: p.projectName || p.project_name,
                bud: p.bud || '',
                months: p.months || [],
                responsibleQuarters: p.responsibleQuarters || [],
                totals,
                presaleAchievePct: Number(p.presaleAchievePct) || 0,
                revenueAchievePct: Number(p.revenueAchievePct) || 0,
              };
            });
            setPersonData({
              name: empData.name,
              position: empData.position,
              roleType: empData.roleType || 'MGR',
              department: empData.department, // 'Sale' or 'Mkt'
              projectCount: projects.length,
              grandTotals,
              kpis,
              quarterlyPerformance: [],
              projects,
              team: undefined, // No team for managers
              monthlyData: empData.monthlyData || [], // Include monthly data for charts
            });
          } else {
            throw new Error('Person not found');
          }
        }
      } catch (err) {
        console.error('Failed to load person data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [name]);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="Performance Dashboard"
          subtitle="Loading..."
        />
        <div className="p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-48" />
            <div className="grid grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="h-80 bg-slate-200 rounded-xl" />
              <div className="h-80 bg-slate-200 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!personData) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Performance Dashboard" subtitle="ไม่พบข้อมูล" />
        <div className="p-8">
          <button
            onClick={() => navigate('/sales-2025/employees')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับไปหน้ารายชื่อ
          </button>
        </div>
      </div>
    );
  }

  const { grandTotals, kpis, projects, team } = personData;
  const hasTeam = team && (team.salesManagers.length > 0 || team.marketingManagers.length > 0);
  const roleLabel = personData.roleType === 'VP' ? 'BUD-Head' : 'Manager';

  // Determine if should show tables based on role/department
  const isSalesMgr = personData.roleType === 'MGR' && personData.department === 'Sale';
  const isMktMgr = personData.roleType === 'MGR' && personData.department === 'Mkt';
  const showSalesTable = !isMktMgr; // VP and Sales MGR see Sales table
  const showMktTable = !isSalesMgr; // VP and Mkt MGR see Marketing table
  const showLeadFunnel = !isMktMgr; // VP and Sales MGR see Lead Funnel

  // Prepare quarters data for LeadFunnelCards (aggregate from quarterlyPerformance or from projects)
  const funnelQuarters = personData.quarterlyPerformance.length > 0
    ? personData.quarterlyPerformance.map(q => ({
        quarter: q.quarter,
        totalLead: q.totalLead,
        qualityLead: q.qualityLead,
        walk: q.walk,
        book: q.book,
      }))
    : []; // For MGR, we don't have quarterly breakdown, so empty

  return (
    <div className="min-h-screen">
      <PageHeader
        title={`${personData.name}`}
        subtitle={`${personData.position} | ${roleLabel} Performance Dashboard`}
      />

      <div className="p-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/sales-2025/employees')}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปหน้ารายชื่อ
        </button>

        {/* Sales KPI Cards - matching page.tsx layout */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Sales Performance</h3>
          {(() => {
            // Calculate derived values for KPI cards (matching page.tsx)
            const totalBooking = grandTotals.booking || 0;
            const totalLivnex = grandTotals.livnex || 0;
            const totalContract = grandTotals.presaleActual - totalBooking - totalLivnex; // Contract = Presale - Booking - Livnex
            const totalCancel = 0; // Cancel not tracked in person data yet
            const totalPresaleTarget = grandTotals.presaleTarget || 0;
            const totalLivnexTarget = grandTotals.presaleTarget * 0.3 || 0; // Estimate Livnex target as 30% of presale
            const totalRevenueTarget = grandTotals.revenueTarget || 0;
            const totalRevenueActual = grandTotals.revenueActual || 0;

            const bookingAchieve = totalPresaleTarget > 0 ? (totalBooking / totalPresaleTarget) * 100 : 0;
            const livnexAchieve = totalLivnexTarget > 0 ? (totalLivnex / totalLivnexTarget) * 100 : 0;
            const contractAchieve = totalPresaleTarget > 0 ? (totalContract / totalPresaleTarget) * 100 : 0;
            const revenueAchieve = totalRevenueTarget > 0 ? (totalRevenueActual / totalRevenueTarget) * 100 : 0;

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-6">
                <KPICard
                  title="Projects"
                  value={personData.projectCount.toString()}
                  change={`${projects.length} records`}
                  changeType="neutral"
                  icon={Building}
                  color="slate"
                />
                <KPICard
                  title="Booking"
                  value={formatCurrency(totalBooking)}
                  change=" "
                  changeType={bookingAchieve >= 40 ? 'positive' : bookingAchieve >= 20 ? 'warning' : 'negative'}
                  showArrow={false}
                  target={{ percentage: Math.round(Math.min(bookingAchieve, 100) * 100) / 100 }}
                  subtext={`${bookingAchieve.toFixed(1)}% of Target (${formatCurrency(totalPresaleTarget)})`}
                  icon={TrendingUp}
                  color="purple"
                />
                <KPICard
                  title="Contract"
                  value={formatCurrency(Math.max(totalContract, 0))}
                  change=" "
                  changeType={contractAchieve >= 40 ? 'positive' : contractAchieve >= 20 ? 'warning' : 'negative'}
                  showArrow={false}
                  target={{ percentage: Math.round(Math.min(Math.max(contractAchieve, 0), 100) * 100) / 100 }}
                  subtext={`${Math.max(contractAchieve, 0).toFixed(1)}% of Target (${formatCurrency(totalPresaleTarget)})`}
                  icon={Target}
                  color="emerald"
                />
                <KPICard
                  title="Revenue"
                  value={formatCurrency(totalRevenueActual)}
                  change=" "
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
                  change=" "
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
                  change=" "
                  changeType={totalCancel > 0 ? 'negative' : 'positive'}
                  showArrow={false}
                  subtext={`${totalBooking > 0 ? ((totalCancel / totalBooking) * 100).toFixed(1) : 0}% of Booking`}
                  icon={XCircle}
                  color="red"
                />
              </div>
            );
          })()}

          {/* Monthly Sales Charts - 4 graphs (only for Sales MGR, not Marketing) */}
          {personData.department !== 'Mkt' && personData.monthlyData && personData.monthlyData.length > 0 && (() => {
            const monthlyData = personData.monthlyData;

            // Prepare chart data with calculated fields
            const salesChartData = monthlyData.map((item) => {
              const presaleTarget = item.presaleTarget || 0;
              const booking = item.booking || 0;
              const contract = item.contract || 0;
              const livnex = item.livnex || 0;
              const livnexTarget = item.livnexTarget || 0;
              const revenueTarget = item.revenueTarget || 0;
              const revenue = item.revenue || 0;
              const cancel = item.cancel || 0;

              return {
                month: item.month,
                'Booking Target': presaleTarget,
                'Booking': booking,
                'Contract': contract,
                'Livnex': livnex,
                'Livnex Target': livnexTarget,
                'Revenue': revenue,
                'Revenue Target': revenueTarget,
                'Cancel': cancel,
                'Booking %': presaleTarget > 0 ? ((booking / presaleTarget) * 100).toFixed(0) : '0',
                'Contract %': presaleTarget > 0 ? ((contract / presaleTarget) * 100).toFixed(0) : '0',
                'Livnex %': livnexTarget > 0 ? ((livnex / livnexTarget) * 100).toFixed(0) : '0',
                'Revenue %': revenueTarget > 0 ? ((revenue / revenueTarget) * 100).toFixed(0) : '0',
              };
            });

            // Calculate cumulative data
            const cumulativeSalesData = salesChartData.reduce((acc: any[], item, index) => {
              const prev = index > 0 ? acc[index - 1] : null;
              acc.push({
                month: item.month,
                'Cum Booking': (prev?.['Cum Booking'] || 0) + (item['Booking'] || 0),
                'Cum Contract': (prev?.['Cum Contract'] || 0) + (item['Contract'] || 0),
                'Cum Cancel': (prev?.['Cum Cancel'] || 0) + (item['Cancel'] || 0),
                'Cum Revenue': (prev?.['Cum Revenue'] || 0) + (item['Revenue'] || 0),
                'Cum Livnex': (prev?.['Cum Livnex'] || 0) + (item['Livnex'] || 0),
              });
              return acc;
            }, []);

            return (
              <>
                {/* Row 1: Presale + Cancel */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  {/* Chart 1: Presale Performance */}
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
                        <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name]} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px' }} />
                        <Legend content={() => (
                          <div className="flex justify-start gap-3 pt-2 flex-wrap">
                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#94a3b8' }} /><span className="text-[10px] text-slate-600">Target</span></div>
                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#8b5cf6' }} /><span className="text-[10px] text-slate-600">Booking</span></div>
                            <div className="flex items-center gap-1"><div className="w-3 h-0.5 rounded" style={{ backgroundColor: '#10b981' }} /><span className="text-[10px] text-slate-600">Contract</span></div>
                          </div>
                        )} />
                        <Bar dataKey="Booking Target" fill="#94a3b8" radius={[2, 2, 0, 0]}>
                          <LabelList position="top" fontSize={7} fill="#64748b" formatter={(v: number) => v > 0 ? `${(v / 1000000).toFixed(0)}M` : ''} />
                        </Bar>
                        <Bar dataKey="Booking" fill="#8b5cf6" radius={[2, 2, 0, 0]}>
                          <LabelList position="top" fontSize={7} fill="#8b5cf6" content={({ x, y, width, value, index }: any) => {
                            if (!value || value <= 0) return null;
                            const pct = salesChartData[index]?.['Booking %'] || '0';
                            return <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={7} fill="#8b5cf6">{`${(value / 1000000).toFixed(0)}M (${pct}%)`}</text>;
                          }} />
                        </Bar>
                        <Line type="monotone" dataKey="Contract" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }}>
                          <LabelList position="top" fontSize={7} fill="#10b981" content={({ x, y, value, index }: any) => {
                            if (!value || value <= 0) return null;
                            const pct = salesChartData[index]?.['Contract %'] || '0';
                            return <text x={x} y={y - 8} textAnchor="middle" fontSize={7} fill="#10b981">{`${(value / 1000000).toFixed(0)}M (${pct}%)`}</text>;
                          }} />
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
                    <ResponsiveContainer width="100%" height={220}>
                      <ComposedChart data={salesChartData.map((item, idx) => ({ ...item, 'Cum Cancel': cumulativeSalesData[idx]?.['Cum Cancel'] || 0 }))} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={9} />
                        <YAxis yAxisId="left" stroke="#64748b" fontSize={9} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                        <YAxis yAxisId="right" orientation="right" stroke="#b91c1c" fontSize={9} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                        <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name === 'Cum Cancel' ? 'สะสม' : 'รายเดือน']} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px' }} />
                        <Legend content={() => (
                          <div className="flex justify-start gap-3 pt-2">
                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#ef4444' }} /><span className="text-[10px] text-slate-600">รายเดือน</span></div>
                            <div className="flex items-center gap-1"><div className="w-3 h-0.5 rounded" style={{ backgroundColor: '#b91c1c' }} /><span className="text-[10px] text-slate-600">สะสม</span></div>
                          </div>
                        )} />
                        <Bar yAxisId="left" dataKey="Cancel" fill="#ef4444" radius={[2, 2, 0, 0]}>
                          <LabelList position="top" fontSize={7} fill="#ef4444" formatter={(v: number) => v > 0 ? `${(v / 1000000).toFixed(0)}M` : ''} />
                        </Bar>
                        <Line yAxisId="right" type="monotone" dataKey="Cum Cancel" stroke="#b91c1c" strokeWidth={2} dot={{ fill: '#b91c1c', r: 3 }}>
                          <LabelList position="top" fontSize={7} fill="#b91c1c" formatter={(v: number) => v > 0 ? `${(v / 1000000).toFixed(0)}M` : ''} />
                        </Line>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Row 2: Transfer + LivNex */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  {/* Chart 3: Transfer Performance */}
                  <div className="card">
                    <div className="mb-2">
                      <h3 className="font-semibold text-slate-800">Transfer Performance</h3>
                      <p className="text-sm text-slate-500">แท่ง = รายเดือน, เส้น = สะสม</p>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <ComposedChart data={salesChartData.map((item, idx) => ({ ...item, 'Cum Revenue': cumulativeSalesData[idx]?.['Cum Revenue'] || 0 }))} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={9} />
                        <YAxis yAxisId="left" stroke="#64748b" fontSize={9} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                        <YAxis yAxisId="right" orientation="right" stroke="#1d4ed8" fontSize={9} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                        <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name === 'Cum Revenue' ? 'สะสม' : name]} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px' }} />
                        <Legend content={() => (
                          <div className="flex justify-start gap-3 pt-2 flex-wrap">
                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#cbd5e1' }} /><span className="text-[10px] text-slate-600">Target</span></div>
                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#3b82f6' }} /><span className="text-[10px] text-slate-600">Revenue</span></div>
                            <div className="flex items-center gap-1"><div className="w-2.5 h-1 rounded-full" style={{ backgroundColor: '#1d4ed8' }} /><span className="text-[10px] text-slate-600">สะสม</span></div>
                          </div>
                        )} />
                        <Bar yAxisId="left" dataKey="Revenue Target" fill="#cbd5e1" radius={[2, 2, 0, 0]}>
                          <LabelList position="top" fontSize={7} fill="#64748b" formatter={(v: number) => v > 0 ? `${(v / 1000000).toFixed(0)}M` : ''} />
                        </Bar>
                        <Bar yAxisId="left" dataKey="Revenue" fill="#3b82f6" radius={[2, 2, 0, 0]}>
                          <LabelList position="top" fontSize={7} fill="#3b82f6" content={({ x, y, width, value, index }: any) => {
                            if (!value || value <= 0) return null;
                            const pct = salesChartData[index]?.['Revenue %'] || '0';
                            return <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={7} fill="#3b82f6">{`${(value / 1000000).toFixed(0)}M (${pct}%)`}</text>;
                          }} />
                        </Bar>
                        <Line yAxisId="right" type="monotone" dataKey="Cum Revenue" stroke="#1d4ed8" strokeWidth={2} dot={{ fill: '#1d4ed8', r: 3 }}>
                          <LabelList position="top" fontSize={7} fill="#1d4ed8" formatter={(v: number) => v > 0 ? `${(v / 1000000).toFixed(0)}M` : ''} />
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
                      <ComposedChart data={salesChartData.map((item, idx) => ({ ...item, 'Cum Livnex': cumulativeSalesData[idx]?.['Cum Livnex'] || 0 }))} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={9} />
                        <YAxis yAxisId="left" stroke="#64748b" fontSize={9} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                        <YAxis yAxisId="right" orientation="right" stroke="#c2410c" fontSize={9} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                        <Tooltip formatter={(value: number, name: string) => [formatCurrency(value), name === 'Cum Livnex' ? 'สะสม' : name]} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px' }} />
                        <Legend content={() => (
                          <div className="flex justify-start gap-3 pt-2 flex-wrap">
                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#fed7aa' }} /><span className="text-[10px] text-slate-600">Target</span></div>
                            <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: '#f97316' }} /><span className="text-[10px] text-slate-600">Livnex</span></div>
                            <div className="flex items-center gap-1"><div className="w-2.5 h-1 rounded-full" style={{ backgroundColor: '#c2410c' }} /><span className="text-[10px] text-slate-600">สะสม</span></div>
                          </div>
                        )} />
                        <Bar yAxisId="left" dataKey="Livnex Target" fill="#fed7aa" radius={[2, 2, 0, 0]}>
                          <LabelList position="top" fontSize={7} fill="#64748b" formatter={(v: number) => v > 0 ? `${(v / 1000000).toFixed(0)}M` : ''} />
                        </Bar>
                        <Bar yAxisId="left" dataKey="Livnex" fill="#f97316" radius={[2, 2, 0, 0]}>
                          <LabelList position="top" fontSize={7} fill="#f97316" content={({ x, y, width, value, index }: any) => {
                            if (!value || value <= 0) return null;
                            const pct = salesChartData[index]?.['Livnex %'] || '0';
                            return <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize={7} fill="#f97316">{`${(value / 1000000).toFixed(0)}M (${pct}%)`}</text>;
                          }} />
                        </Bar>
                        <Line yAxisId="right" type="monotone" dataKey="Cum Livnex" stroke="#c2410c" strokeWidth={2} dot={{ fill: '#c2410c', r: 3 }}>
                          <LabelList position="top" fontSize={7} fill="#c2410c" formatter={(v: number) => v > 0 ? `${(v / 1000000).toFixed(0)}M` : ''} />
                        </Line>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            );
          })()}

          {/* Lead Conversion Funnel - Show for VP and Sales MGR */}
          {showLeadFunnel && (
            <LeadFunnelCards
              totals={{
                lead: grandTotals.totalLead,
                ql: grandTotals.qualityLead,
                walk: grandTotals.walk,
                book: grandTotals.book,
              }}
              quarters={funnelQuarters}
              embedded
            />
          )}

          {/* Top 10 Projects by Sales - Hide for Marketing MGR */}
          {showSalesTable && (
            <Top10SalesTable
              projects={projects}
              onRowClick={(code) => navigate(`/sales-2025/project/${code}`)}
              formatCurrency={formatCurrency}
              storageKey={`person-detail-sales-${name}`}
            />
          )}
        </div>

        {/* Marketing KPI Cards - matching marketing-performance.tsx layout */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Marketing Performance</h3>
          {(() => {
            // Calculate derived values for Marketing KPI cards (matching marketing-performance.tsx)
            const totalMktExpense = grandTotals.mktExpense || 0;
            const totalLead = grandTotals.totalLead || 0;
            const totalQualityLead = grandTotals.qualityLead || 0;
            const totalBook = grandTotals.book || 0;
            const cpl = kpis.avgCPL || 0;
            const cpql = kpis.avgCPQL || 0;
            const cpb = totalBook > 0 ? totalMktExpense / totalBook : 0;

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
                <KPICard
                  title="Projects"
                  value={personData.projectCount.toString()}
                  change={`${projects.length} records`}
                  changeType="neutral"
                  subtext=" "
                  icon={Building}
                  color="slate"
                />
                <KPICard
                  title="MKT Expense (YTD)"
                  value={formatCurrency(totalMktExpense)}
                  change=" "
                  changeType="neutral"
                  showArrow={false}
                  subtext="ค่าใช้จ่าย Marketing"
                  icon={DollarSign}
                  color="orange"
                />
                <KPICard
                  title="Total Lead"
                  value={totalLead.toLocaleString()}
                  change=" "
                  changeType="neutral"
                  showArrow={false}
                  subtext={`CPL: ฿${cpl.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                  icon={Users}
                  color="purple"
                />
                <KPICard
                  title="Quality Lead"
                  value={totalQualityLead.toLocaleString()}
                  change=" "
                  changeType="neutral"
                  showArrow={false}
                  subtext={`CPQL: ฿${cpql.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                  icon={Target}
                  color="emerald"
                />
                <KPICard
                  title="CPB (Cost/Book)"
                  value={`฿${cpb.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                  change=" "
                  changeType="neutral"
                  showArrow={false}
                  subtext={`${totalBook.toLocaleString()} Bookings`}
                  icon={BookCheck}
                  color="blue"
                />
                <KPICard
                  title="Lead Quality"
                  value={`${totalLead > 0 ? ((totalQualityLead / totalLead) * 100).toFixed(1) : 0}%`}
                  change=" "
                  changeType="neutral"
                  showArrow={false}
                  subtext={`${totalLead.toLocaleString()} Lead → ${totalQualityLead.toLocaleString()} QL`}
                  icon={TrendingDown}
                  color="slate"
                />
              </div>
            );
          })()}

          {/* Top 10 Projects by Marketing - Hide for Sales MGR */}
          {showMktTable && (
            <Top10MarketingTable
              projects={projects}
              onRowClick={(code) => navigate(`/sales-2025/project/${code}`)}
              formatCurrency={formatCurrency}
              storageKey={`person-detail-mkt-${name}`}
            />
          )}
        </div>

        {/* Team Section - Only show if has team members */}
        {hasTeam && team && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Managers */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">MGR-Sale Team</h3>
                  <p className="text-sm text-slate-500">{team.salesManagers.length} managers</p>
                </div>
              </div>
              <div className="space-y-3">
                {team.salesManagers.map((mgr, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
                    onClick={() => navigate(`/sales-2025/person/${encodeURIComponent(mgr.name)}`)}
                  >
                    <div className="font-medium text-blue-600">{mgr.name}</div>
                    <div className="text-xs text-slate-500">{mgr.position}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {mgr.projects.map((p, pidx) => (
                        <span key={pidx} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-600">
                          {p.projectCode}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {team.salesManagers.length === 0 && (
                  <p className="text-slate-400 text-sm">No sales managers assigned</p>
                )}
              </div>
            </div>

            {/* Marketing Managers */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">MGR-Marketing Team</h3>
                  <p className="text-sm text-slate-500">{team.marketingManagers.length} managers</p>
                </div>
              </div>
              <div className="space-y-3">
                {team.marketingManagers.map((mgr, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer"
                    onClick={() => navigate(`/sales-2025/person/${encodeURIComponent(mgr.name)}`)}
                  >
                    <div className="font-medium text-purple-600">{mgr.name}</div>
                    <div className="text-xs text-slate-500">{mgr.position}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {mgr.projects.map((p, pidx) => (
                        <span key={pidx} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-600">
                          {p.projectCode}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {team.marketingManagers.length === 0 && (
                  <p className="text-slate-400 text-sm">No marketing managers assigned</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
