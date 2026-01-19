import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Users,
  Target,
  TrendingDown,
  TrendingUp,
  Search,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { PageHeader, KPICard } from '@shared/ui';
import { SalesPerformanceFilters } from './filters';

// Mini Bar Chart Component
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

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

function formatNumber(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0.00';
  if (n >= 1000000) {
    return `${(n / 1000000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  }
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllProjects, setShowAllProjects] = useState(false);
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
            changeType="positive"
            icon={DollarSign}
            color="orange"
          />
          <KPICard
            title="Total Lead"
            value={totalLead.toLocaleString()}
            change={`CPL: ฿${cpl.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            changeType="positive"
            icon={Users}
            color="purple"
          />
          <KPICard
            title="Quality Lead"
            value={totalQualityLead.toLocaleString()}
            change={`CPQL: ฿${cpql.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            changeType="positive"
            icon={Target}
            color="emerald"
          />
          <KPICard
            title="Lead Quality"
            value={`${totalLead.toLocaleString()} / ${totalQualityLead.toLocaleString()}`}
            change={`Quality Rate: ${totalLead > 0 ? ((totalQualityLead / totalLead) * 100).toFixed(1) : 0}%`}
            changeType={totalLead > 0 && (totalQualityLead / totalLead) >= 0.9 ? 'positive' : 'negative'}
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

              return (
                <div className="grid grid-cols-4 gap-4">
                  {summary.map((s, idx) => {
                    const mktExp = Number(s.total_mkt_expense || 0);
                    const booking = Number(s.total_booking || 0);
                    const presaleTarget = Number(s.total_presale_target || 0);
                    const presale = Number(s.total_presale_livnex || 0);
                    const revenueTarget = Number(s.total_revenue_target || 0);
                    const revenue = Number(s.total_revenue || 0);
                    const pctBooking = Number(s.avg_mkt_pct_booking || 0) * 100;
                    const pctPresale = Number(s.avg_mkt_pct_presale_livnex || 0) * 100;
                    const pctRevenue = Number(s.avg_mkt_pct_revenue || 0) * 100;

                    // QoQ calculations (compare with previous quarter)
                    const prevMktExp = idx > 0 ? Number(summary[idx - 1].total_mkt_expense || 0) : 0;
                    const prevPresale = idx > 0 ? Number(summary[idx - 1].total_presale_livnex || 0) : 0;
                    const prevRevenue = idx > 0 ? Number(summary[idx - 1].total_revenue || 0) : 0;

                    const qoqMkt = idx > 0 && prevMktExp > 0 ? ((mktExp - prevMktExp) / prevMktExp) * 100 : null;
                    const qoqPresale = idx > 0 && prevPresale > 0 ? ((presale - prevPresale) / prevPresale) * 100 : null;
                    const qoqRevenue = idx > 0 && prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null;

                    return (
                      <div key={s.quarter} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-white">
                          <div className="font-bold text-lg mb-1">{s.quarter}</div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold">{formatCurrency(mktExp)}</span>
                            {qoqMkt !== null ? (
                              <span className={`flex items-center gap-0.5 text-sm font-semibold ${
                                qoqMkt >= 0 ? 'text-red-200' : 'text-green-200'
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
          </div>
        </div>

        {/* Project Detail Table - Top 10 by MKT Expense (aggregated by project) */}
        {(() => {
          // Aggregate data by project_code (sum across quarters)
          const projectMap = new Map<string, {
            project_code: string;
            project_name: string;
            bud: string;
            quarters: string[];
            mkt_expense: number;
            total_lead: number;
            quality_lead: number;
            booking: number;
            presale_livnex: number;
            revenue: number;
            cpl: number;
            cpql: number;
          }>();

          projects.forEach(row => {
            const code = row.project_code;
            if (!projectMap.has(code)) {
              projectMap.set(code, {
                project_code: code,
                project_name: row.project_name,
                bud: row.bud,
                quarters: [],
                mkt_expense: 0,
                total_lead: 0,
                quality_lead: 0,
                booking: 0,
                presale_livnex: 0,
                revenue: 0,
                cpl: 0,
                cpql: 0,
              });
            }
            const proj = projectMap.get(code)!;
            proj.quarters.push(row.quarter);
            proj.mkt_expense += Number(row.mkt_expense || 0);
            proj.total_lead += Number(row.total_lead || 0);
            proj.quality_lead += Number(row.quality_lead || 0);
            proj.booking += Number(row.booking || 0);
            proj.presale_livnex += Number(row.presale_livnex || 0);
            proj.revenue += Number(row.revenue || 0);
          });

          // Calculate CPL and CPQL after aggregation
          projectMap.forEach(proj => {
            proj.cpl = proj.total_lead > 0 ? proj.mkt_expense / proj.total_lead : 0;
            proj.cpql = proj.quality_lead > 0 ? proj.mkt_expense / proj.quality_lead : 0;
          });

          // Sort by MKT expense descending
          const aggregatedProjects = Array.from(projectMap.values())
            .sort((a, b) => b.mkt_expense - a.mkt_expense);

          const filteredProjects = aggregatedProjects.filter(p =>
            p.project_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.project_name.toLowerCase().includes(searchTerm.toLowerCase())
          );

          const displayProjects = showAllProjects ? filteredProjects : filteredProjects.slice(0, 10);
          const hasMore = filteredProjects.length > 10;

          return (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-800">
                    {showAllProjects ? 'รายละเอียดโครงการทั้งหมด' : 'Top 10 โครงการที่ใช้ MKT Expense สูงสุด'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {showAllProjects
                      ? `แสดงทั้งหมด ${filteredProjects.length} รายการ`
                      : `เรียงตาม MKT Expense มากไปน้อย (${filteredProjects.length} โครงการ)`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {showAllProjects && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="ค้นหาโครงการ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  )}
                  {hasMore && (
                    <button
                      onClick={() => setShowAllProjects(!showAllProjects)}
                      className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                    >
                      {showAllProjects ? 'แสดง Top 10' : 'ดูทั้งหมด'}
                    </button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-center py-3 px-2 font-semibold text-slate-600 w-10">#</th>
                      <th className="text-left py-3 px-3 font-semibold text-slate-600">Project</th>
                      <th className="text-left py-3 px-3 font-semibold text-slate-600">BUD</th>
                      <th className="text-center py-3 px-3 font-semibold text-slate-600">Quarters</th>
                      <th className="text-right py-3 px-3 font-semibold text-slate-600">MKT Expense</th>
                      <th className="text-right py-3 px-3 font-semibold text-slate-600">Lead</th>
                      <th className="text-right py-3 px-3 font-semibold text-slate-600">Q.Lead</th>
                      <th className="text-right py-3 px-3 font-semibold text-slate-600">CPL</th>
                      <th className="text-right py-3 px-3 font-semibold text-slate-600">CPQL</th>
                      <th className="text-right py-3 px-3 font-semibold text-purple-700">Booking</th>
                      <th className="text-right py-3 px-3 font-semibold text-purple-500 bg-purple-50">MKT%</th>
                      <th className="text-right py-3 px-3 font-semibold text-emerald-700">Presale</th>
                      <th className="text-right py-3 px-3 font-semibold text-emerald-500 bg-emerald-50">MKT%</th>
                      <th className="text-right py-3 px-3 font-semibold text-blue-700">Revenue</th>
                      <th className="text-right py-3 px-3 font-semibold text-blue-500 bg-blue-50">MKT%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayProjects.map((row, idx) => {
                      // Calculate MKT % from aggregated values
                      const pctBooking = row.booking > 0 ? (row.mkt_expense / row.booking) * 100 : 0;
                      const pctPresale = row.presale_livnex > 0 ? (row.mkt_expense / row.presale_livnex) * 100 : 0;
                      const pctRevenue = row.revenue > 0 ? (row.mkt_expense / row.revenue) * 100 : 0;
                      return (
                        <tr
                          key={`${row.project_code}-${idx}`}
                          className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                          onClick={() => navigate(`/sales-2025/project/${row.project_code}`)}
                        >
                          <td className="py-2 px-2 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              idx < 3 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-medium text-blue-600 hover:underline">{row.project_code}</div>
                            <div className="text-xs text-slate-500">{row.project_name}</div>
                          </td>
                          <td className="py-2 px-3 text-slate-600">{row.bud}</td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex flex-wrap gap-1 justify-center">
                              {[...new Set(row.quarters)].sort().map(q => (
                                <span key={q} className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-medium">{q}</span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right text-orange-600 font-medium">{formatCurrency(row.mkt_expense)}</td>
                          <td className="py-2 px-3 text-right">{row.total_lead.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right">{row.quality_lead.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-slate-600">฿{row.cpl.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                          <td className="py-2 px-3 text-right text-slate-600">฿{row.cpql.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                          <td className="py-2 px-3 text-right text-purple-700 font-medium">{formatCurrency(row.booking)}</td>
                          <td className="py-2 px-3 text-right text-purple-500 text-xs bg-purple-50">{pctBooking.toFixed(2)}%</td>
                          <td className="py-2 px-3 text-right text-emerald-700 font-medium">{formatCurrency(row.presale_livnex)}</td>
                          <td className="py-2 px-3 text-right text-emerald-500 text-xs bg-emerald-50">{pctPresale.toFixed(2)}%</td>
                          <td className="py-2 px-3 text-right text-blue-700 font-medium">{formatCurrency(row.revenue)}</td>
                          <td className="py-2 px-3 text-right text-blue-500 text-xs bg-blue-50">{pctRevenue.toFixed(2)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!showAllProjects && hasMore && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowAllProjects(true)}
                    className="px-6 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                  >
                    ดูทั้งหมด ({filteredProjects.length} โครงการ)
                  </button>
                </div>
              )}
            </div>
          );
        })()}
        </>
        )}
      </div>
    </div>
  );
}
