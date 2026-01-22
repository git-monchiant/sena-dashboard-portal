import { ArrowLeft, ArrowRight, Table2, FilePlus2, Check } from 'lucide-react';
import { StepProps, ImportMode } from '../types';

export function StepImportMode({ state, onUpdate, onNext, onBack }: StepProps) {
  const handleSelect = (mode: ImportMode) => {
    onUpdate({
      mode,
      targetTable: null,
      columnMapping: {},
      newTableName: null,
      newColumns: [],
    });
  };

  const handleNext = () => {
    if (state.mode) {
      onNext();
    }
  };

  const modes = [
    {
      id: 'existing' as ImportMode,
      title: 'Import ไป Table ที่มีอยู่',
      description: 'เลือก Table ที่มีอยู่แล้ว แล้วจับคู่ Column จาก Excel',
      icon: Table2,
      features: ['เลือก Table จาก Database', 'จับคู่ Column แบบ Manual', 'ตรวจสอบ Data Type'],
    },
    {
      id: 'new' as ImportMode,
      title: 'สร้าง Table ใหม่',
      description: 'สร้าง Table ใหม่จาก Structure ของ Excel',
      icon: FilePlus2,
      features: ['ตั้งชื่อ Table ใหม่', 'กำหนด Data Type แต่ละ Column', 'Auto-create จาก Excel headers'],
    },
  ];

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-2">เลือกรูปแบบ Import</h2>
      <p className="text-sm text-slate-500 mb-6">เลือกว่าต้องการ Import ไป Table เดิม หรือสร้าง Table ใหม่</p>

      <div className="grid md:grid-cols-2 gap-4">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = state.mode === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => handleSelect(mode.id)}
              className={`p-6 border-2 rounded-xl text-left transition-all ${
                isSelected
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                {isSelected && (
                  <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              <p className="font-semibold text-slate-800 mb-1">{mode.title}</p>
              <p className="text-sm text-slate-500 mb-4">{mode.description}</p>

              <ul className="space-y-2">
                {mode.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          ย้อนกลับ
        </button>
        <button
          onClick={handleNext}
          disabled={!state.mode}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ถัดไป
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
