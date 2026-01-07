import { useState } from 'react';
import { Filter, Calendar, Building, RefreshCw, Download } from 'lucide-react';
import { mockProjects } from '@shared/api';
import { FeeStatus } from '../overview/filters';

interface CollectionFiltersProps {
  onApply: (filters: { projectId: string; period: string; status: FeeStatus }) => void;
  onExport?: () => void;
}

export function CollectionFilters({ onApply, onExport }: CollectionFiltersProps) {
  const [projectId, setProjectId] = useState<string>('');
  const [period, setPeriod] = useState<string>('2024-01');
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
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            โครงการ
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

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            งวดเรียกเก็บ
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

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
