import { useState, useEffect } from 'react';
import { Building2, TrendingUp, Star, AlertTriangle, DollarSign, RefreshCw, ChevronDown, ChevronUp, Target } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  LabelList,
} from 'recharts';
import { PageHeader } from '@shared/ui';
import { fetchContractorData, ContractorData, ContractorDetail } from './queries';

export function ContractorPage() {
  const [data, setData] = useState<ContractorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedContractor, setExpandedContractor] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const result = await fetchContractorData();
      setData(result);
      setLoading(false);
    }
    loadData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="ประสิทธิภาพผู้รับเหมา"
          subtitle="ติดตามและเปรียบเทียบประสิทธิภาพของผู้รับเหมา"
        />
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="ประสิทธิภาพผู้รับเหมา"
        subtitle="ติดตามและเปรียบเทียบประสิทธิภาพของผู้รับเหมา"
      />

      <div className="p-8 space-y-6">
        {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">ผู้รับเหมา</p>
              <p className="text-lg font-bold text-slate-800">{data.summary.activeContractors}/{data.summary.totalContractors}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">งานทั้งหมด</p>
              <p className="text-lg font-bold text-slate-800">{data.summary.totalJobs.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Completion เฉลี่ย</p>
              <p className="text-lg font-bold text-green-600">{data.summary.avgCompletionRate}%</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Rating เฉลี่ย</p>
              <p className="text-lg font-bold text-amber-600">{data.summary.avgRating}</p>
            </div>
          </div>
        </div>
        <div className="card col-span-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500">ค่าใช้จ่ายรวม</p>
              <p className="text-lg font-bold text-slate-800">{formatCurrency(data.summary.totalSpend)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            ผู้รับเหมาดีเด่น
          </h3>
          <div className="space-y-3">
            {data.topPerformers.map((performer, index) => (
              <div key={performer.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-green-600">#{index + 1}</span>
                  <span className="text-sm font-medium text-slate-700">{performer.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-green-600 font-medium">{performer.completionRate}%</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-sm text-slate-600">{performer.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Needs Attention */}
        <div className="card">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            ต้องติดตาม
          </h3>
          <div className="space-y-3">
            {data.needsAttention.map((item, index) => (
              <div key={`${item.id}-${index}`} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-slate-700">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{item.issue}</span>
                  <span className="text-sm font-medium text-red-600">{item.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-4">ประสิทธิภาพตามประเภทงาน</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.categoryBreakdown}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="category" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="jobs" name="จำนวนงาน" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="avgCompletionRate" name="Completion %" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Contractor Details Table */}
      <div className="card">
        <h3 className="font-semibold text-slate-800 mb-4">รายละเอียดผู้รับเหมา</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">ผู้รับเหมา</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">ประเภท</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">งาน</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">เสร็จ</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">ค้าง &gt; 14 วัน</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">เวลาเฉลี่ย</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Completion</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Rating</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">ค่าใช้จ่าย</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {data.contractors.map((contractor) => (
                <>
                  <tr key={contractor.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-slate-800">{contractor.name}</p>
                      <p className="text-xs text-slate-500">{contractor.contactPerson} | {contractor.phone}</p>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{contractor.category}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 text-right">{contractor.totalJobs.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 text-right">{contractor.completedJobs.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-sm font-medium ${contractor.jobsOver14Days > 5 ? 'text-red-600' : 'text-slate-600'}`}>
                        {contractor.jobsOver14Days.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 text-right">{contractor.avgResolutionDays} วัน</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-sm font-medium ${
                        contractor.completionRate >= 90 ? 'text-green-600' :
                        contractor.completionRate >= 80 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {contractor.completionRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-sm text-slate-600">{contractor.rating}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 text-right">{formatCurrency(contractor.totalCost)}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setExpandedContractor(
                          expandedContractor === contractor.id ? null : contractor.id
                        )}
                        className="p-1 hover:bg-slate-100 rounded"
                      >
                        {expandedContractor === contractor.id ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedContractor === contractor.id && (
                    <tr key={`${contractor.id}-expanded`}>
                      <td colSpan={10} className="bg-slate-50 px-4 py-4">
                        <ContractorExpandedView contractor={contractor} formatCurrency={formatCurrency} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}

function ContractorExpandedView({
  contractor,
  formatCurrency,
}: {
  contractor: ContractorDetail;
  formatCurrency: (value: number) => string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Stats */}
      <div className="space-y-4">
        <h4 className="font-medium text-slate-700">สถิติเพิ่มเติม</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-500">งานค้าง</p>
            <p className="text-lg font-bold text-slate-800">{contractor.pendingJobs.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-500">อัตรางานซ้ำ</p>
            <p className={`text-lg font-bold ${contractor.repeatJobRate > 5 ? 'text-red-600' : 'text-slate-800'}`}>
              {contractor.repeatJobRate}%
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-500">ค่าใช้จ่ายเฉลี่ย/งาน</p>
            <p className="text-lg font-bold text-slate-800">{formatCurrency(contractor.avgCostPerJob)}</p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-slate-200">
            <p className="text-xs text-slate-500">ค่าใช้จ่ายรวม</p>
            <p className="text-lg font-bold text-slate-800">{formatCurrency(contractor.totalCost)}</p>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div>
        <h4 className="font-medium text-slate-700 mb-4">แนวโน้มรายเดือน</h4>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={contractor.monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="linear" dataKey="jobs" name="งานเข้า" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2.5, fill: '#3b82f6' }}>
              <LabelList dataKey="jobs" position="top" fontSize={10} fill="#3b82f6" fontWeight={600} />
            </Line>
            <Line type="linear" dataKey="completed" name="เสร็จสิ้น" stroke="#22c55e" strokeWidth={2} dot={{ r: 2.5, fill: '#22c55e' }}>
              <LabelList dataKey="completed" position="bottom" fontSize={10} fill="#22c55e" fontWeight={600} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
