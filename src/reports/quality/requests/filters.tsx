import { useState, useEffect } from 'react';
import { Filter, Search, X, AlertTriangle } from 'lucide-react';
import { RequestsFilterState } from './queries';

interface RequestsFiltersProps {
  onApply: (filters: RequestsFilterState) => void;
  initialFilters?: RequestsFilterState;
}

const defaultFilters: RequestsFilterState = {
  projectId: '',
  category: 'all',
  jobType: 'all',
  status: 'all',
  responsibilityType: 'all',
  priority: 'all',
  search: '',
  dateFrom: '',
  dateTo: '',
  overdue: false,
};

export function RequestsFilters({ onApply, initialFilters }: RequestsFiltersProps) {
  const [filters, setFilters] = useState<RequestsFilterState>(initialFilters || defaultFilters);

  // Update filters when initialFilters change (from URL params)
  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    }
  }, [initialFilters]);

  const handleChange = (key: keyof RequestsFilterState, value: string | boolean) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onApply(newFilters);
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    onApply(defaultFilters);
  };

  const hasActiveFilters =
    filters.projectId !== '' ||
    filters.category !== 'all' ||
    filters.jobType !== 'all' ||
    filters.status !== 'all' ||
    filters.responsibilityType !== 'all' ||
    filters.priority !== 'all' ||
    filters.search !== '' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.overdue === true;

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-500" />
          <h3 className="font-medium text-slate-700">ตัวกรอง</h3>
          {filters.overdue && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              งานเกินกำหนด
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่งาน, โครงการ, ยูนิต, รายละเอียด..."
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm"
          />
        </div>
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">โครงการ</label>
          <select
            value={filters.projectId}
            onChange={(e) => handleChange('projectId', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">ทุกโครงการ</option>
            <option value="P001">SENA Park Grand รามอินทรา</option>
            <option value="P002">SENA Villa ลาดพร้าว</option>
            <option value="P003">SENA Kith บางนา</option>
            <option value="P004">SENA Park รังสิต</option>
            <option value="P005">SENA Grand Home พระราม 2</option>
            <option value="P006">SENA Park Ville บางใหญ่</option>
            <option value="P007">SENA Kith ศรีนครินทร์</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">สถานะ</label>
          <select
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="open">เปิดงาน</option>
            <option value="in_progress">กำลังดำเนินการ</option>
            <option value="pending_parts">รออะไหล่</option>
            <option value="pending_approval">รออนุมัติ</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">ประเภทซ่อม</label>
          <select
            value={filters.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">ทุกประเภท</option>
            <option value="electrical">ไฟฟ้า</option>
            <option value="plumbing">ประปา</option>
            <option value="structure">โครงสร้าง</option>
            <option value="architecture">สถาปัตยกรรม</option>
            <option value="aircon">ระบบปรับอากาศ</option>
            <option value="elevator">ลิฟต์และบันไดเลื่อน</option>
            <option value="security">ระบบรักษาความปลอดภัย</option>
            <option value="fire_system">ระบบดับเพลิง</option>
            <option value="it_comm">ระบบสื่อสารและ IT</option>
            <option value="common_area">พื้นที่ส่วนกลาง</option>
            <option value="sanitation">ความสะอาดและสุขาภิบาล</option>
            <option value="landscape">ภูมิทัศน์</option>
            <option value="general_complaint">งานร้องเรียนทั่วไป</option>
            <option value="other">อื่น ๆ</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">ประเภทงาน</label>
          <select
            value={filters.jobType}
            onChange={(e) => handleChange('jobType', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">ทุกประเภท</option>
            <option value="repair">งานซ่อม</option>
            <option value="complaint">ข้อร้องเรียน</option>
            <option value="inspection">ตรวจสอบ</option>
            <option value="preventive">บำรุงรักษา</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">ผู้รับผิดชอบ</label>
          <select
            value={filters.responsibilityType}
            onChange={(e) => handleChange('responsibilityType', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">ทุกกลุ่ม</option>
            <option value="OUTSOURCE">จ้างให้แก้ไข</option>
            <option value="SENA_WARRANTY">SENA (รับประกัน)</option>
            <option value="JURISTIC_TECHNICIAN">ทีมช่างนิติบุคคล</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">ความเร่งด่วน</label>
          <select
            value={filters.priority}
            onChange={(e) => handleChange('priority', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">ทุกระดับ</option>
            <option value="urgent">เร่งด่วน</option>
            <option value="high">สูง</option>
            <option value="medium">ปานกลาง</option>
            <option value="low">ต่ำ</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">วันที่สร้าง</label>
          <div className="flex gap-1">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleChange('dateFrom', e.target.value)}
              className="flex-1 border border-slate-200 rounded-lg px-2 py-2 text-sm min-w-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
