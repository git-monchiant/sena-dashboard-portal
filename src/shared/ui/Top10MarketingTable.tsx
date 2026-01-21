import { useState } from 'react';
import { Search } from 'lucide-react';

interface ProjectData {
  projectCode: string;
  projectName: string;
  totals: {
    mktExpense: number;
    totalLead: number;
    qualityLead: number;
    walk: number;
    book: number;
    presaleActual?: number;
    revenueActual?: number;
  };
}

interface Top10MarketingTableProps {
  projects: ProjectData[];
  onRowClick?: (projectCode: string) => void;
  formatCurrency: (value: number) => string;
  storageKey?: string;
}

type SortBy = 'lead' | 'ql' | 'walk' | 'book' | 'mkt_expense' | 'cpl' | 'cpb' | 'presale_actual' | 'revenue_actual' | 'mkt_pct_presale' | 'mkt_pct_revenue';
type SortDir = 'desc' | 'asc';

interface TableState {
  sortBy: SortBy;
  sortDir: SortDir;
  showAll: boolean;
}

function getTableState(key: string): TableState | null {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to parse table state:', e);
  }
  return null;
}

function saveTableState(key: string, state: TableState) {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save table state:', e);
  }
}

export function Top10MarketingTable({ projects, onRowClick, formatCurrency, storageKey = 'top10-mkt-table' }: Top10MarketingTableProps) {
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    const saved = getTableState(storageKey);
    return saved?.sortBy ?? 'mkt_expense';
  });
  const [sortDir, setSortDir] = useState<SortDir>(() => {
    const saved = getTableState(storageKey);
    return saved?.sortDir ?? 'desc';
  });
  const [showAll, setShowAll] = useState<boolean>(() => {
    const saved = getTableState(storageKey);
    return saved?.showAll === true;
  });
  const [searchTerm, setSearchTerm] = useState('');

  const sortLabels: Record<SortBy, string> = {
    lead: 'Lead',
    ql: 'Quality Lead',
    walk: 'Walk',
    book: 'Book',
    mkt_expense: 'MKT Expense',
    cpl: 'CPL',
    cpb: 'CPB',
    presale_actual: 'Presale Actual',
    revenue_actual: 'Revenue Actual',
    mkt_pct_presale: 'MKT% Presale',
    mkt_pct_revenue: 'MKT% Revenue',
  };

  const handleSortByChange = (value: SortBy) => {
    setSortBy(value);
    saveTableState(storageKey, { sortBy: value, sortDir, showAll });
  };

  const handleSortDirChange = (value: SortDir) => {
    setSortDir(value);
    saveTableState(storageKey, { sortBy, sortDir: value, showAll });
  };

  const handleShowAllToggle = () => {
    const newShowAll = !showAll;
    setShowAll(newShowAll);
    saveTableState(storageKey, { sortBy, sortDir, showAll: newShowAll });
  };

  const sortedProjects = [...projects]
    .map(p => ({
      ...p,
      cpl: p.totals.totalLead > 0 ? p.totals.mktExpense / p.totals.totalLead : 0,
      cpb: p.totals.book > 0 ? p.totals.mktExpense / p.totals.book : 0,
      mktPctPresale: p.totals.presaleActual && p.totals.presaleActual > 0 ? (p.totals.mktExpense / p.totals.presaleActual) * 100 : 0,
      mktPctRevenue: p.totals.revenueActual && p.totals.revenueActual > 0 ? (p.totals.mktExpense / p.totals.revenueActual) * 100 : 0,
    }))
    .sort((a, b) => {
      const multiplier = sortDir === 'desc' ? 1 : -1;
      // For cost/% metrics, lower is better, so reverse the sort
      const costMetrics = ['cpl', 'cpb', 'mkt_pct_presale', 'mkt_pct_revenue'];
      const costMultiplier = costMetrics.includes(sortBy) && sortDir === 'desc' ? -1 : costMetrics.includes(sortBy) && sortDir === 'asc' ? 1 : multiplier;
      switch (sortBy) {
        case 'lead': return (b.totals.totalLead - a.totals.totalLead) * multiplier;
        case 'ql': return (b.totals.qualityLead - a.totals.qualityLead) * multiplier;
        case 'walk': return (b.totals.walk - a.totals.walk) * multiplier;
        case 'book': return (b.totals.book - a.totals.book) * multiplier;
        case 'mkt_expense': return (b.totals.mktExpense - a.totals.mktExpense) * multiplier;
        case 'cpl': return (a.cpl - b.cpl) * costMultiplier;
        case 'cpb': return (a.cpb - b.cpb) * costMultiplier;
        case 'presale_actual': return ((b.totals.presaleActual || 0) - (a.totals.presaleActual || 0)) * multiplier;
        case 'revenue_actual': return ((b.totals.revenueActual || 0) - (a.totals.revenueActual || 0)) * multiplier;
        case 'mkt_pct_presale': return (a.mktPctPresale - b.mktPctPresale) * costMultiplier;
        case 'mkt_pct_revenue': return (a.mktPctRevenue - b.mktPctRevenue) * costMultiplier;
        default: return (b.totals.totalLead - a.totals.totalLead) * multiplier;
      }
    });

  const filtered = sortedProjects.filter(p =>
    p.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.projectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const display = showAll ? filtered : filtered.slice(0, 10);
  const hasMore = filtered.length > 10;

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-semibold text-slate-800">
            {showAll ? 'รายละเอียดโครงการทั้งหมด (Marketing)' : `Top 10 Projects by ${sortLabels[sortBy]}`}
          </h4>
          <p className="text-sm text-slate-500">
            เรียงตาม {sortLabels[sortBy]} {sortDir === 'desc' ? 'มากไปน้อย' : 'น้อยไปมาก'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => handleSortByChange(e.target.value as SortBy)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="mkt_expense">MKT Expense</option>
            <option value="presale_actual">Presale Actual</option>
            <option value="mkt_pct_presale">MKT% Presale</option>
            <option value="revenue_actual">Revenue Actual</option>
            <option value="mkt_pct_revenue">MKT% Revenue</option>
            <option value="lead">Lead</option>
            <option value="ql">Quality Lead</option>
            <option value="walk">Walk</option>
            <option value="book">Book</option>
            <option value="cpl">CPL</option>
            <option value="cpb">CPB</option>
          </select>
          <select
            value={sortDir}
            onChange={(e) => handleSortDirChange(e.target.value as SortDir)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="desc">มากไปน้อย</option>
            <option value="asc">น้อยไปมาก</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาโครงการ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-48"
            />
          </div>
          {hasMore && (
            <button
              onClick={handleShowAllToggle}
              className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors whitespace-nowrap"
            >
              {showAll ? 'แสดง Top 10' : 'ดูทั้งหมด'}
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-center py-2 px-3 font-semibold text-slate-600 w-10">#</th>
              <th className="text-left py-2 px-3 font-semibold text-slate-600">Project</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600">MKT Exp</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600">Presale</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600">Revenue</th>
              <th className="text-left py-2 px-3 font-semibold text-slate-600 min-w-[200px]">Lead → QL</th>
              <th className="text-left py-2 px-3 font-semibold text-slate-600 min-w-[200px]">QL → Walk</th>
              <th className="text-left py-2 px-3 font-semibold text-slate-600 min-w-[200px]">Walk → Book</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600">CPL</th>
              <th className="text-right py-2 px-3 font-semibold text-slate-600">CPB</th>
            </tr>
          </thead>
          <tbody>
            {display.map((proj, idx) => {
              const cpl = proj.totals.totalLead > 0 ? proj.totals.mktExpense / proj.totals.totalLead : 0;
              const cpb = proj.totals.book > 0 ? proj.totals.mktExpense / proj.totals.book : 0;
              // MKT % of sales
              const mktPctPresale = proj.totals.presaleActual && proj.totals.presaleActual > 0 ? (proj.totals.mktExpense / proj.totals.presaleActual) * 100 : null;
              const mktPctRevenue = proj.totals.revenueActual && proj.totals.revenueActual > 0 ? (proj.totals.mktExpense / proj.totals.revenueActual) * 100 : null;
              // Conversion rates
              const leadToQlPct = proj.totals.totalLead > 0 ? (proj.totals.qualityLead / proj.totals.totalLead) * 100 : 0;
              const qlToWalkPct = proj.totals.qualityLead > 0 ? (proj.totals.walk / proj.totals.qualityLead) * 100 : 0;
              const walkToBookPct = proj.totals.walk > 0 ? (proj.totals.book / proj.totals.walk) * 100 : 0;
              // Ratios
              const leadPerQl = proj.totals.qualityLead > 0 ? (proj.totals.totalLead / proj.totals.qualityLead).toFixed(1) : '-';
              const qlPerWalk = proj.totals.walk > 0 ? (proj.totals.qualityLead / proj.totals.walk).toFixed(1) : '-';
              const walkPerBook = proj.totals.book > 0 ? (proj.totals.walk / proj.totals.book).toFixed(1) : '-';
              return (
                <tr
                  key={idx}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                  onClick={() => onRowClick?.(proj.projectCode)}
                >
                  <td className="py-2 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <div className="font-medium text-blue-600">{proj.projectName}</div>
                    <div className="text-xs text-slate-400">{proj.projectCode}</div>
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-purple-600">{formatCurrency(proj.totals.mktExpense)}</td>
                  <td className="py-2 px-3 text-right">
                    {proj.totals.presaleActual ? (
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold font-mono text-emerald-700">
                          {formatCurrency(proj.totals.presaleActual)}
                        </span>
                        {mktPctPresale !== null && (
                          <span className={`text-[10px] font-mono ${
                            mktPctPresale <= 3 ? 'text-emerald-600' :
                            mktPctPresale <= 5 ? 'text-yellow-600' :
                            'text-red-500'
                          }`}>
                            MKT {mktPctPresale.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {proj.totals.revenueActual ? (
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-semibold font-mono text-blue-700">
                          {formatCurrency(proj.totals.revenueActual)}
                        </span>
                        {mktPctRevenue !== null && (
                          <span className={`text-[10px] font-mono ${
                            mktPctRevenue <= 3 ? 'text-emerald-600' :
                            mktPctRevenue <= 5 ? 'text-yellow-600' :
                            'text-red-500'
                          }`}>
                            MKT {mktPctRevenue.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold text-slate-700">{proj.totals.totalLead.toLocaleString()}</span>
                        <span className={`text-xs font-semibold ${
                          leadToQlPct >= 30 ? 'text-emerald-600' :
                          leadToQlPct >= 15 ? 'text-yellow-600' :
                          'text-red-500'
                        }`}>
                          {leadToQlPct.toFixed(0)}% QL
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`absolute h-full rounded-full ${
                              leadToQlPct >= 30 ? 'bg-emerald-500' :
                              leadToQlPct >= 15 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(leadToQlPct, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>→ QL: {proj.totals.qualityLead.toLocaleString()}</span>
                        <span className="text-slate-500">{leadPerQl} : 1</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold text-emerald-700">{proj.totals.qualityLead.toLocaleString()}</span>
                        <span className={`text-xs font-semibold ${
                          qlToWalkPct >= 50 ? 'text-emerald-600' :
                          qlToWalkPct >= 25 ? 'text-yellow-600' :
                          'text-red-500'
                        }`}>
                          {qlToWalkPct.toFixed(0)}% Walk
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`absolute h-full rounded-full ${
                              qlToWalkPct >= 50 ? 'bg-emerald-500' :
                              qlToWalkPct >= 25 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(qlToWalkPct, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>→ Walk: {proj.totals.walk.toLocaleString()}</span>
                        <span className="text-slate-500">{qlPerWalk} : 1</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold text-blue-700">{proj.totals.walk.toLocaleString()}</span>
                        <span className={`text-xs font-semibold ${
                          walkToBookPct >= 60 ? 'text-blue-600' :
                          walkToBookPct >= 30 ? 'text-yellow-600' :
                          'text-red-500'
                        }`}>
                          {walkToBookPct.toFixed(0)}% Book
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`absolute h-full rounded-full ${
                              walkToBookPct >= 60 ? 'bg-blue-500' :
                              walkToBookPct >= 30 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(walkToBookPct, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>→ Book: {proj.totals.book.toLocaleString()}</span>
                        <span className="text-slate-500">{walkPerBook} : 1</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-semibold font-mono ${
                        cpl <= 4000 ? 'text-emerald-600' :
                        cpl <= 7000 ? 'text-yellow-600' :
                        'text-red-500'
                      }`}>
                        ฿{cpl.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-[10px] text-slate-400">per Lead</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-semibold font-mono ${
                        cpb <= 60000 ? 'text-emerald-600' :
                        cpb <= 90000 ? 'text-yellow-600' :
                        'text-red-500'
                      }`}>
                        ฿{cpb.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-[10px] text-slate-400">per Book</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
