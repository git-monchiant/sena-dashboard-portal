import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, KPICard } from '@shared/ui';
import { Users, Target, DollarSign, Briefcase } from 'lucide-react';

const API_URL = 'http://localhost:3001';

interface Employee {
  name: string;
  position: string;
  roleType: string;
  projectCount: number;
  totalPresaleTarget: number;
  totalPresaleActual: number;
  totalRevenueTarget: number;
  totalRevenueActual: number;
  presaleAchievePct: number;
  revenueAchievePct: number;
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

export function EmployeeListPage() {
  const navigate = useNavigate();
  const [roleType, setRoleType] = useState<'VP' | 'MGR'>('VP');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEmployees = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/sales-2025/employees?roleType=${roleType}`);
        const data = await res.json();
        setEmployees(data);
      } catch (err) {
        console.error('Failed to load employees:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadEmployees();
  }, [roleType]);

  // Calculate KPIs
  const totalPresaleTarget = employees.reduce((sum, e) => sum + e.totalPresaleTarget, 0);
  const totalPresaleActual = employees.reduce((sum, e) => sum + e.totalPresaleActual, 0);
  const totalRevenueTarget = employees.reduce((sum, e) => sum + e.totalRevenueTarget, 0);
  const totalRevenueActual = employees.reduce((sum, e) => sum + e.totalRevenueActual, 0);
  const totalProjects = employees.reduce((sum, e) => sum + e.projectCount, 0);

  const avgPresaleAchieve = totalPresaleTarget > 0 ? (totalPresaleActual / totalPresaleTarget) * 100 : 0;
  const avgRevenueAchieve = totalRevenueTarget > 0 ? (totalRevenueActual / totalRevenueTarget) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="Employee Performance"
          subtitle="รายงาน Performance รายบุคคล"
        />
        <div className="p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-slate-200 rounded-xl w-64" />
            <div className="grid grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 bg-slate-200 rounded-xl" />
              ))}
            </div>
            <div className="h-96 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Employee Performance"
        subtitle="รายงาน Performance รายบุคคล"
      />

      <div className="p-8">
        {/* Role Type Toggle */}
        <div className="mb-6">
          <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-white">
            <button
              onClick={() => setRoleType('VP')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                roleType === 'VP'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              VP (ผู้บริหาร)
            </button>
            <button
              onClick={() => setRoleType('MGR')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                roleType === 'MGR'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              MGR (ผู้จัดการ)
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title={`Total ${roleType}s`}
            value={employees.length.toString()}
            change={`${totalProjects} projects`}
            changeType="positive"
            icon={Users}
            color="purple"
          />
          <KPICard
            title="Avg Presale Achievement"
            value={`${avgPresaleAchieve.toFixed(1)}%`}
            change={formatCurrency(totalPresaleActual)}
            changeType={avgPresaleAchieve >= 80 ? 'positive' : 'negative'}
            target={{ percentage: Math.min(avgPresaleAchieve, 100) }}
            icon={Target}
            color="emerald"
          />
          <KPICard
            title="Avg Revenue Achievement"
            value={`${avgRevenueAchieve.toFixed(1)}%`}
            change={formatCurrency(totalRevenueActual)}
            changeType={avgRevenueAchieve >= 80 ? 'positive' : 'negative'}
            target={{ percentage: Math.min(avgRevenueAchieve, 100) }}
            icon={DollarSign}
            color="blue"
          />
          <KPICard
            title="Total Projects"
            value={totalProjects.toString()}
            change={`managed by ${employees.length} ${roleType}s`}
            changeType="positive"
            icon={Briefcase}
            color="orange"
          />
        </div>

        {/* Employee Table */}
        <div className="card">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800">รายชื่อ {roleType === 'VP' ? 'VP' : 'MGR'}</h3>
            <p className="text-sm text-slate-500">คลิกเพื่อดูรายละเอียด</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Position</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Projects</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Presale Target</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Presale Actual</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">%</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Revenue Target</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">Revenue Actual</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">%</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate(`/sales-2025/employee/${encodeURIComponent(emp.name)}`)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-blue-600 hover:underline">{emp.name}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{emp.position}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium">
                        {emp.projectCount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {formatCurrency(emp.totalPresaleTarget)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatCurrency(emp.totalPresaleActual)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        emp.presaleAchievePct >= 0.8 ? 'bg-emerald-100 text-emerald-700' :
                        emp.presaleAchievePct >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {(emp.presaleAchievePct * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {formatCurrency(emp.totalRevenueTarget)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {formatCurrency(emp.totalRevenueActual)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        emp.revenueAchievePct >= 0.8 ? 'bg-emerald-100 text-emerald-700' :
                        emp.revenueAchievePct >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {(emp.revenueAchievePct * 100).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
