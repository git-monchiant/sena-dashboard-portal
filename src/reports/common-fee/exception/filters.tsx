import { useState } from 'react';
import { Filter, Building, RefreshCw, Download } from 'lucide-react';
import { mockProjects } from '@shared/api';

export type CaseType = 'all' | 'legal' | 'dispute' | 'hardship' | 'other';
export type CaseStatus = 'all' | 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';

interface ExceptionFiltersProps {
  onApply: (filters: { projectId: string; caseType: CaseType; caseStatus: CaseStatus }) => void;
  onExport?: () => void;
}

export function ExceptionFilters({ onApply, onExport }: ExceptionFiltersProps) {
  const [projectId, setProjectId] = useState<string>('');
  const [caseType, setCaseType] = useState<CaseType>('all');
  const [caseStatus, setCaseStatus] = useState<CaseStatus>('all');

  const handleApply = () => {
    onApply({ projectId, caseType, caseStatus });
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
            ประเภทเคส
          </label>
          <select
            value={caseType}
            onChange={(e) => setCaseType(e.target.value as CaseType)}
            className="select-field"
          >
            <option value="all">ทุกประเภท</option>
            <option value="legal">ดำเนินการทางกฎหมาย</option>
            <option value="dispute">ข้อพิพาท</option>
            <option value="hardship">ขอผ่อนผัน</option>
            <option value="other">อื่นๆ</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            สถานะเคส
          </label>
          <select
            value={caseStatus}
            onChange={(e) => setCaseStatus(e.target.value as CaseStatus)}
            className="select-field"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="open">เปิดเคส</option>
            <option value="in_progress">กำลังดำเนินการ</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="resolved">แก้ไขแล้ว</option>
            <option value="closed">ปิดเคส</option>
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
