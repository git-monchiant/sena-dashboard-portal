/**
 * Sales 2025 API Routes - V2
 * ใช้ table: sales_mkt, Project_User_Mapping
 * Updated field names ตาม schema ใหม่
 */
import { Router } from 'express';
import { pool } from '../db/index.mjs';
import { asyncHandler } from '../utils/helpers.mjs';

const router = Router();

// Month order constant
const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Helper: แปลงเดือนเป็น quarter
const monthToQuarter = (month) => {
  const map = {
    Jan: 'Q1', Feb: 'Q1', Mar: 'Q1',
    Apr: 'Q2', May: 'Q2', Jun: 'Q2',
    Jul: 'Q3', Aug: 'Q3', Sep: 'Q3',
    Oct: 'Q4', Nov: 'Q4', Dec: 'Q4',
  };
  return map[month] || null;
};

// Helper: รายชื่อเดือน
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const monthsCapitalized = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Helper: Parse numeric value from text column
const parseNum = (val) => {
  if (val === null || val === undefined || val === '' || val === '-') return 0;
  const num = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(num) ? 0 : num;
};

// Helper: Sum monthly columns
const sumMonthlyColumns = (row, prefix, suffix = '') => {
  return months.reduce((sum, m) => {
    const col = `${prefix}${m}${suffix}`;
    return sum + parseNum(row[col]);
  }, 0);
};

// Helper: Get quarterly sum from monthly data
const getQuarterlySum = (row, prefix, suffix = '', quarter) => {
  const quarterMonths = {
    Q1: ['jan', 'feb', 'mar'],
    Q2: ['apr', 'may', 'jun'],
    Q3: ['jul', 'aug', 'sep'],
    Q4: ['oct', 'nov', 'dec'],
  };
  const ms = quarterMonths[quarter] || [];
  return ms.reduce((sum, m) => {
    const col = `${prefix}${m}${suffix}`;
    return sum + parseNum(row[col]);
  }, 0);
};

// ============================================================
// GET /api/sales-2025-v2/filters
// ดึงตัวเลือก filter: VP, MGR, Project, BUD, Quarter
// ============================================================
router.get('/filters', asyncHandler(async (req, res) => {
  const [vpList, mgrList, projectList, budList] = await Promise.all([
    pool.query(`
      SELECT DISTINCT name, position
      FROM "Project_User_Mapping"
      WHERE department = 'Sale' AND role_type = 'VP'
      ORDER BY name
    `),
    pool.query(`
      SELECT DISTINCT name, position
      FROM "Project_User_Mapping"
      WHERE department = 'Sale' AND role_type = 'MGR'
      ORDER BY name
    `),
    pool.query(`
      SELECT DISTINCT projectcode as project_code, projectname as project_name, bud
      FROM sales_mkt
      ORDER BY bud, projectcode
    `),
    pool.query(`
      SELECT DISTINCT bud FROM sales_mkt WHERE bud IS NOT NULL ORDER BY bud
    `),
  ]);

  res.json({
    vpList: vpList.rows,
    mgrList: mgrList.rows,
    projectList: projectList.rows,
    budList: budList.rows.map(r => r.bud),
    quarterList: ['Q1', 'Q2', 'Q3', 'Q4'],
  });
}));

// Helper: Get monthly sum for specific months only
const getMonthlySum = (row, prefix, suffix, monthList) => {
  return monthList.reduce((sum, m) => {
    const col = `${prefix}${m.toLowerCase()}${suffix}`;
    return sum + parseNum(row[col]);
  }, 0);
};

// Helper: Filter months by quarter
const getQuarterMonths = (monthList, quarter) => {
  const quarterMonthMap = {
    Q1: ['Jan', 'Feb', 'Mar'],
    Q2: ['Apr', 'May', 'Jun'],
    Q3: ['Jul', 'Aug', 'Sep'],
    Q4: ['Oct', 'Nov', 'Dec'],
  };
  const qMonths = quarterMonthMap[quarter] || [];
  return monthList.filter(m => qMonths.includes(m));
};

// ============================================================
// GET /api/sales-2025-v2/summary
// ภาพรวม performance รวมทุก project (หรือ filter ตาม query)
// ============================================================
router.get('/summary', asyncHandler(async (req, res) => {
  const { bud, quarter, project, vp, mgr } = req.query;

  let baseWhere = '1=1';
  const params = [];
  let paramIndex = 1;

  if (bud) {
    baseWhere += ` AND s.bud = $${paramIndex++}`;
    params.push(bud);
  }
  if (project) {
    baseWhere += ` AND s.projectcode = $${paramIndex++}`;
    params.push(project);
  }

  // Get projects filtered by VP/MGR if specified - include months they manage
  let projectFilter = '';
  let projectMonthsMap = null; // Map of project_code -> [months they manage]

  if (vp || mgr) {
    const mappingParams = [];
    let mappingWhere = "department = 'Sale'";
    let mParamIndex = 1;

    if (vp) {
      mappingWhere += ` AND role_type = 'VP' AND name = $${mParamIndex++}`;
      mappingParams.push(vp);
    }
    if (mgr) {
      mappingWhere += ` AND role_type = 'MGR' AND name = $${mParamIndex++}`;
      mappingParams.push(mgr);
    }

    const mappingResult = await pool.query(`
      SELECT project_code, month FROM "Project_User_Mapping" WHERE ${mappingWhere}
    `, mappingParams);

    if (mappingResult.rows.length === 0) {
      // No projects found for this VP/MGR - return empty result
      if (quarter) {
        return res.json([{ quarter, projectCount: 0, presaleTarget: 0, livnexTarget: 0, rentnexTarget: 0, booking: 0, livnex: 0, rentnex: 0, contract: 0, revenueTarget: 0, revenue: 0, mktExpense: 0, totalLead: 0, qualityLead: 0, leadWalk: 0, leadBook: 0 }]);
      } else {
        return res.json(['Q1', 'Q2', 'Q3', 'Q4'].map(q => ({ quarter: q, projectCount: 0, presaleTarget: 0, livnexTarget: 0, booking: 0, livnex: 0, contract: 0, revenueTarget: 0, revenue: 0, mktExpense: 0, totalLead: 0, qualityLead: 0, leadWalk: 0, leadBook: 0 })));
      }
    }

    // Build map of project -> months managed
    projectMonthsMap = {};
    mappingResult.rows.forEach(r => {
      if (!projectMonthsMap[r.project_code]) {
        projectMonthsMap[r.project_code] = [];
      }
      if (!projectMonthsMap[r.project_code].includes(r.month)) {
        projectMonthsMap[r.project_code].push(r.month);
      }
    });

    const projectCodes = Object.keys(projectMonthsMap);
    projectFilter = ` AND s.projectcode = ANY($${paramIndex++})`;
    params.push(projectCodes);
  }

  const query = `SELECT s.* FROM sales_mkt s WHERE ${baseWhere}${projectFilter}`;
  const result = await pool.query(query, params);

  // Return monthly data
  // If VP/MGR filter is applied, only include months they manage
  const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const summaryByMonth = allMonths.map(month => {
    let totals = {
      month,
      projectCount: result.rows.length,
      presaleTarget: 0,
      livnexTarget: 0,
      booking: 0,
      livnex: 0,
      contract: 0,
      cancel: 0,
      revenueTarget: 0,
      revenue: 0,
      mktExpense: 0,
      totalLead: 0,
      qualityLead: 0,
      leadWalk: 0,
      leadBook: 0,
    };

    result.rows.forEach(row => {
      // Check if this VP/MGR manages this month for this project
      let shouldInclude = true;
      if (projectMonthsMap && projectMonthsMap[row.projectcode]) {
        shouldInclude = projectMonthsMap[row.projectcode].includes(month);
      }

      if (shouldInclude) {
        const m = month.toLowerCase();
        totals.presaleTarget += parseNum(row[`target_presale_${m}_thb`]);
        totals.livnexTarget += parseNum(row[`target_livnex_${m}_thb`]);
        totals.booking += parseNum(row[`book_${m}_thb`]);
        totals.livnex += parseNum(row[`livnex_${m}_thb`]);
        totals.contract += parseNum(row[`contract_${m}_thb`]);
        totals.cancel += parseNum(row[`cancel_${m}_thb`]);
        totals.revenueTarget += parseNum(row[`target_revenue_${m}_thb`]);
        totals.revenue += parseNum(row[`revenue_${m}_thb`]);
        totals.mktExpense += parseNum(row[`mktexpense_${m}`]);
        totals.totalLead += parseNum(row[`totallead_${m}`]);
        totals.qualityLead += parseNum(row[`qualitylead_${m}`]);
        totals.leadWalk += parseNum(row[`lead_walk_${m}`]);
        totals.leadBook += parseNum(row[`lead_book_${m}`]);
      }
    });

    return totals;
  });

  res.json(summaryByMonth);
}));

// ============================================================
// GET /api/sales-2025-v2/performance
// ข้อมูล performance สำหรับ Sales page (Top 10 tables, charts)
// ============================================================
router.get('/performance', asyncHandler(async (req, res) => {
  const { bud, quarter, vp, mgr, project } = req.query;

  // Build base query with filters
  let baseWhere = '1=1';
  const params = [];
  let paramIndex = 1;

  if (bud) {
    baseWhere += ` AND s.bud = $${paramIndex++}`;
    params.push(bud);
  }
  if (project) {
    baseWhere += ` AND s.projectcode = $${paramIndex++}`;
    params.push(project);
  }

  // Get projects filtered by VP/MGR if specified
  let projectFilter = '';
  if (vp || mgr) {
    const mappingParams = [];
    let mappingWhere = "department = 'Sale'";
    let mParamIndex = params.length + 1;

    if (vp) {
      mappingWhere += ` AND role_type = 'VP' AND name = $${mParamIndex++}`;
      mappingParams.push(vp);
    }
    if (mgr) {
      mappingWhere += ` AND role_type = 'MGR' AND name = $${mParamIndex++}`;
      mappingParams.push(mgr);
    }

    const mappingResult = await pool.query(`
      SELECT DISTINCT project_code FROM "Project_User_Mapping" WHERE ${mappingWhere}
    `, mappingParams);

    const projectCodes = mappingResult.rows.map(r => r.project_code);
    if (projectCodes.length === 0) {
      // No projects found for this VP/MGR
      return res.json({
        summary: { presaleTarget: 0, presaleActual: 0, revenueTarget: 0, revenueActual: 0 },
        projects: [],
        chartData: [],
      });
    }
    projectFilter = ` AND s.projectcode = ANY($${paramIndex++})`;
    params.push(projectCodes);
  }

  const query = `SELECT s.* FROM sales_mkt s WHERE ${baseWhere}${projectFilter}`;
  const result = await pool.query(query, params);

  // Calculate totals and project-level data
  const quarterList = quarter ? [quarter] : ['Q1', 'Q2', 'Q3', 'Q4'];

  let summary = {
    presaleTarget: 0,
    presaleActual: 0,  // booking + contract + livnex
    revenueTarget: 0,
    revenueActual: 0,
    mktExpense: 0,
    totalLead: 0,
    qualityLead: 0,
    walk: 0,
    book: 0,
    booking: 0,
    contract: 0,
    livnex: 0,
  };

  const projects = result.rows.map(row => {
    let presaleTarget = 0, booking = 0, contract = 0, livnex = 0, revenueTarget = 0, revenue = 0;
    let mktExpense = 0, totalLead = 0, qualityLead = 0, walk = 0, book = 0;

    quarterList.forEach(q => {
      presaleTarget += getQuarterlySum(row, 'target_presale_', '_thb', q);
      booking += getQuarterlySum(row, 'book_', '_thb', q);
      contract += getQuarterlySum(row, 'contract_', '_thb', q);
      livnex += getQuarterlySum(row, 'livnex_', '_thb', q);
      revenueTarget += getQuarterlySum(row, 'target_revenue_', '_thb', q);
      revenue += getQuarterlySum(row, 'revenue_', '_thb', q);
      mktExpense += getQuarterlySum(row, 'mktexpense_', '', q);
      totalLead += getQuarterlySum(row, 'totallead_', '', q);
      qualityLead += getQuarterlySum(row, 'qualitylead_', '', q);
      walk += getQuarterlySum(row, 'lead_walk_', '', q);
      book += getQuarterlySum(row, 'lead_book_', '', q);
    });

    const presaleActual = booking + contract + livnex;

    // Add to summary
    summary.presaleTarget += presaleTarget;
    summary.presaleActual += presaleActual;
    summary.revenueTarget += revenueTarget;
    summary.revenueActual += revenue;
    summary.mktExpense += mktExpense;
    summary.totalLead += totalLead;
    summary.qualityLead += qualityLead;
    summary.walk += walk;
    summary.book += book;
    summary.booking += booking;
    summary.contract += contract;
    summary.livnex += livnex;

    return {
      project_code: row.projectcode,
      project_name: row.projectname,
      bud: row.bud,
      segment: row.segment,
      presale_target: presaleTarget,
      presale_actual: presaleActual,
      booking,
      contract,
      livnex,
      revenue_target: revenueTarget,
      revenue_actual: revenue,
      mkt_expense: mktExpense,
      total_lead: totalLead,
      quality_lead: qualityLead,
      walk,
      book,
      presale_achieve_pct: presaleTarget > 0 ? presaleActual / presaleTarget : 0,
      revenue_achieve_pct: revenueTarget > 0 ? revenue / revenueTarget : 0,
    };
  });

  // Chart data by quarter
  const chartData = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
    let presaleTarget = 0, booking = 0, contract = 0, livnex = 0, revenueTarget = 0, revenueActual = 0;

    result.rows.forEach(row => {
      presaleTarget += getQuarterlySum(row, 'target_presale_', '_thb', q);
      booking += getQuarterlySum(row, 'book_', '_thb', q);
      contract += getQuarterlySum(row, 'contract_', '_thb', q);
      livnex += getQuarterlySum(row, 'livnex_', '_thb', q);
      revenueTarget += getQuarterlySum(row, 'target_revenue_', '_thb', q);
      revenueActual += getQuarterlySum(row, 'revenue_', '_thb', q);
    });

    return {
      quarter: q,
      presale_target: presaleTarget,
      presale_actual: booking + contract + livnex,
      booking,
      contract,
      livnex,
      revenue_target: revenueTarget,
      revenue_actual: revenueActual,
    };
  });

  res.json({
    summary,
    projects,
    chartData,
  });
}));

// ============================================================
// GET /api/sales-2025-v2/marketing
// ข้อมูล marketing performance (Lead funnel, CPL, CPQL)
// ============================================================
router.get('/marketing', asyncHandler(async (req, res) => {
  const { bud, quarter, vp, mgr, project } = req.query;

  // Build base query with filters
  let baseWhere = '1=1';
  const params = [];
  let paramIndex = 1;

  if (bud) {
    baseWhere += ` AND s.bud = $${paramIndex++}`;
    params.push(bud);
  }
  if (project) {
    baseWhere += ` AND s.projectcode = $${paramIndex++}`;
    params.push(project);
  }

  // Get projects filtered by VP/MGR if specified - include months they manage
  let projectFilter = '';
  let projectMonthsMap = null;

  if (vp || mgr) {
    const mappingParams = [];
    let mappingWhere = "department = 'Sale'";
    let mParamIndex = 1;

    if (vp) {
      mappingWhere += ` AND role_type = 'VP' AND name = $${mParamIndex++}`;
      mappingParams.push(vp);
    }
    if (mgr) {
      mappingWhere += ` AND role_type = 'MGR' AND name = $${mParamIndex++}`;
      mappingParams.push(mgr);
    }

    const mappingResult = await pool.query(`
      SELECT project_code, month FROM "Project_User_Mapping" WHERE ${mappingWhere}
    `, mappingParams);

    if (mappingResult.rows.length === 0) {
      return res.json({
        summary: { totalLead: 0, qualityLead: 0, walk: 0, book: 0, mktExpense: 0, cpl: 0, cpql: 0 },
        projects: [],
        funnelData: [],
      });
    }

    // Build map of project -> months managed
    projectMonthsMap = {};
    mappingResult.rows.forEach(r => {
      if (!projectMonthsMap[r.project_code]) {
        projectMonthsMap[r.project_code] = [];
      }
      if (!projectMonthsMap[r.project_code].includes(r.month)) {
        projectMonthsMap[r.project_code].push(r.month);
      }
    });

    const projectCodes = Object.keys(projectMonthsMap);
    projectFilter = ` AND s.projectcode = ANY($${paramIndex++})`;
    params.push(projectCodes);
  }

  const query = `SELECT s.* FROM sales_mkt s WHERE ${baseWhere}${projectFilter}`;
  const result = await pool.query(query, params);

  const quarterList = quarter ? [quarter] : ['Q1', 'Q2', 'Q3', 'Q4'];

  let summary = {
    totalLead: 0,
    qualityLead: 0,
    walk: 0,
    book: 0,
    mktExpense: 0,
    booking: 0,
    presaleActual: 0,
    revenue: 0,
  };

  const projects = result.rows.map(row => {
    let mktExpense = 0, totalLead = 0, qualityLead = 0, walk = 0, book = 0;
    let booking = 0, contract = 0, revenue = 0;

    quarterList.forEach(q => {
      mktExpense += getQuarterlySum(row, 'mktexpense_', '', q);
      totalLead += getQuarterlySum(row, 'totallead_', '', q);
      qualityLead += getQuarterlySum(row, 'qualitylead_', '', q);
      walk += getQuarterlySum(row, 'lead_walk_', '', q);
      book += getQuarterlySum(row, 'lead_book_', '', q);
      booking += getQuarterlySum(row, 'book_', '_thb', q);
      contract += getQuarterlySum(row, 'contract_', '_thb', q);
      revenue += getQuarterlySum(row, 'revenue_', '_thb', q);
    });

    const presaleActual = booking + contract;

    // Add to summary
    summary.totalLead += totalLead;
    summary.qualityLead += qualityLead;
    summary.walk += walk;
    summary.book += book;
    summary.mktExpense += mktExpense;
    summary.booking += booking;
    summary.presaleActual += presaleActual;
    summary.revenue += revenue;

    // Calculate CPL, CPQL, MKT%
    const cpl = totalLead > 0 ? mktExpense / totalLead : 0;
    const cpql = qualityLead > 0 ? mktExpense / qualityLead : 0;
    const mktPctBooking = booking > 0 ? (mktExpense / booking) * 100 : 0;
    const mktPctPresale = presaleActual > 0 ? (mktExpense / presaleActual) * 100 : 0;
    const mktPctRevenue = revenue > 0 ? (mktExpense / revenue) * 100 : 0;

    return {
      project_code: row.projectcode,
      project_name: row.projectname,
      bud: row.bud,
      segment: row.segment,
      mkt_expense: mktExpense,
      total_lead: totalLead,
      quality_lead: qualityLead,
      walk,
      book,
      cpl,
      cpql,
      mkt_pct_booking: mktPctBooking,
      mkt_pct_presale: mktPctPresale,
      mkt_pct_revenue: mktPctRevenue,
      lead_to_walk: qualityLead > 0 ? (walk / qualityLead) * 100 : 0,
      walk_to_book: walk > 0 ? (book / walk) * 100 : 0,
    };
  });

  // Calculate summary metrics
  summary.cpl = summary.totalLead > 0 ? summary.mktExpense / summary.totalLead : 0;
  summary.cpql = summary.qualityLead > 0 ? summary.mktExpense / summary.qualityLead : 0;
  summary.leadToWalk = summary.qualityLead > 0 ? (summary.walk / summary.qualityLead) * 100 : 0;
  summary.walkToBook = summary.walk > 0 ? (summary.book / summary.walk) * 100 : 0;
  summary.mktPctBooking = summary.booking > 0 ? (summary.mktExpense / summary.booking) * 100 : 0;
  summary.mktPctPresale = summary.presaleActual > 0 ? (summary.mktExpense / summary.presaleActual) * 100 : 0;
  summary.mktPctRevenue = summary.revenue > 0 ? (summary.mktExpense / summary.revenue) * 100 : 0;

  // Funnel data
  const funnelData = [
    { stage: 'Total Lead', value: summary.totalLead },
    { stage: 'Quality Lead', value: summary.qualityLead },
    { stage: 'Walk', value: summary.walk },
    { stage: 'Book', value: summary.book },
  ];

  res.json({
    summary,
    projects,
    funnelData,
  });
}));

// ============================================================
// GET /api/sales-2025-v2/projects
// รายการ project พร้อม performance
// ============================================================
router.get('/projects', asyncHandler(async (req, res) => {
  const { bud, quarter, vp, mgr, project } = req.query;

  let baseWhere = '1=1';
  const params = [];
  let paramIndex = 1;

  if (bud) {
    baseWhere += ` AND s.bud = $${paramIndex++}`;
    params.push(bud);
  }
  if (project) {
    baseWhere += ` AND s.projectcode = $${paramIndex++}`;
    params.push(project);
  }

  // Get projects filtered by VP/MGR if specified - include months they manage
  let projectFilter = '';
  let projectMonthsMap = null;

  if (vp || mgr) {
    const mappingParams = [];
    let mappingWhere = "department = 'Sale'";
    let mParamIndex = 1;

    if (vp) {
      mappingWhere += ` AND role_type = 'VP' AND name = $${mParamIndex++}`;
      mappingParams.push(vp);
    }
    if (mgr) {
      mappingWhere += ` AND role_type = 'MGR' AND name = $${mParamIndex++}`;
      mappingParams.push(mgr);
    }

    const mappingResult = await pool.query(`
      SELECT project_code, month FROM "Project_User_Mapping" WHERE ${mappingWhere}
    `, mappingParams);

    if (mappingResult.rows.length === 0) {
      return res.json([]);
    }

    // Build map of project -> months managed
    projectMonthsMap = {};
    mappingResult.rows.forEach(r => {
      if (!projectMonthsMap[r.project_code]) {
        projectMonthsMap[r.project_code] = [];
      }
      if (!projectMonthsMap[r.project_code].includes(r.month)) {
        projectMonthsMap[r.project_code].push(r.month);
      }
    });

    const projectCodes = Object.keys(projectMonthsMap);
    projectFilter = ` AND s.projectcode = ANY($${paramIndex++})`;
    params.push(projectCodes);
  }

  const query = `SELECT s.* FROM sales_mkt s WHERE ${baseWhere}${projectFilter} ORDER BY s.bud, s.projectcode`;
  const result = await pool.query(query, params);

  const projects = result.rows.map(row => {
    const q = quarter || null;

    // Get months to sum based on VP/MGR filter
    let monthsToSum = null;
    if (projectMonthsMap && projectMonthsMap[row.projectcode]) {
      monthsToSum = q
        ? getQuarterMonths(projectMonthsMap[row.projectcode], q)
        : projectMonthsMap[row.projectcode];
    }

    // Calculate values - either from specific months or all data
    let presaleTarget, livnexTarget, booking, contract, livnex, revenueTarget;

    if (monthsToSum && monthsToSum.length > 0) {
      // Use only months this VP/MGR manages
      presaleTarget = getMonthlySum(row, 'target_presale_', '_thb', monthsToSum);
      livnexTarget = getMonthlySum(row, 'target_livnex_', '_thb', monthsToSum);
      booking = getMonthlySum(row, 'book_', '_thb', monthsToSum);
      contract = getMonthlySum(row, 'contract_', '_thb', monthsToSum);
      livnex = getMonthlySum(row, 'livnex_', '_thb', monthsToSum);
      revenueTarget = getMonthlySum(row, 'target_revenue_', '_thb', monthsToSum);
    } else if (q) {
      // No VP/MGR filter but quarter specified
      presaleTarget = getQuarterlySum(row, 'target_presale_', '_thb', q);
      livnexTarget = getQuarterlySum(row, 'target_livnex_', '_thb', q);
      booking = getQuarterlySum(row, 'book_', '_thb', q);
      contract = getQuarterlySum(row, 'contract_', '_thb', q);
      livnex = getQuarterlySum(row, 'livnex_', '_thb', q);
      revenueTarget = getQuarterlySum(row, 'target_revenue_', '_thb', q);
    } else {
      // No filter - use totals
      presaleTarget = parseNum(row.target_presale_totalthb);
      livnexTarget = parseNum(row.target_livnex_totalthb);
      booking = parseNum(row.book_totalthb);
      contract = parseNum(row.contract_totalthb);
      livnex = parseNum(row.livnex_totalthb);
      revenueTarget = parseNum(row.target_revenue_totalthb);
    }

    let revenue, mktExpense, totalLead, qualityLead, leadWalk, leadBook;

    if (monthsToSum && monthsToSum.length > 0) {
      // Use only months this VP/MGR manages
      revenue = getMonthlySum(row, 'revenue_', '_thb', monthsToSum);
      mktExpense = getMonthlySum(row, 'mktexpense_', '', monthsToSum);
      totalLead = getMonthlySum(row, 'totallead_', '', monthsToSum);
      qualityLead = getMonthlySum(row, 'qualitylead_', '', monthsToSum);
      leadWalk = getMonthlySum(row, 'lead_walk_', '', monthsToSum);
      leadBook = getMonthlySum(row, 'lead_book_', '', monthsToSum);
    } else if (q) {
      // No VP/MGR filter but quarter specified
      revenue = getQuarterlySum(row, 'revenue_', '_thb', q);
      mktExpense = getQuarterlySum(row, 'mktexpense_', '', q);
      totalLead = getQuarterlySum(row, 'totallead_', '', q);
      qualityLead = getQuarterlySum(row, 'qualitylead_', '', q);
      leadWalk = getQuarterlySum(row, 'lead_walk_', '', q);
      leadBook = getQuarterlySum(row, 'lead_book_', '', q);
    } else {
      // No filter - use totals
      revenue = parseNum(row.revenue_totalthb);
      mktExpense = parseNum(row.mktexpense_total);
      totalLead = parseNum(row.totallead_total);
      qualityLead = parseNum(row.qualitylead_total);
      leadWalk = parseNum(row.lead_walk_total);
      leadBook = parseNum(row.lead_book_total);
    }

    const presaleActual = booking + contract + livnex;

    return {
      projectCode: row.projectcode,
      projectName: row.projectname,
      bud: row.bud,
      opm: row.opm,
      segment: row.segment,
      status: row.status,
      presaleTarget,
      livnexTarget,
      presaleActual,
      booking,
      contract,
      livnex,
      revenueTarget,
      revenue,
      mktExpense,
      totalLead,
      qualityLead,
      leadWalk,
      leadBook,
      presaleAchievePct: presaleTarget > 0 ? (presaleActual / presaleTarget) * 100 : 0,
      livnexAchievePct: livnexTarget > 0 ? (livnex / livnexTarget) * 100 : 0,
      revenueAchievePct: revenueTarget > 0 ? (revenue / revenueTarget) * 100 : 0,
    };
  });

  res.json(projects);
}));

// ============================================================
// GET /api/sales-2025-v2/project/:projectCode
// รายละเอียด project เดี่ยว พร้อมข้อมูลรายเดือน
// ============================================================
router.get('/project/:projectCode', asyncHandler(async (req, res) => {
  const { projectCode } = req.params;

  const result = await pool.query(
    `SELECT * FROM sales_mkt WHERE projectcode = $1`,
    [projectCode]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const row = result.rows[0];

  // Monthly breakdown
  const monthlyData = monthsCapitalized.map((month, idx) => {
    const m = months[idx];
    const booking = parseNum(row[`book_${m}_thb`]);
    const contract = parseNum(row[`contract_${m}_thb`]);
    return {
      month,
      presaleTarget: parseNum(row[`target_presale_${m}_thb`]),
      presaleActual: booking + contract,
      booking,
      contract,
      revenueTarget: parseNum(row[`target_revenue_${m}_thb`]),
      revenue: parseNum(row[`revenue_${m}_thb`]),
      mktExpense: parseNum(row[`mktexpense_${m}`]),
      totalLead: parseNum(row[`totallead_${m}`]),
      qualityLead: parseNum(row[`qualitylead_${m}`]),
      walk: parseNum(row[`lead_walk_${m}`]),
      book: parseNum(row[`lead_book_${m}`]),
    };
  });

  // Quarterly breakdown
  const quarterlyData = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
    const booking = getQuarterlySum(row, 'book_', '_thb', q);
    const contract = getQuarterlySum(row, 'contract_', '_thb', q);
    return {
      quarter: q,
      presaleTarget: getQuarterlySum(row, 'target_presale_', '_thb', q),
      presaleActual: booking + contract,
      booking,
      contract,
      revenueTarget: getQuarterlySum(row, 'target_revenue_', '_thb', q),
      revenue: getQuarterlySum(row, 'revenue_', '_thb', q),
      mktExpense: getQuarterlySum(row, 'mktexpense_', '', q),
      totalLead: getQuarterlySum(row, 'totallead_', '', q),
      qualityLead: getQuarterlySum(row, 'qualitylead_', '', q),
      walk: getQuarterlySum(row, 'lead_walk_', '', q),
      book: getQuarterlySum(row, 'lead_book_', '', q),
    };
  });

  // Get team members from mapping
  const teamResult = await pool.query(`
    SELECT department, role_type, position, name, month
    FROM "Project_User_Mapping"
    WHERE project_code = $1
    ORDER BY department, role_type DESC, name
  `, [projectCode]);

  // Group team by department + role_type + name (unique per dept/role/person)
  // Using module-level monthOrder constant
  const teamMap = {};
  teamResult.rows.forEach(r => {
    const key = `${r.department}|${r.role_type}|${r.name}`;
    if (!teamMap[key]) {
      teamMap[key] = {
        department: r.department,
        roleType: r.role_type,
        position: r.position,
        name: r.name,
        months: [],
      };
    }
    // Add month if not already present
    if (!teamMap[key].months.includes(r.month)) {
      teamMap[key].months.push(r.month);
    }
  });

  // Sort months for each team member
  Object.values(teamMap).forEach((member) => {
    member.months.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
  });

  // Calculate totals
  const totalBooking = parseNum(row.book_totalthb);
  const totalContract = parseNum(row.contract_totalthb);

  res.json({
    projectCode: row.projectcode,
    projectName: row.projectname,
    bud: row.bud,
    opm: row.opm,
    segment: row.segment,
    status: row.status,
    type: row.type,
    avgSellingPrice: row.avgsellingprice_baht_unit,
    totalUnits: row.totalunits,
    soldUnits: row.soldunits_apr25,
    remainingUnits: row.remainingunits,
    totals: {
      presaleTarget: parseNum(row.target_presale_totalthb),
      presaleActual: totalBooking + totalContract,
      booking: totalBooking,
      contract: totalContract,
      revenueTarget: parseNum(row.target_revenue_totalthb),
      revenue: parseNum(row.revenue_totalthb),
      mktExpense: parseNum(row.mktexpense_total),
      totalLead: parseNum(row.totallead_total),
      qualityLead: parseNum(row.qualitylead_total),
      walk: parseNum(row.lead_walk_total),
      book: parseNum(row.lead_book_total),
    },
    monthlyData,
    quarterlyData,
    team: Object.values(teamMap),
  });
}));

// ============================================================
// GET /api/sales-2025-v2/employees
// รายชื่อพนักงาน (VP, MGR Sale, MGR Mkt) พร้อมสรุป performance
// ============================================================
router.get('/employees', asyncHandler(async (req, res) => {
  const { all } = req.query;

  // Query 1: Get all employees
  let employeesResult;
  if (all === 'true') {
    employeesResult = await pool.query(`
      SELECT DISTINCT name, position, role_type, department
      FROM "Project_User_Mapping"
      WHERE (department = 'Sale' AND role_type IN ('VP', 'MGR'))
         OR (department = 'Mkt' AND role_type = 'MGR')
      ORDER BY role_type, department, name
    `);
  } else {
    employeesResult = await pool.query(`
      SELECT DISTINCT name, position, role_type, department
      FROM "Project_User_Mapping"
      WHERE department = 'Sale' AND role_type = 'VP'
      ORDER BY name
    `);
  }

  // Query 2: Get ALL project mappings for all relevant employees at once
  const allMappingsResult = await pool.query(`
    SELECT name, department, project_code, month
    FROM "Project_User_Mapping"
    WHERE (department = 'Sale' AND role_type IN ('VP', 'MGR'))
       OR (department = 'Mkt' AND role_type = 'MGR')
  `);

  // Build mapping: employee -> projects -> quarters
  const employeeProjectMap = {};
  allMappingsResult.rows.forEach(row => {
    const key = `${row.name}|${row.department}`;
    if (!employeeProjectMap[key]) {
      employeeProjectMap[key] = {};
    }
    if (!employeeProjectMap[key][row.project_code]) {
      employeeProjectMap[key][row.project_code] = new Set();
    }
    const quarter = monthToQuarter(row.month);
    if (quarter) employeeProjectMap[key][row.project_code].add(quarter);
  });

  // Query 3: Get ALL sales_mkt data for performance calculation
  const allSalesResult = await pool.query(`
    SELECT
      projectcode as project_code,
      bud,
      target_presale_totalthb,
      book_totalthb,
      contract_totalthb,
      target_revenue_totalthb,
      revenue_totalthb,
      mktexpense_total,
      lead_book_total
    FROM sales_mkt
  `);

  // Build performance lookup: project_code -> data
  const perfLookup = {};
  allSalesResult.rows.forEach(row => {
    const booking = parseNum(row.book_totalthb);
    const contract = parseNum(row.contract_totalthb);
    perfLookup[row.project_code] = {
      bud: row.bud,
      presaleTarget: parseNum(row.target_presale_totalthb),
      presaleActual: booking + contract,
      revenueTarget: parseNum(row.target_revenue_totalthb),
      revenueActual: parseNum(row.revenue_totalthb),
      mktExpense: parseNum(row.mktexpense_total),
      book: parseNum(row.lead_book_total),
    };
  });

  // Process each employee using in-memory data
  const employees = [];
  for (const emp of employeesResult.rows) {
    const empDept = emp.department || 'Sale';
    const empKey = `${emp.name}|${empDept}`;
    const projectQuarters = employeeProjectMap[empKey] || {};

    if (Object.keys(projectQuarters).length === 0) {
      employees.push({
        name: emp.name,
        position: emp.position,
        roleType: emp.role_type,
        department: empDept,
        buds: [],
        projectCount: 0,
        totalPresaleTarget: 0,
        totalPresaleActual: 0,
        totalRevenueTarget: 0,
        totalRevenueActual: 0,
        presaleAchievePct: 0,
        revenueAchievePct: 0,
        mktExpense: 0,
        totalBook: 0,
        cpb: 0,
      });
      continue;
    }

    let totalPresaleTarget = 0;
    let totalPresaleActual = 0;
    let totalRevenueTarget = 0;
    let totalRevenueActual = 0;
    let totalMktExpense = 0;
    let totalBook = 0;
    const budSet = new Set();

    for (const [projectCode] of Object.entries(projectQuarters)) {
      const perf = perfLookup[projectCode];
      if (perf) {
        if (perf.bud) budSet.add(perf.bud);
        totalPresaleTarget += perf.presaleTarget;
        totalPresaleActual += perf.presaleActual;
        totalRevenueTarget += perf.revenueTarget;
        totalRevenueActual += perf.revenueActual;
        totalMktExpense += perf.mktExpense;
        totalBook += perf.book;
      }
    }

    const presaleAchieve = totalPresaleTarget > 0 ? (totalPresaleActual / totalPresaleTarget) : 0;
    const revenueAchieve = totalRevenueTarget > 0 ? (totalRevenueActual / totalRevenueTarget) : 0;
    const cpb = totalBook > 0 ? totalMktExpense / totalBook : 0;

    employees.push({
      name: emp.name,
      position: emp.position,
      roleType: emp.role_type,
      department: empDept,
      buds: Array.from(budSet).sort(),
      projectCount: Object.keys(projectQuarters).length,
      totalPresaleTarget,
      totalPresaleActual,
      totalRevenueTarget,
      totalRevenueActual,
      presaleAchievePct: presaleAchieve,
      revenueAchievePct: revenueAchieve,
      mktExpense: totalMktExpense,
      totalBook,
      cpb,
    });
  }

  // Get unique BUD list for filter
  const allBuds = [...new Set(employees.flatMap(e => e.buds || []))].sort();

  res.json({ employees, budList: allBuds });
}));

// ============================================================
// GET /api/sales-2025-v2/vp/:name
// ข้อมูล VP รายบุคคล พร้อมโปรเจกต์และทีม
// ============================================================
router.get('/vp/:name', asyncHandler(async (req, res) => {
  const { name } = req.params;

  // Get VP info from Sale department
  const vpResult = await pool.query(`
    SELECT DISTINCT name, position, role_type
    FROM "Project_User_Mapping"
    WHERE department = 'Sale' AND role_type = 'VP' AND name = $1
    LIMIT 1
  `, [name]);

  if (vpResult.rows.length === 0) {
    return res.status(404).json({ error: 'VP not found' });
  }

  const vp = vpResult.rows[0];

  // Get all projects with months for this VP
  const projectsResult = await pool.query(`
    SELECT project_code, project_name, month
    FROM "Project_User_Mapping"
    WHERE department = 'Sale' AND role_type = 'VP' AND name = $1
    ORDER BY project_code
  `, [name]);

  // Group by project
  const projectMap = {};
  projectsResult.rows.forEach(row => {
    if (!projectMap[row.project_code]) {
      projectMap[row.project_code] = {
        projectCode: row.project_code,
        projectName: row.project_name,
        months: [],
      };
    }
    projectMap[row.project_code].months.push(row.month);
  });

  // Get all sales_mkt data at once (VP endpoint)
  const projectCodes = Object.keys(projectMap);
  if (projectCodes.length === 0) {
    return res.json({
      name: vp.name,
      position: vp.position,
      roleType: vp.role_type,
      projectCount: 0,
      projects: [],
      grandTotals: {},
      kpis: {},
      quarterlyPerformance: [],
      team: { salesManagers: [], marketingManagers: [] },
    });
  }

  const salesDataResult = await pool.query(`
    SELECT *
    FROM sales_mkt
    WHERE projectcode = ANY($1)
  `, [projectCodes]);

  // Build lookup (use projectcode not project_code since we removed alias)
  const salesLookup = {};
  salesDataResult.rows.forEach(row => {
    salesLookup[row.projectcode] = row;
  });

  // Process projects and calculate totals
  const projects = [];
  let grandTotals = {
    presaleTarget: 0, presaleActual: 0,
    revenueTarget: 0, revenueActual: 0,
    mktExpense: 0, totalLead: 0, qualityLead: 0,
    walk: 0, book: 0, booking: 0, livnex: 0,
  };

  for (const [code, proj] of Object.entries(projectMap)) {
    proj.months = proj.months.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
    const responsibleQuarters = [...new Set(proj.months.map(m => monthToQuarter(m)).filter(q => q))];

    const salesData = salesLookup[code] || {};
    const booking = parseNum(salesData.book_totalthb);
    const contract = parseNum(salesData.contract_totalthb);
    const presaleActual = booking + contract;
    const presaleTarget = parseNum(salesData.target_presale_totalthb);
    const revenueTarget = parseNum(salesData.target_revenue_totalthb);
    const revenueActual = parseNum(salesData.revenue_totalthb);
    const mktExpense = parseNum(salesData.mktexpense_total);
    const totalLead = parseNum(salesData.totallead_total);
    const qualityLead = parseNum(salesData.qualitylead_total);
    const walk = parseNum(salesData.lead_walk_total);
    const book = parseNum(salesData.lead_book_total);
    const livnex = parseNum(salesData.livnex_totalthb);

    const projectTotals = {
      presaleTarget, presaleActual, revenueTarget, revenueActual,
      mktExpense, totalLead, qualityLead, walk, book, booking, livnex,
    };

    // Add to grand totals
    grandTotals.presaleTarget += presaleTarget;
    grandTotals.presaleActual += presaleActual;
    grandTotals.revenueTarget += revenueTarget;
    grandTotals.revenueActual += revenueActual;
    grandTotals.mktExpense += mktExpense;
    grandTotals.totalLead += totalLead;
    grandTotals.qualityLead += qualityLead;
    grandTotals.walk += walk;
    grandTotals.book += book;
    grandTotals.booking += booking;
    grandTotals.livnex += livnex;

    projects.push({
      ...proj,
      bud: salesData.bud || '',
      responsibleQuarters,
      totals: projectTotals,
      presaleAchievePct: presaleTarget > 0 ? (presaleActual / presaleTarget) * 100 : 0,
      revenueAchievePct: revenueTarget > 0 ? (revenueActual / revenueTarget) * 100 : 0,
    });
  }

  // Calculate quarterly performance by aggregating from all projects
  const quarterlyTotals = { Q1: null, Q2: null, Q3: null, Q4: null };
  ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
    let qTotalLead = 0, qQualityLead = 0, qWalk = 0, qBook = 0;
    for (const [code] of Object.entries(projectMap)) {
      const salesData = salesLookup[code] || {};
      qTotalLead += getQuarterlySum(salesData, 'totallead_', '', q);
      qQualityLead += getQuarterlySum(salesData, 'qualitylead_', '', q);
      qWalk += getQuarterlySum(salesData, 'lead_walk_', '', q);
      qBook += getQuarterlySum(salesData, 'lead_book_', '', q);
    }
    quarterlyTotals[q] = {
      quarter: q,
      totalLead: qTotalLead,
      qualityLead: qQualityLead,
      walk: qWalk,
      book: qBook,
    };
  });
  const quarterlyPerformance = Object.values(quarterlyTotals);

  // Get team members
  let salesManagers = [];
  let marketingManagers = [];

  // Get Sales Managers
  const mgrResult = await pool.query(`
    SELECT DISTINCT name, position, project_code, project_name
    FROM "Project_User_Mapping"
    WHERE department = 'Sale' AND role_type = 'MGR' AND project_code = ANY($1)
    ORDER BY name
  `, [projectCodes]);

  const mgrMap = {};
  mgrResult.rows.forEach(row => {
    if (!mgrMap[row.name]) {
      mgrMap[row.name] = { name: row.name, position: row.position, projects: [] };
    }
    mgrMap[row.name].projects.push({ projectCode: row.project_code, projectName: row.project_name });
  });
  salesManagers = Object.values(mgrMap);

  // Get Marketing Managers
  const mktResult = await pool.query(`
    SELECT DISTINCT name, position, project_code, project_name
    FROM "Project_User_Mapping"
    WHERE department = 'Mkt' AND role_type = 'MGR' AND project_code = ANY($1)
    ORDER BY name
  `, [projectCodes]);

  const mktMap = {};
  mktResult.rows.forEach(row => {
    if (!mktMap[row.name]) {
      mktMap[row.name] = { name: row.name, position: row.position, projects: [] };
    }
    mktMap[row.name].projects.push({ projectCode: row.project_code, projectName: row.project_name });
  });
  marketingManagers = Object.values(mktMap);

  // Calculate KPIs
  const kpis = {
    presaleAchievePct: grandTotals.presaleTarget > 0 ? (grandTotals.presaleActual / grandTotals.presaleTarget) * 100 : 0,
    revenueAchievePct: grandTotals.revenueTarget > 0 ? (grandTotals.revenueActual / grandTotals.revenueTarget) * 100 : 0,
    avgCPL: grandTotals.totalLead > 0 ? grandTotals.mktExpense / grandTotals.totalLead : 0,
    avgCPQL: grandTotals.qualityLead > 0 ? grandTotals.mktExpense / grandTotals.qualityLead : 0,
    leadToQLRatio: grandTotals.qualityLead > 0 ? grandTotals.totalLead / grandTotals.qualityLead : 0,
    qlToWalkRatio: grandTotals.walk > 0 ? grandTotals.qualityLead / grandTotals.walk : 0,
    walkToBookRatio: grandTotals.book > 0 ? grandTotals.walk / grandTotals.book : 0,
    mktPctBooking: grandTotals.booking > 0 ? (grandTotals.mktExpense / grandTotals.booking) * 100 : 0,
  };

  res.json({
    name: vp.name,
    position: vp.position,
    roleType: vp.role_type,
    projectCount: projects.length,
    projects,
    grandTotals,
    kpis,
    quarterlyPerformance,
    team: { salesManagers, marketingManagers },
  });
}));

// ============================================================
// GET /api/sales-2025-v2/employee/:name
// ข้อมูล Employee (MGR Sale/Mkt) รายบุคคล
// ============================================================
router.get('/employee/:name', asyncHandler(async (req, res) => {
  const { name } = req.params;

  // Get employee info
  const empResult = await pool.query(`
    SELECT DISTINCT name, position, role_type, department
    FROM "Project_User_Mapping"
    WHERE name = $1 AND role_type = 'MGR'
    LIMIT 1
  `, [name]);

  if (empResult.rows.length === 0) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const emp = empResult.rows[0];

  // Get all projects with months for this employee
  const projectsResult = await pool.query(`
    SELECT project_code, project_name, month
    FROM "Project_User_Mapping"
    WHERE name = $1 AND role_type = 'MGR'
    ORDER BY project_code
  `, [name]);

  // Group by project
  const projectMap = {};
  projectsResult.rows.forEach(row => {
    if (!projectMap[row.project_code]) {
      projectMap[row.project_code] = {
        projectCode: row.project_code,
        projectName: row.project_name,
        months: [],
      };
    }
    projectMap[row.project_code].months.push(row.month);
  });

  // Get all sales_mkt data at once
  const projectCodes = Object.keys(projectMap);
  if (projectCodes.length === 0) {
    return res.json({
      name: emp.name,
      position: emp.position,
      roleType: emp.role_type,
      department: emp.department,
      projectCount: 0,
      projects: [],
      grandTotals: {},
      kpis: {},
    });
  }

  const salesDataResult = await pool.query(`
    SELECT
      projectcode as project_code,
      bud,
      target_presale_totalthb,
      book_totalthb,
      contract_totalthb,
      target_revenue_totalthb,
      revenue_totalthb,
      mktexpense_total,
      totallead_total,
      qualitylead_total,
      lead_walk_total,
      lead_book_total,
      livnex_totalthb
    FROM sales_mkt
    WHERE projectcode = ANY($1)
  `, [projectCodes]);

  // Build lookup
  const salesLookup = {};
  salesDataResult.rows.forEach(row => {
    salesLookup[row.project_code] = row;
  });

  // Process projects and calculate totals
  const projects = [];
  let grandTotals = {
    presaleTarget: 0, presaleActual: 0,
    revenueTarget: 0, revenueActual: 0,
    mktExpense: 0, totalLead: 0, qualityLead: 0,
    walk: 0, book: 0, booking: 0, livnex: 0,
  };

  for (const [code, proj] of Object.entries(projectMap)) {
    proj.months = proj.months.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
    const responsibleQuarters = [...new Set(proj.months.map(m => monthToQuarter(m)).filter(q => q))];

    const salesData = salesLookup[code] || {};
    const booking = parseNum(salesData.book_totalthb);
    const contract = parseNum(salesData.contract_totalthb);
    const presaleActual = booking + contract;
    const presaleTarget = parseNum(salesData.target_presale_totalthb);
    const revenueTarget = parseNum(salesData.target_revenue_totalthb);
    const revenueActual = parseNum(salesData.revenue_totalthb);
    const mktExpense = parseNum(salesData.mktexpense_total);
    const totalLead = parseNum(salesData.totallead_total);
    const qualityLead = parseNum(salesData.qualitylead_total);
    const walk = parseNum(salesData.lead_walk_total);
    const book = parseNum(salesData.lead_book_total);
    const livnex = parseNum(salesData.livnex_totalthb);

    const projectTotals = {
      presaleTarget, presaleActual, revenueTarget, revenueActual,
      mktExpense, totalLead, qualityLead, walk, book, booking, livnex,
    };

    // Add to grand totals
    grandTotals.presaleTarget += presaleTarget;
    grandTotals.presaleActual += presaleActual;
    grandTotals.revenueTarget += revenueTarget;
    grandTotals.revenueActual += revenueActual;
    grandTotals.mktExpense += mktExpense;
    grandTotals.totalLead += totalLead;
    grandTotals.qualityLead += qualityLead;
    grandTotals.walk += walk;
    grandTotals.book += book;
    grandTotals.booking += booking;
    grandTotals.livnex += livnex;

    projects.push({
      ...proj,
      bud: salesData.bud || '',
      responsibleQuarters,
      totals: projectTotals,
      presaleAchievePct: presaleTarget > 0 ? (presaleActual / presaleTarget) * 100 : 0,
      revenueAchievePct: revenueTarget > 0 ? (revenueActual / revenueTarget) * 100 : 0,
    });
  }

  // Calculate KPIs
  const kpis = {
    presaleAchievePct: grandTotals.presaleTarget > 0 ? (grandTotals.presaleActual / grandTotals.presaleTarget) * 100 : 0,
    revenueAchievePct: grandTotals.revenueTarget > 0 ? (grandTotals.revenueActual / grandTotals.revenueTarget) * 100 : 0,
    avgCPL: grandTotals.totalLead > 0 ? grandTotals.mktExpense / grandTotals.totalLead : 0,
    avgCPQL: grandTotals.qualityLead > 0 ? grandTotals.mktExpense / grandTotals.qualityLead : 0,
    leadToQLRatio: grandTotals.qualityLead > 0 ? grandTotals.totalLead / grandTotals.qualityLead : 0,
    qlToWalkRatio: grandTotals.walk > 0 ? grandTotals.qualityLead / grandTotals.walk : 0,
    walkToBookRatio: grandTotals.book > 0 ? grandTotals.walk / grandTotals.book : 0,
    mktPctBooking: grandTotals.booking > 0 ? (grandTotals.mktExpense / grandTotals.booking) * 100 : 0,
  };

  res.json({
    name: emp.name,
    position: emp.position,
    roleType: emp.role_type,
    department: emp.department,
    projectCount: projects.length,
    projects,
    grandTotals,
    kpis,
  });
}));

export default router;
