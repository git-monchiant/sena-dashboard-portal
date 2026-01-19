import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, KPICard, Top10SalesTable, Top10MarketingTable } from '@shared/ui';
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
} from 'lucide-react';

const API_URL = 'http://localhost:3001';

interface VPData {
  name: string;
  position: string;
  roleType: string;
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
  team: {
    salesManagers: { name: string; position: string; projects: { projectCode: string; projectName: string }[] }[];
    marketingManagers: { name: string; position: string; projects: { projectCode: string; projectName: string }[] }[];
  };
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

export function VPDetailPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [vpData, setVPData] = useState<VPData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!name) return;
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/sales-2025/vp/${encodeURIComponent(name)}`);
        if (!res.ok) throw new Error('VP not found');
        const data = await res.json();
        setVPData(data);
      } catch (err) {
        console.error('Failed to load VP data:', err);
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
          title="BUD-Head Performance"
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

  if (!vpData) {
    return (
      <div className="min-h-screen">
        <PageHeader title="BUD-Head Performance" subtitle="ไม่พบข้อมูล" />
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

  const { grandTotals, kpis, projects, team } = vpData;

  return (
    <div className="min-h-screen">
      <PageHeader
        title={`${vpData.name}`}
        subtitle={`${vpData.position} | BUD-Head Performance Dashboard`}
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

        {/* Sales KPI Cards */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Sales Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <KPICard
            title="Projects"
            value={vpData.projectCount.toString()}
            change="โครงการที่รับผิดชอบ"
            changeType="neutral"
            icon={Briefcase}
            color="slate"
          />
          <KPICard
            title="Total Booking"
            value={formatCurrency(grandTotals.booking)}
            change="YTD"
            changeType="neutral"
            icon={TrendingUp}
            color="purple"
          />
          <KPICard
            title="Total Livnex"
            value={formatCurrency(grandTotals.livnex)}
            change="YTD"
            changeType="neutral"
            icon={Zap}
            color="orange"
          />
          <KPICard
            title="Presale Actual"
            value={formatCurrency(grandTotals.presaleActual)}
            change={`${kpis.presaleAchievePct.toFixed(2)}% of target`}
            changeType={kpis.presaleAchievePct >= 80 ? 'positive' : kpis.presaleAchievePct >= 60 ? 'warning' : 'negative'}
            showArrow={false}
            target={{ percentage: Math.round(Math.min(kpis.presaleAchievePct, 100) * 100) / 100 }}
            subtext={`Target: ${formatCurrency(grandTotals.presaleTarget)}`}
            icon={Target}
            color="emerald"
          />
          <KPICard
            title="Revenue Actual"
            value={formatCurrency(grandTotals.revenueActual)}
            change={`${kpis.revenueAchievePct.toFixed(2)}% of target`}
            changeType={kpis.revenueAchievePct >= 80 ? 'positive' : kpis.revenueAchievePct >= 60 ? 'warning' : 'negative'}
            showArrow={false}
            target={{ percentage: Math.round(Math.min(kpis.revenueAchievePct, 100) * 100) / 100 }}
            subtext={`Target: ${formatCurrency(grandTotals.revenueTarget)}`}
            icon={DollarSign}
            color="blue"
          />
          </div>

          {/* Top 10 Projects by Sales */}
          <Top10SalesTable
            projects={projects}
            onRowClick={(code) => navigate(`/sales-2025/project/${code}`)}
            formatCurrency={formatCurrency}
            storageKey="vp-detail-sales-table"
          />
        </div>

        {/* Marketing KPI Cards */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Marketing Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="MKT Expense (YTD)"
            value={formatCurrency(grandTotals.mktExpense)}
            change="ค่าใช้จ่าย Marketing"
            changeType="neutral"
            icon={DollarSign}
            color="orange"
          />
          <KPICard
            title="Total Lead"
            value={grandTotals.totalLead.toLocaleString()}
            change={`CPL: ฿${kpis.avgCPL.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            changeType="neutral"
            icon={Users}
            color="purple"
          />
          <KPICard
            title="Quality Lead"
            value={grandTotals.qualityLead.toLocaleString()}
            change={`CPQL: ฿${kpis.avgCPQL.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            changeType="neutral"
            icon={Target}
            color="emerald"
          />
          <KPICard
            title="Lead Quality"
            value={`${grandTotals.totalLead.toLocaleString()} / ${grandTotals.qualityLead.toLocaleString()}`}
            change={`Quality Rate: ${grandTotals.totalLead > 0 ? ((grandTotals.qualityLead / grandTotals.totalLead) * 100).toFixed(1) : 0}%`}
            changeType={grandTotals.totalLead > 0 ? (((grandTotals.qualityLead / grandTotals.totalLead) * 100) >= 80 ? 'positive' : ((grandTotals.qualityLead / grandTotals.totalLead) * 100) >= 60 ? 'warning' : 'negative') : 'neutral'}
            showArrow={false}
            icon={TrendingDown}
            color="slate"
          />
          </div>

          {/* Top 10 Projects by Marketing */}
          <Top10MarketingTable
            projects={projects}
            onRowClick={(code) => navigate(`/sales-2025/project/${code}`)}
            formatCurrency={formatCurrency}
            storageKey="vp-detail-mkt-table"
          />
        </div>

        {/* Team Section */}
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
                  onClick={() => navigate(`/sales-2025/employee/${encodeURIComponent(mgr.name)}`)}
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
                  className="p-3 bg-slate-50 rounded-lg"
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
      </div>
    </div>
  );
}
