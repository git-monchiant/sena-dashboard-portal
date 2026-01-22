/**
 * Sales 2025 API Routes - V2
 * ใช้ table: sales_mkt, Project_User_Mapping
 */
import { Router } from 'express';
import { pool } from '../db/index.mjs';
import { asyncHandler } from '../utils/helpers.mjs';

const router = Router();

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

// Helper: Sum monthly columns
const sumMonthlyColumns = (row, prefix, suffix = '') => {
  return months.reduce((sum, m) => {
    const col = `${prefix}${m}${suffix}`;
    const val = parseFloat(row[col]) || 0;
    return sum + val;
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
    const val = parseFloat(row[col]) || 0;
    return sum + val;
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

// ============================================================
// GET /api/sales-2025-v2/summary
// ภาพรวม performance รวมทุก project (หรือ filter ตาม query)
// ============================================================
router.get('/summary', asyncHandler(async (req, res) => {
  const { bud, quarter, project } = req.query;

  let query = `SELECT * FROM sales_mkt WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (bud) {
    query += ` AND bud = $${paramIndex++}`;
    params.push(bud);
  }
  if (project) {
    query += ` AND projectcode = $${paramIndex++}`;
    params.push(project);
  }

  const result = await pool.query(query, params);

  // Aggregate by quarter or total
  if (quarter) {
    // Return single quarter data
    let totals = {
      quarter,
      projectCount: result.rows.length,
      targetContract: 0,
      actualBooking: 0,
      actualContract: 0,
      targetRevenue: 0,
      actualRevenue: 0,
      mktExpense: 0,
      totalLead: 0,
      qualityLead: 0,
      leadWalk: 0,
      leadBook: 0,
    };

    result.rows.forEach(row => {
      totals.targetContract += getQuarterlySum(row, 'target_', '_thb', quarter);
      totals.actualBooking += getQuarterlySum(row, 'actual_book_', '_thb', quarter);
      totals.actualContract += getQuarterlySum(row, 'actual_contract_', '_thb', quarter);
      totals.targetRevenue += getQuarterlySum(row, 'target_revenue_', '_thb', quarter);
      totals.actualRevenue += getQuarterlySum(row, 'actual_revenue_', '_thb', quarter);
      totals.mktExpense += getQuarterlySum(row, 'actual_mktexpense_', '', quarter);
      totals.totalLead += getQuarterlySum(row, 'actual_totallead_', '', quarter);
      totals.qualityLead += getQuarterlySum(row, 'actual_qualitylead_', '', quarter);
      totals.leadWalk += getQuarterlySum(row, 'actual_lead_walk_', '', quarter);
      totals.leadBook += getQuarterlySum(row, 'actual_lead_book_', '', quarter);
    });

    res.json([totals]);
  } else {
    // Return all quarters
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const summaryByQuarter = quarters.map(q => {
      let totals = {
        quarter: q,
        projectCount: result.rows.length,
        targetContract: 0,
        actualBooking: 0,
        actualContract: 0,
        targetRevenue: 0,
        actualRevenue: 0,
        mktExpense: 0,
        totalLead: 0,
        qualityLead: 0,
        leadWalk: 0,
        leadBook: 0,
      };

      result.rows.forEach(row => {
        totals.targetContract += getQuarterlySum(row, 'target_', '_thb', q);
        totals.actualBooking += getQuarterlySum(row, 'actual_book_', '_thb', q);
        totals.actualContract += getQuarterlySum(row, 'actual_contract_', '_thb', q);
        totals.targetRevenue += getQuarterlySum(row, 'target_revenue_', '_thb', q);
        totals.actualRevenue += getQuarterlySum(row, 'actual_revenue_', '_thb', q);
        totals.mktExpense += getQuarterlySum(row, 'actual_mktexpense_', '', q);
        totals.totalLead += getQuarterlySum(row, 'actual_totallead_', '', q);
        totals.qualityLead += getQuarterlySum(row, 'actual_qualitylead_', '', q);
        totals.leadWalk += getQuarterlySum(row, 'actual_lead_walk_', '', q);
        totals.leadBook += getQuarterlySum(row, 'actual_lead_book_', '', q);
      });

      return totals;
    });

    res.json(summaryByQuarter);
  }
}));

// ============================================================
// GET /api/sales-2025-v2/projects
// รายการ project พร้อม performance
// ============================================================
router.get('/projects', asyncHandler(async (req, res) => {
  const { bud, quarter } = req.query;

  let query = `SELECT * FROM sales_mkt WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (bud) {
    query += ` AND bud = $${paramIndex++}`;
    params.push(bud);
  }

  query += ' ORDER BY bud, projectcode';

  const result = await pool.query(query, params);

  const projects = result.rows.map(row => {
    // Calculate totals or quarterly based on filter
    const q = quarter || null;

    const targetContract = q
      ? getQuarterlySum(row, 'target_', '_thb', q)
      : parseFloat(row.target_totalthb) || 0;

    const actualBooking = q
      ? getQuarterlySum(row, 'actual_book_', '_thb', q)
      : parseFloat(row.actual_book_totalthb) || 0;

    const actualContract = q
      ? getQuarterlySum(row, 'actual_contract_', '_thb', q)
      : parseFloat(row.actual_contract_totalthb) || 0;

    const targetRevenue = q
      ? getQuarterlySum(row, 'target_revenue_', '_thb', q)
      : parseFloat(row.target_revenue_totalthb) || 0;

    const actualRevenue = q
      ? getQuarterlySum(row, 'actual_revenue_', '_thb', q)
      : parseFloat(row.actual_revenue_totalthb) || 0;

    const mktExpense = q
      ? getQuarterlySum(row, 'actual_mktexpense_', '', q)
      : parseFloat(row.actual_mktexpense_total) || 0;

    const totalLead = q
      ? getQuarterlySum(row, 'actual_totallead_', '', q)
      : parseFloat(row.actual_totallead_total) || 0;

    const qualityLead = q
      ? getQuarterlySum(row, 'actual_qualitylead_', '', q)
      : parseFloat(row.actual_qualitylead_total) || 0;

    const leadWalk = q
      ? getQuarterlySum(row, 'actual_lead_walk_', '', q)
      : parseFloat(row.actual_lead_walk_total) || 0;

    const leadBook = q
      ? getQuarterlySum(row, 'actual_lead_book_', '', q)
      : parseFloat(row.actual_lead_book_total) || 0;

    return {
      projectCode: row.projectcode,
      projectName: row.projectname,
      bud: row.bud,
      opm: row.opm,
      segment: row.segment,
      status: row.status,
      targetContract,
      actualBooking,
      actualContract,
      targetRevenue,
      actualRevenue,
      mktExpense,
      totalLead,
      qualityLead,
      leadWalk,
      leadBook,
      contractAchievePct: targetContract > 0 ? (actualContract / targetContract) * 100 : 0,
      revenueAchievePct: targetRevenue > 0 ? (actualRevenue / targetRevenue) * 100 : 0,
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
    return {
      month,
      targetContract: parseFloat(row[`target_${m}_thb`]) || 0,
      actualBooking: parseFloat(row[`actual_book_${m}_thb`]) || 0,
      targetRevenue: parseFloat(row[`target_revenue_${m}_thb`]) || 0,
      actualRevenue: parseFloat(row[`actual_revenue_${m}_thb`]) || 0,
      mktExpense: parseFloat(row[`actual_mktexpense_${m}`]) || 0,
      totalLead: parseFloat(row[`actual_totallead_${m}`]) || 0,
      qualityLead: parseFloat(row[`actual_qualitylead_${m}`]) || 0,
      leadWalk: parseFloat(row[`actual_lead_walk_${m}`]) || 0,
      leadBook: parseFloat(row[`actual_lead_book_${m}`]) || 0,
    };
  });

  // Quarterly breakdown
  const quarterlyData = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => ({
    quarter: q,
    targetContract: getQuarterlySum(row, 'target_', '_thb', q),
    actualBooking: getQuarterlySum(row, 'actual_book_', '_thb', q),
    targetRevenue: getQuarterlySum(row, 'target_revenue_', '_thb', q),
    actualRevenue: getQuarterlySum(row, 'actual_revenue_', '_thb', q),
    mktExpense: getQuarterlySum(row, 'actual_mktexpense_', '', q),
    totalLead: getQuarterlySum(row, 'actual_totallead_', '', q),
    qualityLead: getQuarterlySum(row, 'actual_qualitylead_', '', q),
    leadWalk: getQuarterlySum(row, 'actual_lead_walk_', '', q),
    leadBook: getQuarterlySum(row, 'actual_lead_book_', '', q),
  }));

  // Get team members from mapping
  const teamResult = await pool.query(`
    SELECT department, role_type, position, name, month
    FROM "Project_User_Mapping"
    WHERE project_code = $1
    ORDER BY department, role_type DESC, name
  `, [projectCode]);

  // Group team by person
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
    teamMap[key].months.push(r.month);
  });

  res.json({
    projectCode: row.projectcode,
    projectName: row.projectname,
    bud: row.bud,
    opm: row.opm,
    segment: row.segment,
    status: row.status,
    type: row.type,
    pricePerUnit: row.priceperunit,
    totalUnits: row.totalunits,
    unitsSold: row.unitssold,
    unitsRemaining: row.unitsremaining,
    totals: {
      targetContract: parseFloat(row.target_totalthb) || 0,
      actualBooking: parseFloat(row.actual_book_totalthb) || 0,
      targetRevenue: parseFloat(row.target_revenue_totalthb) || 0,
      actualRevenue: parseFloat(row.actual_revenue_totalthb) || 0,
      mktExpense: parseFloat(row.actual_mktexpense_total) || 0,
      totalLead: parseFloat(row.actual_totallead_total) || 0,
      qualityLead: parseFloat(row.actual_qualitylead_total) || 0,
      leadWalk: parseFloat(row.actual_lead_walk_total) || 0,
      leadBook: parseFloat(row.actual_lead_book_total) || 0,
    },
    monthlyData,
    quarterlyData,
    team: Object.values(teamMap),
  });
}));

export default router;
