import { useState } from 'react';
import { Filter, Calendar, Building, RefreshCw, Download } from 'lucide-react';
import { mockProjects } from '@shared/api';
import { FilterState, DateRangeType } from '@shared/types';

interface SalesFiltersProps {
  onApply: (filters: FilterState) => void;
  onExport?: () => void;
}

export function SalesFilters({ onApply, onExport }: SalesFiltersProps) {
  const [projectId, setProjectId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRangeType>('mtd');
  const [channel, setChannel] = useState<string>('');

  const handleApply = () => {
    onApply({ projectId, dateRange });
  };

  return (
    <div className="card mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-slate-500" />
        <h3 className="font-semibold text-slate-700">Filters</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Project Filter (Mandatory) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Project <span className="text-red-500">*</span>
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

        {/* Date Range */}
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
              <option value="today">Today</option>
              <option value="wtd">Week to Date</option>
              <option value="mtd">Month to Date</option>
              <option value="qtd">Quarter to Date</option>
              <option value="ytd">Year to Date</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
        </div>

        {/* Sales Channel */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Sales Channel
          </label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="select-field"
          >
            <option value="">All Channels</option>
            <option value="direct">Direct Sales</option>
            <option value="online">Online</option>
            <option value="agents">Agents</option>
            <option value="referral">Referral</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-end gap-2">
          <button
            onClick={handleApply}
            className="btn-primary flex items-center gap-2 flex-1"
          >
            <RefreshCw className="w-4 h-4" />
            Apply Filters
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
