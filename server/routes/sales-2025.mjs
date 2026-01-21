/**
 * Sales 2025 API Routes
 */
import { Router } from 'express';
import { pool } from '../db/index.mjs';
import { monthToQuarter, monthOrder, asyncHandler } from '../utils/helpers.mjs';

const router = Router();

// Get filter options (VP, MGR, Projects, etc.)
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
      SELECT DISTINCT project_code, project_name, bud
      FROM "Performance2025"
      ORDER BY bud, project_code
    `),
    pool.query(`
      SELECT DISTINCT bud FROM "Performance2025" ORDER BY bud
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

// Get performance data with filters
router.get('/performance', asyncHandler(async (req, res) => {
  const { vp, mgr, project, quarter, bud } = req.query;

  // If VP or MGR filter is applied, we need to filter by their responsible quarters
  if (vp || mgr) {
    const personName = vp || mgr;
    const roleType = vp ? 'VP' : 'MGR';

    // Get project-month mapping for this person
    const mappingResult = await pool.query(`
      SELECT project_code, month FROM "Project_User_Mapping"
      WHERE department = 'Sale' AND role_type = $1 AND name = $2
    `, [roleType, personName]);

    // Group by project and get quarters
    const projectQuarters = {};
    mappingResult.rows.forEach(row => {
      if (!projectQuarters[row.project_code]) {
        projectQuarters[row.project_code] = new Set();
      }
      const q = monthToQuarter(row.month);
      if (q) projectQuarters[row.project_code].add(q);
    });

    // Build conditions for (project_code, quarter) pairs
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    for (const [projCode, quarters] of Object.entries(projectQuarters)) {
      const quarterArray = Array.from(quarters);
      conditions.push(`(p.project_code = $${paramIndex} AND p.quarter = ANY($${paramIndex + 1}))`);
      params.push(projCode);
      params.push(quarterArray);
      paramIndex += 2;
    }

    if (conditions.length === 0) {
      return res.json([]);
    }

    let query = `
      SELECT
        p.bud, p.opm, p.project_code, p.project_name, p.quarter,
        COALESCE(NULLIF(p.booking_actual, '-'), '0')::numeric as booking_actual,
        COALESCE(NULLIF(p.livnex_actual, '-'), '0')::numeric as livnex_actual,
        COALESCE(NULLIF(p.presale_target, '-'), '0')::numeric as presale_target,
        COALESCE(NULLIF(p.presale_actual, '-'), '0')::numeric as presale_actual,
        COALESCE(NULLIF(p.presale_achieve_pct, '-'), '0')::numeric as presale_achieve_pct,
        COALESCE(NULLIF(p.revenue_target, '-'), '0')::numeric as revenue_target,
        COALESCE(NULLIF(p.revenue_actual, '-'), '0')::numeric as revenue_actual,
        COALESCE(NULLIF(p.revenue_achieve_pct, '-'), '0')::numeric as revenue_achieve_pct,
        COALESCE(NULLIF(p.mkt_expense_actual, '-'), '0')::numeric as mkt_expense_actual,
        COALESCE(NULLIF(p.total_lead, '-'), '0')::numeric as total_lead,
        COALESCE(NULLIF(p.quality_lead, '-'), '0')::numeric as quality_lead,
        COALESCE(NULLIF(p.lead_new_rem_walk, '-'), '0')::numeric as walk,
        COALESCE(NULLIF(p.lead_new_rem_book, '-'), '0')::numeric as book,
        COALESCE(NULLIF(p.lead_to_walk, '-'), '0')::numeric as lead_to_walk,
        COALESCE(NULLIF(p.walk_to_book, '-'), '0')::numeric as walk_to_book,
        COALESCE(NULLIF(p.cpl, '-'), '0')::numeric as cpl,
        COALESCE(NULLIF(p.cpql, '-'), '0')::numeric as cpql,
        COALESCE(NULLIF(p.mkt_pct_booking, '-'), '0')::numeric as mkt_pct_booking,
        COALESCE(NULLIF(p.mkt_pct_presale_livnex, '-'), '0')::numeric as mkt_pct_presale_livnex,
        COALESCE(NULLIF(p.mkt_pct_revenue, '-'), '0')::numeric as mkt_pct_revenue
      FROM "Performance2025" p
      WHERE (${conditions.join(' OR ')})
    `;

    // Additional filters
    if (project) {
      query += ` AND p.project_code = $${paramIndex}`;
      params.push(project);
      paramIndex++;
    }
    if (quarter) {
      query += ` AND p.quarter = $${paramIndex}`;
      params.push(quarter);
      paramIndex++;
    }
    if (bud) {
      query += ` AND p.bud = $${paramIndex}`;
      params.push(bud);
      paramIndex++;
    }

    query += ' ORDER BY p.bud, p.project_code, p.quarter';

    const result = await pool.query(query, params);
    return res.json(result.rows);
  }

  // No VP/MGR filter - use simple query
  let query = `
    SELECT
      p.bud, p.opm, p.project_code, p.project_name, p.quarter,
      COALESCE(NULLIF(p.booking_actual, '-'), '0')::numeric as booking_actual,
      COALESCE(NULLIF(p.livnex_actual, '-'), '0')::numeric as livnex_actual,
      COALESCE(NULLIF(p.presale_target, '-'), '0')::numeric as presale_target,
      COALESCE(NULLIF(p.presale_actual, '-'), '0')::numeric as presale_actual,
      COALESCE(NULLIF(p.presale_achieve_pct, '-'), '0')::numeric as presale_achieve_pct,
      COALESCE(NULLIF(p.revenue_target, '-'), '0')::numeric as revenue_target,
      COALESCE(NULLIF(p.revenue_actual, '-'), '0')::numeric as revenue_actual,
      COALESCE(NULLIF(p.revenue_achieve_pct, '-'), '0')::numeric as revenue_achieve_pct,
      COALESCE(NULLIF(p.mkt_expense_actual, '-'), '0')::numeric as mkt_expense_actual,
      COALESCE(NULLIF(p.total_lead, '-'), '0')::numeric as total_lead,
      COALESCE(NULLIF(p.quality_lead, '-'), '0')::numeric as quality_lead,
      COALESCE(NULLIF(p.lead_new_rem_walk, '-'), '0')::numeric as walk,
      COALESCE(NULLIF(p.lead_new_rem_book, '-'), '0')::numeric as book,
      COALESCE(NULLIF(p.lead_to_walk, '-'), '0')::numeric as lead_to_walk,
      COALESCE(NULLIF(p.walk_to_book, '-'), '0')::numeric as walk_to_book,
      COALESCE(NULLIF(p.cpl, '-'), '0')::numeric as cpl,
      COALESCE(NULLIF(p.cpql, '-'), '0')::numeric as cpql,
      COALESCE(NULLIF(p.mkt_pct_booking, '-'), '0')::numeric as mkt_pct_booking,
      COALESCE(NULLIF(p.mkt_pct_presale_livnex, '-'), '0')::numeric as mkt_pct_presale_livnex,
      COALESCE(NULLIF(p.mkt_pct_revenue, '-'), '0')::numeric as mkt_pct_revenue
    FROM "Performance2025" p
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (project) {
    query += ` AND p.project_code = $${paramIndex}`;
    params.push(project);
    paramIndex++;
  }
  if (quarter) {
    query += ` AND p.quarter = $${paramIndex}`;
    params.push(quarter);
    paramIndex++;
  }
  if (bud) {
    query += ` AND p.bud = $${paramIndex}`;
    params.push(bud);
    paramIndex++;
  }

  query += ' ORDER BY p.bud, p.project_code, p.quarter';

  const result = await pool.query(query, params);
  res.json(result.rows);
}));

// Get sales team for a project
router.get('/team/:projectCode', asyncHandler(async (req, res) => {
  const { projectCode } = req.params;

  const result = await pool.query(`
    SELECT department, role_type, position, name, month
    FROM "Project_User_Mapping"
    WHERE project_code = $1 AND department IN ('Sale', 'Mkt')
    ORDER BY department, role_type DESC, name
  `, [projectCode]);

  // Group by person
  const grouped = {};
  result.rows.forEach(row => {
    // For Marketing department: only include MGR level, skip VP
    if (row.department === 'Mkt' && row.role_type === 'VP') {
      return; // Skip VP from Marketing
    }
    // For Marketing department, use 'MKT' as roleType
    const roleType = row.department === 'Mkt' ? 'MKT' : row.role_type;
    const key = `${roleType}|${row.name}|${row.position}`;
    if (!grouped[key]) {
      grouped[key] = {
        roleType: roleType,
        name: row.name,
        position: row.position,
        months: [],
      };
    }
    grouped[key].months.push(row.month);
  });

  // Sort months
  const team = Object.values(grouped).map(p => ({
    ...p,
    months: p.months.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b)),
  }));

  res.json(team);
}));

// Get summary by quarter
router.get('/summary', asyncHandler(async (req, res) => {
  const { vp, mgr, bud, quarter, project } = req.query;

  // If VP or MGR filter is applied, we need to filter by their responsible quarters
  if (vp || mgr) {
    const personName = vp || mgr;
    const roleType = vp ? 'VP' : 'MGR';

    // Get project-month mapping for this person
    const mappingResult = await pool.query(`
      SELECT project_code, month FROM "Project_User_Mapping"
      WHERE department = 'Sale' AND role_type = $1 AND name = $2
    `, [roleType, personName]);

    // Group by project and get quarters
    const projectQuarters = {};
    mappingResult.rows.forEach(row => {
      if (!projectQuarters[row.project_code]) {
        projectQuarters[row.project_code] = new Set();
      }
      const q = monthToQuarter(row.month);
      if (q) projectQuarters[row.project_code].add(q);
    });

    // Build conditions for (project_code, quarter) pairs
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    for (const [projCode, quarters] of Object.entries(projectQuarters)) {
      const quarterArray = Array.from(quarters);
      conditions.push(`(p.project_code = $${paramIndex} AND p.quarter = ANY($${paramIndex + 1}))`);
      params.push(projCode);
      params.push(quarterArray);
      paramIndex += 2;
    }

    if (conditions.length === 0) {
      return res.json([]);
    }

    let query = `
      SELECT
        p.quarter,
        COUNT(DISTINCT p.project_code) as project_count,
        SUM(COALESCE(NULLIF(p.booking_actual, '-'), '0')::numeric) as total_booking,
        SUM(COALESCE(NULLIF(p.livnex_actual, '-'), '0')::numeric) as total_livnex,
        SUM(COALESCE(NULLIF(p.presale_target, '-'), '0')::numeric) as total_presale_target,
        SUM(COALESCE(NULLIF(p.presale_actual, '-'), '0')::numeric) as total_presale_actual,
        SUM(COALESCE(NULLIF(p.revenue_target, '-'), '0')::numeric) as total_revenue_target,
        SUM(COALESCE(NULLIF(p.revenue_actual, '-'), '0')::numeric) as total_revenue_actual,
        SUM(COALESCE(NULLIF(p.total_lead, '-'), '0')::numeric) as total_lead,
        SUM(COALESCE(NULLIF(p.quality_lead, '-'), '0')::numeric) as total_quality_lead,
        SUM(COALESCE(NULLIF(p.lead_new_rem_walk, '-'), '0')::numeric) as total_walk,
        SUM(COALESCE(NULLIF(p.lead_new_rem_book, '-'), '0')::numeric) as total_book
      FROM "Performance2025" p
      WHERE (${conditions.join(' OR ')})
    `;

    if (bud) {
      query += ` AND p.bud = $${paramIndex}`;
      params.push(bud);
      paramIndex++;
    }
    if (quarter) {
      query += ` AND p.quarter = $${paramIndex}`;
      params.push(quarter);
      paramIndex++;
    }
    if (project) {
      query += ` AND p.project_code = $${paramIndex}`;
      params.push(project);
      paramIndex++;
    }

    query += ' GROUP BY p.quarter ORDER BY p.quarter';

    const result = await pool.query(query, params);
    return res.json(result.rows);
  }

  // No VP/MGR filter - use simple query
  let query = `
    SELECT
      p.quarter,
      COUNT(DISTINCT p.project_code) as project_count,
      SUM(COALESCE(NULLIF(p.booking_actual, '-'), '0')::numeric) as total_booking,
      SUM(COALESCE(NULLIF(p.livnex_actual, '-'), '0')::numeric) as total_livnex,
      SUM(COALESCE(NULLIF(p.presale_target, '-'), '0')::numeric) as total_presale_target,
      SUM(COALESCE(NULLIF(p.presale_actual, '-'), '0')::numeric) as total_presale_actual,
      SUM(COALESCE(NULLIF(p.revenue_target, '-'), '0')::numeric) as total_revenue_target,
      SUM(COALESCE(NULLIF(p.revenue_actual, '-'), '0')::numeric) as total_revenue_actual,
      SUM(COALESCE(NULLIF(p.total_lead, '-'), '0')::numeric) as total_lead,
      SUM(COALESCE(NULLIF(p.quality_lead, '-'), '0')::numeric) as total_quality_lead,
      SUM(COALESCE(NULLIF(p.lead_new_rem_walk, '-'), '0')::numeric) as total_walk,
      SUM(COALESCE(NULLIF(p.lead_new_rem_book, '-'), '0')::numeric) as total_book
    FROM "Performance2025" p
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (bud) {
    query += ` AND p.bud = $${paramIndex}`;
    params.push(bud);
    paramIndex++;
  }
  if (quarter) {
    query += ` AND p.quarter = $${paramIndex}`;
    params.push(quarter);
    paramIndex++;
  }
  if (project) {
    query += ` AND p.project_code = $${paramIndex}`;
    params.push(project);
    paramIndex++;
  }

  query += ' GROUP BY p.quarter ORDER BY p.quarter';

  const result = await pool.query(query, params);
  res.json(result.rows);
}));

// Marketing Performance Summary
router.get('/marketing-summary', asyncHandler(async (req, res) => {
  const { vp, mgr, bud, quarter, project } = req.query;

  // If VP or MGR filter is applied
  if (vp || mgr) {
    const personName = vp || mgr;
    const roleType = vp ? 'VP' : 'MGR';

    const mappingResult = await pool.query(`
      SELECT project_code, month FROM "Project_User_Mapping"
      WHERE department = 'Sale' AND role_type = $1 AND name = $2
    `, [roleType, personName]);

    const projectQuarters = {};
    mappingResult.rows.forEach(row => {
      if (!projectQuarters[row.project_code]) {
        projectQuarters[row.project_code] = new Set();
      }
      const q = monthToQuarter(row.month);
      if (q) projectQuarters[row.project_code].add(q);
    });

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    for (const [projCode, quarters] of Object.entries(projectQuarters)) {
      const quarterArray = Array.from(quarters);
      conditions.push(`(p.project_code = $${paramIndex} AND p.quarter = ANY($${paramIndex + 1}))`);
      params.push(projCode);
      params.push(quarterArray);
      paramIndex += 2;
    }

    if (conditions.length === 0) {
      return res.json([]);
    }

    let query = `
      SELECT
        p.quarter,
        COUNT(DISTINCT p.project_code) as project_count,
        SUM(COALESCE(NULLIF(p.mkt_expense_actual, '-'), '0')::numeric) as total_mkt_expense,
        SUM(COALESCE(NULLIF(p.total_lead, '-'), '0')::numeric) as total_lead,
        SUM(COALESCE(NULLIF(p.quality_lead, '-'), '0')::numeric) as total_quality_lead,
        SUM(COALESCE(NULLIF(p.lead_new_rem_walk, '-'), '0')::numeric) as total_walk,
        SUM(COALESCE(NULLIF(p.lead_new_rem_book, '-'), '0')::numeric) as total_book,
        SUM(COALESCE(NULLIF(p.booking_actual, '-'), '0')::numeric) as total_booking,
        SUM(COALESCE(NULLIF(p.presale_target, '-'), '0')::numeric) as total_presale_target,
        SUM(COALESCE(NULLIF(p.presale_actual, '-'), '0')::numeric) + SUM(COALESCE(NULLIF(p.livnex_actual, '-'), '0')::numeric) as total_presale_livnex,
        SUM(COALESCE(NULLIF(p.revenue_target, '-'), '0')::numeric) as total_revenue_target,
        SUM(COALESCE(NULLIF(p.revenue_actual, '-'), '0')::numeric) as total_revenue,
        AVG(COALESCE(NULLIF(p.cpl, '-'), '0')::numeric) as avg_cpl,
        AVG(COALESCE(NULLIF(p.cpql, '-'), '0')::numeric) as avg_cpql,
        AVG(COALESCE(NULLIF(p.mkt_pct_booking, '-'), '0')::numeric) as avg_mkt_pct_booking,
        AVG(COALESCE(NULLIF(p.mkt_pct_presale_livnex, '-'), '0')::numeric) as avg_mkt_pct_presale_livnex,
        AVG(COALESCE(NULLIF(p.mkt_pct_revenue, '-'), '0')::numeric) as avg_mkt_pct_revenue
      FROM "Performance2025" p
      WHERE (${conditions.join(' OR ')})
    `;

    if (bud) {
      query += ` AND p.bud = $${paramIndex}`;
      params.push(bud);
      paramIndex++;
    }
    if (quarter) {
      query += ` AND p.quarter = $${paramIndex}`;
      params.push(quarter);
      paramIndex++;
    }
    if (project) {
      query += ` AND p.project_code = $${paramIndex}`;
      params.push(project);
      paramIndex++;
    }

    query += ' GROUP BY p.quarter ORDER BY p.quarter';

    const result = await pool.query(query, params);
    return res.json(result.rows);
  }

  // No VP/MGR filter
  let query = `
    SELECT
      p.quarter,
      COUNT(DISTINCT p.project_code) as project_count,
      SUM(COALESCE(NULLIF(p.mkt_expense_actual, '-'), '0')::numeric) as total_mkt_expense,
      SUM(COALESCE(NULLIF(p.total_lead, '-'), '0')::numeric) as total_lead,
      SUM(COALESCE(NULLIF(p.quality_lead, '-'), '0')::numeric) as total_quality_lead,
      SUM(COALESCE(NULLIF(p.lead_new_rem_walk, '-'), '0')::numeric) as total_walk,
      SUM(COALESCE(NULLIF(p.lead_new_rem_book, '-'), '0')::numeric) as total_book,
      SUM(COALESCE(NULLIF(p.booking_actual, '-'), '0')::numeric) as total_booking,
      SUM(COALESCE(NULLIF(p.presale_target, '-'), '0')::numeric) as total_presale_target,
      SUM(COALESCE(NULLIF(p.presale_actual, '-'), '0')::numeric) + SUM(COALESCE(NULLIF(p.livnex_actual, '-'), '0')::numeric) as total_presale_livnex,
      SUM(COALESCE(NULLIF(p.revenue_target, '-'), '0')::numeric) as total_revenue_target,
      SUM(COALESCE(NULLIF(p.revenue_actual, '-'), '0')::numeric) as total_revenue,
      AVG(COALESCE(NULLIF(p.cpl, '-'), '0')::numeric) as avg_cpl,
      AVG(COALESCE(NULLIF(p.cpql, '-'), '0')::numeric) as avg_cpql,
      AVG(COALESCE(NULLIF(p.mkt_pct_booking, '-'), '0')::numeric) as avg_mkt_pct_booking,
      AVG(COALESCE(NULLIF(p.mkt_pct_presale_livnex, '-'), '0')::numeric) as avg_mkt_pct_presale_livnex,
      AVG(COALESCE(NULLIF(p.mkt_pct_revenue, '-'), '0')::numeric) as avg_mkt_pct_revenue
    FROM "Performance2025" p
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (bud) {
    query += ` AND p.bud = $${paramIndex}`;
    params.push(bud);
    paramIndex++;
  }
  if (quarter) {
    query += ` AND p.quarter = $${paramIndex}`;
    params.push(quarter);
    paramIndex++;
  }
  if (project) {
    query += ` AND p.project_code = $${paramIndex}`;
    params.push(project);
    paramIndex++;
  }

  query += ' GROUP BY p.quarter ORDER BY p.quarter';

  const result = await pool.query(query, params);
  res.json(result.rows);
}));

// Marketing Performance - Project Detail Data
router.get('/marketing-projects', asyncHandler(async (req, res) => {
  const { vp, mgr, bud, quarter, project } = req.query;

  if (vp || mgr) {
    const personName = vp || mgr;
    const roleType = vp ? 'VP' : 'MGR';

    const mappingResult = await pool.query(`
      SELECT project_code, month FROM "Project_User_Mapping"
      WHERE department = 'Sale' AND role_type = $1 AND name = $2
    `, [roleType, personName]);

    const projectQuarters = {};
    mappingResult.rows.forEach(row => {
      if (!projectQuarters[row.project_code]) {
        projectQuarters[row.project_code] = new Set();
      }
      const q = monthToQuarter(row.month);
      if (q) projectQuarters[row.project_code].add(q);
    });

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    for (const [projCode, quarters] of Object.entries(projectQuarters)) {
      const quarterArray = Array.from(quarters);
      conditions.push(`(p.project_code = $${paramIndex} AND p.quarter = ANY($${paramIndex + 1}))`);
      params.push(projCode);
      params.push(quarterArray);
      paramIndex += 2;
    }

    if (conditions.length === 0) {
      return res.json([]);
    }

    let query = `
      SELECT
        p.project_code,
        p.project_name,
        p.bud,
        p.quarter,
        COALESCE(NULLIF(p.mkt_expense_actual, '-'), '0')::numeric as mkt_expense,
        COALESCE(NULLIF(p.total_lead, '-'), '0')::numeric as total_lead,
        COALESCE(NULLIF(p.quality_lead, '-'), '0')::numeric as quality_lead,
        COALESCE(NULLIF(p.booking_actual, '-'), '0')::numeric as booking,
        COALESCE(NULLIF(p.presale_actual, '-'), '0')::numeric + COALESCE(NULLIF(p.livnex_actual, '-'), '0')::numeric as presale_livnex,
        COALESCE(NULLIF(p.revenue_actual, '-'), '0')::numeric as revenue,
        COALESCE(NULLIF(p.cpl, '-'), '0')::numeric as cpl,
        COALESCE(NULLIF(p.cpql, '-'), '0')::numeric as cpql,
        COALESCE(NULLIF(p.mkt_pct_booking, '-'), '0')::numeric as mkt_pct_booking,
        COALESCE(NULLIF(p.mkt_pct_presale_livnex, '-'), '0')::numeric as mkt_pct_presale_livnex,
        COALESCE(NULLIF(p.mkt_pct_revenue, '-'), '0')::numeric as mkt_pct_revenue
      FROM "Performance2025" p
      WHERE (${conditions.join(' OR ')})
    `;

    if (bud) {
      query += ` AND p.bud = $${paramIndex}`;
      params.push(bud);
      paramIndex++;
    }
    if (quarter) {
      query += ` AND p.quarter = $${paramIndex}`;
      params.push(quarter);
      paramIndex++;
    }
    if (project) {
      query += ` AND p.project_code = $${paramIndex}`;
      params.push(project);
      paramIndex++;
    }

    query += ' ORDER BY p.quarter, p.project_code';

    const result = await pool.query(query, params);
    return res.json(result.rows);
  }

  // No VP/MGR filter
  let query = `
    SELECT
      p.project_code,
      p.project_name,
      p.bud,
      p.quarter,
      COALESCE(NULLIF(p.mkt_expense_actual, '-'), '0')::numeric as mkt_expense,
      COALESCE(NULLIF(p.total_lead, '-'), '0')::numeric as total_lead,
      COALESCE(NULLIF(p.quality_lead, '-'), '0')::numeric as quality_lead,
      COALESCE(NULLIF(p.booking_actual, '-'), '0')::numeric as booking,
      COALESCE(NULLIF(p.presale_actual, '-'), '0')::numeric + COALESCE(NULLIF(p.livnex_actual, '-'), '0')::numeric as presale_livnex,
      COALESCE(NULLIF(p.revenue_actual, '-'), '0')::numeric as revenue,
      COALESCE(NULLIF(p.cpl, '-'), '0')::numeric as cpl,
      COALESCE(NULLIF(p.cpql, '-'), '0')::numeric as cpql,
      COALESCE(NULLIF(p.mkt_pct_booking, '-'), '0')::numeric as mkt_pct_booking,
      COALESCE(NULLIF(p.mkt_pct_presale_livnex, '-'), '0')::numeric as mkt_pct_presale_livnex,
      COALESCE(NULLIF(p.mkt_pct_revenue, '-'), '0')::numeric as mkt_pct_revenue
    FROM "Performance2025" p
    WHERE 1=1
  `;
  const params = [];
  let paramIndex = 1;

  if (bud) {
    query += ` AND p.bud = $${paramIndex}`;
    params.push(bud);
    paramIndex++;
  }
  if (quarter) {
    query += ` AND p.quarter = $${paramIndex}`;
    params.push(quarter);
    paramIndex++;
  }
  if (project) {
    query += ` AND p.project_code = $${paramIndex}`;
    params.push(project);
    paramIndex++;
  }

  query += ' ORDER BY p.quarter, p.project_code';

  const result = await pool.query(query, params);
  res.json(result.rows);
}));

// Get employee performance summary
router.get('/employees', asyncHandler(async (req, res) => {
  const { roleType = 'VP', department = 'Sale', all } = req.query;

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
      WHERE department = $1 AND role_type = $2
      ORDER BY name
    `, [department, roleType]);
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

  // Query 3: Get ALL performance data at once
  const allPerfResult = await pool.query(`
    SELECT
      project_code,
      quarter,
      bud,
      COALESCE(NULLIF(presale_target, '-'), '0')::numeric as presale_target,
      COALESCE(NULLIF(presale_actual, '-'), '0')::numeric as presale_actual,
      COALESCE(NULLIF(revenue_target, '-'), '0')::numeric as revenue_target,
      COALESCE(NULLIF(revenue_actual, '-'), '0')::numeric as revenue_actual
    FROM "Performance2025"
  `);

  // Build performance lookup: project_code -> quarter -> data
  const perfLookup = {};
  allPerfResult.rows.forEach(row => {
    const key = `${row.project_code}|${row.quarter}`;
    if (!perfLookup[key]) {
      perfLookup[key] = [];
    }
    perfLookup[key].push(row);
  });

  // Process each employee using in-memory data
  const employees = [];
  for (const emp of employeesResult.rows) {
    const empDept = emp.department || department;
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
      });
      continue;
    }

    let totalPresaleTarget = 0;
    let totalPresaleActual = 0;
    let totalRevenueTarget = 0;
    let totalRevenueActual = 0;
    const budSet = new Set();

    for (const [projectCode, quarters] of Object.entries(projectQuarters)) {
      for (const quarter of quarters) {
        const key = `${projectCode}|${quarter}`;
        const perfRows = perfLookup[key] || [];
        perfRows.forEach(row => {
          if (row.bud) budSet.add(row.bud);
          totalPresaleTarget += parseFloat(row.presale_target) || 0;
          totalPresaleActual += parseFloat(row.presale_actual) || 0;
          totalRevenueTarget += parseFloat(row.revenue_target) || 0;
          totalRevenueActual += parseFloat(row.revenue_actual) || 0;
        });
      }
    }

    const presaleAchieve = totalPresaleTarget > 0 ? (totalPresaleActual / totalPresaleTarget) : 0;
    const revenueAchieve = totalRevenueTarget > 0 ? (totalRevenueActual / totalRevenueTarget) : 0;

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
    });
  }

  // Get unique BUD list for filter
  const allBuds = [...new Set(employees.flatMap(e => e.buds || []))].sort();

  res.json({ employees, budList: allBuds });
}));

// Get employee detail with projects
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

  const employee = empResult.rows[0];

  // Get projects with months
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

  // Grand totals for KPI cards
  let grandTotals = {
    presaleTarget: 0,
    presaleActual: 0,
    revenueTarget: 0,
    revenueActual: 0,
    mktExpense: 0,
    totalLead: 0,
    qualityLead: 0,
    walk: 0,
    book: 0,
    booking: 0,
    livnex: 0,
  };

  // Sort months and get performance
  const projects = [];
  for (const [code, proj] of Object.entries(projectMap)) {
    proj.months = proj.months.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
    const responsibleQuarters = [...new Set(proj.months.map(m => monthToQuarter(m)).filter(q => q))];

    // Get full performance for this project
    const perfResult = await pool.query(`
      SELECT
        quarter,
        bud,
        COALESCE(NULLIF(presale_target, '-'), '0')::numeric as presale_target,
        COALESCE(NULLIF(presale_actual, '-'), '0')::numeric as presale_actual,
        COALESCE(NULLIF(presale_achieve_pct, '-'), '0')::numeric as presale_achieve_pct,
        COALESCE(NULLIF(revenue_target, '-'), '0')::numeric as revenue_target,
        COALESCE(NULLIF(revenue_actual, '-'), '0')::numeric as revenue_actual,
        COALESCE(NULLIF(revenue_achieve_pct, '-'), '0')::numeric as revenue_achieve_pct,
        COALESCE(NULLIF(mkt_expense_actual, '-'), '0')::numeric as mkt_expense,
        COALESCE(NULLIF(total_lead, '-'), '0')::numeric as total_lead,
        COALESCE(NULLIF(quality_lead, '-'), '0')::numeric as quality_lead,
        COALESCE(NULLIF(lead_new_rem_walk, '-'), '0')::numeric as walk,
        COALESCE(NULLIF(lead_new_rem_book, '-'), '0')::numeric as book,
        COALESCE(NULLIF(booking_actual, '-'), '0')::numeric as booking,
        COALESCE(NULLIF(livnex_actual, '-'), '0')::numeric as livnex
      FROM "Performance2025"
      WHERE project_code = $1 AND quarter = ANY($2)
      ORDER BY quarter
    `, [code, responsibleQuarters]);

    // Aggregate to grand totals
    perfResult.rows.forEach(row => {
      grandTotals.presaleTarget += parseFloat(row.presale_target) || 0;
      grandTotals.presaleActual += parseFloat(row.presale_actual) || 0;
      grandTotals.revenueTarget += parseFloat(row.revenue_target) || 0;
      grandTotals.revenueActual += parseFloat(row.revenue_actual) || 0;
      grandTotals.mktExpense += parseFloat(row.mkt_expense) || 0;
      grandTotals.totalLead += parseFloat(row.total_lead) || 0;
      grandTotals.qualityLead += parseFloat(row.quality_lead) || 0;
      grandTotals.walk += parseFloat(row.walk) || 0;
      grandTotals.book += parseFloat(row.book) || 0;
      grandTotals.booking += parseFloat(row.booking) || 0;
      grandTotals.livnex += parseFloat(row.livnex) || 0;
    });

    projects.push({
      ...proj,
      bud: perfResult.rows[0]?.bud || '',
      responsibleQuarters,
      performance: perfResult.rows,
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
    name: employee.name,
    position: employee.position,
    roleType: employee.role_type,
    department: employee.department,
    projects,
    grandTotals,
    kpis,
  });
}));

// Get VP detail with combined Sales + Marketing metrics
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

  // Get performance data for each project
  const projects = [];
  let grandTotals = {
    presaleTarget: 0,
    presaleActual: 0,
    revenueTarget: 0,
    revenueActual: 0,
    mktExpense: 0,
    totalLead: 0,
    qualityLead: 0,
    walk: 0,
    book: 0,
    booking: 0,
    livnex: 0,
  };

  // Performance by quarter (for charts)
  const quarterlyPerformance = {};

  for (const [code, proj] of Object.entries(projectMap)) {
    proj.months = proj.months.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
    const responsibleQuarters = [...new Set(proj.months.map(m => monthToQuarter(m)).filter(q => q))];

    // Get combined Sales + Marketing performance
    const perfResult = await pool.query(`
      SELECT
        quarter,
        bud,
        COALESCE(NULLIF(presale_target, '-'), '0')::numeric as presale_target,
        COALESCE(NULLIF(presale_actual, '-'), '0')::numeric as presale_actual,
        COALESCE(NULLIF(presale_achieve_pct, '-'), '0')::numeric as presale_achieve_pct,
        COALESCE(NULLIF(revenue_target, '-'), '0')::numeric as revenue_target,
        COALESCE(NULLIF(revenue_actual, '-'), '0')::numeric as revenue_actual,
        COALESCE(NULLIF(revenue_achieve_pct, '-'), '0')::numeric as revenue_achieve_pct,
        COALESCE(NULLIF(mkt_expense_actual, '-'), '0')::numeric as mkt_expense,
        COALESCE(NULLIF(total_lead, '-'), '0')::numeric as total_lead,
        COALESCE(NULLIF(quality_lead, '-'), '0')::numeric as quality_lead,
        COALESCE(NULLIF(lead_new_rem_walk, '-'), '0')::numeric as walk,
        COALESCE(NULLIF(lead_new_rem_book, '-'), '0')::numeric as book,
        COALESCE(NULLIF(booking_actual, '-'), '0')::numeric as booking,
        COALESCE(NULLIF(livnex_actual, '-'), '0')::numeric as livnex,
        COALESCE(NULLIF(cpl, '-'), '0')::numeric as cpl,
        COALESCE(NULLIF(cpql, '-'), '0')::numeric as cpql,
        COALESCE(NULLIF(mkt_pct_booking, '-'), '0')::numeric as mkt_pct_booking
      FROM "Performance2025"
      WHERE project_code = $1 AND quarter = ANY($2)
      ORDER BY quarter
    `, [code, responsibleQuarters]);

    // Calculate project totals
    let projectTotals = {
      presaleTarget: 0,
      presaleActual: 0,
      revenueTarget: 0,
      revenueActual: 0,
      mktExpense: 0,
      totalLead: 0,
      qualityLead: 0,
      walk: 0,
      book: 0,
      booking: 0,
      livnex: 0,
    };

    perfResult.rows.forEach(row => {
      projectTotals.presaleTarget += parseFloat(row.presale_target) || 0;
      projectTotals.presaleActual += parseFloat(row.presale_actual) || 0;
      projectTotals.revenueTarget += parseFloat(row.revenue_target) || 0;
      projectTotals.revenueActual += parseFloat(row.revenue_actual) || 0;
      projectTotals.mktExpense += parseFloat(row.mkt_expense) || 0;
      projectTotals.totalLead += parseFloat(row.total_lead) || 0;
      projectTotals.qualityLead += parseFloat(row.quality_lead) || 0;
      projectTotals.walk += parseFloat(row.walk) || 0;
      projectTotals.book += parseFloat(row.book) || 0;
      projectTotals.booking += parseFloat(row.booking) || 0;
      projectTotals.livnex += parseFloat(row.livnex) || 0;

      // Add to quarterly performance
      if (!quarterlyPerformance[row.quarter]) {
        quarterlyPerformance[row.quarter] = {
          quarter: row.quarter,
          presaleTarget: 0,
          presaleActual: 0,
          revenueTarget: 0,
          revenueActual: 0,
          mktExpense: 0,
          totalLead: 0,
          qualityLead: 0,
          walk: 0,
          book: 0,
          booking: 0,
          livnex: 0,
        };
      }
      quarterlyPerformance[row.quarter].presaleTarget += parseFloat(row.presale_target) || 0;
      quarterlyPerformance[row.quarter].presaleActual += parseFloat(row.presale_actual) || 0;
      quarterlyPerformance[row.quarter].revenueTarget += parseFloat(row.revenue_target) || 0;
      quarterlyPerformance[row.quarter].revenueActual += parseFloat(row.revenue_actual) || 0;
      quarterlyPerformance[row.quarter].mktExpense += parseFloat(row.mkt_expense) || 0;
      quarterlyPerformance[row.quarter].totalLead += parseFloat(row.total_lead) || 0;
      quarterlyPerformance[row.quarter].qualityLead += parseFloat(row.quality_lead) || 0;
      quarterlyPerformance[row.quarter].walk += parseFloat(row.walk) || 0;
      quarterlyPerformance[row.quarter].book += parseFloat(row.book) || 0;
      quarterlyPerformance[row.quarter].booking += parseFloat(row.booking) || 0;
      quarterlyPerformance[row.quarter].livnex += parseFloat(row.livnex) || 0;
    });

    // Add to grand totals
    grandTotals.presaleTarget += projectTotals.presaleTarget;
    grandTotals.presaleActual += projectTotals.presaleActual;
    grandTotals.revenueTarget += projectTotals.revenueTarget;
    grandTotals.revenueActual += projectTotals.revenueActual;
    grandTotals.mktExpense += projectTotals.mktExpense;
    grandTotals.totalLead += projectTotals.totalLead;
    grandTotals.qualityLead += projectTotals.qualityLead;
    grandTotals.walk += projectTotals.walk;
    grandTotals.book += projectTotals.book;
    grandTotals.booking += projectTotals.booking;
    grandTotals.livnex += projectTotals.livnex;

    projects.push({
      ...proj,
      bud: perfResult.rows[0]?.bud || '',
      responsibleQuarters,
      performance: perfResult.rows,
      totals: projectTotals,
      presaleAchievePct: projectTotals.presaleTarget > 0 ? (projectTotals.presaleActual / projectTotals.presaleTarget) * 100 : 0,
      revenueAchievePct: projectTotals.revenueTarget > 0 ? (projectTotals.revenueActual / projectTotals.revenueTarget) * 100 : 0,
    });
  }

  // Get team members for all projects under this VP
  const projectCodes = Object.keys(projectMap);
  let salesManagers = [];
  let marketingManagers = [];

  if (projectCodes.length > 0) {
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
        mgrMap[row.name] = {
          name: row.name,
          position: row.position,
          projects: [],
        };
      }
      mgrMap[row.name].projects.push({
        projectCode: row.project_code,
        projectName: row.project_name,
      });
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
        mktMap[row.name] = {
          name: row.name,
          position: row.position,
          projects: [],
        };
      }
      mktMap[row.name].projects.push({
        projectCode: row.project_code,
        projectName: row.project_name,
      });
    });
    marketingManagers = Object.values(mktMap);
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

  // Convert quarterly performance to array
  const quarterlyData = Object.values(quarterlyPerformance).sort((a, b) => {
    const order = ['Q1', 'Q2', 'Q3', 'Q4'];
    return order.indexOf(a.quarter) - order.indexOf(b.quarter);
  });

  res.json({
    name: vp.name,
    position: vp.position,
    roleType: vp.role_type,
    projectCount: projects.length,
    projects,
    grandTotals,
    kpis,
    quarterlyPerformance: quarterlyData,
    team: {
      salesManagers,
      marketingManagers,
    },
  });
}));

export default router;
