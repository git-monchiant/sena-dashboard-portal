import { useState, useEffect } from 'react';
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

  useEffect(() => {
    loadData(filters);
  }, []);

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
  const chartData = summary.map(s => ({
    quarter: s.quarter,
    'Presale Target': Number(s.total_presale_target),
    'Presale Actual': Number(s.total_presale_actual),
    'Revenue Target': Number(s.total_revenue_target),
    'Revenue Actual': Number(s.total_revenue_actual),
  }));

  // Chart data for Booking/Livnex (only actual values)
  const bookingLivnexData = summary.map(s => ({
    quarter: s.quarter,
    'Booking': Number(s.total_booking),
    'Livnex': Number(s.total_livnex || 0),
  }));

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
            title="Total Booking"
            value={formatCurrency(totalBooking)}
            change="YTD"
            changeType="positive"
            icon={TrendingUp}
            color="purple"
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

        {/* Charts: All 4 in one row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <div className="mb-2">
              <h3 className="font-semibold text-slate-800 text-sm">Presale</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
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
                <Bar dataKey="Presale Target" fill="#94a3b8" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Presale Target" position="top" formatter={formatNumber} fontSize={9} fill="#64748b" />
                </Bar>
                <Bar dataKey="Presale Actual" fill="#10b981" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Presale Actual" position="top" formatter={formatNumber} fontSize={9} fill="#059669" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="mb-2">
              <h3 className="font-semibold text-slate-800 text-sm">Revenue</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
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
                <Bar dataKey="Revenue Target" fill="#94a3b8" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Revenue Target" position="top" formatter={formatNumber} fontSize={9} fill="#64748b" />
                </Bar>
                <Bar dataKey="Revenue Actual" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Revenue Actual" position="top" formatter={formatNumber} fontSize={9} fill="#2563eb" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="mb-2">
              <h3 className="font-semibold text-slate-800 text-sm">Booking</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bookingLivnexData}>
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
              <h3 className="font-semibold text-slate-800 text-sm">Livnex</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bookingLivnexData}>
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

        {/* Data Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800">รายละเอียดโครงการ</h3>
              <p className="text-sm text-slate-500">ข้อมูล Performance รายโครงการ รายไตรมาส</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาโครงการ, BUD..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-3 font-semibold text-slate-600">BUD</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-600">Project</th>
                  <th className="text-left py-3 px-3 font-semibold text-slate-600">Project Name</th>
                  <th className="text-center py-3 px-3 font-semibold text-slate-600">Q</th>
                  <th className="text-right py-3 px-3 font-semibold text-slate-600">Booking</th>
                  <th className="text-right py-3 px-3 font-semibold text-slate-600">Livnex</th>
                  <th className="text-right py-3 px-3 font-semibold text-slate-600">Presale Target</th>
                  <th className="text-right py-3 px-3 font-semibold text-slate-600">Presale Actual</th>
                  <th className="text-center py-3 px-3 font-semibold text-slate-600">%</th>
                  <th className="text-right py-3 px-3 font-semibold text-slate-600">Revenue Target</th>
                  <th className="text-right py-3 px-3 font-semibold text-slate-600">Revenue Actual</th>
                  <th className="text-center py-3 px-3 font-semibold text-slate-600">%</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filteredData = searchTerm
                    ? data.filter(row =>
                        row.project_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        row.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        row.bud.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                    : data;

                  const sortedData = [...filteredData].sort((a, b) => {
                    if (a.project_code !== b.project_code) {
                      return a.project_code.localeCompare(b.project_code);
                    }
                    return a.quarter.localeCompare(b.quarter);
                  });

                  if (sortedData.length === 0) {
                    return (
                      <tr>
                        <td colSpan={12} className="text-center py-8 text-slate-500">
                          ไม่พบข้อมูลที่ค้นหา
                        </td>
                      </tr>
                    );
                  }

                  return sortedData.map((row, idx) => {
                    const livnexActual = (row as PerformanceRow & { livnex_actual?: number }).livnex_actual || 0;
                    return (
                      <tr
                        key={idx}
                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                        onClick={() => navigate(`/sales-2025/project/${row.project_code}`)}
                      >
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-medium">{row.bud}</span>
                        </td>
                        <td className="py-2 px-3 font-medium text-blue-600 hover:underline">{row.project_code}</td>
                        <td className="py-2 px-3 text-slate-600 truncate max-w-[200px]">{row.project_name}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{row.quarter}</span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-purple-600">{formatCurrency(row.booking_actual)}</td>
                        <td className="py-2 px-3 text-right font-mono text-orange-600">{formatCurrency(livnexActual)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">{formatCurrency(row.presale_target)}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatCurrency(row.presale_actual)}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            row.presale_achieve_pct >= 0.8 ? 'bg-emerald-100 text-emerald-700' :
                            row.presale_achieve_pct >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {(row.presale_achieve_pct * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-400">{formatCurrency(row.revenue_target)}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatCurrency(row.revenue_actual)}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            row.revenue_achieve_pct >= 0.8 ? 'bg-emerald-100 text-emerald-700' :
                            row.revenue_achieve_pct >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {(row.revenue_achieve_pct * 100).toFixed(0)}%
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
