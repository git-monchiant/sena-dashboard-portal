import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Loader2, AlertCircle, CheckCircle, Eye, Database, Table2 } from 'lucide-react';
import { StepProps } from '../types';

export function StepPreview({ state, onUpdate, onNext, onBack }: StepProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    totalRows: number;
    mappedColumns: number;
    errors: { row: number; column: string; message: string }[];
  } | null>(null);

  useEffect(() => {
    if (state.mode === 'existing' && state.targetTable) {
      validateData();
    }
  }, [state.targetTable, state.columnMapping]);

  const validateData = async () => {
    setIsValidating(true);
    try {
      const response = await fetch('/api/import/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          database: state.database,
          table: state.targetTable,
          columnMapping: state.columnMapping,
          sheetName: state.selectedSheet,
        }),
      });

      if (!response.ok) throw new Error('Validation failed');
      const result = await response.json();
      setValidationResult(result);
      onUpdate({ isValid: result.valid, validationErrors: result.errors });
    } catch (err) {
      setValidationResult(null);
    } finally {
      setIsValidating(false);
    }
  };

  const mappedColumns = Object.entries(state.columnMapping);
  const dbName = state.database === 'silverman' ? 'Common Fee (Silverman)' : 'Sales 2025 (RPT2025)';

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-2">ตรวจสอบข้อมูล</h2>
      <p className="text-sm text-slate-500 mb-6">ตรวจสอบความถูกต้องก่อน Import</p>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Database</p>
              <p className="font-medium text-slate-800">{dbName}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Table2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">
                {state.mode === 'existing' ? 'Target Table' : 'New Table'}
              </p>
              <p className="font-medium text-slate-800">
                {state.mode === 'existing' ? state.targetTable : state.newTableName}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Rows</p>
              <p className="font-medium text-slate-800">{state.totalRows.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Status */}
      {state.mode === 'existing' && (
        <div className="mb-6">
          {isValidating ? (
            <div className="p-4 bg-slate-50 rounded-lg flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
              <span className="text-slate-600">กำลังตรวจสอบข้อมูล...</span>
            </div>
          ) : validationResult ? (
            <div
              className={`p-4 rounded-lg flex items-start gap-3 ${
                validationResult.valid ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
              }`}
            >
              {validationResult.valid ? (
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
              )}
              <div>
                <p className={`font-medium ${validationResult.valid ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {validationResult.valid ? 'ข้อมูลพร้อม Import' : `พบปัญหา ${validationResult.errors.length} รายการ`}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {validationResult.mappedColumns} columns mapped, {validationResult.totalRows} rows
                </p>
                {!validationResult.valid && validationResult.errors.length > 0 && (
                  <div className="mt-2 text-sm text-amber-700">
                    {validationResult.errors.slice(0, 5).map((err, idx) => (
                      <p key={idx}>
                        Row {err.row}: {err.message}
                      </p>
                    ))}
                    {validationResult.errors.length > 5 && (
                      <p className="text-slate-500">...และอีก {validationResult.errors.length - 5} รายการ</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Column Mapping Preview */}
      <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
        <div className="bg-slate-50 px-4 py-3">
          <span className="font-medium text-slate-700">
            {state.mode === 'existing' ? 'Column Mapping' : 'New Table Columns'}
          </span>
        </div>
        <div className="p-4">
          {state.mode === 'existing' ? (
            <div className="space-y-2">
              {mappedColumns.map(([excel, db]) => (
                <div key={excel} className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-1 bg-slate-100 rounded text-slate-700">{excel}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <span className="px-2 py-1 bg-primary-100 rounded text-primary-700">{db}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {state.newColumns.filter((c) => c.name.trim()).map((col, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-1 bg-slate-100 rounded text-slate-700">
                    {state.columns[idx] ? String(state.columns[idx]) : '-'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <span className="px-2 py-1 bg-primary-100 rounded text-primary-700">{col.name}</span>
                  <span className="text-slate-400">({col.type})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Data Preview */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-slate-50 px-4 py-3">
          <span className="font-medium text-slate-700">Data Preview (First 5 rows)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100">
                {state.mode === 'existing'
                  ? mappedColumns.map(([excel]) => (
                      <th key={excel} className="text-left px-4 py-2 font-medium text-slate-600">
                        {excel}
                      </th>
                    ))
                  : state.columns.slice(0, 8).map((col, idx) => (
                      <th key={idx} className="text-left px-4 py-2 font-medium text-slate-600">
                        {String(col)}
                      </th>
                    ))}
              </tr>
            </thead>
            <tbody>
              {state.preview.slice(0, 5).map((row, rowIdx) => (
                <tr key={rowIdx} className="border-t border-slate-100">
                  {state.mode === 'existing'
                    ? mappedColumns.map(([excel], colIdx) => {
                        const excelIdx = state.columns.indexOf(excel);
                        return (
                          <td key={colIdx} className="px-4 py-2 text-slate-600">
                            {row[excelIdx] !== undefined ? String(row[excelIdx]) : '-'}
                          </td>
                        );
                      })
                    : (row as unknown[]).slice(0, 8).map((cell, colIdx) => (
                        <td key={colIdx} className="px-4 py-2 text-slate-600">
                          {cell !== undefined ? String(cell) : '-'}
                        </td>
                      ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
          onClick={onNext}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          เริ่ม Import
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
