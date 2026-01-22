/**
 * Common Fee API Routes
 * Database: postgres, Schema: silverman
 */
import { Router } from 'express';
import { silvermanPool } from '../db/index.mjs';
import { asyncHandler } from '../utils/helpers.mjs';

const router = Router();

// ===== Filter Options =====
router.get('/filters', asyncHandler(async (req, res) => {
  const [sites, projects, statuses, periods] = await Promise.all([
    // Sites with invoice count - use project.name_en for English name
    silvermanPool.query(`
      SELECT
        s.id,
        s.name as domain,
        COALESCE(p.name_en, INITCAP(REPLACE(SPLIT_PART(s.name, '.', 1), '-', ' '))) as display_name,
        COUNT(DISTINCT i.id) as invoice_count
      FROM silverman.site s
      LEFT JOIN silverman.project p ON p.site_id = s.id
      LEFT JOIN silverman.invoice i ON i.site_id = s.id
      GROUP BY s.id, s.name, p.name_en
      HAVING COUNT(DISTINCT i.id) > 0
      ORDER BY COUNT(DISTINCT i.id) DESC
    `),
    // Projects
    silvermanPool.query(`
      SELECT id, name FROM silverman.project WHERE name IS NOT NULL ORDER BY name
    `),
    // Available statuses with counts
    silvermanPool.query(`
      SELECT status, COUNT(*) as count
      FROM silverman.invoice
      WHERE status IS NOT NULL
      GROUP BY status
      ORDER BY count DESC
    `),
    // Available periods (months with invoices)
    silvermanPool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', issued_date), 'YYYY-MM') as period,
        TO_CHAR(DATE_TRUNC('month', issued_date), 'Mon YYYY') as display,
        COUNT(*) as invoice_count
      FROM silverman.invoice
      WHERE issued_date IS NOT NULL AND issued_date > '2020-01-01'
      GROUP BY DATE_TRUNC('month', issued_date)
      HAVING COUNT(*) > 100
      ORDER BY DATE_TRUNC('month', issued_date) DESC
      LIMIT 24
    `),
  ]);

  res.json({
    sites: sites.rows,
    projects: projects.rows,
    statuses: statuses.rows,
    periods: periods.rows,
  });
}));

// ===== Periods by Site =====
router.get('/periods', asyncHandler(async (req, res) => {
  const { site_id } = req.query;

  let whereClause = 'WHERE issued_date IS NOT NULL AND issued_date > \'2020-01-01\'';
  const params = [];

  if (site_id) {
    whereClause += ' AND site_id = $1';
    params.push(site_id);
  }

  const result = await silvermanPool.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', issued_date), 'YYYY-MM') as period,
      TO_CHAR(DATE_TRUNC('month', issued_date), 'Mon YYYY') as display,
      COUNT(*) as invoice_count
    FROM silverman.invoice
    ${whereClause}
    GROUP BY DATE_TRUNC('month', issued_date)
    HAVING COUNT(*) > 0
    ORDER BY DATE_TRUNC('month', issued_date) DESC
    LIMIT 36
  `, params);

  res.json(result.rows);
}));

// ===== Available Years =====
router.get('/available-years', asyncHandler(async (req, res) => {
  const result = await silvermanPool.query(`
    SELECT DISTINCT EXTRACT(YEAR FROM issued_date)::INT as year
    FROM silverman.invoice
    WHERE issued_date IS NOT NULL
    ORDER BY year DESC
  `);

  res.json({
    years: result.rows.map(r => r.year),
  });
}));

// ===== Dashboard Overview =====
router.get('/overview', asyncHandler(async (req, res) => {
  const { site_id, year, period, status, pay_group } = req.query;

  // Use provided year or current year as default
  const targetYear = year || new Date().getFullYear().toString();

  // Build filter conditions
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  // Year filter (always applied)
  conditions.push(`EXTRACT(YEAR FROM issued_date) = $${paramIndex}`);
  params.push(targetYear);
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
    (async () => {
      // Query 1: Billed amounts grouped by issued_date
      const billedResult = await silvermanPool.query(`
        SELECT
          EXTRACT(MONTH FROM issued_date) as month_num,
          COALESCE(SUM(total), 0) as billed_raw
        FROM silverman.invoice
        ${whereClause}
        GROUP BY EXTRACT(MONTH FROM issued_date)
      `, params);

      // Query 2: Paid amounts grouped by paid_date (only paid invoices with paid_date)
      // Build whereClause for paid_date year filter
      const paidConditions = ['status = \'paid\'', 'paid_date IS NOT NULL'];
      const paidParams = [];
      let paidParamIndex = 1;

      paidConditions.push(`EXTRACT(YEAR FROM paid_date) = $${paidParamIndex}`);
      paidParams.push(targetYear);
      paidParamIndex++;

      if (site_id) {
        paidConditions.push(`site_id = $${paidParamIndex}`);
        paidParams.push(site_id);
        paidParamIndex++;
      }
      if (pay_group) {
        paidConditions.push(`pay_group = $${paidParamIndex}`);
        paidParams.push(pay_group);
        paidParamIndex++;
      }

      const paidWhereClause = paidConditions.length > 0 ? `WHERE ${paidConditions.join(' AND ')}` : '';

      const paidResult = await silvermanPool.query(`
        SELECT
          EXTRACT(MONTH FROM paid_date) as month_num,
          COALESCE(SUM(total), 0) as paid_raw
        FROM silverman.invoice
        ${paidWhereClause}
        GROUP BY EXTRACT(MONTH FROM paid_date)
      `, paidParams);

      // Query 3: Outstanding - ยอดค้างชำระ group by month,year
      // เอายอดค้างแต่ละเดือน+ปี แล้วคำนวณ running sum
      const outstandingConditions = ['status = \'overdue\'', 'due_date IS NOT NULL'];
      const outstandingParams = [];
      let outstandingParamIndex = 1;

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

      const outstandingWhereClause = `WHERE ${outstandingConditions.join(' AND ')}`;
      const outstandingResult = await silvermanPool.query(`
        SELECT
          EXTRACT(MONTH FROM due_date)::int as month_num,
          EXTRACT(YEAR FROM due_date)::int as year_num,
          COALESCE(SUM(total), 0) as outstanding_raw
        FROM silverman.invoice
        ${outstandingWhereClause}
        GROUP BY EXTRACT(MONTH FROM due_date), EXTRACT(YEAR FROM due_date)
        ORDER BY year_num, month_num
      `, outstandingParams);

      // สร้าง running sum ของยอดค้าง เรียงตาม year,month
      const outstandingData = outstandingResult.rows;
      const cumulativeByYearMonth = new Map();
      let runningSum = 0;

      for (const row of outstandingData) {
        runningSum += parseFloat(row.outstanding_raw || 0);
        const key = `${row.year_num}-${String(row.month_num).padStart(2, '0')}`;
        cumulativeByYearMonth.set(key, runningSum);
      }

      // หา cumulative outstanding สำหรับแต่ละเดือนของปีที่เลือก
      const outstandingByMonth = [];
      for (let monthNum = 1; monthNum <= 12; monthNum++) {
        const targetKey = `${targetYear}-${String(monthNum).padStart(2, '0')}`;

        // หาค่าสะสมที่ <= targetKey
        let cumValue = 0;
        for (const [key, value] of cumulativeByYearMonth.entries()) {
          if (key <= targetKey) {
            cumValue = value;
          }
        }

        outstandingByMonth.push({
          month_num: monthNum,
          outstanding_raw: cumValue
        });
      }

      // Create maps for each metric
      const billedMap = new Map(billedResult.rows.map(r => [parseInt(r.month_num), parseFloat(r.billed_raw)]));
      const paidMap = new Map(paidResult.rows.map(r => [parseInt(r.month_num), parseFloat(r.paid_raw)]));
      const outstandingMap = new Map(outstandingByMonth.map(r => [r.month_num, r.outstanding_raw]));

      // Always use raw baht values (no scaling)
      const unit = 'บาท';

      // Generate all 12 months with raw values
      const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      return {
        data: monthNames.map((name, idx) => {
          const monthNum = idx + 1;
          return {
            month: name,
            month_key: `${targetYear}-${String(monthNum).padStart(2, '0')}`,
            billed: Math.round(billedMap.get(monthNum) || 0),
            paid: Math.round(paidMap.get(monthNum) || 0),
            outstanding: Math.round(outstandingMap.get(monthNum) || 0),
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
        // outstanding จาก query คือยอดสะสมถึงเดือนนั้นแล้ว (due_date <= สิ้นเดือน)
        const outstanding = parseFloat(row.outstanding || 0);
        cumBilled += billed;
        cumPaid += paid;
        return {
          month: row.month,
          monthKey: row.month_key,
          billed,
          paid,
          outstanding,
          cumBilled: Math.round(cumBilled * 100) / 100,
          cumPaid: Math.round(cumPaid * 100) / 100,
          // outstanding คือยอดสะสมอยู่แล้ว ใช้ค่าตรงๆ
          cumOutstanding: Math.round(outstanding * 100) / 100,
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

// ===== Sites List =====
router.get('/sites', asyncHandler(async (req, res) => {
  const result = await silvermanPool.query(`
    SELECT
      s.id,
      s.name,
      COUNT(DISTINCT t.id) as tenant_count,
      COUNT(DISTINCT i.id) as invoice_count
    FROM silverman.site s
    LEFT JOIN silverman.icon_tenant t ON t.site_id = s.id
    LEFT JOIN silverman.invoice i ON i.site_id = s.id
    GROUP BY s.id, s.name
    ORDER BY s.name
  `);

  res.json(result.rows);
}));

// ===== Invoices (Basic) =====
router.get('/invoices', asyncHandler(async (req, res) => {
  const { site_id, limit = 100, offset = 0 } = req.query;

  let whereClause = '';
  const params = [];
  let paramIndex = 1;

  if (site_id) {
    whereClause = `WHERE i.site_id = $${paramIndex}`;
    params.push(site_id);
    paramIndex++;
  }

  params.push(parseInt(limit));
  params.push(parseInt(offset));

  const result = await silvermanPool.query(`
    SELECT
      i.id,
      i.doc_number,
      i.name as unit,
      CONCAT(i.first_name, ' ', i.last_name) as owner,
      i.total,
      i.status,
      i.due_date,
      i.issued_date,
      i.paid_date,
      i.site_id,
      s.name as site_name,
      i.added,
      i.updated
    FROM silverman.invoice i
    LEFT JOIN silverman.site s ON s.id = i.site_id
    ${whereClause}
    ORDER BY i.added DESC NULLS LAST
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, params);

  // Get total count
  const countResult = await silvermanPool.query(`
    SELECT COUNT(*) as total
    FROM silverman.invoice i
    ${whereClause}
  `, site_id ? [site_id] : []);

  res.json({
    data: result.rows,
    total: parseInt(countResult.rows[0].total),
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
}));

// ===== Collection (Detailed Invoice List with Summary) =====
router.get('/collection', asyncHandler(async (req, res) => {
  const { site_id, year, status, search, period, pay_group, limit = 50, offset = 0, sort_by = 'issued_date', sort_order = 'desc' } = req.query;

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

  // Query for cumulative overdue (years before selected year)
  // สะสม = ค้างจากปีก่อนๆ (ใช้ status = 'overdue' ให้ตรงกับ list)
  const cumulativeConditions = ['status = \'overdue\''];
  const cumulativeParams = [];
  let cumulativeParamIndex = 1;

  // Filter: due_date year < selected year (สะสม = ค้างจากปีก่อนๆ เท่านั้น ไม่รวมปีที่เลือก)
  if (year) {
    cumulativeConditions.push(`EXTRACT(YEAR FROM due_date) < $${cumulativeParamIndex}`);
    cumulativeParams.push(year);
    cumulativeParamIndex++;
  }

  if (site_id) {
    cumulativeConditions.push(`site_id = $${cumulativeParamIndex}`);
    cumulativeParams.push(site_id);
    cumulativeParamIndex++;
  }
  if (pay_group) {
    cumulativeConditions.push(`pay_group = $${cumulativeParamIndex}`);
    cumulativeParams.push(pay_group);
    cumulativeParamIndex++;
  }

  const cumulativeWhereClause = `WHERE ${cumulativeConditions.join(' AND ')}`;

  const cumulativeOverdueResult = await silvermanPool.query(`
    SELECT
      COALESCE(SUM(total), 0) as cumulative_overdue,
      COUNT(*) as cumulative_overdue_count,
      COUNT(DISTINCT name) as cumulative_overdue_unit_count
    FROM silverman.invoice
    ${cumulativeWhereClause}
  `, cumulativeParams);

  // Query for yearly overdue (selected year only)
  // ค้างรายปี = invoice ที่ค้างชำระในปีที่เลือก (ใช้ status = 'overdue' ให้ตรงกับ list)
  const yearlyOverdueConditions = ['status = \'overdue\''];
  const yearlyOverdueParams = [];
  let yearlyOverdueParamIndex = 1;

  // Filter: due_date year = selected year (ค้างของปีที่เลือก - ใช้ due_date)
  if (year) {
    yearlyOverdueConditions.push(`EXTRACT(YEAR FROM due_date) = $${yearlyOverdueParamIndex}`);
    yearlyOverdueParams.push(year);
    yearlyOverdueParamIndex++;
  }

  if (site_id) {
    yearlyOverdueConditions.push(`site_id = $${yearlyOverdueParamIndex}`);
    yearlyOverdueParams.push(site_id);
    yearlyOverdueParamIndex++;
  }
  if (pay_group) {
    yearlyOverdueConditions.push(`pay_group = $${yearlyOverdueParamIndex}`);
    yearlyOverdueParams.push(pay_group);
    yearlyOverdueParamIndex++;
  }

  const yearlyOverdueWhereClause = `WHERE ${yearlyOverdueConditions.join(' AND ')}`;

  const yearlyOverdueResult = await silvermanPool.query(`
    SELECT
      COALESCE(SUM(total), 0) as yearly_overdue,
      COUNT(*) as yearly_overdue_count,
      COUNT(DISTINCT name) as yearly_overdue_unit_count
    FROM silverman.invoice
    ${yearlyOverdueWhereClause}
  `, yearlyOverdueParams);

  // Query for total distinct overdue units (due_date year <= ปีที่เลือก)
  const totalOverdueConditions = ['status = \'overdue\''];
  const totalOverdueParams = [];
  let totalOverdueParamIndex = 1;

  // Filter: due_date year <= selected year
  if (year) {
    totalOverdueConditions.push(`EXTRACT(YEAR FROM due_date) <= $${totalOverdueParamIndex}`);
    totalOverdueParams.push(year);
    totalOverdueParamIndex++;
  }

  if (site_id) {
    totalOverdueConditions.push(`site_id = $${totalOverdueParamIndex}`);
    totalOverdueParams.push(site_id);
    totalOverdueParamIndex++;
  }
  if (pay_group) {
    totalOverdueConditions.push(`pay_group = $${totalOverdueParamIndex}`);
    totalOverdueParams.push(pay_group);
    totalOverdueParamIndex++;
  }

  const totalOverdueWhereClause = `WHERE ${totalOverdueConditions.join(' AND ')}`;

  const totalOverdueResult = await silvermanPool.query(`
    SELECT
      COALESCE(SUM(total), 0) as total_overdue,
      COUNT(*) as total_overdue_count,
      COUNT(DISTINCT name) as total_overdue_unit_count
    FROM silverman.invoice
    ${totalOverdueWhereClause}
  `, totalOverdueParams);

  // Get summary statistics (with same filters) - include both count and amount per status
  // เพิ่ม unit count (COUNT DISTINCT name) สำหรับทุก status
  const summaryResult = await silvermanPool.query(`
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
  `, params.slice(0, paramIndex - 1)); // Exclude limit/offset params

  // Add pagination params
  const dataParams = [...params];
  dataParams.push(parseInt(limit));
  dataParams.push(parseInt(offset));

  // Get paginated data
  const dataResult = await silvermanPool.query(`
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
  `, dataParams);

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

// ===== Receives (Payments) =====
router.get('/receives', asyncHandler(async (req, res) => {
  const { site_id, limit = 100, offset = 0 } = req.query;

  let whereClause = '';
  const params = [];
  let paramIndex = 1;

  if (site_id) {
    whereClause = `WHERE r.site_id = $${paramIndex}`;
    params.push(site_id);
    paramIndex++;
  }

  params.push(parseInt(limit));
  params.push(parseInt(offset));

  const result = await silvermanPool.query(`
    SELECT
      r.id,
      r.site_id,
      r.added,
      r.updated
    FROM silverman.receive r
    ${whereClause}
    ORDER BY r.added DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, params);

  // Get total count
  const countResult = await silvermanPool.query(`
    SELECT COUNT(*) as total
    FROM silverman.receive r
    ${whereClause}
  `, site_id ? [site_id] : []);

  res.json({
    data: result.rows,
    total: parseInt(countResult.rows[0].total),
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
}));

// ===== Fines =====
router.get('/fines', asyncHandler(async (req, res) => {
  const { site_id, limit = 100, offset = 0 } = req.query;

  let whereClause = '';
  const params = [];
  let paramIndex = 1;

  if (site_id) {
    whereClause = `WHERE f.site_id = $${paramIndex}`;
    params.push(site_id);
    paramIndex++;
  }

  params.push(parseInt(limit));
  params.push(parseInt(offset));

  const result = await silvermanPool.query(`
    SELECT
      f.id,
      f.name,
      f.description,
      f.amount,
      f.fine_type,
      f.site_id,
      f.fine_group_id,
      f.added,
      f.updated,
      fg.name as fine_group_name
    FROM silverman.fine f
    LEFT JOIN silverman.fine_group fg ON fg.id = f.fine_group_id
    ${whereClause}
    ORDER BY f.added DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, params);

  // Get total count
  const countResult = await silvermanPool.query(`
    SELECT COUNT(*) as total
    FROM silverman.fine f
    ${whereClause}
  `, site_id ? [site_id] : []);

  res.json({
    data: result.rows,
    total: parseInt(countResult.rows[0].total),
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
}));

// ===== Fine Groups =====
router.get('/fine-groups', asyncHandler(async (req, res) => {
  const { site_id } = req.query;

  let whereClause = '';
  const params = [];

  if (site_id) {
    whereClause = 'WHERE fg.site_id = $1';
    params.push(site_id);
  }

  const result = await silvermanPool.query(`
    SELECT
      fg.id,
      fg.name,
      fg.description,
      fg.fine_total,
      fg.fine_count,
      fg.fine_date,
      fg.site_id,
      fg.added,
      fg.updated
    FROM silverman.fine_group fg
    ${whereClause}
    ORDER BY fg.fine_date DESC NULLS LAST, fg.added DESC
  `, params);

  res.json(result.rows);
}));

// ===== Tenants =====
router.get('/tenants', asyncHandler(async (req, res) => {
  const { site_id, limit = 100, offset = 0 } = req.query;

  let whereClause = '';
  const params = [];
  let paramIndex = 1;

  if (site_id) {
    whereClause = `WHERE t.site_id = $${paramIndex}`;
    params.push(site_id);
    paramIndex++;
  }

  params.push(parseInt(limit));
  params.push(parseInt(offset));

  const result = await silvermanPool.query(`
    SELECT
      t.id,
      t.name,
      t.icon_code,
      t.customer_id,
      t.member_id,
      t.user_type,
      t.site_id,
      t.added,
      t.updated
    FROM silverman.icon_tenant t
    ${whereClause}
    ORDER BY t.name
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, params);

  // Get total count
  const countResult = await silvermanPool.query(`
    SELECT COUNT(*) as total
    FROM silverman.icon_tenant t
    ${whereClause}
  `, site_id ? [site_id] : []);

  res.json({
    data: result.rows,
    total: parseInt(countResult.rows[0].total),
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
}));

// ===== Customers =====
router.get('/customers', asyncHandler(async (req, res) => {
  const { site_id, limit = 100, offset = 0 } = req.query;

  let whereClause = '';
  const params = [];
  let paramIndex = 1;

  if (site_id) {
    whereClause = `WHERE c.site_id = $${paramIndex}`;
    params.push(site_id);
    paramIndex++;
  }

  params.push(parseInt(limit));
  params.push(parseInt(offset));

  const result = await silvermanPool.query(`
    SELECT
      c.id,
      c.name,
      c.icon_code,
      c.customer_id,
      c.unit_no,
      c.house_no,
      c.project_name,
      c.building,
      c.floor,
      c.site_id,
      c.added,
      c.updated
    FROM silverman.icon_custumer c
    ${whereClause}
    ORDER BY c.name
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, params);

  // Get total count
  const countResult = await silvermanPool.query(`
    SELECT COUNT(*) as total
    FROM silverman.icon_custumer c
    ${whereClause}
  `, site_id ? [site_id] : []);

  res.json({
    data: result.rows,
    total: parseInt(countResult.rows[0].total),
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
}));

// ===== Bank Accounts =====
router.get('/bank-accounts', asyncHandler(async (req, res) => {
  const { site_id } = req.query;

  let whereClause = '';
  const params = [];

  if (site_id) {
    whereClause = 'WHERE ba.site_id = $1';
    params.push(site_id);
  }

  const result = await silvermanPool.query(`
    SELECT
      ba.id,
      ba.account_number,
      ba.account_name,
      ba.bank_name,
      ba.branch,
      ba.account_type,
      ba.carrying_balance,
      ba.status,
      ba.site_id,
      ba.added,
      ba.updated
    FROM silverman.bank_account ba
    ${whereClause}
    ORDER BY ba.bank_name, ba.account_name
  `, params);

  res.json(result.rows);
}));

// ===== Transactions =====
router.get('/transactions', asyncHandler(async (req, res) => {
  const { site_id, limit = 100, offset = 0 } = req.query;

  let whereClause = '';
  const params = [];
  let paramIndex = 1;

  if (site_id) {
    whereClause = `WHERE t.site_id = $${paramIndex}`;
    params.push(site_id);
    paramIndex++;
  }

  params.push(parseInt(limit));
  params.push(parseInt(offset));

  const result = await silvermanPool.query(`
    SELECT
      t.id,
      t.site_id,
      t.added,
      t.updated
    FROM silverman.transaction t
    ${whereClause}
    ORDER BY t.added DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, params);

  // Get total count
  const countResult = await silvermanPool.query(`
    SELECT COUNT(*) as total
    FROM silverman.transaction t
    ${whereClause}
  `, site_id ? [site_id] : []);

  res.json({
    data: result.rows,
    total: parseInt(countResult.rows[0].total),
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
}));

// ===== Statistics by Site =====
router.get('/stats/by-site', asyncHandler(async (req, res) => {
  const result = await silvermanPool.query(`
    SELECT
      s.id as site_id,
      s.name as site_name,
      (SELECT COUNT(*) FROM silverman.invoice WHERE site_id = s.id) as invoice_count,
      (SELECT COUNT(*) FROM silverman.receive WHERE site_id = s.id) as receive_count,
      (SELECT COUNT(*) FROM silverman.fine WHERE site_id = s.id) as fine_count,
      (SELECT COALESCE(SUM(amount), 0) FROM silverman.fine WHERE site_id = s.id) as fine_total,
      (SELECT COUNT(*) FROM silverman.icon_tenant WHERE site_id = s.id) as tenant_count,
      (SELECT COUNT(*) FROM silverman.icon_custumer WHERE site_id = s.id) as customer_count
    FROM silverman.site s
    ORDER BY s.name
  `);

  res.json(result.rows);
}));

// ===== Expense Summary by Type =====
// Expense type mapping
const EXPENSE_TYPES = [
  { id: 'common_fee', name: 'ค่าส่วนกลาง', keywords: ['ส่วนกลาง'], exclude: ['ปรับปรุง'] },
  { id: 'water', name: 'ค่าน้ำประปา', keywords: ['ค่าน้ำประปา'], exclude: [] },
  { id: 'water_meter', name: 'ค่ามิเตอร์น้ำ', keywords: ['มิเตอร์น้ำ'], exclude: [] },
  { id: 'public_service', name: 'ค่าบริการสาธารณะ', keywords: ['บริการสาธารณะ'], exclude: [] },
  { id: 'insurance', name: 'ค่าเบี้ยประกัน', keywords: ['ประกันภัย'], exclude: [] },
  { id: 'parking', name: 'ค่าจอดรถ', keywords: ['จอดรถ', 'จอดจักรยานยนต์'], exclude: [] },
  { id: 'surcharge', name: 'เงินเพิ่ม', keywords: ['เงินเพิ่ม'], exclude: [] },
  { id: 'interest', name: 'ค่าดอกเบี้ย', keywords: ['ค่าดอกเบี้ย'], exclude: [] },
  { id: 'fine', name: 'ค่าปรับ/เบี้ยปรับ', keywords: ['ค่าปรับ', 'ค่าเบี้ยปรับ'], exclude: ['ปรับปรุง'] },
  { id: 'fund', name: 'เงินกองทุน', keywords: ['กองทุน'], exclude: [] },
  { id: 'electricity', name: 'ค่าไฟฟ้า', keywords: ['ไฟฟ้า', 'กระแสไฟ'], exclude: [] },
  { id: 'other', name: 'อื่นๆ', keywords: [], exclude: [] },
];

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
  const { site_id, year, bucket, search, limit = 50, offset = 0, sort_by = 'daysOverdue', sort_order = 'desc' } = req.query;

  // Map sort fields to SQL columns
  const sortFieldMap = {
    docNumber: 'i.doc_number',
    unit: 'i.name',
    owner: "CONCAT(i.first_name, ' ', i.last_name)",
    project: "COALESCE(p.name_en, INITCAP(REPLACE(SPLIT_PART(s.name, '.', 1), '-', ' ')))",
    amount: 'i.total',
    dueDate: 'i.due_date',
    daysOverdue: '(CURRENT_DATE - i.due_date)',
  };
  const sortColumn = sortFieldMap[sort_by] || '(CURRENT_DATE - i.due_date)';
  const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';

  // Build WHERE clause for overdue invoices
  const conditions = [
    "status IN ('overdue', 'active')",
    "due_date < CURRENT_DATE"
  ];
  const params = [];
  let paramIndex = 1;

  if (site_id) {
    conditions.push(`i.site_id = $${paramIndex}`);
    params.push(site_id);
    paramIndex++;
  }
  if (year) {
    conditions.push(`EXTRACT(YEAR FROM i.due_date) = $${paramIndex}`);
    params.push(year);
    paramIndex++;
  }
  if (search) {
    conditions.push(`(i.name ILIKE $${paramIndex} OR i.first_name ILIKE $${paramIndex} OR i.last_name ILIKE $${paramIndex} OR i.doc_number ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
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
  // Note: don't include year filter in summary - we want TOTAL overdue
  // Note: don't include search in summary - we want overall totals

  const summaryWhereClause = `WHERE ${summaryConditions.join(' AND ')}`;
  const summaryQuery = await silvermanPool.query(`
    SELECT
      COUNT(DISTINCT name) as total_count,
      COALESCE(SUM(total), 0) as total_amount,
      COUNT(DISTINCT name) FILTER (WHERE (CURRENT_DATE - due_date) BETWEEN 0 AND 30) as bucket_0_30_count,
      COALESCE(SUM(total) FILTER (WHERE (CURRENT_DATE - due_date) BETWEEN 0 AND 30), 0) as bucket_0_30_amount,
      COUNT(DISTINCT name) FILTER (WHERE (CURRENT_DATE - due_date) BETWEEN 31 AND 60) as bucket_31_60_count,
      COALESCE(SUM(total) FILTER (WHERE (CURRENT_DATE - due_date) BETWEEN 31 AND 60), 0) as bucket_31_60_amount,
      COUNT(DISTINCT name) FILTER (WHERE (CURRENT_DATE - due_date) BETWEEN 61 AND 90) as bucket_61_90_count,
      COALESCE(SUM(total) FILTER (WHERE (CURRENT_DATE - due_date) BETWEEN 61 AND 90), 0) as bucket_61_90_amount,
      COUNT(DISTINCT name) FILTER (WHERE (CURRENT_DATE - due_date) BETWEEN 91 AND 180) as bucket_91_180_count,
      COALESCE(SUM(total) FILTER (WHERE (CURRENT_DATE - due_date) BETWEEN 91 AND 180), 0) as bucket_91_180_amount,
      COUNT(DISTINCT name) FILTER (WHERE (CURRENT_DATE - due_date) BETWEEN 181 AND 360) as bucket_181_360_count,
      COALESCE(SUM(total) FILTER (WHERE (CURRENT_DATE - due_date) BETWEEN 181 AND 360), 0) as bucket_181_360_amount,
      COUNT(DISTINCT name) FILTER (WHERE (CURRENT_DATE - due_date) > 360) as bucket_360_plus_count,
      COALESCE(SUM(total) FILTER (WHERE (CURRENT_DATE - due_date) > 360), 0) as bucket_360_plus_amount
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
        invoiceBucketCondition = `AND (CURRENT_DATE - i.due_date) BETWEEN 0 AND 30`;
        break;
      case '31-60':
        invoiceBucketCondition = `AND (CURRENT_DATE - i.due_date) BETWEEN 31 AND 60`;
        break;
      case '61-90':
        invoiceBucketCondition = `AND (CURRENT_DATE - i.due_date) BETWEEN 61 AND 90`;
        break;
      case '91-180':
        invoiceBucketCondition = `AND (CURRENT_DATE - i.due_date) BETWEEN 91 AND 180`;
        break;
      case '181-360':
        invoiceBucketCondition = `AND (CURRENT_DATE - i.due_date) BETWEEN 181 AND 360`;
        break;
      case '360+':
        invoiceBucketCondition = `AND (CURRENT_DATE - i.due_date) > 360`;
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
      (CURRENT_DATE - i.due_date) as days_overdue,
      CASE
        WHEN (CURRENT_DATE - i.due_date) BETWEEN 0 AND 30 THEN '0-30'
        WHEN (CURRENT_DATE - i.due_date) BETWEEN 31 AND 60 THEN '31-60'
        WHEN (CURRENT_DATE - i.due_date) BETWEEN 61 AND 90 THEN '61-90'
        WHEN (CURRENT_DATE - i.due_date) BETWEEN 91 AND 180 THEN '91-180'
        WHEN (CURRENT_DATE - i.due_date) BETWEEN 181 AND 360 THEN '181-360'
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

export default router;
