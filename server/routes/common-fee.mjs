/**
 * Common Fee API Routes
 * Database: postgres, Schema: silverman
 * Tables used: silverman.invoice (i), silverman.transaction (tr)
 * Base condition: i.status NOT IN ('void', 'draft', 'waiting_fix')
 */
import { Router } from 'express';
import { silvermanPool } from '../db/index.mjs';
import { asyncHandler } from '../utils/helpers.mjs';

const router = Router();

// ===== Shared: Expense type keywords =====
const EXPENSE_TYPE_KEYWORDS = {
  common_fee: { keywords: ['ส่วนกลาง', 'บริการสาธารณะ'], exclude: ['ปรับปรุง'] },
  water: { keywords: ['ค่าน้ำประปา'], exclude: [] },
  water_meter: { keywords: ['มิเตอร์น้ำ'], exclude: [] },
  insurance: { keywords: ['ประกันภัย'], exclude: [] },
  parking: { keywords: ['จอดรถ', 'จอดจักรยานยนต์'], exclude: [] },
  surcharge: { keywords: ['เงินเพิ่ม'], exclude: [] },
  interest: { keywords: ['ค่าดอกเบี้ย'], exclude: [] },
  fine: { keywords: ['ค่าปรับ', 'ค่าเบี้ยปรับ'], exclude: ['ปรับปรุง'] },
  fund: { keywords: ['กองทุน'], exclude: [] },
  electricity: { keywords: ['ไฟฟ้า', 'กระแสไฟ'], exclude: [] },
};

// Expense types array for categorization in expense-summary
const EXPENSE_TYPES = [
  { id: 'common_fee', name: 'ค่าส่วนกลาง', keywords: ['ส่วนกลาง', 'บริการสาธารณะ'], exclude: ['ปรับปรุง'] },
  { id: 'water', name: 'ค่าน้ำประปา', keywords: ['ค่าน้ำประปา'], exclude: [] },
  { id: 'water_meter', name: 'ค่ามิเตอร์น้ำ', keywords: ['มิเตอร์น้ำ'], exclude: [] },
  { id: 'insurance', name: 'ค่าเบี้ยประกัน', keywords: ['ประกันภัย'], exclude: [] },
  { id: 'parking', name: 'ค่าจอดรถ', keywords: ['จอดรถ', 'จอดจักรยานยนต์'], exclude: [] },
  { id: 'surcharge', name: 'เงินเพิ่ม', keywords: ['เงินเพิ่ม'], exclude: [] },
  { id: 'interest', name: 'ค่าดอกเบี้ย', keywords: ['ค่าดอกเบี้ย'], exclude: [] },
  { id: 'fine', name: 'ค่าปรับ/เบี้ยปรับ', keywords: ['ค่าปรับ', 'ค่าเบี้ยปรับ'], exclude: ['ปรับปรุง'] },
  { id: 'fund', name: 'เงินกองทุน', keywords: ['กองทุน'], exclude: [] },
  { id: 'electricity', name: 'ค่าไฟฟ้า', keywords: ['ไฟฟ้า', 'กระแสไฟ'], exclude: [] },
  { id: 'other', name: 'อื่นๆ', keywords: [], exclude: [] },
];

const DEFAULT_STATUS_EXCLUSION = "i.status NOT IN ('void', 'draft', 'waiting_fix')";
const MV_STATUS_EXCLUSION = "t.status NOT IN ('void', 'draft', 'waiting_fix')";

/**
 * Build SQL CASE WHEN expression to classify transactions by expense type.
 * Returns only the CASE expression (no alias). Used for GROUP BY aggregation.
 */
function buildExpenseTypeCaseSql(alias = 'tr') {
  const desc = `SPLIT_PART(${alias}.description, '(', 1)`;
  const cases = [];
  for (const type of EXPENSE_TYPES) {
    if (type.id === 'other') continue;
    const kwConds = type.keywords.map(kw => `${desc} LIKE '%${kw}%'`);
    const exConds = type.exclude.map(ex => `${desc} NOT LIKE '%${ex}%'`);
    const allConds = [];
    if (kwConds.length > 0) allConds.push(`(${kwConds.join(' OR ')})`);
    allConds.push(...exConds);
    cases.push(`WHEN ${allConds.join(' AND ')} THEN '${type.id}'`);
  }
  return `CASE ${cases.join(' ')} ELSE 'other' END`;
}

/**
 * Build simple expense_type condition for MV queries.
 * With the MV, expense_type is pre-classified — no LIKE/SPLIT_PART needed.
 */
function buildMvExpenseCondition(expense_type, alias = 't') {
  if (!expense_type) return '';
  if (!EXPENSE_TYPE_KEYWORDS[expense_type]) return '';
  return `${alias}.expense_type = '${expense_type}'`;
}

// ===== Materialized View: Pre-aggregated transaction totals per invoice per expense_type =====
const MV_NAME = 'silverman.mv_invoice_txn';

async function ensureMaterializedView() {
  const caseSql = buildExpenseTypeCaseSql('tr');
  try {
    const check = await silvermanPool.query(`
      SELECT 1 FROM pg_matviews WHERE schemaname = 'silverman' AND matviewname = 'mv_invoice_txn'
    `);
    if (check.rows.length === 0) {
      console.log('📊 Creating materialized view mv_invoice_txn...');
      await silvermanPool.query(`
        CREATE MATERIALIZED VIEW ${MV_NAME} AS
        SELECT
          tr.invoice_id,
          i.site_id,
          i.status,
          i.issued_date,
          i.due_date,
          i.name,
          i.pay_group,
          ${caseSql} as expense_type,
          COALESCE(SUM(tr.total), 0) as amount,
          COUNT(*) as txn_count
        FROM silverman.transaction tr
        JOIN silverman.invoice i ON i.id = tr.invoice_id
        GROUP BY tr.invoice_id, i.site_id, i.status, i.issued_date, i.due_date, i.name, i.pay_group, expense_type
      `);
      await silvermanPool.query(`CREATE UNIQUE INDEX idx_mv_invoice_txn ON ${MV_NAME} (invoice_id, expense_type)`);
      await silvermanPool.query(`CREATE INDEX idx_mv_txn_issued ON ${MV_NAME} (issued_date)`);
      await silvermanPool.query(`CREATE INDEX idx_mv_txn_site_issued ON ${MV_NAME} (site_id, issued_date)`);
      await silvermanPool.query(`CREATE INDEX idx_mv_txn_status ON ${MV_NAME} (status)`);
      await silvermanPool.query(`CREATE INDEX idx_mv_txn_status_due ON ${MV_NAME} (status, due_date)`);
      await silvermanPool.query(`CREATE INDEX idx_mv_txn_expense ON ${MV_NAME} (expense_type)`);
      console.log('✅ Materialized view mv_invoice_txn created');
    }
  } catch (err) {
    console.error('⚠️ MV creation error (non-fatal):', err.message);
  }
}

async function refreshMaterializedView() {
  try {
    await silvermanPool.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${MV_NAME}`);
  } catch (err) {
    console.error('⚠️ MV refresh error:', err.message);
  }
}

// Initialize MV on startup
ensureMaterializedView();

// Refresh MV every 10 minutes
setInterval(refreshMaterializedView, 10 * 60 * 1000);

// ===== Filter Options (Optimized) =====
let filterCache = null;
let filterCacheTime = 0;
const FILTER_CACHE_TTL = 5 * 60 * 1000;

router.get('/filters', asyncHandler(async (req, res) => {
  const now = Date.now();
  if (filterCache && (now - filterCacheTime) < FILTER_CACHE_TTL) {
    return res.json(filterCache);
  }

  const [sites, projects] = await Promise.all([
    silvermanPool.query(`
      SELECT
        s.id,
        s.name as domain,
        COALESCE(p.name_en, INITCAP(REPLACE(SPLIT_PART(s.name, '.', 1), '-', ' '))) as display_name
      FROM silverman.site s
      LEFT JOIN silverman.project p ON p.site_id = s.id
      ORDER BY s.name
    `),
    silvermanPool.query(`
      SELECT id, name FROM silverman.project WHERE name IS NOT NULL ORDER BY name
    `),
  ]);

  const statuses = [
    { status: 'paid', count: 0 },
    { status: 'active', count: 0 },
    { status: 'overdue', count: 0 },
    { status: 'partial_payment', count: 0 },
    { status: 'void', count: 0 },
    { status: 'draft', count: 0 },
  ];

  const periods = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const display = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    periods.push({ period, display, invoice_count: 0 });
  }

  const result = { sites: sites.rows, projects: projects.rows, statuses, periods };
  filterCache = result;
  filterCacheTime = now;
  res.json(result);
}));

// ===== Dashboard Overview =====
router.get('/overview', asyncHandler(async (req, res) => {
  const { site_id, year, period, status, pay_group, project_type, expense_type } = req.query;
  const targetYear = year || new Date().getFullYear().toString();
  const startDate = `${targetYear}-01-01`;
  const endDate = `${parseInt(targetYear) + 1}-01-01`;

  // --- Build shared filter conditions for invoice (alias i) ---
  function buildInvoiceFilters(prefix = 'i') {
    const conds = [];
    const prms = [];
    let idx = 1;
    // Date range
    conds.push(`${prefix}.issued_date >= $${idx}::date`);
    prms.push(startDate);
    idx++;
    conds.push(`${prefix}.issued_date < $${idx}::date`);
    prms.push(endDate);
    idx++;
    if (site_id) {
      conds.push(`${prefix}.site_id = $${idx}`);
      prms.push(site_id);
      idx++;
    }
    if (period) {
      conds.push(`TO_CHAR(${prefix}.issued_date, 'YYYY-MM') = $${idx}`);
      prms.push(period);
      idx++;
    }
    if (status && status !== 'all') {
      conds.push(`${prefix}.status = $${idx}`);
      prms.push(status);
      idx++;
    }
    if (pay_group) {
      conds.push(`${prefix}.pay_group = $${idx}`);
      prms.push(pay_group);
      idx++;
    }
    if (project_type === 'condo') {
      conds.push(`${prefix}.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')`);
    } else if (project_type === 'lowrise') {
      conds.push(`${prefix}.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')`);
    }
    return { conds, prms, idx };
  }

  // --- KPI Stats: MV-only (no invoice JOIN) ---
  const { conds: kpiConds, prms: kpiPrms } = buildInvoiceFilters('t');
  const kpiConditions = [MV_STATUS_EXCLUSION, ...kpiConds];
  const mvExpCond = buildMvExpenseCondition(expense_type, 't');
  if (mvExpCond) kpiConditions.push(mvExpCond);
  const kpiWhere = `WHERE ${kpiConditions.join(' AND ')}`;

  const [kpiResult, statusDistribution, availableYears] = await Promise.all([
    silvermanPool.query(`
      SELECT
        COALESCE(SUM(t.amount), 0) as total_billed,
        COALESCE(SUM(CASE WHEN t.status = 'paid' THEN t.amount ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN t.status IN ('active','overdue','partial_payment') THEN t.amount ELSE 0 END), 0) as total_outstanding,
        COUNT(DISTINCT CASE WHEN t.status IN ('active','overdue') THEN t.name END) as outstanding_units,
        COUNT(DISTINCT t.site_id) as project_count,
        COUNT(DISTINCT t.name) as unit_count
      FROM ${MV_NAME} t
      ${kpiWhere}
    `, kpiPrms),

    // Status distribution (invoice-level percentages)
    (() => {
      const { conds, prms } = buildInvoiceFilters('i');
      const where = `WHERE ${[DEFAULT_STATUS_EXCLUSION, ...conds].join(' AND ')}`;
      return silvermanPool.query(`
        SELECT
          ROUND(100.0 * COUNT(*) FILTER (WHERE i.status = 'paid') / NULLIF(COUNT(*), 0), 1) as paid_pct,
          ROUND(100.0 * COUNT(*) FILTER (WHERE i.status = 'partial_payment') / NULLIF(COUNT(*), 0), 1) as partial_pct,
          ROUND(100.0 * COUNT(*) FILTER (WHERE i.status = 'active') / NULLIF(COUNT(*), 0), 1) as unpaid_pct,
          ROUND(100.0 * COUNT(*) FILTER (WHERE i.status = 'overdue') / NULLIF(COUNT(*), 0), 1) as overdue_pct
        FROM silverman.invoice i
        ${where}
      `, prms);
    })(),

    silvermanPool.query(`
      SELECT DISTINCT EXTRACT(YEAR FROM issued_date)::int as year
      FROM silverman.invoice
      WHERE issued_date >= '2020-01-01' ${site_id ? 'AND site_id = $1' : ''}
      ORDER BY year DESC
    `, site_id ? [site_id] : []),
  ]);

  const kpi = kpiResult.rows[0];

  // --- Monthly Trend + High Risk (all in parallel) ---
  const months = [];
  for (let m = 0; m < 12; m++) {
    months.push(`${targetYear}-${String(m + 1).padStart(2, '0')}`);
  }

  function buildTrendFilters(prefix = 'i') {
    const conds = [];
    const prms = [];
    let idx = 1;
    if (site_id) { conds.push(`${prefix}.site_id = $${idx}`); prms.push(site_id); idx++; }
    if (pay_group) { conds.push(`${prefix}.pay_group = $${idx}`); prms.push(pay_group); idx++; }
    if (project_type === 'condo') {
      conds.push(`${prefix}.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')`);
    } else if (project_type === 'lowrise') {
      conds.push(`${prefix}.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')`);
    }
    return { conds, prms, idx };
  }

  // Build all filter params synchronously before firing queries
  const bMvExp = buildMvExpenseCondition(expense_type, 't');

  // 1) Billed (MV-only)
  const { conds: bConds, prms: bPrms, idx: bIdx } = buildTrendFilters('t');
  const billedConds = [MV_STATUS_EXCLUSION, ...bConds];
  billedConds.push(`t.issued_date >= $${bIdx}::date`); bPrms.push(startDate);
  billedConds.push(`t.issued_date < $${bIdx + 1}::date`); bPrms.push(endDate);
  if (period) { billedConds.push(`TO_CHAR(t.issued_date, 'YYYY-MM') = $${bPrms.length + 1}`); bPrms.push(period); }
  if (status && status !== 'all') { billedConds.push(`t.status = $${bPrms.length + 1}`); bPrms.push(status); }
  if (bMvExp) billedConds.push(bMvExp);

  // 2) Paid (needs i.paid_date — still uses invoice JOIN)
  const { conds: pConds, prms: pPrms, idx: pIdx } = buildTrendFilters('i');
  const paidConds = ["i.status = 'paid'", 'i.paid_date IS NOT NULL', ...pConds];
  paidConds.push(`i.paid_date >= $${pIdx}::date`); pPrms.push(startDate);
  paidConds.push(`i.paid_date < $${pIdx + 1}::date`); pPrms.push(endDate);
  if (bMvExp) paidConds.push(bMvExp);

  // 3) Outstanding (MV-only)
  const { conds: oConds, prms: oPrms, idx: oIdx } = buildTrendFilters('t');
  const outConds = ["t.status = 'overdue'", 't.due_date IS NOT NULL', ...oConds];
  outConds.push(`t.due_date >= $${oIdx}::date`); oPrms.push(startDate);
  outConds.push(`t.due_date < $${oIdx + 1}::date`); oPrms.push(endDate);
  if (bMvExp) outConds.push(bMvExp);

  // 4) Cumulative outstanding (MV-only)
  const { conds: cConds, prms: cPrms, idx: cIdx } = buildTrendFilters('t');
  const cumConds = ["t.status = 'overdue'", 't.due_date IS NOT NULL', ...cConds];
  const endOfYear = new Date(parseInt(targetYear), 11, 31);
  cumConds.push(`t.due_date <= $${cIdx}::date`);
  cPrms.push(endOfYear.toISOString().split('T')[0]);
  if (bMvExp) cumConds.push(bMvExp);

  // 5) High Risk (needs i.first_name, i.last_name — still uses invoice JOIN)
  const hrConds = []; const hrPrms = []; let hrIdx = 1;
  if (site_id) { hrConds.push(`i.site_id = $${hrIdx}`); hrPrms.push(site_id); hrIdx++; }
  if (pay_group) { hrConds.push(`i.pay_group = $${hrIdx}`); hrPrms.push(pay_group); hrIdx++; }
  if (project_type === 'condo') {
    hrConds.push(`i.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')`);
  } else if (project_type === 'lowrise') {
    hrConds.push(`i.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')`);
  }
  const hrConditions = [
    DEFAULT_STATUS_EXCLUSION, "i.status IN ('overdue', 'active')", 'i.due_date < CURRENT_DATE',
    `i.issued_date >= '${startDate}'::date`, `i.issued_date < '${endDate}'::date`, ...hrConds,
  ];
  if (bMvExp) hrConditions.push(bMvExp);

  // Fire all 5 queries in parallel
  const [billedResult, paidResult, outResult, cumResult, highRiskResult] = await Promise.all([
    // Billed (MV-only)
    silvermanPool.query(`
      SELECT TO_CHAR(DATE_TRUNC('month', t.issued_date), 'YYYY-MM') as month_key,
             COALESCE(SUM(t.amount), 0) as billed
      FROM ${MV_NAME} t
      WHERE ${billedConds.join(' AND ')}
      GROUP BY month_key
    `, bPrms),
    // Paid (needs invoice for paid_date)
    silvermanPool.query(`
      SELECT TO_CHAR(DATE_TRUNC('month', i.paid_date), 'YYYY-MM') as month_key,
             COALESCE(SUM(t.amount), 0) as paid
      FROM silverman.invoice i
      JOIN ${MV_NAME} t ON t.invoice_id = i.id
      WHERE ${paidConds.join(' AND ')}
      GROUP BY month_key
    `, pPrms),
    // Outstanding (MV-only)
    silvermanPool.query(`
      SELECT TO_CHAR(DATE_TRUNC('month', t.due_date), 'YYYY-MM') as month_key,
             COALESCE(SUM(t.amount), 0) as outstanding
      FROM ${MV_NAME} t
      WHERE ${outConds.join(' AND ')}
      GROUP BY month_key
    `, oPrms),
    // Cumulative outstanding (MV-only)
    silvermanPool.query(`
      SELECT TO_CHAR(DATE_TRUNC('month', t.due_date), 'YYYY-MM') as month_key,
             COALESCE(SUM(t.amount), 0) as amount
      FROM ${MV_NAME} t
      WHERE ${cumConds.join(' AND ')}
      GROUP BY month_key ORDER BY month_key
    `, cPrms),
    // High Risk (needs invoice for first_name/last_name)
    silvermanPool.query(`
      SELECT i.name as unit, CONCAT(i.first_name, ' ', i.last_name) as owner,
             SUM(t.amount) as amount, MIN(i.due_date) as due_date
      FROM silverman.invoice i
      JOIN ${MV_NAME} t ON t.invoice_id = i.id
      WHERE ${hrConditions.join(' AND ')}
      GROUP BY i.name, i.first_name, i.last_name
      ORDER BY amount DESC LIMIT 5
    `, hrPrms),
  ]);

  // Build trend maps
  const billedMap = new Map(billedResult.rows.map(r => [r.month_key, parseFloat(r.billed)]));
  const paidMap = new Map(paidResult.rows.map(r => [r.month_key, parseFloat(r.paid)]));
  const outMap = new Map(outResult.rows.map(r => [r.month_key, parseFloat(r.outstanding)]));

  const cumMonthlyMap = new Map(cumResult.rows.map(r => [r.month_key, parseFloat(r.amount)]));
  const allCumMonths = Array.from(cumMonthlyMap.keys()).sort();
  let cumRunning = 0;
  const cumByMonth = new Map();
  for (const mk of allCumMonths) {
    cumRunning += (cumMonthlyMap.get(mk) || 0);
    cumByMonth.set(mk, cumRunning);
  }

  const cumOutstandingMap = new Map();
  for (const monthKey of months) {
    let cumValue = 0;
    for (const mk of allCumMonths) {
      if (mk <= monthKey) cumValue = cumByMonth.get(mk) || 0;
      else break;
    }
    cumOutstandingMap.set(monthKey, cumValue);
  }

  let cumOutstandingRange = 0;
  const cumOutstandingRangeMap = new Map();
  for (const monthKey of months) {
    cumOutstandingRange += (outMap.get(monthKey) || 0);
    cumOutstandingRangeMap.set(monthKey, cumOutstandingRange);
  }

  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  const monthlyTrend = {
    data: months.map((monthKey) => {
      const [yr, mon] = monthKey.split('-').map(Number);
      return {
        month: `${thaiMonths[mon - 1]} ${yr}`,
        month_key: monthKey,
        billed: Math.round(billedMap.get(monthKey) || 0),
        paid: Math.round(paidMap.get(monthKey) || 0),
        outstanding: Math.round(outMap.get(monthKey) || 0),
        cumOutstanding: Math.round(cumOutstandingMap.get(monthKey) || 0),
        cumOutstandingYear: Math.round(cumOutstandingRangeMap.get(monthKey) || 0),
      };
    }),
    selectedYear: parseInt(targetYear),
    unit: 'บาท',
  };

  const formatAmount = (amount) => {
    const num = parseFloat(amount || 0);
    return `฿${Math.round(num).toLocaleString('en-US')}`;
  };

  const kpiTotalBilled = parseFloat(kpi.total_billed);
  const kpiTotalPaid = parseFloat(kpi.total_paid);
  const kpiTotalOutstanding = parseFloat(kpi.total_outstanding);

  res.json({
    kpis: {
      totalBilled: { value: formatAmount(kpiTotalBilled), rawValue: kpiTotalBilled, change: '+0%', changeType: 'positive' },
      totalPaid: { value: formatAmount(kpiTotalPaid), rawValue: kpiTotalPaid, change: '+0%', changeType: 'positive' },
      totalOutstanding: { value: formatAmount(kpiTotalOutstanding), rawValue: kpiTotalOutstanding, change: '+0%', changeType: 'negative' },
      outstandingUnits: { value: parseInt(kpi.outstanding_units) || 0, change: '0', changeType: 'positive' },
    },
    statusDistribution: {
      paid: parseFloat(statusDistribution.rows[0]?.paid_pct || 0),
      partial: parseFloat(statusDistribution.rows[0]?.partial_pct || 0),
      unpaid: parseFloat(statusDistribution.rows[0]?.unpaid_pct || 0),
      overdue: parseFloat(statusDistribution.rows[0]?.overdue_pct || 0),
    },
    trend: (() => {
      const trendData = monthlyTrend.data || [];
      let cumBilled = 0, cumPaid = 0;
      return trendData.map(row => {
        const billed = parseFloat(row.billed || 0);
        const paid = parseFloat(row.paid || 0);
        cumBilled += billed;
        cumPaid += paid;
        return {
          month: row.month,
          monthKey: row.month_key,
          billed,
          paid,
          outstanding: parseFloat(row.outstanding || 0),
          cumBilled: Math.round(cumBilled * 100) / 100,
          cumPaid: Math.round(cumPaid * 100) / 100,
          cumOutstanding: Math.round(parseFloat(row.cumOutstanding || 0) * 100) / 100,
          cumOutstandingYear: Math.round(parseFloat(row.cumOutstandingYear || 0) * 100) / 100,
        };
      });
    })(),
    selectedYear: monthlyTrend.selectedYear,
    trendUnit: monthlyTrend.unit || 'M',
    highRiskUnits: highRiskResult.rows.map(row => ({
      unit: row.unit || 'N/A',
      owner: row.owner || 'N/A',
      project: '',
      amount: parseFloat(row.amount) || 0,
      daysOverdue: row.due_date ? Math.floor((Date.now() - new Date(row.due_date).getTime()) / 86400000) : 0,
    })),
    syncInfo: {
      lastSyncAt: new Date().toISOString(),
      totalUnits: parseInt(kpi.unit_count) || 0,
      totalProjects: parseInt(kpi.project_count) || 0,
      status: 'synced',
    },
    availableYears: availableYears.rows.map(r => r.year),
  });
}));

// ===== Collection (Detailed Invoice List with Summary) =====
router.get('/collection', asyncHandler(async (req, res) => {
  const { site_id, year, status, search, period, pay_group, project_type, expense_type, limit = 50, offset = 0, sort_by = 'issued_date', sort_order = 'desc' } = req.query;

  const sortFieldMap = {
    doc_number: 'i.doc_number',
    unit: 'i.name',
    owner: "CONCAT(i.first_name, ' ', i.last_name)",
    billed_amount: 'billed_amount',
    status: 'i.status',
    due_date: 'i.due_date',
    issued_date: 'i.issued_date',
    paid_date: 'i.paid_date',
  };
  const sortColumn = sortFieldMap[sort_by] || 'i.issued_date';
  const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';

  const targetYear = parseInt(year) || new Date().getFullYear();

  // Build WHERE conditions for invoice (detail/paginated queries)
  const conditions = [DEFAULT_STATUS_EXCLUSION];
  const params = [];
  let paramIndex = 1;

  // Also build MV-only conditions (for summary/aggregate queries)
  const mvConds = [MV_STATUS_EXCLUSION];
  const mvParams = [];
  let mvIdx = 1;

  if (site_id) {
    conditions.push(`i.site_id = $${paramIndex}`); params.push(site_id); paramIndex++;
    mvConds.push(`t.site_id = $${mvIdx}`); mvParams.push(site_id); mvIdx++;
  }
  if (year) {
    conditions.push(`i.issued_date >= $${paramIndex}::date`); params.push(`${targetYear}-01-01`); paramIndex++;
    conditions.push(`i.issued_date < $${paramIndex}::date`); params.push(`${targetYear + 1}-01-01`); paramIndex++;
    mvConds.push(`t.issued_date >= $${mvIdx}::date`); mvParams.push(`${targetYear}-01-01`); mvIdx++;
    mvConds.push(`t.issued_date < $${mvIdx}::date`); mvParams.push(`${targetYear + 1}-01-01`); mvIdx++;
  }
  if (status && status !== 'all') {
    conditions.push(`i.status = $${paramIndex}`); params.push(status); paramIndex++;
    mvConds.push(`t.status = $${mvIdx}`); mvParams.push(status); mvIdx++;
  }
  if (period) {
    conditions.push(`TO_CHAR(i.issued_date, 'YYYY-MM') = $${paramIndex}`); params.push(period); paramIndex++;
    mvConds.push(`TO_CHAR(t.issued_date, 'YYYY-MM') = $${mvIdx}`); mvParams.push(period); mvIdx++;
  }
  if (pay_group) {
    conditions.push(`i.pay_group = $${paramIndex}`); params.push(pay_group); paramIndex++;
    mvConds.push(`t.pay_group = $${mvIdx}`); mvParams.push(pay_group); mvIdx++;
  }
  if (project_type === 'condo') {
    conditions.push("i.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')");
    mvConds.push("t.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')");
  } else if (project_type === 'lowrise') {
    conditions.push("i.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')");
    mvConds.push("t.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')");
  }
  if (search) {
    conditions.push(`(i.name ILIKE $${paramIndex} OR i.doc_number ILIKE $${paramIndex} OR i.first_name ILIKE $${paramIndex} OR i.last_name ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
    // search on MV: only name is available
    mvConds.push(`t.name ILIKE $${mvIdx}`);
    mvParams.push(`%${search}%`);
    mvIdx++;
  }

  // Build MV expense condition
  const mvExp = buildMvExpenseCondition(expense_type, 't');
  if (mvExp) mvConds.push(mvExp);
  const mvSubquery = mvExp
    ? `(SELECT COALESCE(SUM(t.amount), 0) FROM ${MV_NAME} t WHERE t.invoice_id = i.id AND ${mvExp})`
    : `(SELECT COALESCE(SUM(t.amount), 0) FROM ${MV_NAME} t WHERE t.invoice_id = i.id)`;

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Run queries in parallel
  const [summaryResult, overdueResult, dataResult] = await Promise.all([
    // Summary by status (MV-only, no invoice JOIN)
    silvermanPool.query(`
      SELECT t.status,
             COUNT(DISTINCT t.invoice_id) as cnt,
             COUNT(DISTINCT t.name) as unit_cnt,
             COALESCE(SUM(t.amount), 0) as amount
      FROM ${MV_NAME} t
      WHERE ${mvConds.join(' AND ')}
      GROUP BY t.status
    `, mvParams),

    // Overdue breakdown (MV-only)
    (() => {
      const odConds = ["t.status = 'overdue'"];
      const odParams = [];
      let odIdx = 1;
      if (site_id) { odConds.push(`t.site_id = $${odIdx}`); odParams.push(site_id); odIdx++; }
      if (pay_group) { odConds.push(`t.pay_group = $${odIdx}`); odParams.push(pay_group); odIdx++; }
      if (project_type === 'condo') odConds.push("t.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')");
      else if (project_type === 'lowrise') odConds.push("t.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')");
      const mvExpOd = buildMvExpenseCondition(expense_type, 't');
      if (mvExpOd) odConds.push(mvExpOd);
      return silvermanPool.query(`
        SELECT t.invoice_id as id, t.name, t.due_date,
               COALESCE(SUM(t.amount), 0) as amount
        FROM ${MV_NAME} t
        WHERE ${odConds.join(' AND ')}
        GROUP BY t.invoice_id, t.name, t.due_date
      `, odParams);
    })(),

    // Paginated data with billed_amount from transaction
    silvermanPool.query(`
      SELECT
        i.id, i.doc_number, i.name as unit,
        CONCAT(i.first_name, ' ', i.last_name) as owner,
        ${mvSubquery} as billed_amount,
        i.status, i.due_date, i.issued_date, i.paid_date,
        i.site_id, s.name as site_name,
        i.pay_group, i.remark, i.void_remark, i.added, i.updated
      FROM silverman.invoice i
      LEFT JOIN silverman.site s ON s.id = i.site_id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection} NULLS LAST, i.added DESC NULLS LAST
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, parseInt(limit), parseInt(offset)]),
  ]);

  // Process summary
  const summaryStats = {
    total: 0, totalUnits: new Set(), totalAmount: 0,
    paid: { count: 0, units: new Set(), amount: 0 },
    partial: { count: 0, units: new Set(), amount: 0 },
    active: { count: 0, units: new Set(), amount: 0 },
    overdue: { count: 0, units: new Set(), amount: 0 },
    void: { count: 0, units: new Set(), amount: 0 },
    draft: { count: 0, units: new Set(), amount: 0 },
  };
  for (const row of summaryResult.rows) {
    const st = row.status === 'partial_payment' ? 'partial' : row.status;
    const cnt = parseInt(row.cnt);
    const amt = parseFloat(row.amount);
    summaryStats.total += cnt;
    summaryStats.totalAmount += amt;
    if (summaryStats[st]) {
      summaryStats[st].count = cnt;
      summaryStats[st].amount = amt;
    }
  }

  // Overdue breakdown
  let cumOverdueAmt = 0, cumOverdueCount = 0, cumOverdueUnits = new Set();
  let yearlyOverdueAmt = 0, yearlyOverdueCount = 0, yearlyOverdueUnits = new Set();
  let totalOverdueAmt = 0, totalOverdueCount = 0, totalOverdueUnits = new Set();
  for (const row of overdueResult.rows) {
    const amt = parseFloat(row.amount) || 0;
    if (expense_type && amt === 0) continue;
    const dueYear = row.due_date ? new Date(row.due_date).getFullYear() : null;
    if (dueYear && dueYear <= targetYear) {
      totalOverdueCount++; totalOverdueUnits.add(row.name); totalOverdueAmt += amt;
    }
    if (dueYear && dueYear < targetYear) {
      cumOverdueCount++; cumOverdueUnits.add(row.name); cumOverdueAmt += amt;
    }
    if (dueYear && dueYear === targetYear) {
      yearlyOverdueCount++; yearlyOverdueUnits.add(row.name); yearlyOverdueAmt += amt;
    }
  }

  // Count for pagination
  const totalItems = summaryStats.total;

  res.json({
    data: dataResult.rows.map(r => ({ ...r, billed_amount: parseFloat(r.billed_amount) || 0 })),
    summary: {
      total: summaryStats.total,
      totalUnitCount: parseInt(summaryResult.rows.reduce((sum, r) => sum + parseInt(r.unit_cnt), 0)) || 0,
      totalAmount: summaryStats.totalAmount,
      paid: { count: summaryStats.paid.count, unitCount: summaryStats.paid.units.size || parseInt(summaryResult.rows.find(r => r.status === 'paid')?.unit_cnt || 0), amount: summaryStats.paid.amount },
      partial: { count: summaryStats.partial.count, unitCount: parseInt(summaryResult.rows.find(r => r.status === 'partial_payment')?.unit_cnt || 0), amount: summaryStats.partial.amount },
      active: { count: summaryStats.active.count, unitCount: parseInt(summaryResult.rows.find(r => r.status === 'active')?.unit_cnt || 0), amount: summaryStats.active.amount },
      overdue: {
        count: summaryStats.overdue.count,
        unitCount: parseInt(summaryResult.rows.find(r => r.status === 'overdue')?.unit_cnt || 0),
        amount: yearlyOverdueAmt,
        yearlyCount: yearlyOverdueCount,
        yearlyUnitCount: yearlyOverdueUnits.size,
        cumulativeAmount: cumOverdueAmt,
        cumulativeCount: cumOverdueCount,
        cumulativeUnitCount: cumOverdueUnits.size,
        totalUnitCount: totalOverdueUnits.size,
      },
      void: { count: summaryStats.void.count, unitCount: parseInt(summaryResult.rows.find(r => r.status === 'void')?.unit_cnt || 0), amount: summaryStats.void.amount },
      draft: { count: summaryStats.draft.count, unitCount: parseInt(summaryResult.rows.find(r => r.status === 'draft')?.unit_cnt || 0), amount: summaryStats.draft.amount },
    },
    pagination: {
      page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
      pageSize: parseInt(limit),
      totalPages: Math.ceil(totalItems / parseInt(limit)),
      totalItems,
    },
  });
}));

// ===== Invoice Line Items =====
router.get('/invoice/:id/items', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await silvermanPool.query(`
    SELECT id, description, unit_items, price, discount, vat, total, paid, status, added
    FROM silverman.transaction
    WHERE invoice_id = $1
    ORDER BY added DESC NULLS LAST
  `, [id]);

  const items = result.rows.map(row => ({
    id: row.id,
    description: row.description,
    unitItems: parseFloat(row.unit_items || 0),
    price: parseFloat(row.price || 0),
    discount: parseFloat(row.discount || 0),
    vat: parseFloat(row.vat || 0),
    total: parseFloat(row.total || 0),
    paid: parseFloat(row.paid || 0),
    status: row.status,
    added: row.added,
    isPaid: row.status === 'paid',
    isPartial: parseFloat(row.paid || 0) > 0 && parseFloat(row.paid || 0) < parseFloat(row.total || 0),
    remaining: parseFloat(row.total || 0) - parseFloat(row.paid || 0),
  }));

  const invoiceTotal = items.reduce((sum, item) => sum + item.total, 0);
  const invoicePaid = items.reduce((sum, item) => sum + item.paid, 0);

  res.json({ invoiceTotal, invoicePaid, invoiceRemaining: invoiceTotal - invoicePaid, items });
}));

// ===== Expense Summary by Type =====
router.get('/expense-summary', asyncHandler(async (req, res) => {
  const { site_id, year, status, project_type, expense_type } = req.query;

  // Build WHERE for MV (no invoice JOIN needed — all columns embedded)
  const conditions = [MV_STATUS_EXCLUSION];
  const params = [];
  let paramIndex = 1;

  if (site_id) {
    conditions.push(`t.site_id = $${paramIndex}`);
    params.push(site_id);
    paramIndex++;
  }
  if (year) {
    conditions.push(`t.issued_date >= $${paramIndex}::date`);
    params.push(`${year}-01-01`);
    paramIndex++;
    conditions.push(`t.issued_date < $${paramIndex}::date`);
    params.push(`${parseInt(year) + 1}-01-01`);
    paramIndex++;
  }
  if (status) {
    conditions.push(`t.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }
  if (project_type === 'condo') {
    conditions.push("t.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')");
  } else if (project_type === 'lowrise') {
    conditions.push("t.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')");
  }
  const mvExpCond = buildMvExpenseCondition(expense_type, 't');
  if (mvExpCond) conditions.push(mvExpCond);

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Query MV directly — no invoice JOIN needed
  const result = await silvermanPool.query(`
    SELECT t.expense_type,
           SUM(t.txn_count)::int as count,
           COALESCE(SUM(t.amount), 0) as amount
    FROM ${MV_NAME} t
    ${whereClause}
    GROUP BY t.expense_type
    ORDER BY amount DESC
  `, params);

  const nameMap = Object.fromEntries(EXPENSE_TYPES.map(t => [t.id, t.name]));
  const summaryArray = result.rows
    .filter(r => parseInt(r.count) > 0)
    .map(r => ({
      id: r.expense_type,
      name: nameMap[r.expense_type] || 'อื่นๆ',
      count: parseInt(r.count),
      amount: parseFloat(r.amount),
    }));
  const totalInvoices = summaryArray.reduce((sum, r) => sum + r.count, 0);

  res.json({
    data: summaryArray,
    totalInvoices,
    filters: { site_id, year, status },
  });
}));

// ===== Aging Report - Invoice Level =====
router.get('/aging', asyncHandler(async (req, res) => {
  const { site_id, year, bucket, search, limit = 50, offset = 0, sort_by = 'daysOverdue', sort_order = 'desc', pay_group, project_type, expense_type } = req.query;

  const sortFieldMap = {
    docNumber: 'i.doc_number',
    unit: 'i.name',
    owner: "CONCAT(i.first_name, ' ', i.last_name)",
    project: "COALESCE(p.name_en, INITCAP(REPLACE(SPLIT_PART(s.name, '.', 1), '-', ' ')))",
    amount: 'amount',
    dueDate: 'i.due_date',
    daysOverdue: '(CURRENT_DATE - i.due_date::date)',
  };
  const sortColumn = sortFieldMap[sort_by] || '(CURRENT_DATE - i.due_date::date)';
  const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';

  // Build WHERE for overdue invoices
  const conditions = [
    "i.status IN ('overdue', 'active')",
    'i.due_date < CURRENT_DATE',
  ];
  const params = [];
  let paramIndex = 1;

  if (site_id) {
    conditions.push(`i.site_id = $${paramIndex}`);
    params.push(site_id);
    paramIndex++;
  }
  if (year) {
    conditions.push(`EXTRACT(YEAR FROM i.due_date) <= $${paramIndex}`);
    params.push(year);
    paramIndex++;
  }
  if (search) {
    conditions.push(`(i.name ILIKE $${paramIndex} OR i.first_name ILIKE $${paramIndex} OR i.last_name ILIKE $${paramIndex} OR i.doc_number ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }
  if (pay_group) {
    conditions.push(`i.pay_group = $${paramIndex}`);
    params.push(pay_group);
    paramIndex++;
  }
  if (project_type === 'condo') {
    conditions.push("i.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')");
  } else if (project_type === 'lowrise') {
    conditions.push("i.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')");
  }

  // Build MV expense condition
  const mvExp = buildMvExpenseCondition(expense_type, 't');
  const mvSubquery = mvExp
    ? `(SELECT COALESCE(SUM(t.amount), 0) FROM ${MV_NAME} t WHERE t.invoice_id = i.id AND ${mvExp})`
    : `(SELECT COALESCE(SUM(t.amount), 0) FROM ${MV_NAME} t WHERE t.invoice_id = i.id)`;

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // --- Summary (MV-only, all buckets, no search filter) ---
  const smConds = [
    "t.status IN ('overdue', 'active')",
    't.due_date < CURRENT_DATE',
  ];
  const smParams = [];
  let smIdx = 1;

  if (site_id) { smConds.push(`t.site_id = $${smIdx}`); smParams.push(site_id); smIdx++; }
  if (pay_group) { smConds.push(`t.pay_group = $${smIdx}`); smParams.push(pay_group); smIdx++; }
  if (year) {
    smConds.push(`t.due_date < $${smIdx}::date`);
    smParams.push(`${parseInt(year) + 1}-01-01`);
    smIdx++;
  }
  if (project_type === 'condo') {
    smConds.push("t.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')");
  } else if (project_type === 'lowrise') {
    smConds.push("t.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')");
  }
  if (mvExp) smConds.push(mvExp);
  const smWhere = `WHERE ${smConds.join(' AND ')}`;

  // Build bucket filter condition (synchronous, before Promise.all)
  let invoiceBucketCondition = '';
  if (bucket) {
    const bucketMap = {
      '0-30': 'BETWEEN 0 AND 30', '31-60': 'BETWEEN 31 AND 60', '61-90': 'BETWEEN 61 AND 90',
      '91-180': 'BETWEEN 91 AND 180', '181-360': 'BETWEEN 181 AND 360', '360+': '> 360',
    };
    if (bucketMap[bucket]) invoiceBucketCondition = `AND (CURRENT_DATE - i.due_date::date) ${bucketMap[bucket]}`;
  }

  // Run summary (SQL bucket aggregation) + paginated + count in parallel
  const [bucketResult, totalResult, invoicesQuery, countQuery] = await Promise.all([
    // Bucket summary (MV-only)
    silvermanPool.query(`
      SELECT
        CASE
          WHEN (CURRENT_DATE - t.due_date::date) BETWEEN 0 AND 30 THEN '0-30'
          WHEN (CURRENT_DATE - t.due_date::date) BETWEEN 31 AND 60 THEN '31-60'
          WHEN (CURRENT_DATE - t.due_date::date) BETWEEN 61 AND 90 THEN '61-90'
          WHEN (CURRENT_DATE - t.due_date::date) BETWEEN 91 AND 180 THEN '91-180'
          WHEN (CURRENT_DATE - t.due_date::date) BETWEEN 181 AND 360 THEN '181-360'
          ELSE '360+'
        END as bucket,
        COUNT(*) as cnt,
        COALESCE(SUM(t.amount), 0) as amount
      FROM ${MV_NAME} t
      ${smWhere}
      GROUP BY bucket
    `, smParams),

    // Total unique units + amount (MV-only)
    silvermanPool.query(`
      SELECT COUNT(DISTINCT t.name) as unique_units,
             COALESCE(SUM(t.amount), 0) as total_amount
      FROM ${MV_NAME} t
      ${smWhere}
    `, smParams),

    // Paginated invoices (using MV subquery)
    silvermanPool.query(`
      SELECT
        i.id, i.doc_number, i.name as unit,
        CONCAT(i.first_name, ' ', i.last_name) as owner,
        s.name as site_domain,
        COALESCE(p.name_en, INITCAP(REPLACE(SPLIT_PART(s.name, '.', 1), '-', ' '))) as project,
        i.site_id,
        ${mvSubquery} as amount,
        i.due_date,
        (CURRENT_DATE - i.due_date::date) as days_overdue,
        CASE
          WHEN (CURRENT_DATE - i.due_date::date) BETWEEN 0 AND 30 THEN '0-30'
          WHEN (CURRENT_DATE - i.due_date::date) BETWEEN 31 AND 60 THEN '31-60'
          WHEN (CURRENT_DATE - i.due_date::date) BETWEEN 61 AND 90 THEN '61-90'
          WHEN (CURRENT_DATE - i.due_date::date) BETWEEN 91 AND 180 THEN '91-180'
          WHEN (CURRENT_DATE - i.due_date::date) BETWEEN 181 AND 360 THEN '181-360'
          ELSE '360+'
        END as bucket
      FROM silverman.invoice i
      LEFT JOIN silverman.site s ON s.id = i.site_id
      LEFT JOIN silverman.project p ON p.site_id = s.id
      ${whereClause}
      ${invoiceBucketCondition}
      ORDER BY ${sortColumn} ${sortDirection}, i.total DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, parseInt(limit), parseInt(offset)]),

    // Count for pagination
    silvermanPool.query(`
      SELECT COUNT(*) as count
      FROM silverman.invoice i
      ${whereClause}
      ${invoiceBucketCondition}
    `, params),
  ]);

  // Build bucket summary from SQL result
  const bucketSummary = { '0-30': { count: 0, amount: 0 }, '31-60': { count: 0, amount: 0 }, '61-90': { count: 0, amount: 0 }, '91-180': { count: 0, amount: 0 }, '181-360': { count: 0, amount: 0 }, '360+': { count: 0, amount: 0 } };
  for (const row of bucketResult.rows) {
    bucketSummary[row.bucket] = { count: parseInt(row.cnt), amount: parseFloat(row.amount) };
  }

  const totalUniqueUnits = parseInt(totalResult.rows[0]?.unique_units) || 0;
  const totalAmount = parseFloat(totalResult.rows[0]?.total_amount) || 0;

  res.json({
    summary: {
      total: { count: totalUniqueUnits, amount: totalAmount },
      buckets: bucketSummary,
    },
    invoices: invoicesQuery.rows.map(row => ({
      id: row.id,
      docNumber: row.doc_number,
      unit: row.unit,
      owner: row.owner,
      project: row.project,
      siteId: row.site_id,
      amount: parseFloat(row.amount) || 0,
      dueDate: row.due_date,
      daysOverdue: parseInt(row.days_overdue) || 0,
      bucket: row.bucket,
    })),
    pagination: {
      total: parseInt(countQuery.rows[0].count) || 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    },
  });
}));

// ===== Invoice Status Summary =====
router.get('/invoice-summary', asyncHandler(async (req, res) => {
  const { site_id, year, period, status, pay_group, project_type, expense_type } = req.query;
  const targetYear = year || new Date().getFullYear().toString();

  // Build conditions (MV-only, no invoice JOIN)
  const conditions = [MV_STATUS_EXCLUSION];
  const params = [];
  let idx = 1;

  conditions.push(`t.issued_date >= $${idx}::date`);
  params.push(`${targetYear}-01-01`);
  idx++;
  conditions.push(`t.issued_date < $${idx}::date`);
  params.push(`${parseInt(targetYear) + 1}-01-01`);
  idx++;

  if (period) {
    conditions.push(`TO_CHAR(t.issued_date, 'YYYY-MM') = $${idx}`);
    params.push(period);
    idx++;
  }
  if (site_id) {
    conditions.push(`t.site_id = $${idx}`);
    params.push(site_id);
    idx++;
  }
  if (status && status !== 'all') {
    conditions.push(`t.status = $${idx}`);
    params.push(status);
    idx++;
  }
  if (pay_group) {
    conditions.push(`t.pay_group = $${idx}`);
    params.push(pay_group);
    idx++;
  }
  if (project_type === 'condo') {
    conditions.push("t.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')");
  } else if (project_type === 'lowrise') {
    conditions.push("t.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')");
  }

  const mvExp = buildMvExpenseCondition(expense_type, 't');
  if (mvExp) conditions.push(mvExp);

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Build cumulative overdue conditions (MV-only)
  const cumConditions = ["t.status = 'overdue'"];
  const cumParams = [];
  let cumIdx = 1;
  cumConditions.push(`t.due_date < $${cumIdx}::date`);
  cumParams.push(`${parseInt(targetYear) + 1}-01-01`);
  cumIdx++;
  if (site_id) { cumConditions.push(`t.site_id = $${cumIdx}`); cumParams.push(site_id); cumIdx++; }
  if (pay_group) { cumConditions.push(`t.pay_group = $${cumIdx}`); cumParams.push(pay_group); cumIdx++; }
  if (project_type === 'condo') {
    cumConditions.push("t.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')");
  } else if (project_type === 'lowrise') {
    cumConditions.push("t.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')");
  }
  if (mvExp) cumConditions.push(mvExp);

  // Run both queries in parallel (MV-only, no invoice JOIN)
  const [summaryResult, cumResult] = await Promise.all([
    silvermanPool.query(`
      SELECT t.status,
             COUNT(DISTINCT t.invoice_id) as cnt,
             COUNT(DISTINCT t.name) as unit_cnt,
             COALESCE(SUM(t.amount), 0) as amount
      FROM ${MV_NAME} t
      ${whereClause}
      GROUP BY t.status
    `, params),
    silvermanPool.query(`
      SELECT COUNT(DISTINCT t.invoice_id) as cnt,
             COUNT(DISTINCT t.name) as unit_cnt,
             COALESCE(SUM(t.amount), 0) as amount
      FROM ${MV_NAME} t
      WHERE ${cumConditions.join(' AND ')}
    `, cumParams),
  ]);

  // Build summary
  const summary = {
    total: { count: 0, units: new Set(), amount: 0 },
    paid: { count: 0, unitCount: 0, amount: 0 },
    partial: { count: 0, unitCount: 0, amount: 0 },
    active: { count: 0, unitCount: 0, amount: 0 },
    overdue: { count: 0, unitCount: 0, amount: 0 },
    draft: { count: 0, unitCount: 0, amount: 0 },
  };

  for (const row of summaryResult.rows) {
    const cnt = parseInt(row.cnt);
    const unitCnt = parseInt(row.unit_cnt);
    const amt = parseFloat(row.amount);
    summary.total.count += cnt;
    summary.total.amount += amt;
    const st = row.status === 'partial_payment' ? 'partial' : row.status;
    if (summary[st]) {
      summary[st].count = cnt;
      summary[st].unitCount = unitCnt;
      summary[st].amount = amt;
    }
  }

  const cumRow = cumResult.rows[0] || { cnt: 0, unit_cnt: 0, amount: 0 };

  // Compute total unitCount across all statuses
  const totalUnitCnt = summaryResult.rows.reduce((sum, r) => sum + parseInt(r.unit_cnt), 0);

  res.json({
    total: { count: summary.total.count, unitCount: totalUnitCnt, amount: summary.total.amount },
    paid: { count: summary.paid.count, unitCount: summary.paid.unitCount, amount: summary.paid.amount },
    partial: { count: summary.partial.count, unitCount: summary.partial.unitCount, amount: summary.partial.amount },
    active: { count: summary.active.count, unitCount: summary.active.unitCount, amount: summary.active.amount },
    overdue: { count: summary.overdue.count, unitCount: summary.overdue.unitCount, amount: summary.overdue.amount },
    overdueCumulative: { count: parseInt(cumRow.cnt), unitCount: parseInt(cumRow.unit_cnt), amount: parseFloat(cumRow.amount) },
    selectedYear: parseInt(targetYear),
    draft: { count: summary.draft.count, unitCount: summary.draft.unitCount, amount: summary.draft.amount },
  });
}));

// ===== Collection summary by project =====
router.get('/collection-by-project', asyncHandler(async (req, res) => {
  const { year, pay_group, project_type, site_id, expense_type } = req.query;
  const targetYear = parseInt(year) || new Date().getFullYear();
  const years = [targetYear, targetYear - 1, targetYear - 2];

  // Build base conditions for main query (needs site/project JOIN for names)
  const baseConditions = [DEFAULT_STATUS_EXCLUSION];
  const params = [];
  let paramIndex = 1;

  if (pay_group) {
    baseConditions.push(`i.pay_group = $${paramIndex}`);
    params.push(pay_group);
    paramIndex++;
  }
  if (project_type === 'condo') {
    baseConditions.push("p.type_of_project = 'condominium'");
  } else if (project_type === 'lowrise') {
    baseConditions.push("(p.type_of_project IS NULL OR p.type_of_project != 'condominium')");
  }
  if (site_id) {
    baseConditions.push(`i.site_id = $${paramIndex}`);
    params.push(site_id);
    paramIndex++;
  }

  const mvExp = buildMvExpenseCondition(expense_type, 't');
  if (mvExp) baseConditions.push(mvExp);

  // Main query: uses MV + site/project tables (skip invoice table, use MV columns)
  const mainConditions = [...baseConditions,
    `i.issued_date >= $${paramIndex}::date`, `i.issued_date < $${paramIndex + 1}::date`];
  params.push(`${targetYear}-01-01`, `${targetYear + 1}-01-01`);

  // Phase 1: main query + first_invoice_date bulk query in parallel
  const [invoiceRows, firstInvoiceResult] = await Promise.all([
    silvermanPool.query(`
      SELECT
        t.site_id, t.status, t.name,
        COALESCE(p.name_en, INITCAP(REPLACE(SPLIT_PART(s.name, '.', 1), '-', ' '))) as project_name,
        p.type_of_project,
        t.amount as txn_total
      FROM ${MV_NAME} t
      LEFT JOIN silverman.site s ON t.site_id = s.id
      LEFT JOIN silverman.project p ON p.site_id = s.id
      WHERE ${mainConditions.map(c => c.replace(/\bi\./g, 't.')).join(' AND ')}
    `, params),
    silvermanPool.query(`
      SELECT t.site_id, MIN(t.issued_date) as first_invoice_date
      FROM ${MV_NAME} t
      WHERE ${MV_STATUS_EXCLUSION}
      GROUP BY t.site_id
    `),
  ]);

  // Build first_invoice_date lookup
  const firstInvoiceMap = new Map(firstInvoiceResult.rows.map(r => [r.site_id, r.first_invoice_date]));

  // Group by site
  const siteMap = new Map();
  for (const row of invoiceRows.rows) {
    const amt = parseFloat(row.txn_total) || 0;
    if (!siteMap.has(row.site_id)) {
      siteMap.set(row.site_id, {
        site_id: row.site_id, project_name: row.project_name, type_of_project: row.type_of_project,
        first_invoice_date: firstInvoiceMap.get(row.site_id) || null, units: new Set(),
        totalAmount: 0, paidAmount: 0, overdueAmount: 0, totalCount: 0,
      });
    }
    const s = siteMap.get(row.site_id);
    s.totalCount++;
    s.units.add(row.name);
    s.totalAmount += amt;
    if (row.status === 'paid' || row.status === 'partial_payment') s.paidAmount += amt;
    if (row.status === 'overdue') s.overdueAmount += amt;
  }

  const siteIds = Array.from(siteMap.keys());

  // Phase 2: yearly + cumulative (MV-only, no invoice JOIN)
  let yearlyData = {};
  let cumulativeData = {};
  if (siteIds.length > 0) {
    const mvExpWhere = mvExp ? ` AND ${mvExp}` : '';
    const extraConds2 = [];
    const extraParams = [siteIds];
    let epIdx = 2;
    if (pay_group) { extraConds2.push(`t.pay_group = $${epIdx}`); extraParams.push(pay_group); epIdx++; }
    if (project_type === 'condo') extraConds2.push("t.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')");
    else if (project_type === 'lowrise') extraConds2.push("t.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')");
    const extraWhere2 = extraConds2.length > 0 ? ' AND ' + extraConds2.join(' AND ') : '';

    const yearlyStartDate = `${years[years.length - 1]}-01-01`;
    const yearlyEndDate = `${years[0] + 1}-01-01`;
    const yearlyParams = [...extraParams, yearlyStartDate, yearlyEndDate];

    const cumEndDate = `${targetYear + 1}-01-01`;
    const cumOverdueYearParams = [...extraParams, cumEndDate];
    const cumYearIdx = extraParams.length + 1;

    const [yearlyRows, cumRows] = await Promise.all([
      // Yearly breakdown (MV-only, date range instead of EXTRACT)
      silvermanPool.query(`
        SELECT t.site_id, t.status, EXTRACT(YEAR FROM t.issued_date)::INT as year,
               SUM(t.amount) as amount
        FROM ${MV_NAME} t
        WHERE t.site_id = ANY($1)
          AND t.issued_date >= $${extraParams.length + 1}::date
          AND t.issued_date < $${extraParams.length + 2}::date
          AND ${MV_STATUS_EXCLUSION}
          ${extraWhere2}
          ${mvExpWhere}
        GROUP BY t.site_id, t.status, year
      `, yearlyParams),
      // Cumulative (MV-only)
      silvermanPool.query(`
        SELECT t.site_id,
               COALESCE(SUM(t.amount), 0) as total_amount,
               COALESCE(SUM(CASE WHEN t.status IN ('paid', 'partial_payment') THEN t.amount ELSE 0 END), 0) as paid_amount,
               COALESCE(SUM(CASE WHEN t.status = 'overdue' AND t.due_date < $${cumYearIdx}::date THEN t.amount ELSE 0 END), 0) as overdue_amount
        FROM ${MV_NAME} t
        WHERE t.site_id = ANY($1)
          AND ${MV_STATUS_EXCLUSION}
          ${extraWhere2}
          ${mvExpWhere}
        GROUP BY t.site_id
      `, cumOverdueYearParams),
    ]);

    for (const row of yearlyRows.rows) {
      if (!yearlyData[row.site_id]) yearlyData[row.site_id] = {};
      if (!yearlyData[row.site_id][row.year]) yearlyData[row.site_id][row.year] = { totalAmount: 0, paidAmount: 0, overdueAmount: 0 };
      const d = yearlyData[row.site_id][row.year];
      const amt = parseFloat(row.amount) || 0;
      d.totalAmount += amt;
      if (row.status === 'paid' || row.status === 'partial_payment') d.paidAmount += amt;
      if (row.status === 'overdue') d.overdueAmount += amt;
    }

    for (const row of cumRows.rows) {
      cumulativeData[row.site_id] = {
        totalAmount: parseFloat(row.total_amount) || 0,
        paidAmount: parseFloat(row.paid_amount) || 0,
        overdueAmount: parseFloat(row.overdue_amount) || 0,
      };
    }
  }

  const projects = Array.from(siteMap.values()).map(row => {
    let ageYears = 0, ageMonths = 0;
    if (row.first_invoice_date) {
      const firstDate = new Date(row.first_invoice_date);
      const now = new Date();
      const totalMonths = (now.getFullYear() - firstDate.getFullYear()) * 12 + (now.getMonth() - firstDate.getMonth());
      ageYears = Math.floor(totalMonths / 12);
      ageMonths = totalMonths % 12;
    }

    const siteYearlyData = yearlyData[row.site_id] || {};
    const yearlyBreakdown = {};
    years.forEach(y => {
      yearlyBreakdown[y] = siteYearlyData[y] || { totalAmount: 0, paidAmount: 0, overdueAmount: 0 };
    });

    return {
      siteId: row.site_id,
      name: row.project_name || `Site ${row.site_id}`,
      projectType: row.type_of_project || 'unknown',
      isCondo: row.type_of_project === 'condominium',
      totalAmount: row.totalAmount,
      paidAmount: row.paidAmount,
      overdueAmount: row.overdueAmount,
      totalUnits: row.units.size,
      collectionRate: row.totalAmount > 0 ? Math.round((row.paidAmount / row.totalAmount) * 100) : 0,
      ageYears,
      ageMonths,
      firstInvoiceDate: row.first_invoice_date,
      yearlyBreakdown,
      cumulative: cumulativeData[row.site_id] || { totalAmount: 0, paidAmount: 0, overdueAmount: 0 },
    };
  }).sort((a, b) => b.totalAmount - a.totalAmount);

  res.json({ year: targetYear, years, projects });
}));

export default router;
