import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Users,
  Target,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Building,
  BookCheck,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
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

interface MonthlyMetric {
  month: string;
  mktExpense: number;
  totalLead: number;
  qualityLead: number;
  leadBook: number;
  cpl: number;
  cpql: number;
  cpb: number;
}

export function MarketingPerformancePage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [monthlyMetrics, setMonthlyMetrics] = useState<MonthlyMetric[]>([]);
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

      // Use the new v2 APIs - get both quarterly summary and marketing details
      const [summaryRes, marketingRes] = await Promise.all([
        fetch(`http://localhost:3001/api/sales-2025-v2/summary?${params}`),
        fetch(`http://localhost:3001/api/sales-2025-v2/marketing?${params}`)
      ]);
      const summaryData = await summaryRes.json();
      const marketingData = await marketingRes.json();

      // Transform monthly summary data to quarterly format
      // API returns array of months: [{month, presaleTarget, booking, livnex, contract, revenueTarget, revenue, mktExpense, totalLead, qualityLead, leadWalk, leadBook}]
      const quarterMonths: Record<string, string[]> = {
        Q1: ['Jan', 'Feb', 'Mar'],
        Q2: ['Apr', 'May', 'Jun'],
        Q3: ['Jul', 'Aug', 'Sep'],
        Q4: ['Oct', 'Nov', 'Dec'],
      };

      const transformedSummary: SummaryRow[] = ['Q1', 'Q2', 'Q3', 'Q4'].map(quarter => {
        const months = quarterMonths[quarter];
        const qData = (summaryData || []).filter((m: Record<string, unknown>) => months.includes(m.month as string));

        const mktExp = qData.reduce((sum: number, m: Record<string, unknown>) => sum + Number(m.mktExpense || 0), 0);
        const booking = qData.reduce((sum: number, m: Record<string, unknown>) => sum + Number(m.booking || 0), 0);
        const livnex = qData.reduce((sum: number, m: Record<string, unknown>) => sum + Number(m.livnex || 0), 0);
        const contract = qData.reduce((sum: number, m: Record<string, unknown>) => sum + Number(m.contract || 0), 0);
        const presaleActual = booking + livnex + contract;
        const revenue = qData.reduce((sum: number, m: Record<string, unknown>) => sum + Number(m.revenue || 0), 0);
        const totalLead = qData.reduce((sum: number, m: Record<string, unknown>) => sum + Number(m.totalLead || 0), 0);
        const qualityLead = qData.reduce((sum: number, m: Record<string, unknown>) => sum + Number(m.qualityLead || 0), 0);
        const presaleTarget = qData.reduce((sum: number, m: Record<string, unknown>) => sum + Number(m.presaleTarget || 0), 0);
        const revenueTarget = qData.reduce((sum: number, m: Record<string, unknown>) => sum + Number(m.revenueTarget || 0), 0);
        const leadWalk = qData.reduce((sum: number, m: Record<string, unknown>) => sum + Number(m.leadWalk || 0), 0);
        const leadBook = qData.reduce((sum: number, m: Record<string, unknown>) => sum + Number(m.leadBook || 0), 0);
        const projectCount = qData.length > 0 ? Number((qData[0] as Record<string, unknown>).projectCount || 0) : 0;

        return {
          quarter,
          project_count: projectCount,
          total_mkt_expense: mktExp,
          total_lead: totalLead,
          total_quality_lead: qualityLead,
          total_walk: leadWalk,
          total_book: leadBook,
          total_booking: booking,
          total_presale_target: presaleTarget,
          total_presale_livnex: presaleActual,
          total_revenue_target: revenueTarget,
          total_revenue: revenue,
          avg_cpl: totalLead > 0 ? mktExp / totalLead : 0,
          avg_cpql: qualityLead > 0 ? mktExp / qualityLead : 0,
          avg_mkt_pct_booking: booking > 0 ? mktExp / booking : 0,
          avg_mkt_pct_presale_livnex: presaleActual > 0 ? mktExp / presaleActual : 0,
          avg_mkt_pct_revenue: revenue > 0 ? mktExp / revenue : 0,
        };
      });

      setSummary(transformedSummary);

      // Calculate monthly CPL/CPQL/CPB for line chart
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyData: MonthlyMetric[] = monthOrder.map(month => {
        const m = (summaryData || []).find((item: Record<string, unknown>) => item.month === month);
        const mktExp = m ? Number(m.mktExpense || 0) : 0;
        const totalLead = m ? Number(m.totalLead || 0) : 0;
        const qualityLead = m ? Number(m.qualityLead || 0) : 0;
        const leadBook = m ? Number(m.leadBook || 0) : 0;
        return {
          month,
          mktExpense: mktExp,
          totalLead,
          qualityLead,
          leadBook,
          cpl: totalLead > 0 ? mktExp / totalLead : 0,
          cpql: qualityLead > 0 ? mktExp / qualityLead : 0,
          cpb: leadBook > 0 ? mktExp / leadBook : 0,
        };
      });
      setMonthlyMetrics(monthlyData);

      // Transform projects from marketing API
      const transformedProjects: ProjectRow[] = (marketingData.projects || []).map((p: Record<string, unknown>) => ({
        project_code: p.project_code as string || '',
        project_name: p.project_name as string || '',
        bud: p.bud as string || '',
        quarter: 'YTD',
        mkt_expense: Number(p.mkt_expense || 0),
        total_lead: Number(p.total_lead || 0),
        quality_lead: Number(p.quality_lead || 0),
        booking: Number(p.booking || 0),
        presale_livnex: Number(p.presale_actual || 0),
        revenue: Number(p.revenue_actual || 0),
        cpl: Number(p.cpl || 0),
        cpql: Number(p.cpql || 0),
        mkt_pct_booking: Number(p.mkt_pct_booking || 0),
        mkt_pct_presale_livnex: Number(p.mkt_pct_presale || 0),
        mkt_pct_revenue: Number(p.mkt_pct_revenue || 0),
      }));
      setProjects(transformedProjects);
    } catch (error) {
      console.error('Error fetching data:', error);
      setSummary([]);
      setProjects([]);
      setMonthlyMetrics([]);
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
  const projectCount = new Set(projects.map(p => p.project_code)).size;
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
  const cpb = totalBook > 0 ? totalMktExpense / totalBook : 0;

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <KPICard
            title="Projects"
            value={projectCount.toString()}
            change={`${projects.length} records`}
            changeType="neutral"
            subtext=" "
            icon={Building}
            color="slate"
          />
          <KPICard
            title="MKT Expense (YTD)"
            value={formatCurrency(totalMktExpense)}
            change="+฿0 จากเดือนก่อน"
            changeType="neutral"
            showArrow={false}
            subtext="ค่าใช้จ่าย Marketing"
            icon={DollarSign}
            color="orange"
          />
          <KPICard
            title="Total Lead"
            value={totalLead.toLocaleString()}
            change="+0 จากเดือนก่อน"
            changeType="neutral"
            showArrow={false}
            subtext={`CPL: ฿${cpl.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            icon={Users}
            color="purple"
          />
          <KPICard
            title="Quality Lead"
            value={totalQualityLead.toLocaleString()}
            change="+0 จากเดือนก่อน"
            changeType="neutral"
            showArrow={false}
            subtext={`CPQL: ฿${cpql.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            icon={Target}
            color="emerald"
          />
          <KPICard
            title="CPB (Cost/Book)"
            value={`฿${cpb.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            change="+฿0 จากเดือนก่อน"
            changeType="neutral"
            showArrow={false}
            subtext={`${totalBook.toLocaleString()} Bookings`}
            icon={BookCheck}
            color="blue"
          />
          <KPICard
            title="Lead Quality"
            value={`${totalLead > 0 ? ((totalQualityLead / totalLead) * 100).toFixed(1) : 0}%`}
            change="+0% จากเดือนก่อน"
            changeType="neutral"
            showArrow={false}
            subtext={`${totalLead.toLocaleString()} Lead → ${totalQualityLead.toLocaleString()} QL`}
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

                      {/* Contract with Target */}
                      <div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">Contract</span>
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

                          {/* Contract with Target */}
                          <div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500">Contract</span>
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

            {/* CPL/CPQL/CPB Monthly Trend Chart */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-800">CPL / CPQL / CPB Monthly Trend</h3>
                <p className="text-sm text-slate-500">ค่าใช้จ่ายต่อหน่วยรายเดือน (บาท)</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyMetrics} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}K` : value.toFixed(0)}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `฿${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                        name
                      ]}
                      labelStyle={{ fontSize: 11, fontWeight: 600 }}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11, padding: '8px 12px' }}
                      itemStyle={{ fontSize: 11, padding: '2px 0' }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="left"
                      height={28}
                      wrapperStyle={{ fontSize: 11, paddingLeft: 0 }}
                      content={() => (
                        <div className="flex justify-start gap-4 mb-2">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: '#8b5cf6' }} />
                            <span className="text-[10px] text-slate-600">CPL</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: '#f97316' }} />
                            <span className="text-[10px] text-slate-600">CPQL</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: '#3b82f6' }} />
                            <span className="text-[10px] text-slate-600">CPB</span>
                          </div>
                        </div>
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey="cpl"
                      name="CPL"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', strokeWidth: 1, r: 3 }}
                      activeDot={{ r: 5 }}
                    >
                      <LabelList
                        position="top"
                        fontSize={7}
                        fill="#8b5cf6"
                        formatter={(v: number) => v > 0 ? `${(v / 1000).toFixed(0)}K` : ''}
                      />
                    </Line>
                    <Line
                      type="monotone"
                      dataKey="cpql"
                      name="CPQL"
                      stroke="#f97316"
                      strokeWidth={2}
                      dot={{ fill: '#f97316', strokeWidth: 1, r: 3 }}
                      activeDot={{ r: 5 }}
                    >
                      <LabelList
                        position="top"
                        fontSize={7}
                        fill="#f97316"
                        formatter={(v: number) => v > 0 ? `${(v / 1000).toFixed(0)}K` : ''}
                      />
                    </Line>
                    <Line
                      type="monotone"
                      dataKey="cpb"
                      name="CPB"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 1, r: 3 }}
                      activeDot={{ r: 5 }}
                    >
                      <LabelList
                        position="top"
                        fontSize={7}
                        fill="#3b82f6"
                        formatter={(v: number) => v > 0 ? `${(v / 1000).toFixed(0)}K` : ''}
                      />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
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
