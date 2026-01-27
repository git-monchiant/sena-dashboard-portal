import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Building2,
  Search,
  Settings,
  X,
  ChevronRight,
} from 'lucide-react';
import { PageHeader, Card } from '@shared/ui';

interface SyncError {
  jobNumber: string;
  errorType: string;
  errorMessage: string;
  timestamp: string;
}

interface Project {
  id: string;
  code: string;
  name: string;
  totalUnits: number;
  totalDefects: number;
  lastSyncAt: string;
  syncStatus: 'synced' | 'syncing' | 'error' | 'pending';
  dataSource: string;
  syncErrors?: SyncError[];
}

// Mock synced projects
const initialProjects: Project[] = [
  {
    id: '1',
    code: 'SPG-001',
    name: 'SENA Park Grand รามอินทรา',
    totalUnits: 850,
    totalDefects: 285,
    lastSyncAt: '2024-01-15 14:30:00',
    syncStatus: 'synced',
    dataSource: 'Fix-It',
  },
  {
    id: '2',
    code: 'SVL-002',
    name: 'SENA Villa ลาดพร้าว',
    totalUnits: 320,
    totalDefects: 198,
    lastSyncAt: '2024-01-15 14:25:00',
    syncStatus: 'synced',
    dataSource: 'Fix-It',
  },
  {
    id: '3',
    code: 'SKT-003',
    name: 'SENA Kith บางนา',
    totalUnits: 450,
    totalDefects: 156,
    lastSyncAt: '2024-01-15 10:00:00',
    syncStatus: 'error',
    dataSource: 'Fix-It',
    syncErrors: [
      {
        jobNumber: 'MNT-2024-1205',
        errorType: 'DATA_MISMATCH',
        errorMessage: 'ข้อมูลผู้รับผิดชอบไม่ตรงกับระบบ Fix-It',
        timestamp: '2024-01-15 10:00:15',
      },
      {
        jobNumber: 'MNT-2024-0803',
        errorType: 'MISSING_DATA',
        errorMessage: 'ไม่พบข้อมูลสถานะงานในระบบต้นทาง',
        timestamp: '2024-01-15 10:00:22',
      },
    ],
  },
  {
    id: '4',
    code: 'SPK-004',
    name: 'SENA Park รังสิต',
    totalUnits: 380,
    totalDefects: 0,
    lastSyncAt: '',
    syncStatus: 'pending',
    dataSource: '-',
  },
];

export function SettingsPage() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [projectCode, setProjectCode] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addError, setAddError] = useState('');
  const [selectedErrorProject, setSelectedErrorProject] = useState<Project | null>(null);

  const filteredProjects = projects.filter(
    (p) =>
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddProject = async () => {
    if (!projectCode.trim()) {
      setAddError('กรุณาระบุรหัสโครงการ');
      return;
    }

    // Check if project already exists
    if (projects.some((p) => p.code.toLowerCase() === projectCode.toLowerCase())) {
      setAddError('โครงการนี้ถูกเพิ่มไว้แล้ว');
      return;
    }

    setIsAdding(true);
    setAddError('');

    // Simulate API call to fetch project info
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock: Generate project info based on code
    const mockProjectNames: Record<string, string> = {
      'SPG': 'SENA Park Grand',
      'SVL': 'SENA Villa',
      'SKT': 'SENA Kith',
      'SPK': 'SENA Park',
      'SGH': 'SENA Grand Home',
    };

    const prefix = projectCode.split('-')[0]?.toUpperCase() || '';
    const projectName = mockProjectNames[prefix] || 'โครงการใหม่';

    const newProject: Project = {
      id: String(Date.now()),
      code: projectCode.toUpperCase(),
      name: `${projectName} (${projectCode.toUpperCase()})`,
      totalUnits: 0,
      totalDefects: 0,
      lastSyncAt: '',
      syncStatus: 'pending',
      dataSource: '-',
    };

    setProjects([...projects, newProject]);
    setProjectCode('');
    setIsAdding(false);
  };

  const handleSyncProject = async (projectId: string) => {
    // Update status to syncing
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, syncStatus: 'syncing' as const } : p))
    );

    // Simulate sync
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update with synced data
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              syncStatus: 'synced' as const,
              lastSyncAt: new Date().toLocaleString('th-TH'),
              totalUnits: Math.floor(Math.random() * 500) + 200,
              totalDefects: Math.floor(Math.random() * 200) + 50,
              dataSource: 'Fix-It',
            }
          : p
      )
    );
  };

  const handleSyncAll = async () => {
    const pendingProjects = projects.filter((p) => p.syncStatus !== 'syncing');

    for (const project of pendingProjects) {
      await handleSyncProject(project.id);
    }
  };

  const handleRemoveProject = (projectId: string) => {
    if (confirm('ต้องการลบโครงการนี้ออกจากระบบหรือไม่?')) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    }
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="ตั้งค่างานซ่อม / ร้องเรียน"
        subtitle="จัดการโครงการและ Sync ข้อมูลจากระบบ Fix-It"
      />

      <div className="p-8">
        <Link
          to="/maintenance"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-primary-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปหน้าภาพรวม
        </Link>

        {/* Add Project Section */}
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-slate-800">เพิ่มโครงการ</h3>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            ระบุรหัสโครงการเพื่อดึงข้อมูลงานซ่อม/ร้องเรียนจากระบบ Fix-It
          </p>
          <div className="flex gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="รหัสโครงการ เช่น SPG-005, SVL-010"
                  value={projectCode}
                  onChange={(e) => {
                    setProjectCode(e.target.value);
                    setAddError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddProject();
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              {addError && <p className="text-sm text-red-500 mt-1">{addError}</p>}
            </div>
            <button
              onClick={handleAddProject}
              disabled={isAdding || !projectCode.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  กำลังค้นหา...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  เพิ่มโครงการ
                </>
              )}
            </button>
          </div>
        </Card>

        {/* Project List */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-600" />
              <h3 className="text-lg font-semibold text-slate-800">
                โครงการที่เชื่อมต่อ
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({projects.length} โครงการ)
                </span>
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาโครงการ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <button
                onClick={handleSyncAll}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Sync ทั้งหมด
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-600">รหัสโครงการ</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">ชื่อโครงการ</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">จำนวนยูนิต</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-600">งานซ่อมทั้งหมด</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">แหล่งข้อมูล</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-600">สถานะ</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-600">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-mono font-medium text-primary-600">{project.code}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{project.name}</td>
                    <td className="py-3 px-4 text-right">
                      {project.totalUnits > 0 ? project.totalUnits.toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {project.totalDefects > 0 ? project.totalDefects.toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{project.dataSource}</td>
                    <td className="py-3 px-4">
                      {project.syncStatus === 'syncing' ? (
                        <div className="flex items-center gap-2 text-amber-600">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span className="text-sm">กำลัง Sync...</span>
                        </div>
                      ) : project.syncStatus === 'pending' ? (
                        <div className="flex items-center gap-2 text-slate-500">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">รอ Sync</span>
                        </div>
                      ) : project.syncStatus === 'error' ? (
                        <button
                          onClick={() => setSelectedErrorProject(project)}
                          className="flex items-center gap-2 text-red-600 hover:bg-red-50 rounded-lg px-2 py-1 -mx-2 -my-1 transition-colors group"
                        >
                          <AlertCircle className="w-4 h-4" />
                          <div className="text-left">
                            <div className="flex items-center gap-1">
                              <span className="text-sm">Sync ผิดพลาด</span>
                              {project.syncErrors && (
                                <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
                                  {project.syncErrors.length} รายการ
                                </span>
                              )}
                            </div>
                            {project.lastSyncAt && (
                              <p className="text-xs text-slate-400">{project.lastSyncAt}</p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <CheckCircle className="w-4 h-4" />
                          <div>
                            <span className="text-sm font-medium">{project.lastSyncAt}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleSyncProject(project.id)}
                          disabled={project.syncStatus === 'syncing'}
                          className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Sync ข้อมูล"
                        >
                          <RefreshCw
                            className={`w-4 h-4 ${
                              project.syncStatus === 'syncing' ? 'animate-spin' : ''
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleRemoveProject(project.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="ลบโครงการ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Building2 className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>ไม่พบโครงการ</p>
              <p className="text-sm">เพิ่มโครงการใหม่โดยระบุรหัสโครงการด้านบน</p>
            </div>
          )}
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">เกี่ยวกับการ Sync ข้อมูล</h4>
              <ul className="mt-2 text-sm text-blue-700 space-y-1">
                <li>• ข้อมูลจะถูก Sync จากระบบ Fix-It (ระบบแจ้งซ่อมนิติบุคคล)</li>
                <li>• ข้อมูลที่ Sync ประกอบด้วย: งานซ่อม, ข้อร้องเรียน, สถานะงาน, ผู้รับผิดชอบ</li>
                <li>• ระบบจะ Sync ข้อมูลอัตโนมัติทุก 30 นาที</li>
                <li>• สามารถ Sync ข้อมูลด้วยตนเองได้ตลอดเวลา</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Error Details Modal */}
        {selectedErrorProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    รายละเอียด Error - {selectedErrorProject.code}
                  </h3>
                  <p className="text-sm text-slate-500">{selectedErrorProject.name}</p>
                </div>
                <button
                  onClick={() => setSelectedErrorProject(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="flex items-center gap-2 mb-4 text-sm text-slate-600">
                  <Clock className="w-4 h-4" />
                  <span>Sync ล่าสุด: {selectedErrorProject.lastSyncAt}</span>
                </div>

                {selectedErrorProject.syncErrors && selectedErrorProject.syncErrors.length > 0 ? (
                  <div className="space-y-3">
                    {selectedErrorProject.syncErrors.map((error, index) => (
                      <div
                        key={index}
                        className="bg-red-50 border border-red-200 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono font-medium text-red-700">
                                {error.jobNumber}
                              </span>
                              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                                {error.errorType}
                              </span>
                            </div>
                            <p className="text-sm text-red-800">{error.errorMessage}</p>
                            <p className="text-xs text-red-400 mt-1">{error.timestamp}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <p>ไม่พบรายละเอียด Error</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                <span className="text-sm text-slate-500">
                  พบ {selectedErrorProject.syncErrors?.length || 0} รายการที่ผิดพลาด
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedErrorProject(null)}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    ปิด
                  </button>
                  <button
                    onClick={() => {
                      handleSyncProject(selectedErrorProject.id);
                      setSelectedErrorProject(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Sync ใหม่
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
