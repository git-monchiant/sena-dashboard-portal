import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Loader2, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { StepProps, TableInfo, ColumnInfo } from '../types';

export function StepColumnMapping({ state, onUpdate, onNext, onBack }: StepProps) {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For new table mode - just the table name
  const [newTableName, setNewTableName] = useState(state.newTableName || '');

  useEffect(() => {
    if (state.mode === 'existing') {
      fetchTables();
    } else {
      setIsLoadingTables(false);
    }
  }, [state.mode, state.database]);

  useEffect(() => {
    if (state.targetTable && state.mode === 'existing') {
      fetchColumns(state.targetTable);
    }
  }, [state.targetTable]);

  const fetchTables = async () => {
    try {
      const response = await fetch(`/api/import/tables/${state.database}`);
      if (!response.ok) throw new Error('Failed to fetch tables');
      const data = await response.json();
      setTables(data.tables);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsLoadingTables(false);
    }
  };

  const fetchColumns = async (tableName: string) => {
    setIsLoadingColumns(true);
    try {
      const response = await fetch(`/api/import/columns/${state.database}/${tableName}`);
      if (!response.ok) throw new Error('Failed to fetch columns');
      const data = await response.json();
      setColumns(data.columns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setIsLoadingColumns(false);
    }
  };

  const handleTableSelect = (tableName: string) => {
    onUpdate({ targetTable: tableName, columnMapping: {} });
  };

  const handleColumnMap = (excelCol: string, dbCol: string) => {
    const newMapping = { ...state.columnMapping };
    if (dbCol === '') {
      delete newMapping[excelCol];
    } else {
      newMapping[excelCol] = dbCol;
    }
    onUpdate({ columnMapping: newMapping });
  };

  // For now, always use TEXT type to avoid type mismatch errors
  const detectColumnType = (_colIndex: number): string => {
    return 'TEXT';
  };

  const handleNext = () => {
    if (state.mode === 'existing') {
      if (state.targetTable && Object.keys(state.columnMapping).length > 0) {
        onNext();
      }
    } else {
      if (newTableName) {
        // Auto-generate columns from Excel headers with detected types
        const autoColumns = state.columns.map((col, idx) => ({
          name: String(col).toLowerCase().replace(/[^a-z0-9]/g, '_'),
          type: detectColumnType(idx),
          nullable: true,
        }));
        onUpdate({ newTableName, newColumns: autoColumns });
        onNext();
      }
    }
  };

  const isValid = state.mode === 'existing'
    ? state.targetTable && Object.keys(state.columnMapping).length > 0
    : newTableName.trim().length > 0;

  if (isLoadingTables) {
    return (
      <div className="p-6 flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        <span className="ml-3 text-slate-500">กำลังโหลด...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-2">
        {state.mode === 'existing' ? 'จับคู่ Column' : 'สร้าง Table ใหม่'}
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        {state.mode === 'existing'
          ? 'เลือก Table และจับคู่ Column จาก Excel กับ Column ใน Database'
          : 'ใส่ชื่อ Table แล้วระบบจะสร้าง Table จาก Excel columns อัตโนมัติ'}
      </p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {state.mode === 'existing' ? (
        <>
          {/* Table Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">เลือก Table</label>
            <select
              value={state.targetTable || ''}
              onChange={(e) => handleTableSelect(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">-- เลือก Table --</option>
              {tables.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name} ({t.columnCount} columns)
                </option>
              ))}
            </select>
          </div>

          {/* Column Mapping */}
          {state.targetTable && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-slate-500" />
                <span className="font-medium text-slate-700">จับคู่ Column</span>
              </div>

              {isLoadingColumns ? (
                <div className="p-4 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-100 text-sm text-slate-600">
                      <th className="text-left px-4 py-3 font-medium">Excel Column</th>
                      <th className="text-left px-4 py-3 font-medium">Sample Data</th>
                      <th className="text-left px-4 py-3 font-medium">Target Column</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.columns.map((col, idx) => (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800">{String(col)}</td>
                        <td className="px-4 py-3 text-slate-500 text-sm">
                          {state.preview[0]?.[idx] !== undefined ? String(state.preview[0][idx]) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={state.columnMapping[String(col)] || ''}
                            onChange={(e) => handleColumnMap(String(col), e.target.value)}
                            className="w-full border border-slate-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="">-- ข้าม --</option>
                            {columns.map((c) => (
                              <option key={c.name} value={c.name}>
                                {c.name} ({c.type})
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* New Table Name */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">ชื่อ Table ใหม่</label>
            <input
              type="text"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="my_new_table"
              className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-slate-500 mt-1">ใช้ตัวอักษรพิมพ์เล็ก, ตัวเลข และ _ เท่านั้น</p>
          </div>

          {/* Preview Columns from Excel */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-3">
              <span className="font-medium text-slate-700">Columns จาก Excel ({state.columns.length} columns)</span>
              <p className="text-xs text-slate-500 mt-1">ระบบจะ detect type อัตโนมัติจากข้อมูลตัวอย่าง</p>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {state.columns.map((col, idx) => {
                  const detectedType = detectColumnType(idx);
                  const typeColor = {
                    'BIGINT': 'bg-blue-100 text-blue-700',
                    'NUMERIC': 'bg-emerald-100 text-emerald-700',
                    'DATE': 'bg-amber-100 text-amber-700',
                    'BOOLEAN': 'bg-purple-100 text-purple-700',
                    'TEXT': 'bg-slate-100 text-slate-700',
                  }[detectedType] || 'bg-slate-100 text-slate-700';

                  return (
                    <span
                      key={idx}
                      className={`px-3 py-1.5 rounded-full text-sm ${typeColor}`}
                    >
                      {String(col).toLowerCase().replace(/[^a-z0-9]/g, '_')}
                      <span className="ml-1 opacity-60">({detectedType})</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Data Preview */}
          <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 px-4 py-3">
              <span className="font-medium text-slate-700">ตัวอย่างข้อมูล</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    {state.columns.slice(0, 6).map((col, idx) => (
                      <th key={idx} className="text-left px-4 py-2 font-medium text-slate-600 whitespace-nowrap">
                        {String(col)}
                      </th>
                    ))}
                    {state.columns.length > 6 && (
                      <th className="px-4 py-2 text-slate-400">...</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {state.preview.slice(0, 3).map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-t border-slate-100">
                      {(row as unknown[]).slice(0, 6).map((cell, colIdx) => (
                        <td key={colIdx} className="px-4 py-2 text-slate-600 whitespace-nowrap">
                          {cell !== undefined ? String(cell).substring(0, 30) : '-'}
                        </td>
                      ))}
                      {state.columns.length > 6 && (
                        <td className="px-4 py-2 text-slate-400">...</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

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
          disabled={!isValid}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ถัดไป
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
