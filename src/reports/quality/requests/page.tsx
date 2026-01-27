import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '@shared/ui';
import { RequestsFilters } from './filters';
import {
  fetchMaintenanceRequests,
  RequestsData,
  RequestsFilterState,
  MaintenanceRequestItem,
} from './queries';
import {
  categoryConfig,
  statusConfig,
  responsibilityConfig,
  priorityConfig,
  jobTypeConfig,
  RequestStatus,
  RequestCategory,
  ResponsibilityType,
  Priority,
  JobType,
} from '../types';

type SortField = 'requestNumber' | 'createdAt' | 'daysOpen' | 'priority' | 'status';
type SortDirection = 'asc' | 'desc';

export function RequestsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<RequestsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('daysOpen');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Parse URL params for initial filters
  const initialFilters = useMemo((): RequestsFilterState => {
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const jobType = searchParams.get('jobType');
    const responsibilityType = searchParams.get('responsibilityType');
    const priority = searchParams.get('priority');
    const projectId = searchParams.get('projectId');
    const overdue = searchParams.get('overdue');

    return {
      projectId: projectId || '',
      category: (category as RequestCategory) || 'all',
      jobType: (jobType as JobType) || 'all',
      status: (status as RequestStatus) || 'all',
      responsibilityType: (responsibilityType as ResponsibilityType) || 'all',
      priority: (priority as Priority) || 'all',
      search: '',
      dateFrom: '',
      dateTo: '',
      overdue: overdue === 'true',
    };
  }, [searchParams]);

  const loadData = async (filters: RequestsFilterState) => {
    setLoading(true);
    const result = await fetchMaintenanceRequests(filters);
    setData(result);
    setLoading(false);
  };

  useEffect(() => {
    loadData(initialFilters);
  }, [initialFilters]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedItems = data?.items
    ? [...data.items].sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'requestNumber':
            comparison = a.requestNumber.localeCompare(b.requestNumber);
            break;
          case 'createdAt':
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            break;
          case 'daysOpen':
            comparison = a.daysOpen - b.daysOpen;
            break;
          case 'priority': {
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
            break;
          }
          case 'status': {
            const statusOrder = {
              open: 5,
              in_progress: 4,
              pending_parts: 3,
              pending_approval: 2,
              completed: 1,
              cancelled: 0,
            };
            comparison = statusOrder[a.status] - statusOrder[b.status];
            break;
          }
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      })
    : [];

  if (loading || !data) {
    return (
      <div className="min-h-screen">
        <PageHeader title="รายการงานทั้งหมด" subtitle="รายละเอียดคำร้องแจ้งซ่อมและข้อร้องเรียน" />
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
      <PageHeader title="รายการงานทั้งหมด" subtitle="รายละเอียดคำร้องแจ้งซ่อมและข้อร้องเรียน" />

      <div className="p-8">
        {/* Back Navigation */}
        <button
          onClick={() => navigate('/maintenance')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">กลับหน้าภาพรวม</span>
        </button>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">งานทั้งหมด</p>
                <p className="text-xl font-bold text-slate-800">{data.summary.total.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">เปิดอยู่</p>
                <p className="text-xl font-bold text-amber-600">{data.summary.open.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">กำลังดำเนินการ</p>
                <p className="text-xl font-bold text-purple-600">{data.summary.inProgress.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 text-green-600">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">เสร็จสิ้น</p>
                <p className="text-xl font-bold text-green-600">{data.summary.completed.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">เกินกำหนด</p>
                <p className="text-xl font-bold text-red-600">{data.summary.overdue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <RequestsFilters onApply={loadData} initialFilters={initialFilters} />

        {/* Results Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">รายการทั้งหมด ({sortedItems.length} รายการ)</h3>
            <button className="btn-secondary text-sm flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Export
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <SortableHeader
                    label="เลขที่งาน"
                    field="requestNumber"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="วันที่สร้าง"
                    field="createdAt"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">โครงการ / ยูนิต</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">ประเภท</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">รายละเอียด</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">ผู้รับผิดชอบ</th>
                  <SortableHeader
                    label="สถานะ"
                    field="status"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="ความเร่งด่วน"
                    field="priority"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="เปิดมา"
                    field="daysOpen"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <RequestRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          </div>

          {sortedItems.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>ไม่พบรายการที่ตรงกับเงื่อนไข</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SortableHeaderProps {
  label: string;
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  align?: 'left' | 'right';
}

function SortableHeader({ label, field, currentField, direction, onSort, align = 'left' }: SortableHeaderProps) {
  const isActive = currentField === field;
  return (
    <th
      className={`py-3 px-4 text-sm font-medium text-slate-600 cursor-pointer hover:bg-slate-100 transition-colors ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        <span>{label}</span>
        {isActive ? (
          direction === 'asc' ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )
        ) : (
          <ChevronDown className="w-4 h-4 opacity-30" />
        )}
      </div>
    </th>
  );
}

function RequestRow({ item }: { item: MaintenanceRequestItem }) {
  const catConfig = categoryConfig[item.category];
  const statConfig = statusConfig[item.status];
  const respConfig = responsibilityConfig[item.responsibilityType];
  const prioConfig = priorityConfig[item.priority];
  const jtConfig = jobTypeConfig[item.jobType];

  const isOverdue = item.daysOpen > 14 && item.status !== 'completed';

  const statusVariantClasses = {
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-amber-100 text-amber-700',
    success: 'bg-green-100 text-green-700',
    danger: 'bg-red-100 text-red-700',
    default: 'bg-slate-100 text-slate-700',
  };

  const priorityColorClasses = {
    urgent: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-green-100 text-green-700',
  };

  return (
    <tr className={`border-b border-slate-100 hover:bg-slate-50 ${isOverdue ? 'bg-red-50/30' : ''}`}>
      <td className="py-3 px-4">
        <span className="text-sm font-medium text-primary-600">{item.requestNumber}</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-sm text-slate-600">{item.createdAt}</span>
      </td>
      <td className="py-3 px-4">
        <p className="text-sm font-medium text-slate-800">{item.projectName}</p>
        <p className="text-xs text-slate-500">{item.unitNumber} | {item.building}</p>
      </td>
      <td className="py-3 px-4">
        <p className="text-sm text-slate-700">{catConfig.label}</p>
        <span className="text-xs text-slate-500">{jtConfig.label}</span>
      </td>
      <td className="py-3 px-4 max-w-[200px]">
        <p className="text-sm text-slate-600 truncate" title={item.description}>
          {item.description}
        </p>
      </td>
      <td className="py-3 px-4">
        <p className="text-sm text-slate-800">{item.assignee}</p>
        <p className="text-xs text-slate-500">{respConfig.shortLabel}</p>
      </td>
      <td className="py-3 px-4">
        <span
          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusVariantClasses[statConfig.variant]}`}
        >
          {statConfig.label}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${priorityColorClasses[item.priority]}`}>
          {prioConfig.label}
        </span>
      </td>
      <td className="py-3 px-4 text-right">
        {item.status === 'completed' ? (
          <span className="text-sm text-green-600">{item.resolutionDays} วัน</span>
        ) : (
          <span
            className={`text-sm font-medium ${
              item.daysOpen > 14 ? 'text-red-600' : item.daysOpen > 7 ? 'text-amber-600' : 'text-slate-600'
            }`}
          >
            {item.daysOpen} วัน
          </span>
        )}
      </td>
    </tr>
  );
}
