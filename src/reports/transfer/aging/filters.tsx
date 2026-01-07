import { useState } from 'react';
import { Filter, Calendar, Building, RefreshCw, Download } from 'lucide-react';
import { mockProjects } from '@shared/api';
import { DateRangeType } from '@shared/types';

interface AgingFiltersProps {
  onApply: (filters: { projectId: string; dateRange: DateRangeType; agingRange: string }) => void;
  onExport?: () => void;
}

export function AgingFilters({ onApply, onExport }: AgingFiltersProps) {
  const [projectId, setProjectId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRangeType>('mtd');
  const [agingRange, setAgingRange] = useState<string>('');

  const handleApply = () => {
    onApply({ projectId, dateRange, agingRange });
  };

  return (
    <div className="card mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-slate-500" />
        <h3 className="font-semibold text-slate-700">Filters</h3>
        <span className="text-xs text-slate-400 ml-2">
          (Inherited from Transfer Overview)
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Project
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="select-field pl-10"
            >
              <option value="">All Projects</option>
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
            Date Range
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeType)}
              className="select-field pl-10"
            >
              <option value="mtd">Month to Date</option>
              <option value="qtd">Quarter to Date</option>
              <option value="ytd">Year to Date</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Aging Range
          </label>
          <select
            value={agingRange}
            onChange={(e) => setAgingRange(e.target.value)}
            className="select-field"
          >
            <option value="">All Ranges</option>
            <option value="0-30">0-30 days</option>
            <option value="31-60">31-60 days</option>
            <option value="61-90">61-90 days</option>
            <option value="90+">90+ days</option>
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={handleApply}
            className="btn-primary flex items-center gap-2 flex-1"
          >
            <RefreshCw className="w-4 h-4" />
            Apply
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
