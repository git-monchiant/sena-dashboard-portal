import express from 'express';
import cors from 'cors';
import pg from 'pg';

const { Pool } = pg;

const app = express();
app.use(cors());
app.use(express.json());

// Database connection pool
const pool = new Pool({
  host: '172.22.22.12',
  port: 5432,
  database: 'RPT2025',
  user: 'postgres',
  password: 'Sen@1775',
  max: 10,
});

// Test connection
pool.query('SELECT NOW()').then(() => {
  console.log('✅ Database connected');
}).catch(err => {
  console.error('❌ Database connection failed:', err.message);
});

// ===== API Routes =====

// Get filter options (VP, MGR, Projects, etc.)
app.get('/api/sales-2025/filters', async (req, res) => {
  try {
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
  } catch (err) {
    console.error('Error fetching filters:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get performance data with filters
app.get('/api/sales-2025/performance', async (req, res) => {
  try {
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
          COALESCE(NULLIF(p.mkt_expense_actual, '-'), '0')::numeric as mkt_expense_actual
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
        COALESCE(NULLIF(p.mkt_expense_actual, '-'), '0')::numeric as mkt_expense_actual
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
  } catch (err) {
    console.error('Error fetching performance:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get sales team for a project
app.get('/api/sales-2025/team/:projectCode', async (req, res) => {
  try {
    const { projectCode } = req.params;
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const result = await pool.query(`
      SELECT department, role_type, position, name, month
      FROM "Project_User_Mapping"
      WHERE project_code = $1 AND department = 'Sale'
      ORDER BY role_type DESC, name
    `, [projectCode]);

    // Group by person
    const grouped = {};
    result.rows.forEach(row => {
      const key = `${row.role_type}|${row.name}|${row.position}`;
      if (!grouped[key]) {
        grouped[key] = {
          roleType: row.role_type,
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
  } catch (err) {
    console.error('Error fetching team:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get summary by quarter
app.get('/api/sales-2025/summary', async (req, res) => {
  try {
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
          SUM(COALESCE(NULLIF(p.revenue_actual, '-'), '0')::numeric) as total_revenue_actual
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
        SUM(COALESCE(NULLIF(p.revenue_actual, '-'), '0')::numeric) as total_revenue_actual
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
  } catch (err) {
    console.error('Error fetching summary:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper function to convert month to quarter
function monthToQuarter(month) {
  const q1 = ['Jan', 'Feb', 'Mar'];
  const q2 = ['Apr', 'May', 'Jun'];
  const q3 = ['Jul', 'Aug', 'Sep'];
  const q4 = ['Oct', 'Nov', 'Dec'];
  if (q1.includes(month)) return 'Q1';
  if (q2.includes(month)) return 'Q2';
  if (q3.includes(month)) return 'Q3';
  if (q4.includes(month)) return 'Q4';
  return null;
}

// Get employee performance summary (by VP or MGR)
app.get('/api/sales-2025/employees', async (req, res) => {
  try {
    const { roleType = 'VP' } = req.query;

    // Get all employees with their projects
    const employeesResult = await pool.query(`
      SELECT DISTINCT name, position, role_type
      FROM "Project_User_Mapping"
      WHERE department = 'Sale' AND role_type = $1
      ORDER BY name
    `, [roleType]);

    const employees = [];
    for (const emp of employeesResult.rows) {
      // Get all projects and months for this employee
      const projectsResult = await pool.query(`
        SELECT project_code, month FROM "Project_User_Mapping"
        WHERE department = 'Sale' AND name = $1
      `, [emp.name]);

      if (projectsResult.rows.length === 0) {
        employees.push({
          name: emp.name,
          position: emp.position,
          roleType: emp.role_type,
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

      // Group by project and get quarters
      const projectQuarters = {};
      projectsResult.rows.forEach(row => {
        if (!projectQuarters[row.project_code]) {
          projectQuarters[row.project_code] = new Set();
        }
        const quarter = monthToQuarter(row.month);
        if (quarter) projectQuarters[row.project_code].add(quarter);
      });

      // Get performance data filtered by responsible quarters
      let totalPresaleTarget = 0;
      let totalPresaleActual = 0;
      let totalRevenueTarget = 0;
      let totalRevenueActual = 0;

      for (const [projectCode, quarters] of Object.entries(projectQuarters)) {
        const quarterArray = Array.from(quarters);
        const perfResult = await pool.query(`
          SELECT
            SUM(COALESCE(NULLIF(presale_target, '-'), '0')::numeric) as presale_target,
            SUM(COALESCE(NULLIF(presale_actual, '-'), '0')::numeric) as presale_actual,
            SUM(COALESCE(NULLIF(revenue_target, '-'), '0')::numeric) as revenue_target,
            SUM(COALESCE(NULLIF(revenue_actual, '-'), '0')::numeric) as revenue_actual
          FROM "Performance2025"
          WHERE project_code = $1 AND quarter = ANY($2)
        `, [projectCode, quarterArray]);

        if (perfResult.rows[0]) {
          totalPresaleTarget += parseFloat(perfResult.rows[0].presale_target) || 0;
          totalPresaleActual += parseFloat(perfResult.rows[0].presale_actual) || 0;
          totalRevenueTarget += parseFloat(perfResult.rows[0].revenue_target) || 0;
          totalRevenueActual += parseFloat(perfResult.rows[0].revenue_actual) || 0;
        }
      }

      const presaleAchieve = totalPresaleTarget > 0 ? (totalPresaleActual / totalPresaleTarget) : 0;
      const revenueAchieve = totalRevenueTarget > 0 ? (totalRevenueActual / totalRevenueTarget) : 0;

      employees.push({
        name: emp.name,
        position: emp.position,
        roleType: emp.role_type,
        projectCount: Object.keys(projectQuarters).length,
        totalPresaleTarget,
        totalPresaleActual,
        totalRevenueTarget,
        totalRevenueActual,
        presaleAchievePct: presaleAchieve,
        revenueAchievePct: revenueAchieve,
      });
    }

    res.json(employees);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get employee detail with projects
app.get('/api/sales-2025/employee/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Get employee info
    const empResult = await pool.query(`
      SELECT DISTINCT name, position, role_type
      FROM "Project_User_Mapping"
      WHERE department = 'Sale' AND name = $1
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
      WHERE department = 'Sale' AND name = $1
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

    // Sort months and get performance (filtered by responsible quarters)
    const projects = [];
    for (const [code, proj] of Object.entries(projectMap)) {
      proj.months = proj.months.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));

      // Convert months to quarters for this project
      const responsibleQuarters = [...new Set(proj.months.map(m => monthToQuarter(m)).filter(q => q))];

      // Get performance for this project ONLY for responsible quarters
      const perfResult = await pool.query(`
        SELECT
          quarter,
          COALESCE(NULLIF(presale_target, '-'), '0')::numeric as presale_target,
          COALESCE(NULLIF(presale_actual, '-'), '0')::numeric as presale_actual,
          COALESCE(NULLIF(presale_achieve_pct, '-'), '0')::numeric as presale_achieve_pct,
          COALESCE(NULLIF(revenue_target, '-'), '0')::numeric as revenue_target,
          COALESCE(NULLIF(revenue_actual, '-'), '0')::numeric as revenue_actual,
          COALESCE(NULLIF(revenue_achieve_pct, '-'), '0')::numeric as revenue_achieve_pct
        FROM "Performance2025"
        WHERE project_code = $1 AND quarter = ANY($2)
        ORDER BY quarter
      `, [code, responsibleQuarters]);

      projects.push({
        ...proj,
        responsibleQuarters,
        performance: perfResult.rows,
      });
    }

    res.json({
      name: employee.name,
      position: employee.position,
      roleType: employee.role_type,
      projects,
    });
  } catch (err) {
    console.error('Error fetching employee:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});
