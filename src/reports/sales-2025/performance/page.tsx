import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, KPICard } from '@shared/ui';
import { SalesPerformanceFilters } from './filters';
import {
  Target,
  TrendingUp,
  DollarSign,
  Building,
  Zap,
  Search,
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

interface FilterState {
  vp: string;
  mgr: string;
  project: string;
  quarter: string;
  bud: string;
}

interface PerformanceRow {
  bud: string;
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
}

interface SummaryRow {
  quarter: string;
  project_count: number;
  total_booking: number;
  total_livnex: number;
  total_presale_target: number;
  total_presale_actual: number;
  total_revenue_target: number;
  total_revenue_actual: number;
  total_lead: number;
  total_quality_lead: number;
  total_walk: number;
  total_book: number;
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
  const [data, setData] = useState<PerformanceRow[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    vp: '', mgr: '', project: '', quarter: '', bud: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllProjects, setShowAllProjects] = useState(false);

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
        fetch(`${API_URL}/api/sales-2025/performance?${params}`),
        fetch(`${API_URL}/api/sales-2025/summary?${params}`),
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

  // Calculate KPIs
  const totalPresaleTarget = summary.reduce((sum, r) => sum + Number(r.total_presale_target), 0);
  const totalPresaleActual = summary.reduce((sum, r) => sum + Number(r.total_presale_actual), 0);
  const totalRevenueTarget = summary.reduce((sum, r) => sum + Number(r.total_revenue_target), 0);
  const totalRevenueActual = summary.reduce((sum, r) => sum + Number(r.total_revenue_actual), 0);
  const totalBooking = summary.reduce((sum, r) => sum + Number(r.total_booking), 0);
  const totalLivnex = summary.reduce((sum, r) => sum + Number(r.total_livnex || 0), 0);
  const projectCount = new Set(data.map(d => d.project_code)).size;

  const presaleAchieve = totalPresaleTarget > 0 ? (totalPresaleActual / totalPresaleTarget) * 100 : 0;
  const revenueAchieve = totalRevenueTarget > 0 ? (totalRevenueActual / totalRevenueTarget) * 100 : 0;

  // Chart data for Presale/Revenue
  const chartData = summary.map(s => {
    const presaleTarget = Number(s.total_presale_target);
    const presaleActual = Number(s.total_presale_actual);
    const revenueTarget = Number(s.total_revenue_target);
    const revenueActual = Number(s.total_revenue_actual);
    return {
      quarter: s.quarter,
      'Presale Target': presaleTarget,
      'Presale Actual': presaleActual,
      'Presale %': presaleTarget > 0 ? ((presaleActual / presaleTarget) * 100).toFixed(0) + '%' : '0%',
      'Revenue Target': revenueTarget,
      'Revenue Actual': revenueActual,
      'Revenue %': revenueTarget > 0 ? ((revenueActual / revenueTarget) * 100).toFixed(0) + '%' : '0%',
    };
  });

  // Chart data for Booking/Livnex (only actual values)
  const bookingLivnexData = summary.map(s => ({
    quarter: s.quarter,
    'Booking': Number(s.total_booking),
    'Livnex': Number(s.total_livnex || 0),
  }));

  // Chart data for Lead Conversion Funnel
  const leadConversionData = summary.map(s => {
    const totalLead = Number(s.total_lead || 0);
    const qualityLead = Number(s.total_quality_lead || 0);
    const walk = Number(s.total_walk || 0);
    const book = Number(s.total_book || 0);
    const leadToWalkPct = qualityLead > 0 ? ((walk / qualityLead) * 100).toFixed(1) : '0';
    const walkToBookPct = walk > 0 ? ((book / walk) * 100).toFixed(1) : '0';
    const qlToWalkRatio = walk > 0 ? (qualityLead / walk).toFixed(1) : '-';
    const walkToBookRatio = book > 0 ? (walk / book).toFixed(1) : '-';
    return {
      quarter: s.quarter,
      'Total Lead': totalLead,
      'Quality Lead': qualityLead,
      'Walk': walk,
      'Book': book,
      'Lead to Walk %': leadToWalkPct,
      'Walk to Book %': walkToBookPct,
      'QL to Walk Ratio': qlToWalkRatio,
      'Walk to Book Ratio': walkToBookRatio,
    };
  });

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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <KPICard
            title="Total Booking"
            value={formatCurrency(totalBooking)}
            change="YTD"
            changeType="positive"
            icon={TrendingUp}
            color="purple"
          />
          <KPICard
            title="Presale Actual"
            value={formatCurrency(totalPresaleActual)}
            change={`${presaleAchieve.toFixed(2)}% of target`}
            changeType={presaleAchieve >= 80 ? 'positive' : 'negative'}
            target={{ percentage: Math.min(presaleAchieve, 100) }}
            icon={Target}
            color="emerald"
          />
          <KPICard
            title="Revenue Actual"
            value={formatCurrency(totalRevenueActual)}
            change={`${revenueAchieve.toFixed(2)}% of target`}
            changeType={revenueAchieve >= 80 ? 'positive' : 'negative'}
            target={{ percentage: Math.min(revenueAchieve, 100) }}
            icon={DollarSign}
            color="blue"
          />
          <KPICard
            title="Total Livnex"
            value={formatCurrency(totalLivnex)}
            change="YTD"
            changeType="positive"
            icon={Zap}
            color="orange"
          />
          <KPICard
            title="Projects"
            value={projectCount.toString()}
            change={`${data.length} records`}
            changeType="positive"
            icon={Building}
            color="slate"
          />
        </div>

        {/* Charts: 5 charts - 4 in first row, 1 in second row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          <div className="card">
            <div className="mb-2">
              <h3 className="font-semibold text-slate-800 text-sm">Booking</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bookingLivnexData} margin={{ top: 20, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="quarter" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={formatNumber} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="Booking" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Booking" position="top" formatter={formatNumber} fontSize={9} fill="#7c3aed" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="mb-2">
              <h3 className="font-semibold text-slate-800 text-sm">Presale</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 20, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="quarter" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={formatNumber} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload) return null;
                    const orderedKeys = ['Presale Target', 'Presale Actual'];
                    const colors: Record<string, string> = {
                      'Presale Target': '#94a3b8',
                      'Presale Actual': '#10b981',
                    };
                    const data = payload[0]?.payload;
                    const pct = data?.['Presale %'] || '0%';
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
                              <span className="font-medium">{formatCurrency(Number(item.value))}</span>
                            </div>
                          );
                        })}
                        <hr className="my-2 border-slate-200" />
                        <div className="text-xs text-slate-500">
                          <span>Achieve: <span className="font-medium text-slate-700">{pct}</span></span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  content={() => (
                    <div className="flex justify-center gap-4 pt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#94a3b8' }} />
                        <span className="text-xs text-slate-600">Target</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10b981' }} />
                        <span className="text-xs text-slate-600">Actual</span>
                      </div>
                    </div>
                  )}
                />
                <Bar dataKey="Presale Target" fill="#94a3b8" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Presale Target" position="top" formatter={formatNumber} fontSize={9} fill="#64748b" />
                </Bar>
                <Bar dataKey="Presale Actual" fill="#10b981" radius={[4, 4, 0, 0]}>
                  <LabelList
                    position="top"
                    fontSize={9}
                    fill="#059669"
                    content={(props) => {
                      const { x, y, width, value, index } = props as { x?: number | string; y?: number | string; width?: number | string; value?: number; index?: number };
                      const pct = typeof index === 'number' ? chartData[index]?.['Presale %'] : '';
                      return (
                        <text x={Number(x || 0) + Number(width || 0) / 2} y={Number(y || 0) - 5} textAnchor="middle" fontSize={9} fill="#059669">
                          {formatNumber(value || 0)} ({pct})
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="mb-2">
              <h3 className="font-semibold text-slate-800 text-sm">Revenue</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 20, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="quarter" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={formatNumber} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload) return null;
                    const orderedKeys = ['Revenue Target', 'Revenue Actual'];
                    const colors: Record<string, string> = {
                      'Revenue Target': '#94a3b8',
                      'Revenue Actual': '#3b82f6',
                    };
                    const data = payload[0]?.payload;
                    const pct = data?.['Revenue %'] || '0%';
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
                              <span className="font-medium">{formatCurrency(Number(item.value))}</span>
                            </div>
                          );
                        })}
                        <hr className="my-2 border-slate-200" />
                        <div className="text-xs text-slate-500">
                          <span>Achieve: <span className="font-medium text-slate-700">{pct}</span></span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  content={() => (
                    <div className="flex justify-center gap-4 pt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#94a3b8' }} />
                        <span className="text-xs text-slate-600">Target</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
                        <span className="text-xs text-slate-600">Actual</span>
                      </div>
                    </div>
                  )}
                />
                <Bar dataKey="Revenue Target" fill="#94a3b8" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Revenue Target" position="top" formatter={formatNumber} fontSize={9} fill="#64748b" />
                </Bar>
                <Bar dataKey="Revenue Actual" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  <LabelList
                    position="top"
                    fontSize={9}
                    fill="#2563eb"
                    content={(props) => {
                      const { x, y, width, value, index } = props as { x?: number | string; y?: number | string; width?: number | string; value?: number; index?: number };
                      const pct = typeof index === 'number' ? chartData[index]?.['Revenue %'] : '';
                      return (
                        <text x={Number(x || 0) + Number(width || 0) / 2} y={Number(y || 0) - 5} textAnchor="middle" fontSize={9} fill="#2563eb">
                          {formatNumber(value || 0)} ({pct})
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="mb-2">
              <h3 className="font-semibold text-slate-800 text-sm">Livnex</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bookingLivnexData} margin={{ top: 20, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="quarter" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} tickFormatter={formatNumber} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="Livnex" fill="#f97316" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Livnex" position="top" formatter={formatNumber} fontSize={9} fill="#ea580c" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Conversion Chart */}
        <div className="grid grid-cols-1 gap-4 mb-8">
          <div className="card">
            <div className="mb-2">
              <h3 className="font-semibold text-slate-800 text-sm">Lead Conversion Funnel</h3>
              <p className="text-xs text-slate-500">Total Lead → Quality Lead → Walk → Book</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={leadConversionData} margin={{ top: 20, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="quarter" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
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
                    const qlToWalkRatio = data?.['Quality Lead'] > 0 && data?.['Walk'] > 0
                      ? (data['Quality Lead'] / data['Walk']).toFixed(1) : '-';
                    const walkToBookRatio = data?.['Walk'] > 0 && data?.['Book'] > 0
                      ? (data['Walk'] / data['Book']).toFixed(1) : '-';
                    const qlToWalkPct = data?.['Lead to Walk %'] || '0';
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
                          <div>QL→Walk: <span className="font-medium text-slate-700">{qlToWalkRatio}:1</span> ({qlToWalkPct}%)</div>
                          <div>Walk→Book: <span className="font-medium text-slate-700">{walkToBookRatio}:1</span> ({walkToBookPct}%)</div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  content={() => (
                    <div className="flex justify-center gap-6 pt-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#64748b' }} />
                        <span className="text-xs text-slate-600">Total Lead</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#8b5cf6' }} />
                        <span className="text-xs text-slate-600">Quality Lead</span>
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
                  <LabelList dataKey="Quality Lead" position="top" fontSize={10} fill="#7c3aed" formatter={(v) => Number(v).toLocaleString()} />
                </Bar>
                <Bar dataKey="Walk" fill="#10b981" radius={[4, 4, 0, 0]}>
                  <LabelList
                    position="top"
                    fontSize={9}
                    fill="#059669"
                    content={(props) => {
                      const { x, y, width, index } = props as { x?: number | string; y?: number | string; width?: number | string; index?: number };
                      const walkValue = typeof index === 'number' ? leadConversionData[index]?.['Walk'] : 0;
                      const ratio = typeof index === 'number' ? leadConversionData[index]?.['QL to Walk Ratio'] : '-';
                      const pct = typeof index === 'number' ? leadConversionData[index]?.['Lead to Walk %'] : '0';
                      return (
                        <text x={Number(x || 0) + Number(width || 0) / 2} y={Number(y || 0) - 5} textAnchor="middle" fontSize={9} fill="#059669">
                          {walkValue.toLocaleString()} ({ratio}:1 / {pct}%)
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
                      const bookValue = typeof index === 'number' ? leadConversionData[index]?.['Book'] : 0;
                      const ratio = typeof index === 'number' ? leadConversionData[index]?.['Walk to Book Ratio'] : '-';
                      const pct = typeof index === 'number' ? leadConversionData[index]?.['Walk to Book %'] : '0';
                      return (
                        <text x={Number(x || 0) + Number(width || 0) / 2} y={Number(y || 0) - 5} textAnchor="middle" fontSize={9} fill="#2563eb">
                          {bookValue.toLocaleString()} ({ratio}:1 / {pct}%)
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Detail Table - Top 10 by Booking (aggregated by project) */}
        {(() => {
          // Aggregate data by project_code (sum across quarters)
          const projectMap = new Map<string, {
            project_code: string;
            project_name: string;
            bud: string;
            quarters: string[];
            booking: number;
            livnex: number;
            presale_target: number;
            presale_actual: number;
            revenue_target: number;
            revenue_actual: number;
          }>();

          data.forEach(row => {
            const code = row.project_code;
            const livnexActual = (row as PerformanceRow & { livnex_actual?: number }).livnex_actual || 0;
            if (!projectMap.has(code)) {
              projectMap.set(code, {
                project_code: code,
                project_name: row.project_name,
                bud: row.bud,
                quarters: [],
                booking: 0,
                livnex: 0,
                presale_target: 0,
                presale_actual: 0,
                revenue_target: 0,
                revenue_actual: 0,
              });
            }
            const proj = projectMap.get(code)!;
            proj.quarters.push(row.quarter);
            proj.booking += Number(row.booking_actual || 0);
            proj.livnex += Number(livnexActual || 0);
            proj.presale_target += Number(row.presale_target || 0);
            proj.presale_actual += Number(row.presale_actual || 0);
            proj.revenue_target += Number(row.revenue_target || 0);
            proj.revenue_actual += Number(row.revenue_actual || 0);
          });

          // Sort by Booking descending
          const aggregatedProjects = Array.from(projectMap.values())
            .sort((a, b) => b.booking - a.booking);

          const filteredProjects = aggregatedProjects.filter(p =>
            p.project_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.bud.toLowerCase().includes(searchTerm.toLowerCase())
          );

          const displayProjects = showAllProjects ? filteredProjects : filteredProjects.slice(0, 10);
          const hasMore = filteredProjects.length > 10;

          return (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-800">
                    {showAllProjects ? 'รายละเอียดโครงการทั้งหมด' : 'Top 10 โครงการที่มี Booking สูงสุด'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {showAllProjects
                      ? `แสดงทั้งหมด ${filteredProjects.length} รายการ`
                      : `เรียงตาม Booking มากไปน้อย (${filteredProjects.length} โครงการ)`}
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
                      <th className="text-right py-3 px-3 font-semibold text-purple-700">Booking</th>
                      <th className="text-right py-3 px-3 font-semibold text-orange-700">Livnex</th>
                      <th className="text-right py-3 px-3 font-semibold text-emerald-400">Presale Target</th>
                      <th className="text-right py-3 px-3 font-semibold text-emerald-700">Presale Actual</th>
                      <th className="text-center py-3 px-3 font-semibold text-emerald-600 bg-emerald-50">%</th>
                      <th className="text-right py-3 px-3 font-semibold text-blue-400">Revenue Target</th>
                      <th className="text-right py-3 px-3 font-semibold text-blue-700">Revenue Actual</th>
                      <th className="text-center py-3 px-3 font-semibold text-blue-600 bg-blue-50">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayProjects.map((row, idx) => {
                      const presaleAchievePct = row.presale_target > 0 ? (row.presale_actual / row.presale_target) * 100 : 0;
                      const revenueAchievePct = row.revenue_target > 0 ? (row.revenue_actual / row.revenue_target) * 100 : 0;
                      return (
                        <tr
                          key={`${row.project_code}-${idx}`}
                          className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                          onClick={() => navigate(`/sales-2025/project/${row.project_code}`)}
                        >
                          <td className="py-2 px-2 text-center">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              idx < 3 ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
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
                          <td className="py-2 px-3 text-right text-purple-600 font-medium">{formatCurrency(row.booking)}</td>
                          <td className="py-2 px-3 text-right text-orange-600 font-medium">{formatCurrency(row.livnex)}</td>
                          <td className="py-2 px-3 text-right text-emerald-400">{formatCurrency(row.presale_target)}</td>
                          <td className="py-2 px-3 text-right text-emerald-700 font-medium">{formatCurrency(row.presale_actual)}</td>
                          <td className="py-2 px-3 text-center bg-emerald-50">
                            <span className={`inline-block w-14 text-center py-0.5 rounded text-xs font-medium ${
                              presaleAchievePct >= 80 ? 'bg-emerald-100 text-emerald-700' :
                              presaleAchievePct >= 50 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {presaleAchievePct.toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-blue-400">{formatCurrency(row.revenue_target)}</td>
                          <td className="py-2 px-3 text-right text-blue-700 font-medium">{formatCurrency(row.revenue_actual)}</td>
                          <td className="py-2 px-3 text-center bg-blue-50">
                            <span className={`inline-block w-14 text-center py-0.5 rounded text-xs font-medium ${
                              revenueAchievePct >= 80 ? 'bg-emerald-100 text-emerald-700' :
                              revenueAchievePct >= 50 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {revenueAchievePct.toFixed(0)}%
                            </span>
                          </td>
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
