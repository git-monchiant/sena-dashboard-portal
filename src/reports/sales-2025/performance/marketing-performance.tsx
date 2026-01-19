import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Users,
  Target,
  TrendingDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { PageHeader, KPICard, LeadFunnelCards, Top10MarketingTable } from '@shared/ui';
import { SalesPerformanceFilters } from './filters';

interface SummaryRow {
  quarter: string;
  project_count: number;
  total_mkt_expense: number;
  total_lead: number;
  total_quality_lead: number;
  total_walk: number;
  total_book: number;
  total_booking: number;
  total_presale_target: number;
  total_presale_livnex: number;
  total_revenue_target: number;
  total_revenue: number;
  avg_cpl: number;
  avg_cpql: number;
  avg_mkt_pct_booking: number;
  avg_mkt_pct_presale_livnex: number;
  avg_mkt_pct_revenue: number;
}

interface ProjectRow {
  project_code: string;
  project_name: string;
  bud: string;
  quarter: string;
  mkt_expense: number;
  total_lead: number;
  quality_lead: number;
  booking: number;
  presale_livnex: number;
  revenue: number;
  cpl: number;
  cpql: number;
  mkt_pct_booking: number;
  mkt_pct_presale_livnex: number;
  mkt_pct_revenue: number;
}

interface FilterState {
  vp: string;
  mgr: string;
  project: string;
  quarter: string;
  bud: string;
}

function formatCurrency(num: number): string {
  if (num >= 1000000) {
    return `฿${(num / 1000000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  }
  return `฿${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function MarketingPerformancePage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    vp: '', mgr: '', project: '', quarter: '', bud: ''
  });

  const loadData = async (f: FilterState) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.vp) params.append('vp', f.vp);
      if (f.mgr) params.append('mgr', f.mgr);
      if (f.bud) params.append('bud', f.bud);
      if (f.quarter) params.append('quarter', f.quarter);
      if (f.project) params.append('project', f.project);

      const [summaryRes, projectsRes] = await Promise.all([
        fetch(`http://localhost:3001/api/sales-2025/marketing-summary?${params}`),
        fetch(`http://localhost:3001/api/sales-2025/marketing-projects?${params}`)
      ]);
      const summaryData = await summaryRes.json();
      const projectsData = await projectsRes.json();
      setSummary(summaryData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't load on mount - let filter component trigger initial load with saved filters

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    loadData(newFilters);
  };

  // Calculate totals
  const totalMktExpense = summary.reduce((acc, s) => acc + Number(s.total_mkt_expense || 0), 0);
  const totalLead = summary.reduce((acc, s) => acc + Number(s.total_lead || 0), 0);
  const totalQualityLead = summary.reduce((acc, s) => acc + Number(s.total_quality_lead || 0), 0);
  const totalWalk = summary.reduce((acc, s) => acc + Number(s.total_walk || 0), 0);
  const totalBook = summary.reduce((acc, s) => acc + Number(s.total_book || 0), 0);
  const totalBooking = summary.reduce((acc, s) => acc + Number(s.total_booking || 0), 0);
  const totalPresaleLivnex = summary.reduce((acc, s) => acc + Number(s.total_presale_livnex || 0), 0);
  const totalRevenue = summary.reduce((acc, s) => acc + Number(s.total_revenue || 0), 0);

  // Sum CPL/CPQL from all quarters (not average)
  const cpl = summary.reduce((acc, s) => acc + Number(s.avg_cpl || 0), 0);
  const cpql = summary.reduce((acc, s) => acc + Number(s.avg_cpql || 0), 0);

  // Sum MKT % from all quarters (not average)
  const mktPctBooking = summary.reduce((acc, s) => acc + Number(s.avg_mkt_pct_booking || 0), 0) * 100;
  const mktPctPresale = totalPresaleLivnex > 0 ? (totalMktExpense / totalPresaleLivnex) * 100 : 0;
  const mktPctRevenue = summary.reduce((acc, s) => acc + Number(s.avg_mkt_pct_revenue || 0), 0) * 100;

  // Chart data for MKT Expense by Quarter
  const mktExpenseData = summary.map(s => ({
    quarter: s.quarter,
    'MKT Expense': Number(s.total_mkt_expense || 0),
  }));

  // Chart data for CPL/CPQL by Quarter (use DB values)
  const cplData = summary.map(s => ({
    quarter: s.quarter,
    'CPL': Number(s.avg_cpl || 0),
    'CPQL': Number(s.avg_cpql || 0),
  }));

  // Chart data for MKT % by Quarter (use DB values for Booking/Revenue, calculate Presale)
  const mktPctData = summary.map(s => {
    const mktExp = Number(s.total_mkt_expense || 0);
    const presaleLivnex = Number(s.total_presale_livnex || 0);
    return {
      quarter: s.quarter,
      '% Booking': Number(s.avg_mkt_pct_booking || 0) * 100,
      '% Presale+Livnex': presaleLivnex > 0 ? (mktExp / presaleLivnex) * 100 : 0,
      '% Revenue': Number(s.avg_mkt_pct_revenue || 0) * 100,
    };
  });

  // Chart data for Lead Funnel
  const leadFunnelData = summary.map(s => ({
    quarter: s.quarter,
    'Total Lead': Number(s.total_lead || 0),
    'Quality Lead': Number(s.total_quality_lead || 0),
    'Walk': Number(s.total_walk || 0),
    'Book': Number(s.total_book || 0),
  }));

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Marketing Performance 2025"
        subtitle="รายงาน Performance การตลาด - CPL, CPQL, MKT %"
      />

      <div className="p-8">
        <SalesPerformanceFilters onApply={handleApplyFilters} />

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
        <>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="MKT Expense (YTD)"
            value={formatCurrency(totalMktExpense)}
            change="ค่าใช้จ่าย Marketing"
            changeType="neutral"
            icon={DollarSign}
            color="orange"
          />
          <KPICard
            title="Total Lead"
            value={totalLead.toLocaleString()}
            change={`CPL: ฿${cpl.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            changeType="neutral"
            icon={Users}
            color="purple"
          />
          <KPICard
            title="Quality Lead"
            value={totalQualityLead.toLocaleString()}
            change={`CPQL: ฿${cpql.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            changeType="neutral"
            icon={Target}
            color="emerald"
          />
          <KPICard
            title="Lead Quality"
            value={`${totalLead.toLocaleString()} / ${totalQualityLead.toLocaleString()}`}
            change={`Quality Rate: ${totalLead > 0 ? ((totalQualityLead / totalLead) * 100).toFixed(1) : 0}%`}
            changeType={totalLead > 0 ? (((totalQualityLead / totalLead) * 100) >= 80 ? 'positive' : ((totalQualityLead / totalLead) * 100) >= 60 ? 'warning' : 'negative') : 'neutral'}
            showArrow={false}
            icon={TrendingDown}
            color="slate"
          />
        </div>

        {/* MKT Expense by Quarter - Simple Cards with Mini Charts */}
        <div className="mb-6">
          <div className="card">
            <div className="mb-4">
              <h3 className="font-semibold text-slate-800">MKT Expense by Quarter</h3>
              <p className="text-sm text-slate-500">เปรียบเทียบค่าใช้จ่าย Marketing กับยอดขาย</p>
            </div>

            {/* Find max values for mini bars */}
            {(() => {
              const maxPresaleTarget = Math.max(...summary.map(s => Number(s.total_presale_target || 0)));
              const maxRevenueTarget = Math.max(...summary.map(s => Number(s.total_revenue_target || 0)));

              // Calculate totals for YTD card
              const totalMktExp = summary.reduce((acc, s) => acc + Number(s.total_mkt_expense || 0), 0);
              const totalBookingYTD = summary.reduce((acc, s) => acc + Number(s.total_booking || 0), 0);
              const totalPresaleTargetYTD = summary.reduce((acc, s) => acc + Number(s.total_presale_target || 0), 0);
              const totalPresaleYTD = summary.reduce((acc, s) => acc + Number(s.total_presale_livnex || 0), 0);
              const totalRevenueTargetYTD = summary.reduce((acc, s) => acc + Number(s.total_revenue_target || 0), 0);
              const totalRevenueYTD = summary.reduce((acc, s) => acc + Number(s.total_revenue || 0), 0);
              const pctBookingYTD = totalBookingYTD > 0 ? (totalMktExp / totalBookingYTD) * 100 : 0;
              const pctPresaleYTD = totalPresaleYTD > 0 ? (totalMktExp / totalPresaleYTD) * 100 : 0;
              const pctRevenueYTD = totalRevenueYTD > 0 ? (totalMktExp / totalRevenueYTD) * 100 : 0;

              return (
                <div className="grid grid-cols-5 gap-4">
                  {/* YTD Total Card - First */}
                  <div className="bg-blue-50 rounded-xl border border-blue-100 overflow-hidden">
                    {/* Header */}
                    <div className="bg-blue-100 px-4 py-3">
                      <div className="font-semibold text-sm text-blue-700">YTD</div>
                      <div className="text-xl font-bold text-blue-800 mt-1">{formatCurrency(totalMktExp)}</div>
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-4">
                      {/* Booking */}
                      <div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Booking</span>
                          <span className="font-semibold text-slate-800">{formatCurrency(totalBookingYTD)}</span>
                        </div>
                        <div className="text-right text-xs text-purple-600">MKT {pctBookingYTD.toFixed(2)}%</div>
                      </div>

                      {/* Presale with Target */}
                      <div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Presale</span>
                          <span className="font-semibold text-slate-800">{formatCurrency(totalPresaleYTD)}</span>
                        </div>
                        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
                          <div className="absolute h-full bg-slate-300 rounded-full" style={{ width: '100%' }} />
                          <div className="absolute h-full bg-emerald-400 rounded-full" style={{ width: `${totalPresaleTargetYTD > 0 ? Math.min((totalPresaleYTD / totalPresaleTargetYTD) * 100, 100) : 0}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                          <span>Target: {formatCurrency(totalPresaleTargetYTD)}</span>
                          <span className="text-emerald-600">MKT {pctPresaleYTD.toFixed(2)}%</span>
                        </div>
                      </div>

                      {/* Revenue with Target */}
                      <div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Revenue</span>
                          <span className="font-semibold text-slate-800">{formatCurrency(totalRevenueYTD)}</span>
                        </div>
                        <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
                          <div className="absolute h-full bg-slate-300 rounded-full" style={{ width: '100%' }} />
                          <div className="absolute h-full bg-blue-400 rounded-full" style={{ width: `${totalRevenueTargetYTD > 0 ? Math.min((totalRevenueYTD / totalRevenueTargetYTD) * 100, 100) : 0}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                          <span>Target: {formatCurrency(totalRevenueTargetYTD)}</span>
                          <span className="text-blue-600">MKT {pctRevenueYTD.toFixed(2)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quarterly Cards - Always show Q1-Q4 */}
                  {['Q1', 'Q2', 'Q3', 'Q4'].map((quarter, idx) => {
                    const s = summary.find(item => item.quarter === quarter);
                    const mktExp = s ? Number(s.total_mkt_expense || 0) : 0;
                    const booking = s ? Number(s.total_booking || 0) : 0;
                    const presaleTarget = s ? Number(s.total_presale_target || 0) : 0;
                    const presale = s ? Number(s.total_presale_livnex || 0) : 0;
                    const revenueTarget = s ? Number(s.total_revenue_target || 0) : 0;
                    const revenue = s ? Number(s.total_revenue || 0) : 0;
                    const pctBooking = s ? Number(s.avg_mkt_pct_booking || 0) * 100 : 0;
                    const pctPresale = s ? Number(s.avg_mkt_pct_presale_livnex || 0) * 100 : 0;
                    const pctRevenue = s ? Number(s.avg_mkt_pct_revenue || 0) * 100 : 0;

                    // QoQ calculations (compare with previous quarter)
                    const prevQuarter = ['Q1', 'Q2', 'Q3', 'Q4'][idx - 1];
                    const prevData = prevQuarter ? summary.find(item => item.quarter === prevQuarter) : null;
                    const prevMktExp = prevData ? Number(prevData.total_mkt_expense || 0) : 0;
                    const prevPresale = prevData ? Number(prevData.total_presale_livnex || 0) : 0;
                    const prevRevenue = prevData ? Number(prevData.total_revenue || 0) : 0;

                    const qoqMkt = idx > 0 && prevMktExp > 0 ? ((mktExp - prevMktExp) / prevMktExp) * 100 : null;
                    const qoqPresale = idx > 0 && prevPresale > 0 ? ((presale - prevPresale) / prevPresale) * 100 : null;
                    const qoqRevenue = idx > 0 && prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null;

                    return (
                      <div key={quarter} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                        {/* Header */}
                        <div className="bg-slate-50 px-4 py-3">
                          <div className="font-semibold text-sm text-slate-600">{quarter}</div>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-xl font-bold text-slate-800">{formatCurrency(mktExp)}</span>
                            {qoqMkt !== null ? (
                              <span className={`flex items-center gap-0.5 text-xs font-semibold ${
                                qoqMkt >= 0 ? 'text-red-500' : 'text-emerald-600'
                              }`}>
                                {qoqMkt >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                {Math.abs(qoqMkt).toFixed(1)}%
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Body */}
                        <div className="p-4 space-y-4">
                          {/* Booking */}
                          <div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500">Booking</span>
                              <span className="font-semibold text-slate-800">{formatCurrency(booking)}</span>
                            </div>
                            <div className="text-right text-xs text-purple-600">MKT {pctBooking.toFixed(2)}%</div>
                          </div>

                          {/* Presale with Target */}
                          <div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500">Presale</span>
                              <div className="flex items-baseline gap-1">
                                <span className="font-semibold text-slate-800">{formatCurrency(presale)}</span>
                                {qoqPresale !== null ? (
                                  <span className={`flex items-center text-[10px] font-semibold ${qoqPresale >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {qoqPresale >= 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                                    {Math.abs(qoqPresale).toFixed(0)}%
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
                              <div className="absolute h-full bg-slate-300 rounded-full" style={{ width: `${Math.min((presaleTarget / maxPresaleTarget) * 100, 100)}%` }} />
                              <div className="absolute h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min((presale / maxPresaleTarget) * 100, 100)}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                              <span>Target: {formatCurrency(presaleTarget)}</span>
                              <span className="text-emerald-600">MKT {pctPresale.toFixed(2)}%</span>
                            </div>
                          </div>

                          {/* Revenue with Target */}
                          <div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500">Revenue</span>
                              <div className="flex items-baseline gap-1">
                                <span className="font-semibold text-slate-800">{formatCurrency(revenue)}</span>
                                {qoqRevenue !== null ? (
                                  <span className={`flex items-center text-[10px] font-semibold ${qoqRevenue >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {qoqRevenue >= 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
                                    {Math.abs(qoqRevenue).toFixed(0)}%
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden mt-1">
                              <div className="absolute h-full bg-slate-300 rounded-full" style={{ width: `${Math.min((revenueTarget / maxRevenueTarget) * 100, 100)}%` }} />
                              <div className="absolute h-full bg-blue-400 rounded-full" style={{ width: `${Math.min((revenue / maxRevenueTarget) * 100, 100)}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                              <span>Target: {formatCurrency(revenueTarget)}</span>
                              <span className="text-blue-600">MKT {pctRevenue.toFixed(2)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Lead Conversion Funnel - Inside same card */}
            <LeadFunnelCards
              totals={{ lead: totalLead, ql: totalQualityLead, walk: totalWalk, book: totalBook }}
              quarters={['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => {
                const s = summary.find(item => item.quarter === quarter);
                return {
                  quarter,
                  totalLead: s ? Number(s.total_lead || 0) : 0,
                  qualityLead: s ? Number(s.total_quality_lead || 0) : 0,
                  walk: s ? Number(s.total_walk || 0) : 0,
                  book: s ? Number(s.total_book || 0) : 0,
                };
              })}
              embedded
            />
          </div>
        </div>

        {/* Project Detail Table - Top 10 by MKT Expense (aggregated by project) */}
        {(() => {
          // Aggregate data by project_code (sum across quarters)
          const projectMap = new Map<string, {
            project_code: string;
            project_name: string;
            mkt_expense: number;
            total_lead: number;
            quality_lead: number;
            walk: number;
            book: number;
            presale_livnex: number;
            revenue: number;
          }>();

          projects.forEach(row => {
            const code = row.project_code;
            if (!projectMap.has(code)) {
              projectMap.set(code, {
                project_code: code,
                project_name: row.project_name,
                mkt_expense: 0,
                total_lead: 0,
                quality_lead: 0,
                walk: 0,
                book: 0,
                presale_livnex: 0,
                revenue: 0,
              });
            }
            const proj = projectMap.get(code)!;
            proj.mkt_expense += Number(row.mkt_expense || 0);
            proj.total_lead += Number(row.total_lead || 0);
            proj.quality_lead += Number(row.quality_lead || 0);
            proj.presale_livnex += Number(row.presale_livnex || 0);
            proj.revenue += Number(row.revenue || 0);
          });

          // Transform to Top10MarketingTable format
          const tableProjects = Array.from(projectMap.values()).map(p => ({
            projectCode: p.project_code,
            projectName: p.project_name,
            totals: {
              mktExpense: p.mkt_expense,
              totalLead: p.total_lead,
              qualityLead: p.quality_lead,
              walk: totalWalk > 0 ? Math.round((p.quality_lead / totalQualityLead) * totalWalk) : 0,
              book: totalBook > 0 ? Math.round((p.quality_lead / totalQualityLead) * totalBook) : 0,
              presaleActual: p.presale_livnex,
              revenueActual: p.revenue,
            },
          }));

          return (
            <Top10MarketingTable
              projects={tableProjects}
              onRowClick={(projectCode) => navigate(`/sales-2025/project/${projectCode}`)}
              formatCurrency={formatCurrency}
              storageKey="mkt-performance-table"
            />
          );
        })()}
        </>
        )}
      </div>
    </div>
  );
}
