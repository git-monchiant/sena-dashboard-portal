// Database options
export interface DatabaseOption {
  id: string;
  name: string;
  description: string;
}

// Table info
export interface TableInfo {
  name: string;
  columnCount: number;
}

// Column info from database
export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  hasDefault: boolean;
  maxLength: number | null;
}

// Upload response
export interface UploadResponse {
  sessionId: string;
  filename: string;
  fileSize: number;
  sheets: string[];
  columns: string[];
  preview: unknown[][];
  totalRows: number;
}

// Column mapping (Excel column -> DB column)
export type ColumnMapping = Record<string, string>;

// New table column definition
export interface NewColumnDef {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey?: boolean;
}

// Import mode
export type ImportMode = 'existing' | 'new';

// Wizard state
export interface WizardState {
  // Step 1: Upload
  file: File | null;
  sessionId: string | null;
  filename: string | null;
  sheets: string[];
  selectedSheet: string | null;
  columns: string[];
  preview: unknown[][];
  totalRows: number;

  // Step 2: Database
  database: string | null;

  // Step 3: Mode
  mode: ImportMode | null;

  // Step 4: Column Mapping / New Table
  targetTable: string | null;
  columnMapping: ColumnMapping;
  newTableName: string | null;
  newColumns: NewColumnDef[];

  // Step 5: Validation
  isValid: boolean;
  validationErrors: ValidationError[];

  // Step 6: Results
  importResult: ImportResult | null;
}

// Validation error
export interface ValidationError {
  row: number;
  column: string;
  message: string;
}

// Import result
export interface ImportResult {
  success: boolean;
  inserted: number;
  failed: number;
  total: number;
  errors: ImportError[];
}

// Import error
export interface ImportError {
  row: number;
  error: string;
  data?: Record<string, unknown>;
}

// Step props
export interface StepProps {
  state: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
  onNext: () => void;
  onBack: () => void;
}

// Wizard step definition
export interface WizardStep {
  id: number;
  title: string;
  description: string;
}

// Initial wizard state
export const initialWizardState: WizardState = {
  file: null,
  sessionId: null,
  filename: null,
  sheets: [],
  selectedSheet: null,
  columns: [],
  preview: [],
  totalRows: 0,
  database: null,
  mode: null,
  targetTable: null,
  columnMapping: {},
  newTableName: null,
  newColumns: [],
  isValid: false,
  validationErrors: [],
  importResult: null,
};

// Wizard steps
export const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'Upload File', description: 'เลือกไฟล์ Excel' },
  { id: 2, title: 'Select Database', description: 'เลือก Database' },
  { id: 3, title: 'Import Mode', description: 'เลือกรูปแบบ Import' },
  { id: 4, title: 'Column Mapping', description: 'จับคู่ Column' },
  { id: 5, title: 'Preview', description: 'ตรวจสอบข้อมูล' },
  { id: 6, title: 'Execute', description: 'Import ข้อมูล' },
];
