import { useState, useEffect, useRef } from 'react';
import { Filter, Search, ChevronDown, X, Calendar } from 'lucide-react';

// Month helpers (YYYY-MM format)
function getYTDStartMonth(): string {
  return `${new Date().getFullYear()}-01`;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export interface QualityFilterState {
  projectId: string;
  projectType: string;
  category: string;
  workArea: string;
  warrantyStatus: string;
  dateFrom: string;
  dateTo: string;
}

interface ProjectOption {
  project_id: string;
  project_name: string;
}

interface QualityFiltersProps {
  onApply: (filters: QualityFilterState) => void;
  projects?: ProjectOption[];
  hideProject?: boolean;
  hideFields?: ('category' | 'workArea' | 'date')[];
}

// ===== Searchable Select (same pattern as Common Fee) =====
interface SelectOption {
  value: string;
  label: string;
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'ทั้งหมด',
}: {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = options.filter((o) =>
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
    <div ref={containerRef} className="relative">
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
              onClick={(e) => {
                e.stopPropagation();
                handleSelect('');
              }}
            />
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
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
              className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                !value ? 'bg-primary-50 text-primary-700' : 'text-slate-600'
              }`}
            >
              {placeholder}
            </button>
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 truncate ${
                  value === option.value ? 'bg-primary-50 text-primary-700' : 'text-slate-800'
                }`}
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

// Date range presets (month-based)
const datePresets = [
  { label: 'YTD', getRange: () => ({ from: getYTDStartMonth(), to: getCurrentMonth() }) },
  { label: '3 เดือน', getRange: () => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return { from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, to: getCurrentMonth() };
  }},
  { label: '6 เดือน', getRange: () => {
    const d = new Date(); d.setMonth(d.getMonth() - 6);
    return { from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, to: getCurrentMonth() };
  }},
  { label: '1 ปี', getRange: () => {
    const d = new Date(); d.setFullYear(d.getFullYear() - 1);
    return { from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, to: getCurrentMonth() };
  }},
  { label: 'ทั้งหมด', getRange: () => ({ from: '', to: '' }) },
];

const projectTypeOptions: SelectOption[] = [
  { value: 'C', label: 'แนวสูง (คอนโด)' },
  { value: 'H', label: 'แนวราบ' },
];

const workAreaOptions: SelectOption[] = [
  { value: 'customer_room', label: 'ห้องลูกค้า' },
  { value: 'central_area', label: 'ซ่อมส่วนกลาง' },
  { value: 'sales_office', label: 'สนง.ขาย' },
];

const warrantyStatusOptions: SelectOption[] = [
  { value: 'inWarranty', label: 'อยู่ในประกัน' },
  { value: 'noWarranty', label: 'ไม่อยู่ในประกัน' },
  { value: 'notCovered', label: 'ประกันไม่ครอบคลุม' },
];

const STORAGE_KEY = 'quality-overview-filters';

function loadSavedFilters(): { projectId: string; projectType: string; category: string; workArea: string; warrantyStatus: string; dateFrom: string; dateTo: string; activePreset: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { workArea: '', warrantyStatus: '', ...JSON.parse(raw) };
  } catch {}
  return { projectId: '', projectType: '', category: '', workArea: '', warrantyStatus: '', dateFrom: '', dateTo: '', activePreset: 'ทั้งหมด' };
}

function saveFilters(projectId: string, projectType: string, category: string, workArea: string, warrantyStatus: string, dateFrom: string, dateTo: string, activePreset: string) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ projectId, projectType, category, workArea, warrantyStatus, dateFrom, dateTo, activePreset }));
}

export function QualityFilters({ onApply, projects = [], hideProject = false, hideFields = [] }: QualityFiltersProps) {
  const saved = loadSavedFilters();
  const [projectId, setProjectId] = useState(saved.projectId);
  const [projectType, setProjectType] = useState(saved.projectType);
  const [category, setCategory] = useState(saved.category || '');
  const [workArea, setWorkArea] = useState(saved.workArea || '');
  const [warrantyStatus, setWarrantyStatus] = useState(saved.warrantyStatus || '');
  const [dateFrom, setDateFrom] = useState(saved.dateFrom);
  const [dateTo, setDateTo] = useState(saved.dateTo);
  const [activePreset, setActivePreset] = useState(saved.activePreset);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const initialLoadRef = useRef(true);

  // Load category options
  useEffect(() => {
    fetch('/api/quality/categories')
      .then(r => r.json())
      .then(setCategoryOptions)
      .catch(() => {});
  }, []);

  // Emit saved filters on first render
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      onApply({ projectId, projectType, category, workArea, warrantyStatus, dateFrom, dateTo });
    }
  }, []);

  const projectOptions: SelectOption[] = projects.map((p) => ({
    value: p.project_id,
    label: p.project_name,
  }));

  const emitFilters = (pId: string, pType: string, cat: string, wa: string, ws: string, from: string, to: string, preset?: string) => {
    saveFilters(pId, pType, cat, wa, ws, from, to, preset ?? activePreset);
    onApply({ projectId: pId, projectType: pType, category: cat, workArea: wa, warrantyStatus: ws, dateFrom: from, dateTo: to });
  };

  const handleProjectChange = (value: string) => {
    setProjectId(value);
    emitFilters(value, projectType, category, workArea, warrantyStatus, dateFrom, dateTo);
  };

  const handleProjectTypeChange = (value: string) => {
    setProjectType(value);
    emitFilters(projectId, value, category, workArea, warrantyStatus, dateFrom, dateTo);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    emitFilters(projectId, projectType, value, workArea, warrantyStatus, dateFrom, dateTo);
  };

  const handleWorkAreaChange = (value: string) => {
    setWorkArea(value);
    emitFilters(projectId, projectType, category, value, warrantyStatus, dateFrom, dateTo);
  };

  const handleWarrantyStatusChange = (value: string) => {
    setWarrantyStatus(value);
    emitFilters(projectId, projectType, category, workArea, value, dateFrom, dateTo);
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    setActivePreset('');
    emitFilters(projectId, projectType, category, workArea, warrantyStatus, value, dateTo, '');
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    setActivePreset('');
    emitFilters(projectId, projectType, category, workArea, warrantyStatus, dateFrom, value, '');
  };

  const handlePreset = (preset: typeof datePresets[number]) => {
    const { from, to } = preset.getRange();
    setDateFrom(from);
    setDateTo(to);
    setActivePreset(preset.label);
    emitFilters(projectId, projectType, category, workArea, warrantyStatus, from, to, preset.label);
  };

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-500" />
          <h3 className="font-medium text-slate-700">ตัวกรอง</h3>
        </div>
        <div className="flex items-center gap-1">
          {!hideFields.includes('date') && datePresets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activePreset === preset.label
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">ประเภทโครงการ</label>
          <SearchableSelect
            options={projectTypeOptions}
            value={projectType}
            onChange={handleProjectTypeChange}
            placeholder="ทั้งหมด"
          />
        </div>
        {!hideProject && (
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">โครงการ</label>
          <SearchableSelect
            options={projectOptions}
            value={projectId}
            onChange={handleProjectChange}
            placeholder="ทุกโครงการ"
          />
        </div>
        )}
        {!hideFields.includes('category') && (
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">หมวดงาน</label>
          <SearchableSelect
            options={categoryOptions}
            value={category}
            onChange={handleCategoryChange}
            placeholder="ทุกหมวด"
          />
        </div>
        )}
        {!hideFields.includes('workArea') && (
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">ประเภทพื้นที่</label>
          <SearchableSelect
            options={workAreaOptions}
            value={workArea}
            onChange={handleWorkAreaChange}
            placeholder="ทั้งหมด"
          />
        </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">การรับประกัน</label>
          <SearchableSelect
            options={warrantyStatusOptions}
            value={warrantyStatus}
            onChange={handleWarrantyStatusChange}
            placeholder="ทั้งหมด"
          />
        </div>
        {!hideFields.includes('date') && (
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">ตั้งแต่เดือน</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="month"
              value={dateFrom}
              onChange={(e) => handleDateFromChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        )}
        {!hideFields.includes('date') && (
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">ถึงเดือน</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="month"
              value={dateTo}
              onChange={(e) => handleDateToChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
