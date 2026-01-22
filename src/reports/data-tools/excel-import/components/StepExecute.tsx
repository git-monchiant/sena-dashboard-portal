import { useState } from 'react';
import { Loader2, CheckCircle, XCircle, AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StepProps, ImportResult, initialWizardState } from '../types';

export function StepExecute({ state, onUpdate, onBack }: StepProps) {
  const navigate = useNavigate();
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCreatingTable, setIsCreatingTable] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(state.importResult);
  const [error, setError] = useState<string | null>(null);

  const executeImport = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      // If creating new table, create it first
      if (state.mode === 'new') {
        setIsCreatingTable(true);
        const createResponse = await fetch('/api/import/create-table', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: state.sessionId,
            database: state.database,
            tableName: state.newTableName,
            columns: state.newColumns.filter((c) => c.name.trim()),
          }),
        });

        if (!createResponse.ok) {
          const err = await createResponse.json();
          throw new Error(err.error || 'Failed to create table');
        }
        setIsCreatingTable(false);
      }

      // Execute import
      const targetTable = state.mode === 'existing' ? state.targetTable : state.newTableName;

      // For new table, create column mapping from newColumns
      const columnMapping =
        state.mode === 'existing'
          ? state.columnMapping
          : state.newColumns.reduce(
              (acc, col, idx) => {
                if (col.name.trim() && state.columns[idx]) {
                  acc[String(state.columns[idx])] = col.name;
                }
                return acc;
              },
              {} as Record<string, string>
            );

      const response = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          database: state.database,
          table: targetTable,
          columnMapping,
          mode: state.mode,
          sheetName: state.selectedSheet,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Import failed');
      }

      const importResult: ImportResult = await response.json();
      setResult(importResult);
      onUpdate({ importResult });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsExecuting(false);
      setIsCreatingTable(false);
    }
  };

  const handleReset = () => {
    onUpdate(initialWizardState);
    // Reset to step 1 will be handled by parent
    navigate('/data-tools/excel-import');
    window.location.reload();
  };

  if (isExecuting) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-16 h-16 text-primary-500 animate-spin mb-6" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            {isCreatingTable ? 'กำลังสร้าง Table...' : 'กำลัง Import ข้อมูล...'}
          </h2>
          <p className="text-slate-500">กรุณารอสักครู่</p>
          <div className="mt-4 text-sm text-slate-400">
            {state.totalRows.toLocaleString()} rows
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Import ไม่สำเร็จ</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <div className="flex gap-4">
            <button
              onClick={onBack}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              ย้อนกลับ
            </button>
            <button
              onClick={executeImport}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              ลองใหม่
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    const successRate = result.total > 0 ? Math.round((result.inserted / result.total) * 100) : 0;

    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
              result.failed === 0 ? 'bg-emerald-100' : 'bg-amber-100'
            }`}
          >
            {result.failed === 0 ? (
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-amber-500" />
            )}
          </div>

          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            {result.failed === 0 ? 'Import สำเร็จ!' : 'Import เสร็จสิ้น (มีข้อผิดพลาดบางส่วน)'}
          </h2>

          <p className="text-slate-500 mb-6">
            {state.mode === 'new' ? `สร้าง Table "${state.newTableName}" และ` : ''} Import ข้อมูลเข้า "
            {state.mode === 'existing' ? state.targetTable : state.newTableName}"
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-600">{result.inserted.toLocaleString()}</p>
              <p className="text-sm text-slate-500">Inserted</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{result.failed.toLocaleString()}</p>
              <p className="text-sm text-slate-500">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-slate-600">{successRate}%</p>
              <p className="text-sm text-slate-500">Success Rate</p>
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="w-full max-w-2xl mb-8">
              <div className="border border-red-200 rounded-lg overflow-hidden">
                <div className="bg-red-50 px-4 py-3">
                  <span className="font-medium text-red-700">Errors ({result.errors.length})</span>
                </div>
                <div className="p-4 max-h-48 overflow-y-auto">
                  {result.errors.map((err, idx) => (
                    <div key={idx} className="text-sm py-2 border-b border-red-100 last:border-0">
                      <span className="font-medium text-red-600">Row {err.row}:</span>{' '}
                      <span className="text-slate-600">{err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleReset}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Import ไฟล์ใหม่
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <Home className="w-4 h-4" />
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Initial state - ready to execute
  return (
    <div className="p-6">
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-primary-500" />
        </div>

        <h2 className="text-xl font-semibold text-slate-800 mb-2">พร้อม Import</h2>
        <p className="text-slate-500 mb-6">
          {state.mode === 'new'
            ? `สร้าง Table "${state.newTableName}" และ Import ${state.totalRows.toLocaleString()} rows`
            : `Import ${state.totalRows.toLocaleString()} rows ไปยัง "${state.targetTable}"`}
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 max-w-md">
          <p className="text-sm text-amber-700">
            <strong>หมายเหตุ:</strong> การ Import อาจใช้เวลาสักครู่ขึ้นอยู่กับจำนวนข้อมูล กรุณาอย่าปิดหน้านี้
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            ย้อนกลับ
          </button>
          <button
            onClick={executeImport}
            className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            เริ่ม Import
          </button>
        </div>
      </div>
    </div>
  );
}
