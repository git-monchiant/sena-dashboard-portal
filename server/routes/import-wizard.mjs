/**
 * Excel Import Wizard API Routes
 * Handles file upload, parsing, and database import
 */
import { Router } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { silvermanPool, pool } from '../db/index.mjs';
import { asyncHandler } from '../utils/helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => {
    const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${sessionId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
  }
});

// Helper: Get pool by database id
function getPool(database) {
  if (database === 'silverman') return silvermanPool;
  if (database === 'rpt2025') return pool;
  throw new Error('Invalid database selection');
}

// Helper: Get schema by database id
function getSchema(database) {
  if (database === 'silverman') return 'silverman';
  if (database === 'rpt2025') return 'public';
  return 'public';
}

// Helper: Find session file
function findSessionFile(sessionId) {
  const uploadsDir = path.join(__dirname, '../uploads');
  const files = fs.readdirSync(uploadsDir);
  const file = files.find(f => f.startsWith(sessionId));
  if (!file) throw new Error('Session file not found');
  return path.join(uploadsDir, file);
}

// ===== Upload Excel File =====
router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new Error('No file uploaded');
  }

  const filePath = req.file.path;
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  const firstSheet = workbook.Sheets[sheetNames[0]];

  // Parse data with headers
  const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

  if (rawData.length === 0) {
    throw new Error('Excel file is empty');
  }

  const headers = rawData[0] || [];
  const dataRows = rawData.slice(1);
  const previewRows = dataRows.slice(0, 10);
  const totalRows = dataRows.length;

  // Extract session ID from filename
  const sessionId = path.basename(req.file.filename, path.extname(req.file.filename));

  res.json({
    sessionId,
    filename: req.file.originalname,
    fileSize: req.file.size,
    sheets: sheetNames,
    columns: headers,
    preview: previewRows,
    totalRows,
  });
}));

// ===== List Available Databases =====
router.get('/databases', asyncHandler(async (req, res) => {
  res.json({
    databases: [
      {
        id: 'silverman',
        name: 'Common Fee (Silverman)',
        description: 'ฐานข้อมูลค่าส่วนกลาง - postgres/silverman schema',
      },
      {
        id: 'rpt2025',
        name: 'Sales 2025 (RPT2025)',
        description: 'ฐานข้อมูลการขาย - RPT2025/public schema',
      },
    ]
  });
}));

// ===== List Tables in Database =====
router.get('/tables/:database', asyncHandler(async (req, res) => {
  const { database } = req.params;
  const targetPool = getPool(database);
  const schema = getSchema(database);

  const result = await targetPool.query(`
    SELECT
      table_name,
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = $1 AND table_name = t.table_name) as column_count
    FROM information_schema.tables t
    WHERE table_schema = $1 AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `, [schema]);

  res.json({
    tables: result.rows.map(r => ({
      name: r.table_name,
      columnCount: parseInt(r.column_count)
    }))
  });
}));

// ===== Get Table Columns =====
router.get('/columns/:database/:table', asyncHandler(async (req, res) => {
  const { database, table } = req.params;
  const targetPool = getPool(database);
  const schema = getSchema(database);

  const result = await targetPool.query(`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
    ORDER BY ordinal_position
  `, [schema, table]);

  res.json({
    table,
    columns: result.rows.map(r => ({
      name: r.column_name,
      type: r.data_type,
      nullable: r.is_nullable === 'YES',
      hasDefault: r.column_default !== null,
      maxLength: r.character_maximum_length,
    }))
  });
}));

// ===== Validate Data =====
router.post('/validate', asyncHandler(async (req, res) => {
  const { sessionId, database, table, columnMapping, sheetName } = req.body;

  if (!sessionId || !database || !table || !columnMapping) {
    throw new Error('Missing required parameters');
  }

  const filePath = findSessionFile(sessionId);
  const workbook = XLSX.readFile(filePath);
  // Use selected sheet or default to first sheet
  const targetSheetName = sheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[targetSheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  // Get target table columns for type validation
  const targetPool = getPool(database);
  const schema = getSchema(database);

  const colResult = await targetPool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
  `, [schema, table]);

  const columnTypes = {};
  colResult.rows.forEach(r => {
    columnTypes[r.column_name] = r.data_type;
  });

  // Validate sample data
  const errors = [];
  const mappedColumns = Object.entries(columnMapping);

  data.slice(0, 100).forEach((row, rowIndex) => {
    mappedColumns.forEach(([excelCol, dbCol]) => {
      const value = row[excelCol];
      const expectedType = columnTypes[dbCol];

      if (value !== undefined && value !== null && value !== '') {
        // Basic type checking
        if (expectedType?.includes('int') && isNaN(parseInt(value))) {
          errors.push({ row: rowIndex + 2, column: excelCol, message: `Expected integer for ${dbCol}` });
        }
        if (expectedType?.includes('numeric') && isNaN(parseFloat(value))) {
          errors.push({ row: rowIndex + 2, column: excelCol, message: `Expected number for ${dbCol}` });
        }
      }
    });
  });

  res.json({
    valid: errors.length === 0,
    totalRows: data.length,
    mappedColumns: mappedColumns.length,
    errors: errors.slice(0, 20),
  });
}));

// ===== Execute Import =====
router.post('/execute', asyncHandler(async (req, res) => {
  const { sessionId, database, table, columnMapping, mode, sheetName } = req.body;

  if (!sessionId || !database || !table || !columnMapping) {
    throw new Error('Missing required parameters');
  }

  const filePath = findSessionFile(sessionId);
  const workbook = XLSX.readFile(filePath);
  // Use selected sheet or default to first sheet
  const targetSheetName = sheetName || workbook.SheetNames[0];
  const sheet = workbook.Sheets[targetSheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  const targetPool = getPool(database);
  const schema = getSchema(database);

  // Get mapped columns
  const excelColumns = Object.keys(columnMapping);
  const dbColumns = Object.values(columnMapping);

  let inserted = 0;
  let failed = 0;
  const errors = [];

  // Build parameterized INSERT query
  const placeholders = dbColumns.map((_, i) => `$${i + 1}`).join(', ');
  const insertQuery = `INSERT INTO ${schema}.${table} (${dbColumns.join(', ')}) VALUES (${placeholders})`;

  // Import each row
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    try {
      const values = excelColumns.map(col => {
        const value = row[col];
        // Convert empty strings to null
        if (value === '' || value === undefined) return null;
        return value;
      });

      await targetPool.query(insertQuery, values);
      inserted++;
    } catch (err) {
      failed++;
      if (errors.length < 20) {
        errors.push({
          row: i + 2,
          error: err.message,
          data: excelColumns.reduce((acc, col) => ({ ...acc, [col]: row[col] }), {})
        });
      }
    }
  }

  // Cleanup uploaded file
  try {
    fs.unlinkSync(filePath);
  } catch (e) {
    console.error('Failed to cleanup file:', e.message);
  }

  res.json({
    success: inserted > 0,
    inserted,
    failed,
    total: data.length,
    errors,
  });
}));

// ===== Create New Table =====
router.post('/create-table', asyncHandler(async (req, res) => {
  const { sessionId, database, tableName, columns } = req.body;

  if (!sessionId || !database || !tableName || !columns || columns.length === 0) {
    throw new Error('Missing required parameters');
  }

  // Validate table name (alphanumeric and underscore only)
  if (!/^[a-z][a-z0-9_]*$/.test(tableName)) {
    throw new Error('Invalid table name. Use lowercase letters, numbers, and underscores only.');
  }

  const targetPool = getPool(database);
  const schema = getSchema(database);

  // Check if table already exists
  const existsResult = await targetPool.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = $1 AND table_name = $2
  `, [schema, tableName]);

  if (existsResult.rows.length > 0) {
    throw new Error('Table already exists');
  }

  // Build CREATE TABLE statement
  const columnDefs = columns.map(col => {
    let def = `"${col.name}" ${col.type || 'TEXT'}`;
    if (col.primaryKey) def += ' PRIMARY KEY';
    if (!col.nullable && !col.primaryKey) def += ' NOT NULL';
    return def;
  });

  const createQuery = `CREATE TABLE ${schema}.${tableName} (
    id SERIAL PRIMARY KEY,
    ${columnDefs.join(',\n    ')},
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`;

  await targetPool.query(createQuery);

  res.json({
    success: true,
    table: tableName,
    schema,
    columns: columns.length + 2, // +2 for id and created_at
  });
}));

// ===== Cleanup Session =====
router.delete('/cleanup/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  try {
    const filePath = findSessionFile(sessionId);
    fs.unlinkSync(filePath);
    res.json({ success: true, message: 'Session cleaned up' });
  } catch (e) {
    res.json({ success: false, message: 'File already cleaned up or not found' });
  }
}));

// ===== Get Session Info =====
router.get('/session/:sessionId', asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  try {
    const filePath = findSessionFile(sessionId);
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const headers = rawData[0] || [];
    const dataRows = rawData.slice(1);

    res.json({
      sessionId,
      columns: headers,
      totalRows: dataRows.length,
      preview: dataRows.slice(0, 10),
    });
  } catch (e) {
    throw new Error('Session not found or expired');
  }
}));

// ===== Get Sheet Data =====
router.get('/sheet/:sessionId/:sheetName', asyncHandler(async (req, res) => {
  const { sessionId, sheetName } = req.params;

  const filePath = findSessionFile(sessionId);
  const workbook = XLSX.readFile(filePath);

  // Decode sheet name (may be URL encoded)
  const decodedSheetName = decodeURIComponent(sheetName);

  if (!workbook.SheetNames.includes(decodedSheetName)) {
    throw new Error(`Sheet "${decodedSheetName}" not found`);
  }

  const sheet = workbook.Sheets[decodedSheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rawData.length === 0) {
    throw new Error('Sheet is empty');
  }

  const headers = rawData[0] || [];
  const dataRows = rawData.slice(1);
  const previewRows = dataRows.slice(0, 10);

  res.json({
    sessionId,
    sheetName: decodedSheetName,
    columns: headers,
    preview: previewRows,
    totalRows: dataRows.length,
  });
}));

export default router;
