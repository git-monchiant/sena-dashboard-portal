import { useState } from 'react';
import { Filter, Calendar, Building, RefreshCw, Download } from 'lucide-react';
import { mockProjects } from '@shared/api';

export type AgingBucket = 'all' | '0-30' | '31-60' | '61-90' | '90+';

interface AgingFiltersProps {
  onApply: (filters: { projectId: string; asOfDate: string; bucket: AgingBucket }) => void;
  onExport?: () => void;
}

export function AgingFilters({ onApply, onExport }: AgingFiltersProps) {
  const [projectId, setProjectId] = useState<string>('');
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bucket, setBucket] = useState<AgingBucket>('all');

  const handleApply = () => {
    onApply({ projectId, asOfDate, bucket });
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
            ณ วันที่
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            ช่วงอายุหนี้
          </label>
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value as AgingBucket)}
            className="select-field"
          >
            <option value="all">ทุกช่วง</option>
            <option value="0-30">0-30 วัน</option>
            <option value="31-60">31-60 วัน</option>
            <option value="61-90">61-90 วัน</option>
            <option value="90+">มากกว่า 90 วัน</option>
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
