import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@shared/ui';
import { Filter, Search, ChevronDown, X } from 'lucide-react';

const API_URL = ''; // Use Vite proxy

// Searchable Select Component (same as filters.tsx)
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
  showAllOption?: boolean;
}

function SearchableSelect({ options, value, onChange, placeholder = 'ทั้งหมด', className = '', showAllOption = true }: SearchableSelectProps) {
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
          {value && showAllOption && (
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
            {showAllOption && (
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${!value ? 'bg-primary-50 text-primary-700' : 'text-slate-600'}`}
              >
                {placeholder}
              </button>
            )}
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

interface Employee {
  name: string;
  position: string;
  roleType: string;
  department: string;
  buds: string[];
  projectCount: number;
  totalPresaleTarget: number;
  totalPresaleActual: number;
  totalRevenueTarget: number;
  totalRevenueActual: number;
  presaleAchievePct: number;
  revenueAchievePct: number;
  mktExpense: number;
  totalBook: number;
  cpb: number;
}

function formatNumber(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0.00';
  if (n >= 1000000) {
    return `${(n / 1000000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  }
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(num: number): string {
  return `฿${formatNumber(num)}`;
}

function getEmployeeType(emp: Employee): string {
  if (emp.roleType === 'VP') return 'BUD-Head';
  if (emp.roleType === 'MGR' && emp.department === 'Sale') return 'MGR-Sale';
  if (emp.roleType === 'MGR' && emp.department === 'Mkt') return 'MGR-Marketing';
  return emp.roleType;
}

function getTypeBadgeClass(type: string): string {
  switch (type) {
    case 'BUD-Head':
      return 'bg-blue-100 text-blue-700';
    case 'MGR-Sale':
      return 'bg-emerald-100 text-emerald-700';
    case 'MGR-Marketing':
      return 'bg-purple-100 text-purple-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

const roleTypeOptions: SelectOption[] = [
  { value: 'VP', label: 'BUD-Head (ผู้บริหาร)' },
  { value: 'MGR_SALE', label: 'MGR-Sale (ผู้จัดการขาย)' },
  { value: 'MGR_MKT', label: 'MGR-Marketing (ผู้จัดการการตลาด)' },
];

const EMPLOYEE_FILTERS_KEY = 'employee-list-filters';

function getEmployeeFiltersFromStorage(): { roleFilter: string; budFilter: string } | null {
  try {
    const saved = localStorage.getItem(EMPLOYEE_FILTERS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to parse saved employee filters:', e);
  }
  return null;
}

function saveEmployeeFiltersToStorage(roleFilter: string, budFilter: string) {
  try {
    localStorage.setItem(EMPLOYEE_FILTERS_KEY, JSON.stringify({ roleFilter, budFilter }));
  } catch (e) {
    console.error('Failed to save employee filters:', e);
  }
}

export function EmployeeListPage() {
  const navigate = useNavigate();
  const savedFilters = getEmployeeFiltersFromStorage();
  const [roleFilter, setRoleFilter] = useState<string>(savedFilters?.roleFilter || 'VP');
  const [budFilter, setBudFilter] = useState<string>(savedFilters?.budFilter || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [budList, setBudList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEmployees = async () => {
      setIsLoading(true);
      try {
        const url = `${API_URL}/api/sales-2025-v2/employees?all=true`;
        const res = await fetch(url);
        const data = await res.json();
        setEmployees(data.employees || []);
        setBudList(data.budList || []);
      } catch (err) {
        console.error('Failed to load employees:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadEmployees();
  }, []);

  const filteredEmployees = employees
    .filter((emp) => {
      // Filter by role type
      if (roleFilter) {
        if (roleFilter === 'VP' && emp.roleType !== 'VP') return false;
        if (roleFilter === 'MGR_SALE' && !(emp.roleType === 'MGR' && emp.department === 'Sale')) return false;
        if (roleFilter === 'MGR_MKT' && !(emp.roleType === 'MGR' && emp.department === 'Mkt')) return false;
      }
      // Filter by BUD
      if (budFilter && !emp.buds?.includes(budFilter)) return false;
      // Filter by search query (fulltext search)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = emp.name.toLowerCase().includes(query);
        const positionMatch = emp.position?.toLowerCase().includes(query);
        const budMatch = emp.buds?.some(b => b.toLowerCase().includes(query));
        if (!nameMatch && !positionMatch && !budMatch) return false;
      }
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'th'));

  const handleRoleChange = (value: string) => {
    setRoleFilter(value);
    saveEmployeeFiltersToStorage(value, budFilter);
  };

  const handleBudChange = (value: string) => {
    setBudFilter(value);
    saveEmployeeFiltersToStorage(roleFilter, value);
  };

  const handleClearFilter = () => {
    setRoleFilter('VP');
    setBudFilter('');
    setSearchQuery('');
    saveEmployeeFiltersToStorage('VP', '');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="Employee Performance"
          subtitle="รายงาน Performance รายบุคคล"
        />
        <div className="p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-slate-200 rounded-xl w-64" />
            <div className="h-96 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Employee Performance"
        subtitle="รายงาน Performance รายบุคคล"
      />

      <div className="p-8">
        {/* Filter Card - Same style as Sales Performance */}
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Filters</h3>
            <span className="ml-auto text-sm text-slate-500">
              แสดง {filteredEmployees.length} รายการ
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">ค้นหา</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อ, ตำแหน่ง, BUD..."
                  className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </div>
            </div>

            {/* BUD Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">BUD</label>
              <SearchableSelect
                value={budFilter}
                onChange={handleBudChange}
                options={budList.map(bud => ({ value: bud, label: bud }))}
                placeholder="ทั้งหมด"
              />
            </div>

            {/* Role Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">ประเภทพนักงาน</label>
              <SearchableSelect
                value={roleFilter}
                onChange={handleRoleChange}
                options={roleTypeOptions}
                showAllOption={false}
              />
            </div>

            {/* Clear Button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleClearFilter}
                className="px-4 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>
        </div>

        {/* Employee Table */}
        <div className="card">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800">รายชื่อพนักงาน</h3>
            <p className="text-sm text-slate-500">คลิกเพื่อดูรายละเอียด</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600">BUD</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-600">Projects</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 min-w-[200px]">Presale (Target / Actual)</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-600 min-w-[200px]">Revenue (Target / Actual)</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">MKT Expense</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-600">CPB</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, idx) => {
                  const empType = getEmployeeType(emp);
                  return (
                    <tr
                      key={idx}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => navigate(`/sales-2025/person/${encodeURIComponent(emp.name)}`)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-blue-600 hover:underline">{emp.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {emp.buds?.map((bud, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                              {bud}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium">
                          {emp.projectCount}
                        </span>
                      </td>
                      {/* Presale with Progress Bar */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Target: {formatCurrency(emp.totalPresaleTarget)}</span>
                            <span className={`font-medium ${
                              emp.presaleAchievePct >= 0.8 ? 'text-emerald-600' :
                              emp.presaleAchievePct >= 0.6 ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              {(emp.presaleAchievePct * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="absolute h-full bg-slate-200 rounded-full"
                              style={{ width: '100%' }}
                            />
                            <div
                              className={`absolute h-full rounded-full ${
                                emp.presaleAchievePct >= 0.8 ? 'bg-emerald-400' :
                                emp.presaleAchievePct >= 0.6 ? 'bg-amber-400' :
                                'bg-red-400'
                              }`}
                              style={{ width: `${Math.min(100, emp.presaleAchievePct * 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-slate-700 font-medium">
                            Actual: {formatCurrency(emp.totalPresaleActual)}
                          </div>
                        </div>
                      </td>
                      {/* Revenue with Progress Bar */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Target: {formatCurrency(emp.totalRevenueTarget)}</span>
                            <span className={`font-medium ${
                              emp.revenueAchievePct >= 0.8 ? 'text-emerald-600' :
                              emp.revenueAchievePct >= 0.6 ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              {(emp.revenueAchievePct * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="absolute h-full bg-slate-200 rounded-full"
                              style={{ width: '100%' }}
                            />
                            <div
                              className={`absolute h-full rounded-full ${
                                emp.revenueAchievePct >= 0.8 ? 'bg-emerald-400' :
                                emp.revenueAchievePct >= 0.6 ? 'bg-amber-400' :
                                'bg-red-400'
                              }`}
                              style={{ width: `${Math.min(100, emp.revenueAchievePct * 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-slate-700 font-medium">
                            Actual: {formatCurrency(emp.totalRevenueActual)}
                          </div>
                        </div>
                      </td>
                      {/* MKT Expense */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-medium text-orange-600">{formatCurrency(emp.mktExpense || 0)}</div>
                        <div className="text-[10px] text-slate-400">{(emp.totalBook || 0).toLocaleString()} Books</div>
                      </td>
                      {/* CPB */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-medium text-blue-600">{formatCurrency(emp.cpb || 0)}</div>
                        <div className="text-[10px] text-slate-400">Cost/Book</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
