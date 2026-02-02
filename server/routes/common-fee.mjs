/**
 * Common Fee API Routes
 * Database: postgres, Schema: silverman
 */
import { Router } from 'express';
import { silvermanPool } from '../db/index.mjs';
import { asyncHandler } from '../utils/helpers.mjs';

const router = Router();

// ===== Filter Options (Optimized) =====
// Cache for filter options (refresh every 5 minutes)
let filterCache = null;
let filterCacheTime = 0;
const FILTER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

router.get('/filters', asyncHandler(async (req, res) => {
  const now = Date.now();

  // Return cached data if still valid
  if (filterCache && (now - filterCacheTime) < FILTER_CACHE_TTL) {
    return res.json(filterCache);
  }

  const [sites, projects] = await Promise.all([
    // Sites - simplified query without counting invoices (much faster)
    silvermanPool.query(`
      SELECT
        s.id,
        s.name as domain,
        COALESCE(p.name_en, INITCAP(REPLACE(SPLIT_PART(s.name, '.', 1), '-', ' '))) as display_name
      FROM silverman.site s
      LEFT JOIN silverman.project p ON p.site_id = s.id
      ORDER BY s.name
    `),
    // Projects
    silvermanPool.query(`
      SELECT id, name FROM silverman.project WHERE name IS NOT NULL ORDER BY name
    `),
  ]);

  // Static statuses (known values, no need to query)
  const statuses = [
    { status: 'paid', count: 0 },
    { status: 'active', count: 0 },
    { status: 'overdue', count: 0 },
    { status: 'partial_payment', count: 0 },
    { status: 'void', count: 0 },
    { status: 'draft', count: 0 },
  ];

  // Generate periods statically (last 24 months)
  const periods = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const today = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const display = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    periods.push({ period, display, invoice_count: 0 });
  }

  const result = {
    sites: sites.rows,
    projects: projects.rows,
    statuses,
    periods,
  };

  // Cache the result
  filterCache = result;
  filterCacheTime = now;

  res.json(result);
}));

// ===== Dashboard Overview =====
router.get('/overview', asyncHandler(async (req, res) => {
  const { site_id, year, period, status, pay_group, project_type, expense_type } = req.query;

  // Use year filter (default to current year)
  const targetYear = year || new Date().getFullYear().toString();

  // Derive month range from year
  const startMonthFilter = `${targetYear}-01`;
  const endMonthFilter = `${targetYear}-12`;

  // Build filter conditions using month range
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  // Month range filter (replaces year filter)
  conditions.push(`TO_CHAR(DATE_TRUNC('month', issued_date), 'YYYY-MM') >= $${paramIndex}`);
  params.push(startMonthFilter);
  paramIndex++;

  conditions.push(`TO_CHAR(DATE_TRUNC('month', issued_date), 'YYYY-MM') <= $${paramIndex}`);
  params.push(endMonthFilter);
  paramIndex++;

  // Site filter (optional)
  if (site_id) {
    conditions.push(`site_id = $${paramIndex}`);
    params.push(site_id);
    paramIndex++;
  }

  // Period filter (optional) - format: YYYY-MM
  if (period) {
    conditions.push(`TO_CHAR(DATE_TRUNC('month', issued_date), 'YYYY-MM') = $${paramIndex}`);
    params.push(period);
    paramIndex++;
  }

  // Status filter (optional)
  if (status && status !== 'all') {
    conditions.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  // Pay group filter (optional)
  if (pay_group) {
    conditions.push(`pay_group = $${paramIndex}`);
    params.push(pay_group);
    paramIndex++;
  }

  // Project type filter (condo vs lowrise) - uses subquery for cleaner implementation
  let projectTypeCondition = '';
  if (project_type === 'condo') {
    projectTypeCondition = "site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')";
    conditions.push(projectTypeCondition);
  } else if (project_type === 'lowrise') {
    projectTypeCondition = "site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')";
    conditions.push(projectTypeCondition);
  }

  // Expense type filter
  if (expense_type) {
    conditions.push(buildExpenseTypeCondition(expense_type));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get summary statistics
  const [kpiStats, projectCount, unitCount, statusDistribution, monthlyTrend, highRiskUnits, availableYears] = await Promise.all([
    // KPI: Total billed, paid, outstanding (filtered by year)
    silvermanPool.query(`
      SELECT
        COUNT(*) as total_invoices,
        COALESCE(SUM(total), 0) as total_billed,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN status IN ('active', 'overdue', 'partial_payment') THEN total ELSE 0 END), 0) as total_outstanding,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        COUNT(*) FILTER (WHERE status = 'partial_payment') as partial_count,
        COUNT(*) FILTER (WHERE status IN ('active')) as unpaid_count,
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count
      FROM silverman.invoice
      ${whereClause}
    `, params),

    // Project/Site count (for the year)
    silvermanPool.query(`
      SELECT COUNT(DISTINCT site_id) as count
      FROM silverman.invoice
      ${whereClause}
    `, params),

    // Total units (tenants) for the year
    silvermanPool.query(`
      SELECT COUNT(DISTINCT name) as count
      FROM silverman.invoice
      ${whereClause}
    `, params),

    // Status distribution (percentage) for the year
    silvermanPool.query(`
      SELECT
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'paid') / NULLIF(COUNT(*), 0), 1) as paid_pct,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'partial_payment') / NULLIF(COUNT(*), 0), 1) as partial_pct,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'active') / NULLIF(COUNT(*), 0), 1) as unpaid_pct,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'overdue') / NULLIF(COUNT(*), 0), 1) as overdue_pct
      FROM silverman.invoice
      ${whereClause}
    `, params),

    // Monthly trend - billed by issued_date, paid by paid_date
    // Now uses month range instead of year
    (async () => {
      // Generate list of months in range
      const months = [];
      const [startYear, startMon] = startMonthFilter.split('-').map(Number);
      const [endYear, endMon] = endMonthFilter.split('-').map(Number);
      let currentDate = new Date(startYear, startMon - 1, 1);
      const endDate = new Date(endYear, endMon - 1, 1);

      while (currentDate <= endDate) {
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        months.push(monthKey);
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // Query 1: Billed amounts grouped by month (exclude void)
      const billedConditions = ["status != 'void'"];
      const billedParams = [];
      let billedParamIndex = 1;

      // Month range filter
      billedConditions.push(`TO_CHAR(DATE_TRUNC('month', issued_date), 'YYYY-MM') >= $${billedParamIndex}`);
      billedParams.push(startMonthFilter);
      billedParamIndex++;
      billedConditions.push(`TO_CHAR(DATE_TRUNC('month', issued_date), 'YYYY-MM') <= $${billedParamIndex}`);
      billedParams.push(endMonthFilter);
      billedParamIndex++;

      if (site_id) {
        billedConditions.push(`site_id = $${billedParamIndex}`);
        billedParams.push(site_id);
        billedParamIndex++;
      }
      if (period) {
        billedConditions.push(`TO_CHAR(DATE_TRUNC('month', issued_date), 'YYYY-MM') = $${billedParamIndex}`);
        billedParams.push(period);
        billedParamIndex++;
      }
      if (status && status !== 'all') {
        billedConditions.push(`status = $${billedParamIndex}`);
        billedParams.push(status);
        billedParamIndex++;
      }
      if (pay_group) {
        billedConditions.push(`pay_group = $${billedParamIndex}`);
        billedParams.push(pay_group);
        billedParamIndex++;
      }
      if (projectTypeCondition) {
        billedConditions.push(projectTypeCondition);
      }
      if (expense_type) {
        billedConditions.push(buildExpenseTypeCondition(expense_type));
      }

      const billedWhereClause = `WHERE ${billedConditions.join(' AND ')}`;

      const billedResult = await silvermanPool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', issued_date), 'YYYY-MM') as month_key,
          COALESCE(SUM(total), 0) as billed_raw
        FROM silverman.invoice
        ${billedWhereClause}
        GROUP BY DATE_TRUNC('month', issued_date)
        ORDER BY DATE_TRUNC('month', issued_date)
      `, billedParams);

      // Query 2: Paid amounts grouped by paid_date (only paid invoices with paid_date)
      const paidConditions = ['status = \'paid\'', 'paid_date IS NOT NULL'];
      const paidParams = [];
      let paidParamIndex = 1;

      // Month range filter
      paidConditions.push(`TO_CHAR(DATE_TRUNC('month', paid_date), 'YYYY-MM') >= $${paidParamIndex}`);
      paidParams.push(startMonthFilter);
      paidParamIndex++;
      paidConditions.push(`TO_CHAR(DATE_TRUNC('month', paid_date), 'YYYY-MM') <= $${paidParamIndex}`);
      paidParams.push(endMonthFilter);
      paidParamIndex++;

      if (site_id) {
        paidConditions.push(`site_id = $${paidParamIndex}`);
        paidParams.push(site_id);
        paidParamIndex++;
      }
      if (period) {
        paidConditions.push(`TO_CHAR(DATE_TRUNC('month', paid_date), 'YYYY-MM') = $${paidParamIndex}`);
        paidParams.push(period);
        paidParamIndex++;
      }
      if (pay_group) {
        paidConditions.push(`pay_group = $${paidParamIndex}`);
        paidParams.push(pay_group);
        paidParamIndex++;
      }
      if (projectTypeCondition) {
        paidConditions.push(projectTypeCondition);
      }
      if (expense_type) {
        paidConditions.push(buildExpenseTypeCondition(expense_type));
      }

      const paidWhereClause = paidConditions.length > 0 ? `WHERE ${paidConditions.join(' AND ')}` : '';

      const paidResult = await silvermanPool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', paid_date), 'YYYY-MM') as month_key,
          COALESCE(SUM(total), 0) as paid_raw
        FROM silverman.invoice
        ${paidWhereClause}
        GROUP BY DATE_TRUNC('month', paid_date)
        ORDER BY DATE_TRUNC('month', paid_date)
      `, paidParams);

      // Query 3: Outstanding - ยอดค้างชำระรายเดือน (ใช้ month range)
      const outstandingConditions = ['status = \'overdue\'', 'due_date IS NOT NULL'];
      const outstandingParams = [];
      let outstandingParamIndex = 1;

      // Filter by month range
      outstandingConditions.push(`TO_CHAR(DATE_TRUNC('month', due_date), 'YYYY-MM') >= $${outstandingParamIndex}`);
      outstandingParams.push(startMonthFilter);
      outstandingParamIndex++;
      outstandingConditions.push(`TO_CHAR(DATE_TRUNC('month', due_date), 'YYYY-MM') <= $${outstandingParamIndex}`);
      outstandingParams.push(endMonthFilter);
      outstandingParamIndex++;

      if (site_id) {
        outstandingConditions.push(`site_id = $${outstandingParamIndex}`);
        outstandingParams.push(site_id);
        outstandingParamIndex++;
      }
      if (pay_group) {
        outstandingConditions.push(`pay_group = $${outstandingParamIndex}`);
        outstandingParams.push(pay_group);
        outstandingParamIndex++;
      }
      if (projectTypeCondition) {
        outstandingConditions.push(projectTypeCondition);
      }
      if (expense_type) {
        outstandingConditions.push(buildExpenseTypeCondition(expense_type));
      }

      const outstandingWhereClause = `WHERE ${outstandingConditions.join(' AND ')}`;

      // Query ยอดรายเดือน (grouped by month_key)
      const monthlyOutstandingResult = await silvermanPool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', due_date), 'YYYY-MM') as month_key,
          COALESCE(SUM(total), 0) as outstanding_raw
        FROM silverman.invoice
        ${outstandingWhereClause}
        GROUP BY DATE_TRUNC('month', due_date)
        ORDER BY DATE_TRUNC('month', due_date)
      `, outstandingParams);

      const monthlyOutstandingMap = new Map(
        monthlyOutstandingResult.rows.map(r => [r.month_key, parseFloat(r.outstanding_raw)])
      );

      // Query ยอดสะสม - ใช้ single query แทน loop (เร็วกว่ามาก)
      // ดึงยอดรวมทั้งหมดและยอดรายเดือน แล้วคำนวณสะสมใน JavaScript
      const cumConditions = ['status = \'overdue\'', 'due_date IS NOT NULL'];
      const cumParams = [];
      let cumParamIndex = 1;

      if (site_id) {
        cumConditions.push(`site_id = $${cumParamIndex}`);
        cumParams.push(site_id);
        cumParamIndex++;
      }
      if (pay_group) {
        cumConditions.push(`pay_group = $${cumParamIndex}`);
        cumParams.push(pay_group);
        cumParamIndex++;
      }
      if (projectTypeCondition) {
        cumConditions.push(projectTypeCondition);
      }
      if (expense_type) {
        cumConditions.push(buildExpenseTypeCondition(expense_type));
      }

      const cumWhereClause = `WHERE ${cumConditions.join(' AND ')}`;

      // Single query: get overdue by month (all history up to endMonth)
      const lastMonth = months[months.length - 1];
      const [lastYear, lastMon] = lastMonth.split('-').map(Number);
      const endOfLastMonth = new Date(lastYear, lastMon, 0);
      const endDateStr = endOfLastMonth.toISOString().split('T')[0];

      const cumMonthlyResult = await silvermanPool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', due_date), 'YYYY-MM') as month_key,
          COALESCE(SUM(total), 0) as amount
        FROM silverman.invoice
        ${cumWhereClause} AND due_date <= $${cumParamIndex}
        GROUP BY DATE_TRUNC('month', due_date)
        ORDER BY DATE_TRUNC('month', due_date)
      `, [...cumParams, endDateStr]);

      // Build cumulative map by summing up to each month
      const cumMonthlyMap = new Map(cumMonthlyResult.rows.map(r => [r.month_key, parseFloat(r.amount)]));
      const cumOutstandingMap = new Map();
      let runningTotal = 0;

      // Get all months up to endMonth (sorted)
      const allMonthKeys = Array.from(cumMonthlyMap.keys()).sort();
      for (const mk of allMonthKeys) {
        runningTotal += (cumMonthlyMap.get(mk) || 0);
      }

      // For each display month, we need cumulative up to that month
      // Since we already have total, calculate backwards or use a simpler approach
      // Actually, for the chart we need cumulative at each point
      let cumTotal = 0;
      const sortedAllMonths = allMonthKeys;
      const cumByMonth = new Map();
      for (const mk of sortedAllMonths) {
        cumTotal += (cumMonthlyMap.get(mk) || 0);
        cumByMonth.set(mk, cumTotal);
      }

      // Now for each display month, find the cumulative value
      for (const monthKey of months) {
        // Find the last month <= monthKey that has data
        let cumValue = 0;
        for (const mk of sortedAllMonths) {
          if (mk <= monthKey) {
            cumValue = cumByMonth.get(mk) || 0;
          } else {
            break;
          }
        }
        cumOutstandingMap.set(monthKey, cumValue);
      }

      // Create maps for each metric (keyed by month_key: YYYY-MM)
      const billedMap = new Map(billedResult.rows.map(r => [r.month_key, parseFloat(r.billed_raw)]));
      const paidMap = new Map(paidResult.rows.map(r => [r.month_key, parseFloat(r.paid_raw)]));

      // Always use raw baht values (no scaling)
      const unit = 'บาท';

      // Thai month names for display
      const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

      // คำนวณยอดสะสมเฉพาะ range ที่เลือก (running sum ของ monthly outstanding)
      let cumOutstandingRange = 0;
      const cumOutstandingRangeMap = new Map();
      for (const monthKey of months) {
        cumOutstandingRange += (monthlyOutstandingMap.get(monthKey) || 0);
        cumOutstandingRangeMap.set(monthKey, cumOutstandingRange);
      }

      return {
        data: months.map((monthKey) => {
          const [year, mon] = monthKey.split('-').map(Number);
          const monthName = `${thaiMonths[mon - 1]} ${year}`; // Thai month + CE year (e.g. ม.ค. 2025)
          return {
            month: monthName,
            month_key: monthKey,
            billed: Math.round(billedMap.get(monthKey) || 0),
            paid: Math.round(paidMap.get(monthKey) || 0),
            outstanding: Math.round(monthlyOutstandingMap.get(monthKey) || 0), // ยอดรายเดือน
            cumOutstanding: Math.round(cumOutstandingMap.get(monthKey) || 0), // ยอดสะสมทุกปี
            cumOutstandingYear: Math.round(cumOutstandingRangeMap.get(monthKey) || 0), // ยอดสะสมใน range
          };
        }),
        selectedYear: parseInt(targetYear),
        unit: unit,
      };
    })(),

    // High risk units (top outstanding) - filtered by year
    silvermanPool.query(`
      SELECT
        name as unit,
        CONCAT(first_name, ' ', last_name) as owner,
        SUM(total) as amount,
        MAX(CURRENT_DATE - due_date) as days_overdue
      FROM silverman.invoice
      ${whereClause} AND status IN ('overdue', 'active') AND due_date < CURRENT_DATE
      GROUP BY name, first_name, last_name
      ORDER BY SUM(total) DESC
      LIMIT 5
    `, params),

    // Available years (no year filter for this one)
    silvermanPool.query(`
      SELECT DISTINCT EXTRACT(YEAR FROM issued_date)::int as year
      FROM silverman.invoice
      WHERE issued_date >= '2020-01-01' ${site_id ? 'AND site_id = $1' : ''}
      ORDER BY year DESC
    `, site_id ? [site_id] : []),
  ]);

  const kpi = kpiStats.rows[0];
  const totalInvoices = parseInt(kpi.total_invoices || 0);

  // Format amounts with comma separators (full baht, no K/M)
  const formatAmount = (amount) => {
    const num = parseFloat(amount || 0);
    return `฿${Math.round(num).toLocaleString('en-US')}`;
  };

  res.json({
    kpis: {
      totalBilled: {
        value: formatAmount(kpi.total_billed),
        rawValue: parseFloat(kpi.total_billed || 0),
        change: '+0%',
        changeType: 'positive',
      },
      totalPaid: {
        value: formatAmount(kpi.total_paid),
        rawValue: parseFloat(kpi.total_paid || 0),
        change: '+0%',
        changeType: 'positive',
      },
      totalOutstanding: {
        value: formatAmount(kpi.total_outstanding),
        rawValue: parseFloat(kpi.total_outstanding || 0),
        change: '+0%',
        changeType: 'negative',
      },
      outstandingUnits: {
        value: parseInt(kpi.unpaid_count || 0) + parseInt(kpi.overdue_count || 0),
        change: '0',
        changeType: 'positive',
      },
    },
    statusDistribution: {
      paid: parseFloat(statusDistribution.rows[0]?.paid_pct || 0),
      partial: parseFloat(statusDistribution.rows[0]?.partial_pct || 0),
      unpaid: parseFloat(statusDistribution.rows[0]?.unpaid_pct || 0),
      overdue: parseFloat(statusDistribution.rows[0]?.overdue_pct || 0),
    },
    trend: (() => {
      // monthlyTrend returns { data, selectedYear }
      const trendData = monthlyTrend.data || [];
      let cumBilled = 0, cumPaid = 0;
      return trendData.map(row => {
        const billed = parseFloat(row.billed || 0);
        const paid = parseFloat(row.paid || 0);
        const outstanding = parseFloat(row.outstanding || 0); // ยอดรายเดือน
        const cumOutstanding = parseFloat(row.cumOutstanding || 0); // ยอดสะสมทุกปี (by due_date)
        const cumOutstandingYear = parseFloat(row.cumOutstandingYear || 0); // ยอดสะสมเฉพาะปีนี้
        cumBilled += billed;
        cumPaid += paid;
        return {
          month: row.month,
          monthKey: row.month_key,
          billed,
          paid,
          outstanding, // ยอดค้างชำระรายเดือน
          cumBilled: Math.round(cumBilled * 100) / 100,
          cumPaid: Math.round(cumPaid * 100) / 100,
          cumOutstanding: Math.round(cumOutstanding * 100) / 100, // ยอดค้างชำระสะสมทุกปี
          cumOutstandingYear: Math.round(cumOutstandingYear * 100) / 100, // ยอดค้างชำระสะสมเฉพาะปีนี้
        };
      });
    })(),
    selectedYear: monthlyTrend.selectedYear,
    trendUnit: monthlyTrend.unit || 'M',
    highRiskUnits: highRiskUnits.rows.map(row => ({
      unit: row.unit || 'N/A',
      owner: row.owner || 'N/A',
      project: '',
      amount: parseFloat(row.amount || 0),
      daysOverdue: parseInt(row.days_overdue || 0),
    })),
    syncInfo: {
      lastSyncAt: new Date().toISOString(),
      totalUnits: parseInt(unitCount.rows[0]?.count || 0),
      totalProjects: parseInt(projectCount.rows[0]?.count || 0),
      status: 'synced',
    },
    availableYears: availableYears.rows.map(r => r.year),
  });
}));

// ===== Collection (Detailed Invoice List with Summary) =====
router.get('/collection', asyncHandler(async (req, res) => {
  const { site_id, year, status, search, period, pay_group, project_type, expense_type, limit = 50, offset = 0, sort_by = 'issued_date', sort_order = 'desc' } = req.query;

  // Map sort fields to SQL columns
  const sortFieldMap = {
    doc_number: 'i.doc_number',
    unit: 'i.name',
    owner: "CONCAT(i.first_name, ' ', i.last_name)",
    billed_amount: 'i.total',
    status: 'i.status',
    due_date: 'i.due_date',
    issued_date: 'i.issued_date',
    paid_date: 'i.paid_date',
  };
  const sortColumn = sortFieldMap[sort_by] || 'i.issued_date';
  const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';

  // Build WHERE conditions
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (site_id) {
    conditions.push(`i.site_id = $${paramIndex}`);
    params.push(site_id);
    paramIndex++;
  }

  // Year filter
  if (year) {
    conditions.push(`EXTRACT(YEAR FROM i.issued_date) = $${paramIndex}`);
    params.push(year);
    paramIndex++;
  }

  if (status && status !== 'all') {
    conditions.push(`i.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (period) {
    // period format: YYYY-MM
    conditions.push(`TO_CHAR(i.issued_date, 'YYYY-MM') = $${paramIndex}`);
    params.push(period);
    paramIndex++;
  }

  // Pay group filter
  if (pay_group) {
    conditions.push(`i.pay_group = $${paramIndex}`);
    params.push(pay_group);
    paramIndex++;
  }

  // Project type filter (condo vs lowrise)
  if (project_type === 'condo') {
    conditions.push("i.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')");
  } else if (project_type === 'lowrise') {
    conditions.push("i.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')");
  }

  // Expense type filter
  if (expense_type) {
    conditions.push(buildExpenseTypeCondition(expense_type, 'i'));
  }

  if (search) {
    conditions.push(`(
      i.name ILIKE $${paramIndex} OR
      i.doc_number ILIKE $${paramIndex} OR
      i.first_name ILIKE $${paramIndex} OR
      i.last_name ILIKE $${paramIndex}
    )`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Build overdue filter conditions (shared by cumulative, yearly, total queries)
  const overdueBaseConditions = ['status = \'overdue\''];
  const overdueBaseParams = [];
  let overdueParamIndex = 1;
  if (site_id) {
    overdueBaseConditions.push(`site_id = $${overdueParamIndex}`);
    overdueBaseParams.push(site_id);
    overdueParamIndex++;
  }
  if (pay_group) {
    overdueBaseConditions.push(`pay_group = $${overdueParamIndex}`);
    overdueBaseParams.push(pay_group);
    overdueParamIndex++;
  }
  // Project type filter for overdue queries
  if (project_type === 'condo') {
    overdueBaseConditions.push("site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')");
  } else if (project_type === 'lowrise') {
    overdueBaseConditions.push("site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')");
  }
  if (expense_type) {
    overdueBaseConditions.push(buildExpenseTypeCondition(expense_type));
  }

  // Add pagination params for data query
  const dataParams = [...params];
  dataParams.push(parseInt(limit));
  dataParams.push(parseInt(offset));

  // Run ALL queries in parallel for better performance
  const [cumulativeOverdueResult, yearlyOverdueResult, totalOverdueResult, summaryResult, dataResult] = await Promise.all([
    // 1. Cumulative overdue (years before selected year)
    silvermanPool.query(`
      SELECT
        COALESCE(SUM(total), 0) as cumulative_overdue,
        COUNT(*) as cumulative_overdue_count,
        COUNT(DISTINCT name) as cumulative_overdue_unit_count
      FROM silverman.invoice
      WHERE ${overdueBaseConditions.join(' AND ')}${year ? ` AND EXTRACT(YEAR FROM due_date) < $${overdueParamIndex}` : ''}
    `, year ? [...overdueBaseParams, year] : overdueBaseParams),

    // 2. Yearly overdue (selected year only)
    silvermanPool.query(`
      SELECT
        COALESCE(SUM(total), 0) as yearly_overdue,
        COUNT(*) as yearly_overdue_count,
        COUNT(DISTINCT name) as yearly_overdue_unit_count
      FROM silverman.invoice
      WHERE ${overdueBaseConditions.join(' AND ')}${year ? ` AND EXTRACT(YEAR FROM due_date) = $${overdueParamIndex}` : ''}
    `, year ? [...overdueBaseParams, year] : overdueBaseParams),

    // 3. Total overdue (all years <= selected)
    silvermanPool.query(`
      SELECT
        COALESCE(SUM(total), 0) as total_overdue,
        COUNT(*) as total_overdue_count,
        COUNT(DISTINCT name) as total_overdue_unit_count
      FROM silverman.invoice
      WHERE ${overdueBaseConditions.join(' AND ')}${year ? ` AND EXTRACT(YEAR FROM due_date) <= $${overdueParamIndex}` : ''}
    `, year ? [...overdueBaseParams, year] : overdueBaseParams),

    // 4. Summary statistics
    silvermanPool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(DISTINCT name) as total_unit_count,
        COALESCE(SUM(total), 0) as total_amount,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        COUNT(DISTINCT name) FILTER (WHERE status = 'paid') as paid_unit_count,
        COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) as paid_amount,
        COUNT(*) FILTER (WHERE status = 'partial_payment') as partial_count,
        COUNT(DISTINCT name) FILTER (WHERE status = 'partial_payment') as partial_unit_count,
        COALESCE(SUM(total) FILTER (WHERE status = 'partial_payment'), 0) as partial_amount,
        COUNT(*) FILTER (WHERE status = 'active') as active_count,
        COUNT(DISTINCT name) FILTER (WHERE status = 'active') as active_unit_count,
        COALESCE(SUM(total) FILTER (WHERE status = 'active'), 0) as active_amount,
        COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
        COUNT(DISTINCT name) FILTER (WHERE status = 'overdue') as overdue_unit_count,
        COALESCE(SUM(total) FILTER (WHERE status = 'overdue'), 0) as overdue_amount,
        COUNT(*) FILTER (WHERE status = 'void') as void_count,
        COUNT(DISTINCT name) FILTER (WHERE status = 'void') as void_unit_count,
        COALESCE(SUM(total) FILTER (WHERE status = 'void'), 0) as void_amount,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
        COUNT(DISTINCT name) FILTER (WHERE status = 'draft') as draft_unit_count,
        COALESCE(SUM(total) FILTER (WHERE status = 'draft'), 0) as draft_amount
      FROM silverman.invoice i
      ${whereClause}
    `, params.slice(0, paramIndex - 1)),

    // 5. Paginated data
    silvermanPool.query(`
      SELECT
        i.id,
        i.doc_number,
        i.name as unit,
        CONCAT(i.first_name, ' ', i.last_name) as owner,
        i.total as billed_amount,
        i.status,
        i.due_date,
        i.issued_date,
        i.paid_date,
        i.site_id,
        s.name as site_name,
        i.pay_group,
        i.remark,
        i.void_remark,
        i.added,
        i.updated
      FROM silverman.invoice i
      LEFT JOIN silverman.site s ON s.id = i.site_id
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection} NULLS LAST, i.added DESC NULLS LAST
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, dataParams),
  ]);

  const summary = summaryResult.rows[0];
  const cumulativeOverdue = cumulativeOverdueResult.rows[0];
  const yearlyOverdue = yearlyOverdueResult.rows[0];
  const totalOverdue = totalOverdueResult.rows[0];

  res.json({
    data: dataResult.rows,
    summary: {
      total: parseInt(summary.total || 0),
      totalUnitCount: parseInt(summary.total_unit_count || 0),
      totalAmount: parseFloat(summary.total_amount || 0),
      paid: {
        count: parseInt(summary.paid_count || 0),
        unitCount: parseInt(summary.paid_unit_count || 0),
        amount: parseFloat(summary.paid_amount || 0),
      },
      partial: {
        count: parseInt(summary.partial_count || 0),
        unitCount: parseInt(summary.partial_unit_count || 0),
        amount: parseFloat(summary.partial_amount || 0),
      },
      active: {
        count: parseInt(summary.active_count || 0),
        unitCount: parseInt(summary.active_unit_count || 0),
        amount: parseFloat(summary.active_amount || 0),
      },
      overdue: {
        // count/amount = invoices with status='overdue' in the filtered year (original logic)
        count: parseInt(summary.overdue_count || 0),
        unitCount: parseInt(summary.overdue_unit_count || 0),
        // ค้างรายปี = issued this year + past due date + not paid
        amount: parseFloat(yearlyOverdue.yearly_overdue || 0),
        yearlyCount: parseInt(yearlyOverdue.yearly_overdue_count || 0),
        yearlyUnitCount: parseInt(yearlyOverdue.yearly_overdue_unit_count || 0),
        // สะสม = all past due date regardless of issue year
        cumulativeAmount: parseFloat(cumulativeOverdue.cumulative_overdue || 0),
        cumulativeCount: parseInt(cumulativeOverdue.cumulative_overdue_count || 0),
        cumulativeUnitCount: parseInt(cumulativeOverdue.cumulative_overdue_unit_count || 0),
        // Total distinct units (ไม่แยกปี - นับ unit ที่ค้างทั้งหมดไม่ซ้ำ)
        totalUnitCount: parseInt(totalOverdue.total_overdue_unit_count || 0),
      },
      void: {
        count: parseInt(summary.void_count || 0),
        unitCount: parseInt(summary.void_unit_count || 0),
        amount: parseFloat(summary.void_amount || 0),
      },
      draft: {
        count: parseInt(summary.draft_count || 0),
        unitCount: parseInt(summary.draft_unit_count || 0),
        amount: parseFloat(summary.draft_amount || 0),
      },
    },
    pagination: {
      page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
      pageSize: parseInt(limit),
      totalPages: Math.ceil(parseInt(summary.total) / parseInt(limit)),
      totalItems: parseInt(summary.total || 0),
    },
  });
}));

// ===== Invoice Line Items =====
router.get('/invoice/:id/items', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Query from transaction table (actual line items)
  const result = await silvermanPool.query(`
    SELECT
      id,
      description,
      unit_items,
      price,
      discount,
      vat,
      total,
      paid,
      status,
      added
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

  // Calculate totals
  const invoiceTotal = items.reduce((sum, item) => sum + item.total, 0);
  const invoicePaid = items.reduce((sum, item) => sum + item.paid, 0);

  res.json({
    invoiceTotal,
    invoicePaid,
    invoiceRemaining: invoiceTotal - invoicePaid,
    items,
  });
}));

// ===== Expense Summary by Type =====
// Expense type mapping
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

// Build SQL condition to filter invoices by expense type (keyword match on transaction text)
function buildExpenseTypeCondition(expenseTypeId, tableAlias = '') {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  // Use materialized view for fast lookup (indexed by expense_type + invoice_id)
  return `${prefix}id IN (SELECT invoice_id FROM silverman.invoice_expense_type WHERE expense_type = '${expenseTypeId}')`;
}

function categorizeExpense(description) {
  for (const type of EXPENSE_TYPES) {
    // Check exclude first
    if (type.exclude.some(ex => description.includes(ex))) continue;
    // Check keywords
    if (type.keywords.length === 0) continue; // Skip 'other' in loop
    if (type.keywords.some(kw => description.includes(kw))) {
      return type;
    }
  }
  return EXPENSE_TYPES.find(t => t.id === 'other');
}

router.get('/expense-summary', asyncHandler(async (req, res) => {
  const { site_id, year, status } = req.query;

  // Build WHERE clause
  const conditions = ["transaction IS NOT NULL", "transaction != '{''transaction'': []}'"];
  const params = [];
  let paramIndex = 1;

  if (site_id) {
    conditions.push(`site_id = $${paramIndex}`);
    params.push(site_id);
    paramIndex++;
  }
  if (year) {
    conditions.push(`EXTRACT(YEAR FROM issued_date) = $${paramIndex}`);
    params.push(year);
    paramIndex++;
  }
  if (status) {
    conditions.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Query invoice_data with transaction JSON
  const result = await silvermanPool.query(`
    SELECT transaction, total as invoice_total, status
    FROM silverman.invoice_data
    ${whereClause}
  `, params);

  // Parse and categorize
  const summary = {};
  EXPENSE_TYPES.forEach(type => {
    summary[type.id] = { id: type.id, name: type.name, count: 0, amount: 0 };
  });

  for (const row of result.rows) {
    try {
      // Convert Python-style dict to JSON
      const jsonStr = row.transaction
        .replace(/'/g, '"')
        .replace(/None/g, 'null')
        .replace(/True/g, 'true')
        .replace(/False/g, 'false');
      const data = JSON.parse(jsonStr);

      if (data.transaction && Array.isArray(data.transaction)) {
        for (const txn of data.transaction) {
          if (txn.description) {
            const desc = txn.description.split('(')[0].trim();
            const type = categorizeExpense(desc);
            summary[type.id].count++;
            summary[type.id].amount += parseFloat(txn.total) || 0;
          }
        }
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }

  // Convert to array and sort by amount desc
  const summaryArray = Object.values(summary)
    .filter(item => item.count > 0)
    .sort((a, b) => b.amount - a.amount);

  res.json({
    data: summaryArray,
    totalInvoices: result.rows.length,
    filters: { site_id, year, status },
  });
}));

// ===== Aging Report - Invoice Level =====
router.get('/aging', asyncHandler(async (req, res) => {
  const { site_id, year, bucket, search, limit = 50, offset = 0, sort_by = 'daysOverdue', sort_order = 'desc', pay_group, project_type, expense_type } = req.query;

  // Map sort fields to SQL columns
  const sortFieldMap = {
    docNumber: 'i.doc_number',
    unit: 'i.name',
    owner: "CONCAT(i.first_name, ' ', i.last_name)",
    project: "COALESCE(p.name_en, INITCAP(REPLACE(SPLIT_PART(s.name, '.', 1), '-', ' ')))",
    amount: 'i.total',
    dueDate: 'i.due_date',
    daysOverdue: '(CURRENT_DATE - i.due_date::date)',
  };
  const sortColumn = sortFieldMap[sort_by] || '(CURRENT_DATE - i.due_date::date)';
  const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';

  // Build WHERE clause for overdue invoices
  const conditions = [
    "i.status IN ('overdue', 'active')",
    "i.due_date < CURRENT_DATE"
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
  // Project type filter (condo vs lowrise)
  if (project_type === 'condo') {
    conditions.push("i.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')");
  } else if (project_type === 'lowrise') {
    conditions.push("i.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')");
  }
  if (expense_type) {
    conditions.push(buildExpenseTypeCondition(expense_type, 'i'));
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Get summary (all buckets) - always show TOTAL overdue (no year filter)
  // This matches Overview page which shows total overdue (yearly + cumulative)
  const summaryParams = [];
  let summaryParamIndex = 1;
  const summaryConditions = [
    "status IN ('overdue', 'active')",
    "due_date < CURRENT_DATE"
  ];
  if (site_id) {
    summaryConditions.push(`site_id = $${summaryParamIndex}`);
    summaryParams.push(site_id);
    summaryParamIndex++;
  }
  if (pay_group) {
    summaryConditions.push(`pay_group = $${summaryParamIndex}`);
    summaryParams.push(pay_group);
    summaryParamIndex++;
  }
  if (year) {
    summaryConditions.push(`EXTRACT(YEAR FROM due_date) <= $${summaryParamIndex}`);
    summaryParams.push(year);
    summaryParamIndex++;
  }
  // Project type filter for summary
  if (project_type === 'condo') {
    summaryConditions.push("site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')");
  } else if (project_type === 'lowrise') {
    summaryConditions.push("site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')");
  }
  if (expense_type) {
    summaryConditions.push(buildExpenseTypeCondition(expense_type));
  }
  // Note: don't include search in summary - we want overall totals

  const summaryWhereClause = `WHERE ${summaryConditions.join(' AND ')}`;
  const summaryQuery = await silvermanPool.query(`
    SELECT
      COUNT(DISTINCT name) as total_count,
      COALESCE(SUM(total), 0) as total_amount,
      COUNT(DISTINCT name) FILTER (WHERE (CURRENT_DATE - due_date::date) BETWEEN 0 AND 30) as bucket_0_30_count,
      COALESCE(SUM(total) FILTER (WHERE (CURRENT_DATE - due_date::date) BETWEEN 0 AND 30), 0) as bucket_0_30_amount,
      COUNT(DISTINCT name) FILTER (WHERE (CURRENT_DATE - due_date::date) BETWEEN 31 AND 60) as bucket_31_60_count,
      COALESCE(SUM(total) FILTER (WHERE (CURRENT_DATE - due_date::date) BETWEEN 31 AND 60), 0) as bucket_31_60_amount,
      COUNT(DISTINCT name) FILTER (WHERE (CURRENT_DATE - due_date::date) BETWEEN 61 AND 90) as bucket_61_90_count,
      COALESCE(SUM(total) FILTER (WHERE (CURRENT_DATE - due_date::date) BETWEEN 61 AND 90), 0) as bucket_61_90_amount,
      COUNT(DISTINCT name) FILTER (WHERE (CURRENT_DATE - due_date::date) BETWEEN 91 AND 180) as bucket_91_180_count,
      COALESCE(SUM(total) FILTER (WHERE (CURRENT_DATE - due_date::date) BETWEEN 91 AND 180), 0) as bucket_91_180_amount,
      COUNT(DISTINCT name) FILTER (WHERE (CURRENT_DATE - due_date::date) BETWEEN 181 AND 360) as bucket_181_360_count,
      COALESCE(SUM(total) FILTER (WHERE (CURRENT_DATE - due_date::date) BETWEEN 181 AND 360), 0) as bucket_181_360_amount,
      COUNT(DISTINCT name) FILTER (WHERE (CURRENT_DATE - due_date::date) > 360) as bucket_360_plus_count,
      COALESCE(SUM(total) FILTER (WHERE (CURRENT_DATE - due_date::date) > 360), 0) as bucket_360_plus_amount
    FROM silverman.invoice
    ${summaryWhereClause}
  `, summaryParams);

  const summary = summaryQuery.rows[0];

  // Get invoices with pagination
  // Build condition for bucket filter if specified
  let invoiceBucketCondition = '';
  if (bucket) {
    switch (bucket) {
      case '0-30':
        invoiceBucketCondition = `AND (CURRENT_DATE - i.due_date::date) BETWEEN 0 AND 30`;
        break;
      case '31-60':
        invoiceBucketCondition = `AND (CURRENT_DATE - i.due_date::date) BETWEEN 31 AND 60`;
        break;
      case '61-90':
        invoiceBucketCondition = `AND (CURRENT_DATE - i.due_date::date) BETWEEN 61 AND 90`;
        break;
      case '91-180':
        invoiceBucketCondition = `AND (CURRENT_DATE - i.due_date::date) BETWEEN 91 AND 180`;
        break;
      case '181-360':
        invoiceBucketCondition = `AND (CURRENT_DATE - i.due_date::date) BETWEEN 181 AND 360`;
        break;
      case '360+':
        invoiceBucketCondition = `AND (CURRENT_DATE - i.due_date::date) > 360`;
        break;
    }
  }

  const invoicesQuery = await silvermanPool.query(`
    SELECT
      i.id,
      i.doc_number,
      i.name as unit,
      CONCAT(i.first_name, ' ', i.last_name) as owner,
      s.name as site_domain,
      COALESCE(p.name_en, INITCAP(REPLACE(SPLIT_PART(s.name, '.', 1), '-', ' '))) as project,
      i.site_id,
      i.total as amount,
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
  `, [...params, parseInt(limit), parseInt(offset)]);

  // Get total count for pagination (with all filters including bucket)
  const countQuery = await silvermanPool.query(`
    SELECT COUNT(*) as count
    FROM silverman.invoice i
    ${whereClause}
    ${invoiceBucketCondition}
  `, params);

  res.json({
    summary: {
      total: {
        count: parseInt(summary.total_count) || 0,
        amount: parseFloat(summary.total_amount) || 0,
      },
      buckets: {
        '0-30': {
          count: parseInt(summary.bucket_0_30_count) || 0,
          amount: parseFloat(summary.bucket_0_30_amount) || 0,
        },
        '31-60': {
          count: parseInt(summary.bucket_31_60_count) || 0,
          amount: parseFloat(summary.bucket_31_60_amount) || 0,
        },
        '61-90': {
          count: parseInt(summary.bucket_61_90_count) || 0,
          amount: parseFloat(summary.bucket_61_90_amount) || 0,
        },
        '91-180': {
          count: parseInt(summary.bucket_91_180_count) || 0,
          amount: parseFloat(summary.bucket_91_180_amount) || 0,
        },
        '181-360': {
          count: parseInt(summary.bucket_181_360_count) || 0,
          amount: parseFloat(summary.bucket_181_360_amount) || 0,
        },
        '360+': {
          count: parseInt(summary.bucket_360_plus_count) || 0,
          amount: parseFloat(summary.bucket_360_plus_amount) || 0,
        },
      },
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

// ===== Invoice Status Summary (Direct from invoice table) =====
router.get('/invoice-summary', asyncHandler(async (req, res) => {
  const { site_id, year, period, status, pay_group, project_type, expense_type } = req.query;

  // Use year filter (default to current year)
  const targetYear = year || new Date().getFullYear().toString();

  // Build WHERE clause
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  // Year filter
  conditions.push(`EXTRACT(YEAR FROM issued_date) = $${paramIndex}`);
  params.push(targetYear);
  paramIndex++;

  if (site_id) {
    conditions.push(`site_id = $${paramIndex}`);
    params.push(site_id);
    paramIndex++;
  }

  if (period) {
    conditions.push(`TO_CHAR(DATE_TRUNC('month', issued_date), 'YYYY-MM') = $${paramIndex}`);
    params.push(period);
    paramIndex++;
  }

  if (status && status !== 'all') {
    conditions.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (pay_group) {
    conditions.push(`pay_group = $${paramIndex}`);
    params.push(pay_group);
    paramIndex++;
  }

  // Project type filter (condo vs lowrise)
  if (project_type === 'condo') {
    conditions.push("site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')");
  } else if (project_type === 'lowrise') {
    conditions.push("site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')");
  }
  if (expense_type) {
    conditions.push(buildExpenseTypeCondition(expense_type));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Query summary by status directly from invoice table (exclude void from total)
  const result = await silvermanPool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status != 'void') as total_count,
      COUNT(DISTINCT name) FILTER (WHERE status != 'void') as total_unit_count,
      COALESCE(SUM(total) FILTER (WHERE status != 'void'), 0) as total_amount,

      COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
      COUNT(DISTINCT name) FILTER (WHERE status = 'paid') as paid_unit_count,
      COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) as paid_amount,

      COUNT(*) FILTER (WHERE status = 'partial_payment') as partial_count,
      COUNT(DISTINCT name) FILTER (WHERE status = 'partial_payment') as partial_unit_count,
      COALESCE(SUM(total) FILTER (WHERE status = 'partial_payment'), 0) as partial_amount,

      COUNT(*) FILTER (WHERE status = 'active') as active_count,
      COUNT(DISTINCT name) FILTER (WHERE status = 'active') as active_unit_count,
      COALESCE(SUM(total) FILTER (WHERE status = 'active'), 0) as active_amount,

      COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count,
      COUNT(DISTINCT name) FILTER (WHERE status = 'overdue') as overdue_unit_count,
      COALESCE(SUM(total) FILTER (WHERE status = 'overdue'), 0) as overdue_amount,

      COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
      COUNT(DISTINCT name) FILTER (WHERE status = 'draft') as draft_unit_count,
      COALESCE(SUM(total) FILTER (WHERE status = 'draft'), 0) as draft_amount
    FROM silverman.invoice
    ${whereClause}
  `, params);

  const row = result.rows[0];

  // Query cumulative overdue (years <= selected year)
  const cumConditions = ['status = \'overdue\''];
  const cumParams = [];
  let cumParamIndex = 1;

  // Filter by year <= selected year (due_date based)
  cumConditions.push(`EXTRACT(YEAR FROM due_date) <= $${cumParamIndex}`);
  cumParams.push(targetYear);
  cumParamIndex++;

  if (site_id) {
    cumConditions.push(`site_id = $${cumParamIndex}`);
    cumParams.push(site_id);
    cumParamIndex++;
  }
  if (pay_group) {
    cumConditions.push(`pay_group = $${cumParamIndex}`);
    cumParams.push(pay_group);
    cumParamIndex++;
  }
  // Project type filter for cumulative overdue
  if (project_type === 'condo') {
    cumConditions.push("site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')");
  } else if (project_type === 'lowrise') {
    cumConditions.push("site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium')");
  }
  if (expense_type) {
    cumConditions.push(buildExpenseTypeCondition(expense_type));
  }

  const cumWhereClause = cumConditions.length > 0 ? `WHERE ${cumConditions.join(' AND ')}` : '';

  const cumResult = await silvermanPool.query(`
    SELECT
      COUNT(*) as cum_overdue_count,
      COUNT(DISTINCT name) as cum_overdue_unit_count,
      COALESCE(SUM(total), 0) as cum_overdue_amount
    FROM silverman.invoice
    ${cumWhereClause}
  `, cumParams);

  const cumRow = cumResult.rows[0];

  res.json({
    total: {
      count: parseInt(row.total_count) || 0,
      unitCount: parseInt(row.total_unit_count) || 0,
      amount: parseFloat(row.total_amount) || 0,
    },
    paid: {
      count: parseInt(row.paid_count) || 0,
      unitCount: parseInt(row.paid_unit_count) || 0,
      amount: parseFloat(row.paid_amount) || 0,
    },
    partial: {
      count: parseInt(row.partial_count) || 0,
      unitCount: parseInt(row.partial_unit_count) || 0,
      amount: parseFloat(row.partial_amount) || 0,
    },
    active: {
      count: parseInt(row.active_count) || 0,
      unitCount: parseInt(row.active_unit_count) || 0,
      amount: parseFloat(row.active_amount) || 0,
    },
    overdue: {
      count: parseInt(row.overdue_count) || 0,
      unitCount: parseInt(row.overdue_unit_count) || 0,
      amount: parseFloat(row.overdue_amount) || 0,
    },
    overdueCumulative: {
      count: parseInt(cumRow.cum_overdue_count) || 0,
      unitCount: parseInt(cumRow.cum_overdue_unit_count) || 0,
      amount: parseFloat(cumRow.cum_overdue_amount) || 0,
    },
    selectedYear: parseInt(targetYear),
    draft: {
      count: parseInt(row.draft_count) || 0,
      unitCount: parseInt(row.draft_unit_count) || 0,
      amount: parseFloat(row.draft_amount) || 0,
    },
  });
}));

// Collection summary by project (for comparison chart)
router.get('/collection-by-project', asyncHandler(async (req, res) => {
  const { year, pay_group, project_type, site_id, expense_type } = req.query;

  // Use year filter (default to current year)
  const targetYear = parseInt(year) || new Date().getFullYear();

  // Calculate years for 3-year historical data (selected year + 2 previous years)
  const years = [targetYear, targetYear - 1, targetYear - 2];

  // Build base conditions (excluding year)
  const baseConditions = [];
  const params = [];
  let paramIndex = 1;

  if (pay_group) {
    baseConditions.push(`i.pay_group = $${paramIndex}`);
    params.push(pay_group);
    paramIndex++;
  }

  // Project type filter (condo vs lowrise) - uses p.type_of_project from JOIN
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
  if (expense_type) {
    baseConditions.push(buildExpenseTypeCondition(expense_type, 'i'));
  }

  // Build WHERE clause for main query (filter by selected year to get project list)
  const mainConditions = [`EXTRACT(YEAR FROM i.issued_date) = $${paramIndex}`, "i.status != 'void'", ...baseConditions];
  params.push(targetYear);
  const whereClause = `WHERE ${mainConditions.join(' AND ')}`;

  // Query collection data grouped by site/project (filtered by selected year)
  const result = await silvermanPool.query(`
    SELECT
      i.site_id,
      COALESCE(p.name_en, INITCAP(REPLACE(SPLIT_PART(s.name, '.', 1), '-', ' '))) as project_name,
      p.type_of_project,
      COUNT(*) as total_count,
      COUNT(DISTINCT i.name) as total_units,
      COALESCE(SUM(i.total), 0) as total_amount,
      COUNT(*) FILTER (WHERE i.status IN ('paid', 'partial_payment')) as paid_count,
      COALESCE(SUM(i.total) FILTER (WHERE i.status IN ('paid', 'partial_payment')), 0) as paid_amount,
      COUNT(*) FILTER (WHERE i.status = 'overdue') as overdue_count,
      COALESCE(SUM(i.total) FILTER (WHERE i.status = 'overdue'), 0) as overdue_amount,
      (SELECT MIN(issued_date) FROM silverman.invoice WHERE site_id = i.site_id AND status != 'void') as first_invoice_date
    FROM silverman.invoice i
    LEFT JOIN silverman.site s ON i.site_id = s.id
    LEFT JOIN silverman.project p ON p.site_id = s.id
    ${whereClause}
    GROUP BY i.site_id, p.name_en, s.name, p.type_of_project
    ORDER BY total_amount DESC
  `, params);

  // Get site IDs for yearly data query
  const siteIds = result.rows.map(r => r.site_id);

  // Build additional conditions for yearly/cumulative queries (must match main query filters)
  const yearlyExtraConds = [];
  if (pay_group) yearlyExtraConds.push(`i.pay_group = '${pay_group.replace(/'/g, "''")}'`);
  if (project_type === 'condo') yearlyExtraConds.push("i.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project = 'condominium')");
  else if (project_type === 'lowrise') yearlyExtraConds.push("(i.site_id IN (SELECT site_id FROM silverman.project WHERE type_of_project IS NULL OR type_of_project != 'condominium'))");
  if (expense_type) yearlyExtraConds.push(buildExpenseTypeCondition(expense_type, 'i'));
  const yearlyExtraWhere = yearlyExtraConds.length > 0 ? ' AND ' + yearlyExtraConds.join(' AND ') : '';

  // Query yearly breakdown for all sites in one query (for all 3 years)
  let yearlyData = {};
  if (siteIds.length > 0) {
    const yearlyResult = await silvermanPool.query(`
      SELECT
        i.site_id,
        EXTRACT(YEAR FROM i.issued_date)::INT as year,
        COALESCE(SUM(i.total) FILTER (WHERE i.status != 'void'), 0) as total_amount,
        COALESCE(SUM(i.total) FILTER (WHERE i.status IN ('paid', 'partial_payment')), 0) as paid_amount,
        COALESCE(SUM(i.total) FILTER (WHERE i.status = 'overdue'), 0) as overdue_amount
      FROM silverman.invoice i
      WHERE i.site_id = ANY($1)
        AND EXTRACT(YEAR FROM i.issued_date) = ANY($2)
        AND i.status != 'void'
        ${yearlyExtraWhere}
      GROUP BY i.site_id, EXTRACT(YEAR FROM i.issued_date)
    `, [siteIds, years]);

    // Organize yearly data by site_id
    yearlyResult.rows.forEach(row => {
      if (!yearlyData[row.site_id]) {
        yearlyData[row.site_id] = {};
      }
      yearlyData[row.site_id][row.year] = {
        totalAmount: parseFloat(row.total_amount) || 0,
        paidAmount: parseFloat(row.paid_amount) || 0,
        overdueAmount: parseFloat(row.overdue_amount) || 0,
      };
    });
  }

  // Query ALL-TIME cumulative totals per site (no year filter)
  let cumulativeData = {};
  if (siteIds.length > 0) {
    const cumResult = await silvermanPool.query(`
      SELECT
        i.site_id,
        COALESCE(SUM(i.total) FILTER (WHERE i.status != 'void'), 0) as total_amount,
        COALESCE(SUM(i.total) FILTER (WHERE i.status IN ('paid', 'partial_payment')), 0) as paid_amount,
        COALESCE(SUM(i.total) FILTER (WHERE i.status = 'overdue' AND EXTRACT(YEAR FROM i.due_date) <= $2), 0) as overdue_amount
      FROM silverman.invoice i
      WHERE i.site_id = ANY($1)
        AND i.status != 'void'
        ${yearlyExtraWhere}
      GROUP BY i.site_id
    `, [siteIds, targetYear]);

    cumResult.rows.forEach(row => {
      cumulativeData[row.site_id] = {
        totalAmount: parseFloat(row.total_amount) || 0,
        paidAmount: parseFloat(row.paid_amount) || 0,
        overdueAmount: parseFloat(row.overdue_amount) || 0,
      };
    });
  }

  const projects = result.rows.map(row => {
    // Calculate project age from first invoice date
    let ageYears = 0;
    let ageMonths = 0;
    if (row.first_invoice_date) {
      const firstDate = new Date(row.first_invoice_date);
      const now = new Date();
      const totalMonths = (now.getFullYear() - firstDate.getFullYear()) * 12 + (now.getMonth() - firstDate.getMonth());
      ageYears = Math.floor(totalMonths / 12);
      ageMonths = totalMonths % 12;
    }

    // Build yearly breakdown
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
      totalAmount: parseFloat(row.total_amount) || 0,
      paidAmount: parseFloat(row.paid_amount) || 0,
      overdueAmount: parseFloat(row.overdue_amount) || 0,
      totalUnits: parseInt(row.total_units) || 0,
      collectionRate: row.total_amount > 0
        ? Math.round((parseFloat(row.paid_amount) / parseFloat(row.total_amount)) * 100)
        : 0,
      ageYears,
      ageMonths,
      firstInvoiceDate: row.first_invoice_date,
      yearlyBreakdown,
      cumulative: cumulativeData[row.site_id] || { totalAmount: 0, paidAmount: 0, overdueAmount: 0 },
    };
  });

  res.json({
    year: targetYear,
    years,
    projects,
  });
}));

export default router;
