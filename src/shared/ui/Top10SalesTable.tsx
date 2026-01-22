import { useState } from 'react';
import { Search } from 'lucide-react';

interface ProjectData {
  projectCode: string;
  projectName: string;
  totals: {
    booking: number;
    livnex: number;
    contract: number;
    presaleTarget: number; // Target สำหรับ Booking + Livnex + Contract
    revenueTarget: number;
    revenueActual: number;
    qualityLead: number;
    walk: number;
    book: number;
  };
  revenueAchievePct: number;
}

interface Top10SalesTableProps {
  projects: ProjectData[];
  onRowClick?: (projectCode: string) => void;
  formatCurrency: (value: number) => string;
  hideLeadColumns?: boolean;
  storageKey?: string;
}

type SortBy = 'booking' | 'livnex' | 'contract' | 'revenue_actual' | 'booking_pct' | 'contract_pct' | 'revenue_pct';
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

export function Top10SalesTable({ projects, onRowClick, formatCurrency, hideLeadColumns = false, storageKey = 'top10-sales-table' }: Top10SalesTableProps) {
  const [sortBy, setSortBy] = useState<SortBy>(() => {
    const saved = getTableState(storageKey);
    return (saved?.sortBy as SortBy) ?? 'booking';
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
    booking: 'Booking',
    livnex: 'Livnex',
    contract: 'Contract',
    revenue_actual: 'Revenue',
    booking_pct: 'Booking %',
    contract_pct: 'Contract %',
    revenue_pct: 'Revenue %',
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
      booking_pct: p.totals.presaleTarget > 0 ? (p.totals.booking / p.totals.presaleTarget) * 100 : 0,
      livnex_pct: p.totals.presaleTarget > 0 ? (p.totals.livnex / p.totals.presaleTarget) * 100 : 0,
      contract_pct: p.totals.presaleTarget > 0 ? (p.totals.contract / p.totals.presaleTarget) * 100 : 0,
      revenue_pct: p.totals.revenueTarget > 0 ? (p.totals.revenueActual / p.totals.revenueTarget) * 100 : 0,
    }))
    .sort((a, b) => {
      const multiplier = sortDir === 'desc' ? 1 : -1;
      switch (sortBy) {
        case 'booking': return (b.totals.booking - a.totals.booking) * multiplier;
        case 'livnex': return (b.totals.livnex - a.totals.livnex) * multiplier;
        case 'contract': return (b.totals.contract - a.totals.contract) * multiplier;
        case 'revenue_actual': return (b.totals.revenueActual - a.totals.revenueActual) * multiplier;
        case 'booking_pct': return (b.booking_pct - a.booking_pct) * multiplier;
        case 'contract_pct': return (b.contract_pct - a.contract_pct) * multiplier;
        case 'revenue_pct': return (b.revenue_pct - a.revenue_pct) * multiplier;
        default: return (b.totals.booking - a.totals.booking) * multiplier;
      }
    });

  const filtered = sortedProjects.filter(p =>
    (p.projectCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.projectName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const display = showAll ? filtered : filtered.slice(0, 10);
  const hasMore = filtered.length > 10;

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-semibold text-slate-800">
            {showAll ? 'รายละเอียดโครงการทั้งหมด (Sales)' : `Top 10 Projects by ${sortLabels[sortBy]}`}
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
            <option value="booking">Booking</option>
            <option value="booking_pct">Booking %</option>
            <option value="livnex">Livnex</option>
            <option value="contract">Contract</option>
            <option value="contract_pct">Contract %</option>
            <option value="revenue_actual">Revenue</option>
            <option value="revenue_pct">Revenue %</option>
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
              <th className="text-left py-2 px-3 font-semibold text-slate-600 min-w-[160px]">Booking</th>
              <th className="text-left py-2 px-3 font-semibold text-slate-600 min-w-[160px]">Livnex</th>
              <th className="text-left py-2 px-3 font-semibold text-slate-600 min-w-[160px]">Contract</th>
              <th className="text-left py-2 px-3 font-semibold text-slate-600 min-w-[160px]">Revenue</th>
              {!hideLeadColumns && (
                <>
                  <th className="text-center py-2 px-3 font-semibold text-slate-600">QL/Walk</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-600">Walk/Book</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {display.map((proj, idx) => {
              const qlPerWalk = proj.totals.walk > 0 ? (proj.totals.qualityLead / proj.totals.walk).toFixed(1) : '-';
              const walkPerBook = proj.totals.book > 0 ? (proj.totals.walk / proj.totals.book).toFixed(1) : '-';
              const walkPerBookNum = proj.totals.book > 0 ? proj.totals.walk / proj.totals.book : 0;
              return (
                <tr
                  key={idx}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                  onClick={() => onRowClick?.(proj.projectCode)}
                >
                  <td className="py-2 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <div className="font-medium text-blue-600">{proj.projectName || '-'}</div>
                    <div className="text-xs text-slate-400">{proj.projectCode || '-'}</div>
                  </td>
                  {/* Booking */}
                  <td className="py-2 px-3">
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold text-purple-700">{formatCurrency(proj.totals.booking)}</span>
                        <span className={`text-xs font-semibold ${
                          proj.booking_pct >= 40 ? 'text-purple-600' :
                          proj.booking_pct >= 20 ? 'text-yellow-600' :
                          'text-red-500'
                        }`}>
                          {(proj.booking_pct || 0).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`absolute h-full rounded-full ${
                              proj.booking_pct >= 40 ? 'bg-purple-500' :
                              proj.booking_pct >= 20 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(proj.booking_pct || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Booking Target: {formatCurrency(proj.totals.presaleTarget)}
                      </div>
                    </div>
                  </td>
                  {/* Livnex */}
                  <td className="py-2 px-3">
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold text-orange-700">{formatCurrency(proj.totals.livnex)}</span>
                        <span className={`text-xs font-semibold ${
                          proj.livnex_pct >= 40 ? 'text-orange-600' :
                          proj.livnex_pct >= 20 ? 'text-yellow-600' :
                          'text-red-500'
                        }`}>
                          {(proj.livnex_pct || 0).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`absolute h-full rounded-full ${
                              proj.livnex_pct >= 40 ? 'bg-orange-500' :
                              proj.livnex_pct >= 20 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(proj.livnex_pct || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Livnex Target: {formatCurrency(proj.totals.presaleTarget)}
                      </div>
                    </div>
                  </td>
                  {/* Contract */}
                  <td className="py-2 px-3">
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold text-emerald-700">{formatCurrency(proj.totals.contract)}</span>
                        <span className={`text-xs font-semibold ${
                          proj.contract_pct >= 40 ? 'text-emerald-600' :
                          proj.contract_pct >= 20 ? 'text-yellow-600' :
                          'text-red-500'
                        }`}>
                          {(proj.contract_pct || 0).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`absolute h-full rounded-full ${
                              proj.contract_pct >= 40 ? 'bg-emerald-500' :
                              proj.contract_pct >= 20 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(proj.contract_pct || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Contract Target: {formatCurrency(proj.totals.presaleTarget)}
                      </div>
                    </div>
                  </td>
                  {/* Revenue */}
                  <td className="py-2 px-3">
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold text-blue-700">{formatCurrency(proj.totals.revenueActual)}</span>
                        <span className={`text-xs font-semibold ${
                          proj.revenue_pct >= 80 ? 'text-blue-600' :
                          proj.revenue_pct >= 50 ? 'text-yellow-600' :
                          'text-red-500'
                        }`}>
                          {(proj.revenue_pct || 0).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`absolute h-full rounded-full ${
                              proj.revenue_pct >= 80 ? 'bg-blue-500' :
                              proj.revenue_pct >= 50 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(proj.revenue_pct || 0, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Revenue Target: {formatCurrency(proj.totals.revenueTarget)}
                      </div>
                    </div>
                  </td>
                  {!hideLeadColumns && (
                    <>
                      <td className="py-2 px-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-semibold text-slate-700">
                            {proj.totals.walk > 0 ? `${qlPerWalk} : 1` : '-'}
                          </span>
                          <span className="text-[10px] text-slate-400">{proj.totals.qualityLead} / {proj.totals.walk}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`text-sm font-semibold ${
                            proj.totals.book > 0
                              ? walkPerBookNum <= 3 ? 'text-emerald-600' :
                                walkPerBookNum <= 5 ? 'text-yellow-600' :
                                'text-red-500'
                              : 'text-slate-700'
                          }`}>
                            {proj.totals.book > 0 ? `${walkPerBook} : 1` : '-'}
                          </span>
                          <span className="text-[10px] text-slate-400">{proj.totals.walk} / {proj.totals.book}</span>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {display.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          ไม่พบข้อมูลโครงการ
        </div>
      )}
    </div>
  );
}
