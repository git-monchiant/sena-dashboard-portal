import { useState } from 'react';
import { Filter } from 'lucide-react';
import { ResponsibilityType, RequestCategory } from '../types';

export interface MaintenanceFilterState {
  projectId: string;
  responsibilityType: ResponsibilityType | 'all';
  category: RequestCategory | 'all';
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

interface MaintenanceFiltersProps {
  onApply: (filters: MaintenanceFilterState) => void;
}

export function MaintenanceFilters({ onApply }: MaintenanceFiltersProps) {
  const [filters, setFilters] = useState<MaintenanceFilterState>({
    projectId: '',
    responsibilityType: 'all',
    category: 'all',
    period: 'monthly',
  });

  const handleChange = (key: keyof MaintenanceFilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onApply(newFilters);
  };

  return (
    <div className="card mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-5 h-5 text-slate-500" />
        <h3 className="font-medium text-slate-700">ตัวกรอง</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">โครงการ</label>
          <select
            value={filters.projectId}
            onChange={(e) => handleChange('projectId', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">ทุกโครงการ</option>
            <option value="SPG-001">เสนา พาร์ค แกรนด์ รามอินทรา</option>
            <option value="SVL-002">เสนา วิลล่า พระราม 2</option>
            <option value="STW-003">เสนา ทาวเวอร์ สุขุมวิท</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">กลุ่มความรับผิดชอบ</label>
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
          <label className="block text-sm font-medium text-slate-600 mb-1">ประเภทงาน</label>
          <select
            value={filters.category}
            onChange={(e) => handleChange('category', e.target.value)}
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
          <label className="block text-sm font-medium text-slate-600 mb-1">ช่วงเวลา</label>
          <select
            value={filters.period}
            onChange={(e) => handleChange('period', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="daily">รายวัน</option>
            <option value="weekly">รายสัปดาห์</option>
            <option value="monthly">รายเดือน</option>
            <option value="yearly">รายปี</option>
          </select>
        </div>
      </div>
    </div>
  );
}
