import { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';

interface FilterOptions {
  vpList: { name: string; position: string }[];
  mgrList: { name: string; position: string }[];
  projectList: { project_code: string; project_name: string; bud: string }[];
  budList: string[];
  quarterList: string[];
}

interface FilterState {
  vp: string;
  mgr: string;
  project: string;
  quarter: string;
  bud: string;
}

interface Props {
  onApply: (filters: FilterState) => void;
  initialFilters?: FilterState;
}

const API_URL = 'http://localhost:3001';

export function SalesPerformanceFilters({ onApply, initialFilters }: Props) {
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters || {
    vp: '',
    mgr: '',
    project: '',
    quarter: '',
    bud: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/sales-2025/filters`)
      .then(res => res.json())
      .then(data => {
        setOptions(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load filters:', err);
        setIsLoading(false);
      });
  }, []);

  const handleChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onApply(newFilters);
  };

  const handleClear = () => {
    const cleared = { vp: '', mgr: '', project: '', quarter: '', bud: '' };
    setFilters(cleared);
    onApply(cleared);
  };

  if (isLoading) {
    return (
      <div className="card mb-6">
        <div className="animate-pulse flex gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-10 bg-slate-200 rounded-lg flex-1" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-slate-500" />
        <h3 className="font-semibold text-slate-800">Filters</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* BUD Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">BUD</label>
          <select
            value={filters.bud}
            onChange={e => handleChange('bud', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">ทั้งหมด</option>
            {options?.budList.map(bud => (
              <option key={bud} value={bud}>{bud}</option>
            ))}
          </select>
        </div>

        {/* VP Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">VP</label>
          <select
            value={filters.vp}
            onChange={e => handleChange('vp', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">ทั้งหมด</option>
            {options?.vpList.map(vp => (
              <option key={vp.name} value={vp.name}>{vp.name} ({vp.position})</option>
            ))}
          </select>
        </div>

        {/* MGR Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">MGR</label>
          <select
            value={filters.mgr}
            onChange={e => handleChange('mgr', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">ทั้งหมด</option>
            {options?.mgrList.map(mgr => (
              <option key={mgr.name} value={mgr.name}>{mgr.name} ({mgr.position})</option>
            ))}
          </select>
        </div>

        {/* Project Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Project</label>
          <select
            value={filters.project}
            onChange={e => handleChange('project', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">ทั้งหมด</option>
            {options?.projectList.map(p => (
              <option key={p.project_code} value={p.project_code}>
                {p.project_code} - {p.project_name}
              </option>
            ))}
          </select>
        </div>

        {/* Quarter Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Quarter</label>
          <select
            value={filters.quarter}
            onChange={e => handleChange('quarter', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">ทั้งหมด</option>
            {options?.quarterList.map(q => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>

        {/* Clear Button */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            ล้างตัวกรอง
          </button>
        </div>
      </div>
    </div>
  );
}
