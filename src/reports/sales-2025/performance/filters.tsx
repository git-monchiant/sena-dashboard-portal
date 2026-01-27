import { useState, useEffect, useRef } from 'react';
import { Filter, Search, ChevronDown, X } from 'lucide-react';

// Searchable Select Component
interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function SearchableSelect({ options, value, onChange, placeholder = 'ทั้งหมด', className = '' }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(o => o.value === value);

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white flex items-center justify-between gap-2"
      >
        <span className={`truncate ${!selectedOption ? 'text-slate-400' : 'text-slate-800'}`}>
          {selectedOption?.label || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <X
              className="w-4 h-4 text-slate-400 hover:text-slate-600"
              onClick={(e) => { e.stopPropagation(); handleSelect(''); }}
            />
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${!value ? 'bg-primary-50 text-primary-700' : 'text-slate-600'}`}
            >
              {placeholder}
            </button>
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 truncate ${value === option.value ? 'bg-primary-50 text-primary-700' : 'text-slate-800'}`}
              >
                {option.label}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-400 text-center">ไม่พบข้อมูล</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface FilterOptions {
  vpList: { name: string; position: string }[];
  mgrList: { name: string; position: string }[];
  projectList: { project_code: string; project_name: string; bud: string }[];
  budList: string[];
  quarterList: string[];
}

export interface FilterState {
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

const API_URL = ''; // Use Vite proxy
const STORAGE_KEY = 'sales2025-filters';

// Helper to get filters from localStorage
function getFiltersFromStorage(): FilterState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to parse saved filters:', e);
  }
  return null;
}

// Helper to save filters to localStorage
function saveFiltersToStorage(filters: FilterState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch (e) {
    console.error('Failed to save filters:', e);
  }
}

// Helper to clear filters from localStorage
function clearFiltersFromStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear filters:', e);
  }
}

export function SalesPerformanceFilters({ onApply, initialFilters }: Props) {
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [filters, setFilters] = useState<FilterState>(() => {
    // Priority: localStorage > initialFilters > empty
    const savedFilters = getFiltersFromStorage();
    return savedFilters || initialFilters || {
      vp: '',
      mgr: '',
      project: '',
      quarter: '',
      bud: '',
    };
  });
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    fetch(`${API_URL}/api/sales-2025-v2/filters`)
      .then(res => res.json())
      .then(data => {
        setOptions(data);
        setIsLoading(false);
        // Apply initial filters from localStorage after options loaded
        if (!initialLoadDone.current) {
          initialLoadDone.current = true;
          onApply(filters);
        }
      })
      .catch(err => {
        console.error('Failed to load filters:', err);
        setIsLoading(false);
      });
  }, []);

  const handleChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    saveFiltersToStorage(newFilters);
    onApply(newFilters);
  };

  const handleClear = () => {
    const cleared = { vp: '', mgr: '', project: '', quarter: '', bud: '' };
    setFilters(cleared);
    clearFiltersFromStorage();
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
          <SearchableSelect
            value={filters.bud}
            onChange={(val) => handleChange('bud', val)}
            options={options?.budList.map(bud => ({ value: bud, label: bud })) || []}
            placeholder="ทั้งหมด"
          />
        </div>

        {/* BUD-Head Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">BUD-Head</label>
          <SearchableSelect
            value={filters.vp}
            onChange={(val) => handleChange('vp', val)}
            options={options?.vpList.map(vp => ({ value: vp.name, label: `${vp.name} (${vp.position})` })) || []}
            placeholder="ทั้งหมด"
          />
        </div>

        {/* MGR-Sale Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">MGR-Sale</label>
          <SearchableSelect
            value={filters.mgr}
            onChange={(val) => handleChange('mgr', val)}
            options={options?.mgrList.map(mgr => ({ value: mgr.name, label: `${mgr.name} (${mgr.position})` })) || []}
            placeholder="ทั้งหมด"
          />
        </div>

        {/* Project Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Project</label>
          <SearchableSelect
            value={filters.project}
            onChange={(val) => handleChange('project', val)}
            options={options?.projectList.map(p => ({ value: p.project_code, label: `${p.project_code} - ${p.project_name}` })) || []}
            placeholder="ทั้งหมด"
          />
        </div>

        {/* Quarter Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Quarter</label>
          <SearchableSelect
            value={filters.quarter}
            onChange={(val) => handleChange('quarter', val)}
            options={options?.quarterList.map(q => ({ value: q, label: q })) || []}
            placeholder="ทั้งหมด"
          />
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
