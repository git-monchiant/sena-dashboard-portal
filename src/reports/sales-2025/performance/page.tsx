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

interface ProjectRow {
  projectCode: string;
  projectName: string;
  bud: string;
  opm: string;
  segment: string;
  status: string;
  targetContract: number;
  actualBooking: number;
  actualContract: number;
  targetRevenue: number;
  actualRevenue: number;
  mktExpense: number;
  totalLead: number;
  qualityLead: number;
  leadWalk: number;
  leadBook: number;
  contractAchievePct: number;
  revenueAchievePct: number;
}

interface SummaryRow {
  quarter: string;
  projectCount: number;
  targetContract: number;
  actualBooking: number;
  actualContract: number;
  targetRevenue: number;
  actualRevenue: number;
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

  // Calculate KPIs
  const totalContractTarget = summary.reduce((sum, r) => sum + Number(r.targetContract), 0);
  const totalContractActual = summary.reduce((sum, r) => sum + Number(r.actualContract), 0);
  const totalRevenueTarget = summary.reduce((sum, r) => sum + Number(r.targetRevenue), 0);
  const totalRevenueActual = summary.reduce((sum, r) => sum + Number(r.actualRevenue), 0);
  const totalBooking = summary.reduce((sum, r) => sum + Number(r.actualBooking), 0);
  const totalLivnex = 0; // Not available in new API
  const projectCount = new Set(data.map(d => d.projectCode)).size;

  const contractAchieve = totalContractTarget > 0 ? (totalContractActual / totalContractTarget) * 100 : 0;
  const revenueAchieve = totalRevenueTarget > 0 ? (totalRevenueActual / totalRevenueTarget) * 100 : 0;

  // Lead Funnel Totals
  const totalLead = summary.reduce((sum, s) => sum + Number(s.totalLead || 0), 0);
  const totalQualityLead = summary.reduce((sum, s) => sum + Number(s.qualityLead || 0), 0);
  const totalWalk = summary.reduce((sum, s) => sum + Number(s.leadWalk || 0), 0);
  const totalBook = summary.reduce((sum, s) => sum + Number(s.leadBook || 0), 0);

  // Combined Sales Performance chart data
  const salesChartData = summary.map(s => {
    const contractTarget = Number(s.targetContract);
    const contractActual = Number(s.actualContract);
    const revenueTarget = Number(s.targetRevenue);
    const revenueActual = Number(s.actualRevenue);
    return {
      quarter: s.quarter,
      'Booking': Number(s.actualBooking),
      'Livnex': 0, // Not available in new API
      'Contract Target': contractTarget,
      'Contract Actual': contractActual,
      'Revenue Target': revenueTarget,
      'Revenue Actual': revenueActual,
      'Contract %': contractTarget > 0 ? ((contractActual / contractTarget) * 100).toFixed(0) : '0',
      'Revenue %': revenueTarget > 0 ? ((revenueActual / revenueTarget) * 100).toFixed(0) : '0',
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
            title="Projects"
            value={projectCount.toString()}
            change={`${data.length} records`}
            changeType="neutral"
            icon={Building}
            color="slate"
          />
          <KPICard
            title="Total Booking"
            value={formatCurrency(totalBooking)}
            change="YTD"
            changeType="neutral"
            icon={TrendingUp}
            color="purple"
          />
          <KPICard
            title="Total Livnex"
            value={formatCurrency(totalLivnex)}
            change="YTD"
            changeType="neutral"
            icon={Zap}
            color="orange"
          />
          <KPICard
            title="Contract Actual"
            value={formatCurrency(totalContractActual)}
            change={`${contractAchieve.toFixed(2)}% of target`}
            changeType={contractAchieve >= 80 ? 'positive' : contractAchieve >= 60 ? 'warning' : 'negative'}
            showArrow={false}
            target={{ percentage: Math.round(Math.min(contractAchieve, 100) * 100) / 100 }}
            subtext={`Target: ${formatCurrency(totalContractTarget)}`}
            icon={Target}
            color="emerald"
          />
          <KPICard
            title="Revenue Actual"
            value={formatCurrency(totalRevenueActual)}
            change={`${revenueAchieve.toFixed(2)}% of target`}
            changeType={revenueAchieve >= 80 ? 'positive' : revenueAchieve >= 60 ? 'warning' : 'negative'}
            showArrow={false}
            target={{ percentage: Math.round(Math.min(revenueAchieve, 100) * 100) / 100 }}
            subtext={`Target: ${formatCurrency(totalRevenueTarget)}`}
            icon={DollarSign}
            color="blue"
          />
        </div>

        {/* Sales Performance Chart - Combined */}
        <div className="card mb-4">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800">Sales Performance by Quarter</h3>
            <p className="text-sm text-slate-500">Booking, Livnex, Contract, Revenue</p>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesChartData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="quarter" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Legend
                content={() => (
                  <div className="flex justify-center gap-4 pt-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#8b5cf6' }} />
                      <span className="text-xs text-slate-600">Booking</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#f97316' }} />
                      <span className="text-xs text-slate-600">Livnex</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#94a3b8' }} />
                      <span className="text-xs text-slate-600">Contract Target</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10b981' }} />
                      <span className="text-xs text-slate-600">Contract Actual</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#94a3b8' }} />
                      <span className="text-xs text-slate-600">Revenue Target</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#3b82f6' }} />
                      <span className="text-xs text-slate-600">Revenue Actual</span>
                    </div>
                  </div>
                )}
              />
              <Bar dataKey="Booking" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                <LabelList position="top" fontSize={9} fill="#7c3aed" formatter={(v) => formatNumber(Number(v))} />
              </Bar>
              <Bar dataKey="Livnex" fill="#f97316" radius={[4, 4, 0, 0]}>
                <LabelList position="top" fontSize={9} fill="#ea580c" formatter={(v) => formatNumber(Number(v))} />
              </Bar>
              <Bar dataKey="Contract Target" fill="#94a3b8" radius={[4, 4, 0, 0]}>
                <LabelList position="top" fontSize={9} fill="#64748b" formatter={(v) => formatNumber(Number(v))} />
              </Bar>
              <Bar dataKey="Contract Actual" fill="#10b981" radius={[4, 4, 0, 0]}>
                <LabelList
                  position="top"
                  fontSize={9}
                  fill="#059669"
                  content={(props) => {
                    const { x, y, width, index } = props as { x?: number | string; y?: number | string; width?: number | string; index?: number };
                    const data = typeof index === 'number' ? salesChartData[index] : null;
                    const actual = data?.['Contract Actual'] || 0;
                    const pct = data?.['Contract %'] || '0';
                    return (
                      <text x={Number(x || 0) + Number(width || 0) / 2} y={Number(y || 0) - 5} textAnchor="middle" fontSize={9} fill="#059669">
                        {formatNumber(actual)} ({pct}%)
                      </text>
                    );
                  }}
                />
              </Bar>
              <Bar dataKey="Revenue Target" fill="#94a3b8" radius={[4, 4, 0, 0]}>
                <LabelList position="top" fontSize={9} fill="#64748b" formatter={(v) => formatNumber(Number(v))} />
              </Bar>
              <Bar dataKey="Revenue Actual" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                <LabelList
                  position="top"
                  fontSize={9}
                  fill="#2563eb"
                  content={(props) => {
                    const { x, y, width, index } = props as { x?: number | string; y?: number | string; width?: number | string; index?: number };
                    const data = typeof index === 'number' ? salesChartData[index] : null;
                    const actual = data?.['Revenue Actual'] || 0;
                    const pct = data?.['Revenue %'] || '0';
                    return (
                      <text x={Number(x || 0) + Number(width || 0) / 2} y={Number(y || 0) - 5} textAnchor="middle" fontSize={9} fill="#2563eb">
                        {formatNumber(actual)} ({pct}%)
                      </text>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Lead Conversion Funnel - embedded */}
          <LeadFunnelCards
            totals={{ lead: totalLead, ql: totalQualityLead, walk: totalWalk, book: totalBook }}
            quarters={summary.map(s => ({
              quarter: s.quarter,
              totalLead: Number(s.totalLead || 0),
              qualityLead: Number(s.qualityLead || 0),
              walk: Number(s.leadWalk || 0),
              book: Number(s.leadBook || 0),
            }))}
            embedded
          />
        </div>

        {/* Project Detail Table - Top 10 by Booking */}
        {(() => {
          // Transform data to Top10SalesTable format (data already comes aggregated from API)
          const projects = data.map(row => ({
            projectCode: row.projectCode,
            projectName: row.projectName,
            totals: {
              booking: row.actualBooking,
              livnex: 0,
              contractTarget: row.targetContract,
              contractActual: row.actualContract,
              revenueTarget: row.targetRevenue,
              revenueActual: row.actualRevenue,
              qualityLead: row.qualityLead,
              walk: row.leadWalk,
              book: row.leadBook,
            },
            contractAchievePct: row.contractAchievePct,
            revenueAchievePct: row.revenueAchievePct,
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
