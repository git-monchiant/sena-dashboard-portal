import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@shared/ui';
import { SiteFilters, SiteFilterValues } from '../components';
import { fetchCollectionByProject, CollectionByProjectData, fetchInvoiceSummary, InvoiceSummaryData } from '../overview/queries';
import { FileText, CheckCircle, Clock, XCircle, Building2, Search, ArrowRight } from 'lucide-react';

export function ProjectCollectionPage() {
  const [collectionByProject, setCollectionByProject] = useState<CollectionByProjectData | null>(null);
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projectSortBy, setProjectSortBy] = useState<'collectionRate' | 'outstandingRate' | 'paidAmount' | 'outstanding' | 'totalAmount' | 'cumulativeOutstanding' | 'cumulativeTotal' | 'cumulativePaid'>(() => {
    try {
      const saved = localStorage.getItem('common-fee-project-sort-by');
      if (saved === 'collectionRate' || saved === 'outstandingRate' || saved === 'paidAmount' || saved === 'outstanding' || saved === 'totalAmount' || saved === 'cumulativeOutstanding' || saved === 'cumulativeTotal' || saved === 'cumulativePaid') return saved;
      return 'collectionRate';
    } catch {
      return 'collectionRate';
    }
  });
  const [showAllProjects, setShowAllProjects] = useState(() => {
    try {
      return localStorage.getItem('common-fee-show-all-projects') === 'true';
    } catch {
      return false;
    }
  });
  const [searchTerm, setSearchTerm] = useState(() => {
    try {
      return localStorage.getItem('common-fee-projects-search') || '';
    } catch {
      return '';
    }
  });

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    try {
      localStorage.setItem('common-fee-projects-search', value);
    } catch {
      // ignore
    }
  };

  const handleProjectSortChange = (value: 'collectionRate' | 'outstandingRate' | 'paidAmount' | 'outstanding' | 'totalAmount' | 'cumulativeOutstanding' | 'cumulativeTotal' | 'cumulativePaid') => {
    setProjectSortBy(value);
    try {
      localStorage.setItem('common-fee-project-sort-by', value);
    } catch {
      // ignore
    }
  };

  const handleToggleShowAll = () => {
    const newValue = !showAllProjects;
    setShowAllProjects(newValue);
    try {
      localStorage.setItem('common-fee-show-all-projects', String(newValue));
    } catch {
      // ignore
    }
  };

  const loadData = async (filters: SiteFilterValues) => {
    setIsLoading(true);
    try {
      const [projectResult, invoiceResult] = await Promise.all([
        fetchCollectionByProject(filters),
        fetchInvoiceSummary(filters).catch(() => null),
      ]);
      setCollectionByProject(projectResult);
      setInvoiceSummary(invoiceResult);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = (filters: SiteFilterValues) => {
    loadData(filters);
  };

  // Memoize project chart data to prevent flickering on re-render
  const projectChartData = useMemo(() => {
    if (!collectionByProject || collectionByProject.projects.length === 0) {
      return null;
    }

    // Filter by search term
    const searchLower = searchTerm.toLowerCase().trim();
    const filteredBySearch = searchLower
      ? collectionByProject.projects.filter(p => p.name.toLowerCase().includes(searchLower))
      : collectionByProject.projects;

    // Sort projects based on projectSortBy
    const sortedProjects = [...filteredBySearch].sort((a, b) => {
      const outA = a.overdueAmount;
      const outB = b.overdueAmount;
      const outPctA = a.totalAmount > 0 ? (outA / a.totalAmount) * 100 : 0;
      const outPctB = b.totalAmount > 0 ? (outB / b.totalAmount) * 100 : 0;

      if (projectSortBy === 'collectionRate') return b.collectionRate - a.collectionRate;
      if (projectSortBy === 'outstandingRate') return outPctB - outPctA;
      if (projectSortBy === 'paidAmount') return b.paidAmount - a.paidAmount;
      if (projectSortBy === 'outstanding') return outB - outA;
      if (projectSortBy === 'cumulativeOutstanding') {
        const cumA = (a.cumulative?.totalAmount || 0) - (a.cumulative?.paidAmount || 0);
        const cumB = (b.cumulative?.totalAmount || 0) - (b.cumulative?.paidAmount || 0);
        return cumB - cumA;
      }
      if (projectSortBy === 'cumulativeTotal') {
        return (b.cumulative?.totalAmount || 0) - (a.cumulative?.totalAmount || 0);
      }
      if (projectSortBy === 'cumulativePaid') {
        return (b.cumulative?.paidAmount || 0) - (a.cumulative?.paidAmount || 0);
      }
      // totalAmount
      return b.totalAmount - a.totalAmount;
    });

    const condoCount = collectionByProject.projects.filter(p => p.isCondo === true || p.projectType === 'condominium').length;
    const lowriseCount = collectionByProject.projects.filter(p => p.isCondo !== true && p.projectType !== 'condominium').length;

    // Years for cumulative calculation
    const years = (collectionByProject.years || [collectionByProject.year]).slice().reverse();

    // Pre-compute chart data
    const chartData = sortedProjects.map(p => {
      // Use all-time cumulative data from backend
      const cum = p.cumulative || { totalAmount: 0, paidAmount: 0, overdueAmount: 0 };
      const cumTotal = cum.totalAmount;
      const cumPaid = cum.paidAmount;
      const cumOverdue = cum.overdueAmount;
      const cumRateRaw = cumTotal > 0 ? (cumPaid / cumTotal) * 100 : 0;
      const cumRate = Math.round(cumRateRaw * 100) / 100; // 2 decimal places
      const outstanding = cumOverdue; // ค้าง = overdue amount (ตรงกับ KPI ค้างสะสม)
      const outstandingPct = cumTotal > 0 ? Math.round((100 - cumRate) * 100) / 100 : 0; // 2 decimal places
      // Format amount for label
      const amountLabel = p.paidAmount >= 1000000
        ? `${(p.paidAmount / 1000000).toFixed(1)}M`
        : p.paidAmount >= 1000
        ? `${(p.paidAmount / 1000).toFixed(0)}K`
        : p.paidAmount.toLocaleString();
      return {
        ...p,
        displayName: p.name.length > 20 ? p.name.slice(0, 20) + '...' : p.name,
        outstanding,
        outstandingPct,
        cumTotal,
        cumPaid,
        cumOverdue,
        cumRate,
        labelText: `${cumRate}% (฿${amountLabel})`
      };
    });

    return {
      sortedProjects,
      condoCount,
      lowriseCount,
      chartData,
      year: collectionByProject.year,
      years,
      totalCount: collectionByProject.projects.length,
      hasApiData: true, // Indicate we have data from API
    };
  }, [collectionByProject, projectSortBy, searchTerm]);

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Overview"
        subtitle="อัตราการเก็บเงินส่วนกลาง รายโครงการ"
      />

      <div className="p-8">
        {/* Filters - hide project dropdown since this is project list page */}
        <SiteFilters
          onApply={handleApplyFilters}
          storageKey="common-fee-filters"
          showYear={true}
          showStatus={false}
          showSite={true}
        />

        {/* Summary Cards */}
        {invoiceSummary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {/* จำนวนโครงการ */}
          <div className="card text-left bg-indigo-600">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-indigo-500 text-white rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-bold text-white text-left">
              {collectionByProject?.projects?.length || 0}
            </p>
            <p className="text-xs text-indigo-200 mb-1 text-left">
              {projectChartData?.condoCount || 0} คอนโด / {projectChartData?.lowriseCount || 0} แนวราบ
            </p>
            <p className="text-xs text-indigo-100 font-medium text-left">จำนวนโครงการ</p>
          </div>

          {/* ทั้งหมด */}
          <div className="card text-left">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">100%</span>
            </div>
            <p className="text-xl font-bold text-slate-800 text-left">
              ฿{invoiceSummary.total.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-slate-400 mb-1 text-left">{invoiceSummary.total.unitCount.toLocaleString()} ยูนิต ({invoiceSummary.total.count.toLocaleString()} inv)</p>
            <p className="text-xs text-slate-500 font-medium text-left">ทั้งหมด</p>
          </div>

          {/* ชำระแล้ว */}
          <div className="card text-left">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                {invoiceSummary.total.amount > 0 ? (invoiceSummary.paid.amount / invoiceSummary.total.amount * 100).toFixed(0) : 0}%
              </span>
            </div>
            <p className="text-xl font-bold text-emerald-600 text-left">
              ฿{invoiceSummary.paid.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-emerald-500 mb-1 text-left">{invoiceSummary.paid.unitCount.toLocaleString()} ยูนิต ({invoiceSummary.paid.count.toLocaleString()} inv)</p>
            <p className="text-xs text-slate-500 font-medium text-left">ชำระแล้ว (paid)</p>
          </div>

          {/* ชำระบางส่วน */}
          <div className="card text-left">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                {invoiceSummary.total.amount > 0 ? (invoiceSummary.partial.amount / invoiceSummary.total.amount * 100).toFixed(0) : 0}%
              </span>
            </div>
            <p className="text-xl font-bold text-blue-600 text-left">
              ฿{invoiceSummary.partial.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-blue-500 mb-1 text-left">{invoiceSummary.partial.unitCount.toLocaleString()} ยูนิต ({invoiceSummary.partial.count.toLocaleString()} inv)</p>
            <p className="text-xs text-slate-500 font-medium text-left">ชำระบางส่วน (partial_payment)</p>
          </div>

          {/* ค้างในรอบ */}
          <Link to="/reports/common-fee/aging" className="card text-left hover:ring-2 hover:ring-orange-300 transition-all cursor-pointer block">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                  {invoiceSummary.total.amount > 0 ? (invoiceSummary.overdue.amount / invoiceSummary.total.amount * 100).toFixed(0) : 0}%
                </span>
                <ArrowRight className="w-4 h-4 text-orange-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-orange-600 text-left">
              ฿{invoiceSummary.overdue.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-orange-500 mb-1 text-left">
              {invoiceSummary.overdue.unitCount.toLocaleString()} ยูนิต ({invoiceSummary.overdue.count.toLocaleString()} inv)
            </p>
            <p className="text-xs text-slate-500 font-medium text-left">ค้างในรอบ</p>
          </Link>

          {/* ค้างสะสม */}
          <Link to="/reports/common-fee/aging" className="card text-left hover:ring-2 hover:ring-red-300 transition-all cursor-pointer block">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
              <ArrowRight className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-xl font-bold text-red-600 text-left">
              ฿{(invoiceSummary.overdueCumulative?.amount || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-red-500 mb-1 text-left">
              {(invoiceSummary.overdueCumulative?.unitCount || 0).toLocaleString()} ยูนิต ({(invoiceSummary.overdueCumulative?.count || 0).toLocaleString()} inv)
            </p>
            <p className="text-xs text-slate-500 font-medium text-left">ค้างสะสม (ถึง {invoiceSummary?.selectedYear})</p>
          </Link>
        </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="animate-pulse space-y-6">
            <div className="h-64 bg-slate-200 rounded-xl" />
          </div>
        )}

        {/* Main Content */}
        {!isLoading && projectChartData && projectChartData.hasApiData && (() => {
          const displayList = showAllProjects ? projectChartData.chartData : projectChartData.chartData.slice(0, 10);
          const hasMore = projectChartData.chartData.length > 10;
          const hasSearchResults = projectChartData.chartData.length > 0;
          return (
          <div className="card">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h3 className="font-semibold text-slate-800">
                  {showAllProjects ? 'อัตราเก็บเงิน รายโครงการ' : 'Top 10 อัตราเก็บเงิน รายโครงการ'}
                </h3>
                <p className="text-sm text-slate-500">
                  แสดงอัตราเก็บเงินรายปีและเก็บสะสมทุกปี (ปี {projectChartData.year})
                  {!showAllProjects && hasMore && ` - แสดง 10 จาก ${projectChartData.chartData.length} โครงการ`}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="ค้นหาโครงการ..."
                    className="pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-48"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">เรียงตาม:</span>
                  <select
                    value={projectSortBy}
                    onChange={(e) => handleProjectSortChange(e.target.value as 'collectionRate' | 'outstandingRate' | 'paidAmount' | 'outstanding' | 'totalAmount' | 'cumulativeOutstanding' | 'cumulativeTotal' | 'cumulativePaid')}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="collectionRate">% ชำระ</option>
                    <option value="outstandingRate">% ค้างชำระ</option>
                    <option value="paidAmount">ยอดชำระ</option>
                    <option value="cumulativePaid">ยอดชำระสะสม</option>
                    <option value="totalAmount">ยอดเรียกเก็บ</option>
                    <option value="cumulativeTotal">เรียกเก็บสะสม</option>
                    <option value="outstanding">ยอดค้างชำระ</option>
                    <option value="cumulativeOutstanding">ค้างชำระสะสม</option>
                  </select>
                </div>
                {hasMore && (
                  <button
                    onClick={handleToggleShowAll}
                    className="px-4 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {showAllProjects ? 'แสดง Top 10' : 'ดูทั้งหมด'}
                  </button>
                )}
                <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-emerald-500 rounded" />
                    <span className="text-xs text-slate-600">ชำระแล้ว</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-red-500 rounded" />
                    <span className="text-xs text-slate-600">ค้างชำระ</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Table Header */}
            <div className="overflow-x-auto">
              <div className="flex items-center gap-2 py-2 border-b-2 border-slate-200 bg-slate-50 rounded-t-lg px-2 min-w-max">
                <div className="flex-1 min-w-[150px]">
                  <span className="text-xs font-semibold text-slate-600 uppercase">โครงการ</span>
                </div>
                <div className="w-16 flex-shrink-0 text-right">
                  <span className="text-xs font-semibold text-slate-600 uppercase">อายุ</span>
                </div>
                {/* 3-year columns with progress bars */}
                {projectChartData.years.map((yr) => (
                  <div key={yr} className="w-56 flex-shrink-0 border-l border-slate-200 pl-2 text-center">
                    <span className="text-xs font-bold text-slate-700">{yr}</span>
                    <div className="text-[10px] text-slate-500">อัตราเก็บเงิน</div>
                  </div>
                ))}
                <div className="w-64 flex-shrink-0 border-l border-slate-200 pl-2 text-center">
                  <span className="text-xs font-bold text-slate-700">เก็บสะสม</span>
                  <div className="text-[10px] text-slate-500">ถึง {invoiceSummary?.selectedYear || ''}</div>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div className="overflow-x-auto">
              {hasSearchResults ? (
                displayList.map((project, index) => {
                  // Helper to format amount - full number
                  const fmtAmt = (amt: number) => amt.toLocaleString('en-US', { maximumFractionDigits: 0 });
                  return (
                  <div key={index} className="flex items-center gap-2 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 px-2 min-w-max">
                    {/* Project Name */}
                    <div className="flex-1 min-w-[150px]">
                      <Link
                        to={`/reports/common-fee/overview?year=${projectChartData.year}&siteId=${project.siteId}`}
                        className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline block"
                        title={project.name}
                      >
                        {project.name}
                      </Link>
                      <p className="text-xs text-slate-400">{project.totalUnits} ยูนิต</p>
                    </div>

                    {/* Project Age */}
                    <div className="w-16 flex-shrink-0 text-right">
                      <p className="text-xs font-medium text-slate-700">
                        {project.ageYears > 0 && `${project.ageYears}ปี`}
                        {project.ageYears > 0 && project.ageMonths > 0 && ' '}
                        {project.ageMonths > 0 && `${project.ageMonths}ด.`}
                        {!project.ageYears && !project.ageMonths && '-'}
                      </p>
                    </div>

                    {/* 3-year data columns with progress bars */}
                    {projectChartData.years.map((yr) => {
                      const yrData = project.yearlyBreakdown?.[yr] || { totalAmount: 0, paidAmount: 0, overdueAmount: 0 };
                      const yrOutstanding = yrData.overdueAmount;
                      const yrPct = yrData.totalAmount > 0 ? Math.round((yrData.paidAmount / yrData.totalAmount) * 10000) / 100 : 0;
                      const barColor = yrPct >= 80 ? 'bg-emerald-500' : yrPct >= 50 ? 'bg-amber-500' : 'bg-red-500';
                      const textColor = yrPct >= 80 ? 'text-emerald-600' : yrPct >= 50 ? 'text-amber-600' : 'text-red-600';
                      return (
                        <div key={yr} className="w-56 flex-shrink-0 border-l border-slate-100 pl-2">
                          <div className="space-y-1">
                            {/* Amount and percentage */}
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs font-semibold text-emerald-700">฿{fmtAmt(yrData.paidAmount)}</span>
                              <span className={`text-xs font-bold ${textColor}`}>{yrPct}%</span>
                            </div>
                            {/* Progress bar */}
                            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`absolute h-full rounded-full ${barColor} transition-all`}
                                style={{ width: `${Math.min(yrPct, 100)}%` }}
                              />
                            </div>
                            {/* Total and Outstanding */}
                            <div className="flex justify-between text-[10px] font-mono">
                              <span className="text-slate-400">เรียกเก็บ: ฿{fmtAmt(yrData.totalAmount)}</span>
                              <span className="text-red-500">ค้าง: ฿{fmtAmt(yrOutstanding)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Stacked Progress Bar - cumulative all years */}
                    <div className="w-64 flex-shrink-0 border-l border-slate-100 pl-2">
                      <div className="space-y-1">
                        {/* Amount and percentage */}
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-semibold text-emerald-700">฿{fmtAmt(project.cumPaid)}</span>
                          <span className="text-xs font-bold text-emerald-600">{project.cumRate}%</span>
                        </div>
                        {/* Stacked progress bar */}
                        <div className="flex h-5 overflow-hidden bg-slate-100 relative">
                          {/* Paid portion */}
                          <div
                            className="bg-emerald-500 transition-all flex items-center justify-center"
                            style={{ width: `${project.cumRate}%` }}
                          >
                            {project.cumRate >= 15 && (
                              <span className="text-[10px] font-semibold text-white">{project.cumRate}%</span>
                            )}
                          </div>
                          {/* Outstanding portion */}
                          <div
                            className="bg-red-500 transition-all flex items-center justify-center"
                            style={{ width: `${project.outstandingPct}%` }}
                          >
                            {project.outstandingPct >= 15 && (
                              <span className="text-[10px] font-semibold text-white">{project.outstandingPct}%</span>
                            )}
                          </div>
                        </div>
                        {/* Total and Outstanding amounts */}
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400">เรียกเก็บ: ฿{fmtAmt(project.cumTotal)}</span>
                          <span className="text-red-500">ค้าง: ฿{fmtAmt(project.outstanding)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-slate-500">
                  ไม่พบโครงการที่ตรงกับคำค้นหา "{searchTerm}"
                </div>
              )}
            </div>
          </div>
          );
        })()}

        {/* No Data State - only show when API returns no data */}
        {!isLoading && !projectChartData && (
          <div className="card text-center py-12">
            <p className="text-slate-500">ไม่พบข้อมูลโครงการ</p>
          </div>
        )}
      </div>
    </div>
  );
}
