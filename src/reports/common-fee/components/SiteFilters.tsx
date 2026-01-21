import { useState, useEffect, useRef } from 'react';
import { Filter, Search, ChevronDown, X } from 'lucide-react';

// ===== Searchable Select Component =====
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

// ===== Types =====
interface Site {
  id: number;
  domain: string;
  display_name: string;
  invoice_count: string;
}

interface Status {
  status: string;
  count: string;
}

interface Period {
  period: string;
  display: string;
  invoice_count: string;
}

interface FilterOptions {
  sites: Site[];
  statuses: Status[];
  periods: Period[];
}

export interface SiteFilterValues {
  siteId: string;
  period: string;
  status: string;
  year: string;
  payGroup: string;
}

interface SiteFiltersProps {
  onApply: (filters: SiteFilterValues) => void;
  initialValues?: Partial<SiteFilterValues>;
  storageKey?: string;
  showPeriod?: boolean;
  showStatus?: boolean;
  showYear?: boolean;
  showPayGroup?: boolean;
}

const statusLabels: Record<string, string> = {
  all: 'ทั้งหมด',
  active: 'รอรับชำระ',
  overdue: 'เกินกำหนด',
  paid: 'ชำระแล้ว',
  partial_payment: 'ชำระแล้วบางส่วน',
  void: 'ยกเลิก',
  draft: 'แบบร่าง',
  waiting_fix: 'รอแก้ไข',
};

const payGroupLabels: Record<string, string> = {
  all: 'ทั้งหมด',
  owner: 'เจ้าของห้อง',
  developer: 'ผู้พัฒนา',
  rent: 'ผู้เช่า',
  agent: 'ตัวแทน',
};

const payGroupOptions: SelectOption[] = [
  { value: 'owner', label: 'เจ้าของห้อง' },
  { value: 'developer', label: 'ผู้พัฒนา' },
  { value: 'rent', label: 'ผู้เช่า' },
  { value: 'agent', label: 'ตัวแทน' },
];

// Statuses to show in dropdown (in order)
const allowedStatuses = ['all', 'active', 'overdue', 'paid', 'partial_payment', 'void'];

function getFiltersFromStorage(key: string): SiteFilterValues | null {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to parse saved filters:', e);
  }
  return null;
}

function saveFiltersToStorage(key: string, filters: SiteFilterValues) {
  try {
    localStorage.setItem(key, JSON.stringify(filters));
  } catch (e) {
    console.error('Failed to save filters:', e);
  }
}

function clearFiltersFromStorage(key: string) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to clear filters:', e);
  }
}

// ===== Main Component =====
export function SiteFilters({
  onApply,
  initialValues,
  storageKey = 'common-fee-site-filters',
  showPeriod = true,
  showStatus = true,
  showYear = true,
  showPayGroup = true,
}: SiteFiltersProps) {
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasAppliedInitial = useRef(false);

  // Generate year options: current year + 15 years back
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 16 }, (_, i) => currentYear - i);

  // Filter state - restore from localStorage
  const [filters, setFilters] = useState<SiteFilterValues>(() => {
    const saved = getFiltersFromStorage(storageKey);
    if (saved) return { ...saved, payGroup: saved.payGroup === 'all' ? '' : (saved.payGroup || '') };
    return {
      siteId: initialValues?.siteId || '',
      period: initialValues?.period || '',
      status: initialValues?.status || 'all',
      year: initialValues?.year || new Date().getFullYear().toString(),
      payGroup: initialValues?.payGroup || '',
    };
  });

  // 1. Fetch filter options (sites, statuses) - NOT periods
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const response = await fetch('/api/common-fee/filters');
        if (!response.ok) throw new Error('Failed to fetch filters');
        const data = await response.json();

        // Only set sites and statuses, NOT periods
        setFilterOptions({
          sites: data.sites,
          statuses: data.statuses,
          periods: [] // Periods will be fetched by the other effect
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading filters');
      } finally {
        setLoading(false);
      }
    }

    fetchFilterOptions();
  }, []);

  // 2. Fetch periods based on current siteId - runs on mount and when siteId changes
  useEffect(() => {
    if (!showPeriod) {
      // If not showing period, still apply initial filters
      if (!hasAppliedInitial.current) {
        hasAppliedInitial.current = true;
        onApply(filters);
      }
      return;
    }

    async function fetchPeriods() {
      setPeriodsLoading(true);
      try {
        // Always fetch based on current siteId
        const url = filters.siteId
          ? `/api/common-fee/periods?site_id=${filters.siteId}`
          : '/api/common-fee/periods';
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch periods');
        const data: Period[] = await response.json();
        setPeriods(data);

        // Apply initial filters once after periods are loaded
        if (!hasAppliedInitial.current) {
          hasAppliedInitial.current = true;
          onApply(filters);
        }
      } catch (err) {
        console.error('Failed to fetch periods:', err);
      } finally {
        setPeriodsLoading(false);
      }
    }

    fetchPeriods();
  }, [filters.siteId, showPeriod]); // Only depends on siteId

  const handleChange = (key: keyof SiteFilterValues, value: string) => {
    // When site changes, reset period to empty (ทุกงวด)
    if (key === 'siteId') {
      const newFilters = { ...filters, siteId: value, period: '' };
      setFilters(newFilters);
      saveFiltersToStorage(storageKey, newFilters);
      onApply(newFilters);
      return;
    }

    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    saveFiltersToStorage(storageKey, newFilters);
    onApply(newFilters);
  };

  const handleClear = () => {
    const cleared: SiteFilterValues = {
      siteId: '',
      period: '',
      status: 'all',
      year: new Date().getFullYear().toString(),
      payGroup: '',
    };
    setFilters(cleared);
    clearFiltersFromStorage(storageKey);
    onApply(cleared);
  };

  if (loading) {
    return (
      <div className="card mb-6">
        <div className="animate-pulse flex gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 bg-slate-200 rounded-lg flex-1" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card mb-6 bg-red-50 border-red-200">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  // Prepare options for SearchableSelect
  const siteOptions: SelectOption[] = filterOptions?.sites.map(s => ({
    value: String(s.id),
    label: `${s.display_name} (${parseInt(s.invoice_count).toLocaleString()})`,
  })) || [];

  const periodOptions: SelectOption[] = periods.map(p => ({
    value: p.period,
    label: `${p.display} (${parseInt(p.invoice_count).toLocaleString()})`,
  }));

  const statusOptions: SelectOption[] = filterOptions?.statuses
    .filter(s => allowedStatuses.includes(s.status))
    .sort((a, b) => allowedStatuses.indexOf(a.status) - allowedStatuses.indexOf(b.status))
    .map(s => ({
      value: s.status,
      label: `${statusLabels[s.status] || s.status} (${parseInt(s.count).toLocaleString()})`,
    })) || [];

  // Calculate grid columns based on what's shown
  const gridCols = (showYear ? 1 : 0) + 1 + (showPeriod ? 1 : 0) + (showStatus ? 1 : 0) + (showPayGroup ? 1 : 0) + 1; // year? + site + period? + status? + payGroup? + clear button

  return (
    <div className="card mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-slate-500" />
        <h3 className="font-semibold text-slate-800">Filters</h3>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${gridCols} gap-4`}>
        {/* Year Filter */}
        {showYear && (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">ปี</label>
            <select
              value={filters.year}
              onChange={(e) => handleChange('year', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-800"
            >
              {availableYears.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
        )}

        {/* Site Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">โครงการ / Site</label>
          <SearchableSelect
            value={filters.siteId}
            onChange={(val) => handleChange('siteId', val)}
            options={siteOptions}
            placeholder="ทุกโครงการ"
          />
        </div>

        {/* Period Filter */}
        {showPeriod && (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              งวดเรียกเก็บ
              {periodsLoading && <span className="ml-2 text-xs text-slate-400">(กำลังโหลด...)</span>}
            </label>
            <SearchableSelect
              value={filters.period}
              onChange={(val) => handleChange('period', val)}
              options={periodOptions}
              placeholder="ทุกงวด"
            />
          </div>
        )}

        {/* Status Filter */}
        {showStatus && (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">สถานะ</label>
            <SearchableSelect
              value={filters.status}
              onChange={(val) => handleChange('status', val === '' ? 'all' : val)}
              options={statusOptions}
              placeholder="ทั้งหมด"
            />
          </div>
        )}

        {/* Pay Group Filter */}
        {showPayGroup && (
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">ประเภทค่าใช้จ่าย</label>
            <SearchableSelect
              value={filters.payGroup}
              onChange={(val) => handleChange('payGroup', val)}
              options={payGroupOptions}
              placeholder="ทั้งหมด"
            />
          </div>
        )}

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
