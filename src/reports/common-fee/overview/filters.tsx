import { useState } from 'react';
import { Filter, Calendar, Building, RefreshCw, Download } from 'lucide-react';
import { mockProjects } from '@shared/api';

export type FeeStatus = 'all' | 'paid' | 'partial' | 'unpaid' | 'overdue';
export type PeriodType = 'monthly' | 'quarterly' | 'custom';

export interface CommonFeeFilterState {
  projectId: string;
  period: PeriodType;
  status: FeeStatus;
  startDate?: string;
  endDate?: string;
}

interface CommonFeeFiltersProps {
  onApply: (filters: CommonFeeFilterState) => void;
  onExport?: () => void;
}

export function CommonFeeFilters({ onApply, onExport }: CommonFeeFiltersProps) {
  const [projectId, setProjectId] = useState<string>('');
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const [status, setStatus] = useState<FeeStatus>('all');

  const handleApply = () => {
    onApply({ projectId, period, status });
  };

  return (
    <div className="card mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-slate-500" />
        <h3 className="font-semibold text-slate-700">ตัวกรอง</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Project Filter (Mandatory) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            โครงการ <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="select-field pl-10"
            >
              <option value="">ทุกโครงการ</option>
              {mockProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Period */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            ช่วงเวลา
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodType)}
              className="select-field pl-10"
            >
              <option value="monthly">รายเดือน</option>
              <option value="quarterly">รายไตรมาส</option>
              <option value="custom">กำหนดเอง</option>
            </select>
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            สถานะ
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as FeeStatus)}
            className="select-field"
          >
            <option value="all">ทั้งหมด</option>
            <option value="paid">ชำระแล้ว</option>
            <option value="partial">ชำระบางส่วน</option>
            <option value="unpaid">ค้างชำระ</option>
            <option value="overdue">เกินกำหนด</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-end gap-2">
          <button
            onClick={handleApply}
            className="btn-primary flex items-center gap-2 flex-1"
          >
            <RefreshCw className="w-4 h-4" />
            ค้นหา
          </button>
          {onExport && (
            <button onClick={onExport} className="btn-secondary p-2">
              <Download className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
