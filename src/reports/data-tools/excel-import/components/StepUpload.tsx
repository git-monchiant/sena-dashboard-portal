import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, FileSpreadsheet, X, Loader2, AlertCircle, Sheet } from 'lucide-react';
import { StepProps, UploadResponse } from '../types';

export function StepUpload({ state, onUpdate, onNext }: StepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    setError(null);

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
      setError('กรุณาเลือกไฟล์ Excel (.xlsx, .xls) หรือ CSV เท่านั้น');
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setError('ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 50MB)');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data: UploadResponse = await response.json();

      onUpdate({
        file,
        sessionId: data.sessionId,
        filename: data.filename,
        sheets: data.sheets,
        selectedSheet: data.sheets[0], // Default to first sheet
        columns: data.columns,
        preview: data.preview,
        totalRows: data.totalRows,
      });

      // Don't auto-advance, let user select sheet first if multiple sheets
      if (data.sheets.length === 1) {
        onNext();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอัปโหลด');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFile = () => {
    onUpdate({
      file: null,
      sessionId: null,
      filename: null,
      sheets: [],
      selectedSheet: null,
      columns: [],
      preview: [],
      totalRows: 0,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSheetChange = async (sheetName: string) => {
    if (!state.sessionId || sheetName === state.selectedSheet) return;

    setIsLoadingSheet(true);
    setError(null);

    try {
      const response = await fetch(`/api/import/sheet/${state.sessionId}/${encodeURIComponent(sheetName)}`);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to load sheet');
      }

      const data = await response.json();

      onUpdate({
        selectedSheet: sheetName,
        columns: data.columns,
        preview: data.preview,
        totalRows: data.totalRows,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลด Sheet');
    } finally {
      setIsLoadingSheet(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-slate-800 mb-2">อัปโหลดไฟล์ Excel</h2>
      <p className="text-sm text-slate-500 mb-6">รองรับไฟล์ .xlsx, .xls และ .csv ขนาดไม่เกิน 50MB</p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!state.file ? (
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
              <p className="text-lg font-medium text-slate-700">กำลังอัปโหลด...</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
              <p className="text-lg font-medium text-slate-700">ลากไฟล์มาวางที่นี่</p>
              <p className="text-sm text-slate-500 mt-1">หรือคลิกเพื่อเลือกไฟล์</p>
              <p className="text-xs text-slate-400 mt-4">รองรับ: .xlsx, .xls, .csv (สูงสุด 50MB)</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-slate-800">{state.filename}</p>
                <p className="text-sm text-slate-500">
                  {state.sheets.length} sheet{state.sheets.length > 1 ? 's' : ''}, {state.columns.length} columns, {state.totalRows.toLocaleString()} rows
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveFile}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sheet Selector */}
          {state.sheets.length > 1 && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                <Sheet className="w-4 h-4" />
                เลือก Sheet:
              </label>
              <div className="flex flex-wrap gap-2">
                {state.sheets.map((sheet) => (
                  <button
                    key={sheet}
                    onClick={() => handleSheetChange(sheet)}
                    disabled={isLoadingSheet}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      state.selectedSheet === sheet
                        ? 'bg-primary-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:border-primary-400'
                    } ${isLoadingSheet ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {sheet}
                  </button>
                ))}
              </div>
              {isLoadingSheet && (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังโหลด...
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-700 mb-2">
              Columns ที่พบใน Sheet "{state.selectedSheet}":
            </p>
            <div className="flex flex-wrap gap-2">
              {state.columns.slice(0, 10).map((col, idx) => (
                <span key={idx} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                  {String(col)}
                </span>
              ))}
              {state.columns.length > 10 && (
                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-sm">
                  +{state.columns.length - 10} more
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onNext}
              disabled={isLoadingSheet}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              ถัดไป
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
