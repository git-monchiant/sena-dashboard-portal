import { useState, useEffect } from 'react';
import { Database, Loader2, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { StepProps, DatabaseOption } from '../types';

export function StepSelectDB({ state, onUpdate, onNext, onBack }: StepProps) {
  const [databases, setDatabases] = useState<DatabaseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDatabases();
  }, []);

  const fetchDatabases = async () => {
    try {
      const response = await fetch('/api/import/databases');
      if (!response.ok) throw new Error('Failed to fetch databases');
      const data = await response.json();
      setDatabases(data.databases);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (dbId: string) => {
    onUpdate({ database: dbId, targetTable: null, columnMapping: {} });
  };

  const handleNext = () => {
    if (state.database) {
      onNext();
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        <span className="ml-3 text-slate-500">กำลังโหลด...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-500">{error}</p>
        <button onClick={fetchDatabases} className="mt-4 btn-primary">
          ลองใหม่
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-2">เลือก Database</h2>
      <p className="text-sm text-slate-500 mb-6">เลือก Database ที่ต้องการ Import ข้อมูลเข้าไป</p>

      <div className="grid gap-4">
        {databases.map((db) => (
          <button
            key={db.id}
            onClick={() => handleSelect(db.id)}
            className={`p-6 border-2 rounded-xl text-left transition-all ${
              state.database === db.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    state.database === db.id ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{db.name}</p>
                  <p className="text-sm text-slate-500 mt-1">{db.description}</p>
                </div>
              </div>
              {state.database === db.id && (
                <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </button>
        ))}
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
          disabled={!state.database}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ถัดไป
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
