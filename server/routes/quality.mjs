/**
 * Quality Reports API Routes
 * Data source: dbquality.trn_repair
 */
import { Router } from 'express';
import { qualityPool } from '../db/index.mjs';

const router = Router();

// Category group mapping: group name → array of raw repair_category values
const CATEGORY_GROUP_MAP = {
  'ฝ้าและผนัง': ['ฝ้าและผนัง', 'ผนัง', 'ฝ้า'],
  'ประตู/หน้าต่าง': ['ประตู', 'ประตู/หน้าต่าง', 'หน้าต่าง', 'ประตูอัตโนมัติ', 'ลูกบิด'],
  'ระบบประปา': ['ระบบประปา', 'ระบบน้ำ/ห้องน้ำ', 'ท่อระบายน้ำ', 'ก๊อกน้ำ', 'วาล์วน้ำ เปิด-ปิด'],
  'สุขภัณฑ์': ['ชักโครก', 'ฝาชักโครก', 'อ่างล้างหน้า', 'สุขภัณฑ์อื่น ๆ', 'สายชำระ', 'ฝักบัว'],
  'พื้น': ['วัสดุปูพื้น', 'งานพื้น', 'พื้น'],
  'งานถนน': ['พื้นถนน', 'ทางเดินเท้า', 'ไฟทางเดิน', 'ไฟริมถนน'],
  'ระบบไฟฟ้า': ['ระบบไฟฟ้า', 'ดวงโคม', 'สวิตซ์', 'เครื่องใช้ไฟฟ้า'],
  'โครงสร้าง': ['โครงสร้าง', 'บันได', 'บันไดหนีไฟ', 'ฐานราก', 'คาน', 'เสา', 'ผนังรับน้ำหนัก'],
  'หลังคา': ['โครงหลังคา', 'หลังคาทางเดิน', 'แผ่นหลังคา', 'รางน้ำฝน'],
  'งานตกแต่ง/สี': ['งานตกแต่ง/งานสี', 'วัสดุตกแต่ง/สี'],
  'เฟอร์นิเจอร์': ['เฟอร์นิเจอร์', 'โซฟา'],
  'รั้ว/กำแพง': ['รั้ว/กำแพง'],
  'เครื่องปรับอากาศ': ['เครื่องปรับอากาศ'],
  'โซล่าเซลล์': ['Inverter', 'แผงโซล่าเซล'],
  'งานติดตั้ง': ['งานติดตั้ง', 'อุปกรณ์เครื่องใช้ภายในบ้าน'],
  'สระว่ายน้ำ': ['สระว่ายน้ำ'],
  'ลิฟต์': ['ลิฟต์'],
  'ฟิตเนส': ['อุปกรณ์ฟิตเนส'],
  'อื่นๆ': ['อื่น ๆ', 'อื่นๆ', 'ถังขยะ'],
};

// Build reverse lookup: raw category → group name
const CATEGORY_TO_GROUP = {};
for (const [group, categories] of Object.entries(CATEGORY_GROUP_MAP)) {
  for (const cat of categories) {
    CATEGORY_TO_GROUP[cat] = group;
  }
}

function getCategoryGroup(rawCategory) {
  if (!rawCategory) return 'อื่นๆ';
  return CATEGORY_TO_GROUP[rawCategory] || 'อื่นๆ';
}

// GET /api/quality/overview
router.get('/overview', async (req, res, next) => {
  try {
    const { project_id, project_type, date_from, date_to } = req.query;

    // Build dynamic WHERE clause
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (project_id) {
      conditions.push(`project_id = $${paramIdx++}`);
      params.push(project_id);
    }
    if (project_type) {
      conditions.push(`project_type = $${paramIdx++}`);
      params.push(project_type);
    }
    if (date_from) {
      // date_from is YYYY-MM, use first day of month
      conditions.push(`open_date >= $${paramIdx++}::date`);
      params.push(`${date_from}-01`);
    }
    if (date_to) {
      // date_to is YYYY-MM, use last day of month (first of next month)
      conditions.push(`open_date < ($${paramIdx++}::date + INTERVAL '1 month')`);
      params.push(`${date_to}-01`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build a separate WHERE clause for trend query (no date filters)
    const trendConditions = [];
    const trendParams = [];
    let trendParamIdx = 1;
    if (project_id) {
      trendConditions.push(`project_id = $${trendParamIdx++}`);
      trendParams.push(project_id);
    }
    if (project_type) {
      trendConditions.push(`project_type = $${trendParamIdx++}`);
      trendParams.push(project_type);
    }
    const trendWhereClause = trendConditions.length > 0 ? `WHERE ${trendConditions.join(' AND ')}` : '';

    // Run all queries in parallel
    const [
      kpiResult,
      trendResult,
      categoryResult,
      projectResult,
      projectCategoryResult,
      statusDistResult,
      warrantyResult,
      channelResult,
      syncResult,
      nullDateResult,
    ] = await Promise.all([
      // 1. KPIs
      qualityPool.query(`
        SELECT
          COUNT(*) AS total_jobs,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel')) AS open_jobs,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel') AND open_date < NOW() - INTERVAL '14 days') AS jobs_over_14_days,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel') AND open_date >= NOW() - INTERVAL '7 days') AS aging_0_7,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel') AND open_date < NOW() - INTERVAL '7 days' AND open_date >= NOW() - INTERVAL '14 days') AS aging_8_14,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel') AND open_date < NOW() - INTERVAL '14 days' AND open_date >= NOW() - INTERVAL '30 days') AS aging_15_30,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel') AND open_date < NOW() - INTERVAL '30 days') AS aging_over_30,
          ROUND(AVG(EXTRACT(EPOCH FROM (close_date - open_date)) / 86400) FILTER (WHERE close_date IS NOT NULL)::numeric, 1) AS avg_resolution_days,
          ROUND(
            COUNT(*) FILTER (WHERE job_sub_status IN ('completed', 'cancel'))::numeric / NULLIF(COUNT(*), 0) * 100, 1
          ) AS completion_rate
        FROM trn_repair
        ${whereClause}
      `, params),

      // 2. Monthly trend (ALL months, no date filter so cumulative backlog matches open jobs KPI)
      qualityPool.query(`
        SELECT
          TO_CHAR(open_date, 'YYYY-MM') AS month,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE job_sub_status IN ('completed', 'cancel')) AS completed
        FROM trn_repair
        ${trendWhereClause}
        ${trendWhereClause ? 'AND' : 'WHERE'} open_date IS NOT NULL
        GROUP BY TO_CHAR(open_date, 'YYYY-MM')
        ORDER BY month
      `, trendParams),

      // 3. Jobs by repair_category (total + open)
      qualityPool.query(`
        SELECT
          repair_category AS category,
          COUNT(*) AS total_jobs,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel')) AS open_jobs
        FROM trn_repair
        ${whereClause}
        GROUP BY repair_category
        ORDER BY total_jobs DESC
      `, params),

      // 4. Project defects summary
      qualityPool.query(`
        SELECT
          project_id,
          project_name,
          COUNT(*) AS total_defects,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel')) AS open_defects,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel') AND open_date < NOW() - INTERVAL '14 days') AS defects_over_14_days,
          ROUND(AVG(EXTRACT(EPOCH FROM (close_date - open_date)) / 86400) FILTER (WHERE close_date IS NOT NULL)::numeric, 1) AS avg_resolution_days,
          ROUND(
            COUNT(*) FILTER (WHERE job_sub_status IN ('completed', 'cancel'))::numeric / NULLIF(COUNT(*), 0) * 100, 1
          ) AS completion_rate
        FROM trn_repair
        ${whereClause}
        GROUP BY project_id, project_name
        ORDER BY open_defects DESC
      `, params),

      // 5. Project x repair_category (open jobs only)
      qualityPool.query(`
        SELECT
          project_id,
          project_name,
          repair_category,
          COUNT(*) AS cnt
        FROM trn_repair
        ${whereClause}
        ${whereClause ? 'AND' : 'WHERE'} job_sub_status NOT IN ('completed', 'cancel')
        GROUP BY project_id, project_name, repair_category
        ORDER BY project_name, cnt DESC
      `, params),

      // 6. Job status distribution
      qualityPool.query(`
        SELECT
          job_status,
          job_sub_status,
          COUNT(*) AS cnt
        FROM trn_repair
        ${whereClause}
        GROUP BY job_status, job_sub_status
        ORDER BY cnt DESC
      `, params),

      // 7. Warranty distribution
      qualityPool.query(`
        SELECT
          warranty_status,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel')) AS open_jobs
        FROM trn_repair
        ${whereClause}
        GROUP BY warranty_status
        ORDER BY total DESC
      `, params),

      // 8. Request channel distribution
      qualityPool.query(`
        SELECT
          request_channel,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel')) AS open_jobs
        FROM trn_repair
        ${whereClause}
        GROUP BY request_channel
        ORDER BY total DESC
      `, params),

      // 9. Sync info
      qualityPool.query(`
        SELECT
          COUNT(DISTINCT project_id) AS total_projects,
          COUNT(DISTINCT house_number) AS total_units,
          MAX(open_date) AS last_data_date
        FROM trn_repair
        ${whereClause}
      `, params),

      // 10. Open jobs with NULL open_date (not captured in trend)
      qualityPool.query(`
        SELECT COUNT(*) AS null_date_open_jobs
        FROM trn_repair
        ${trendWhereClause}
        ${trendWhereClause ? 'AND' : 'WHERE'} open_date IS NULL
          AND job_sub_status NOT IN ('completed', 'cancel')
      `, trendParams),
    ]);

    // Process KPIs
    const kpi = kpiResult.rows[0];

    // Process trend - format month labels in Thai
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const trend = trendResult.rows.map(r => ({
      month: thaiMonths[parseInt(r.month.split('-')[1]) - 1] + ' ' + r.month.split('-')[0].slice(2),
      total: parseInt(r.total),
      completed: parseInt(r.completed),
    }));

    // Group raw categories into mapped groups
    const groupColorMap = {
      'ฝ้าและผนัง': '#64748b',
      'ประตู/หน้าต่าง': '#8b5cf6',
      'ระบบประปา': '#3b82f6',
      'สุขภัณฑ์': '#14b8a6',
      'พื้น': '#78716c',
      'งานถนน': '#a3a3a3',
      'ระบบไฟฟ้า': '#f59e0b',
      'โครงสร้าง': '#6366f1',
      'หลังคา': '#ef4444',
      'งานตกแต่ง/สี': '#eab308',
      'เฟอร์นิเจอร์': '#d946ef',
      'รั้ว/กำแพง': '#737373',
      'เครื่องปรับอากาศ': '#06b6d4',
      'โซล่าเซลล์': '#f97316',
      'งานติดตั้ง': '#84cc16',
      'สระว่ายน้ำ': '#0ea5e9',
      'ลิฟต์': '#a855f7',
      'ฟิตเนส': '#ec4899',
      'อื่นๆ': '#9ca3af',
    };
    const defaultColors = ['#10b981', '#f97316', '#a855f7', '#84cc16', '#22c55e', '#9ca3af', '#ec4899', '#0ea5e9'];
    const groupTotals = {};
    const groupOpen = {};
    for (const r of categoryResult.rows) {
      const group = getCategoryGroup(r.category);
      groupTotals[group] = (groupTotals[group] || 0) + parseInt(r.total_jobs);
      groupOpen[group] = (groupOpen[group] || 0) + parseInt(r.open_jobs);
    }
    let colorIdx = 0;
    const openJobsByCategory = Object.entries(groupTotals).map(([group, totalJobs]) => ({
      category: group,
      label: group,
      totalJobs,
      openJobs: groupOpen[group] || 0,
      color: groupColorMap[group] || defaultColors[colorIdx++ % defaultColors.length],
    })).sort((a, b) => {
      if (a.category === 'อื่นๆ') return 1;
      if (b.category === 'อื่นๆ') return -1;
      return b.totalJobs - a.totalJobs;
    });

    // Process project defects
    const projectDefects = projectResult.rows.map(r => ({
      projectId: r.project_id || '',
      projectName: r.project_name || r.project_id || 'ไม่ระบุ',
      totalDefects: parseInt(r.total_defects),
      openDefects: parseInt(r.open_defects),
      defectsOver14Days: parseInt(r.defects_over_14_days),
      avgResolutionDays: parseFloat(r.avg_resolution_days) || 0,
      completionRate: parseFloat(r.completion_rate) || 0,
    }));

    // Process project x category pivot
    const projectCatMap = {};
    for (const r of projectCategoryResult.rows) {
      const key = r.project_id;
      if (!projectCatMap[key]) {
        projectCatMap[key] = { projectId: r.project_id, projectName: r.project_name, categories: {}, total: 0 };
      }
      const cat = r.repair_category || 'ไม่ระบุ';
      projectCatMap[key].categories[cat] = parseInt(r.cnt);
      projectCatMap[key].total += parseInt(r.cnt);
    }
    const projectDefectsByCategory = Object.values(projectCatMap)
      .sort((a, b) => b.total - a.total);

    // Get all unique categories for the pivot
    const allCategories = [...new Set(projectCategoryResult.rows.map(r => r.repair_category || 'ไม่ระบุ'))];

    // Process status distribution
    const statusDistribution = statusDistResult.rows.map(r => ({
      jobStatus: r.job_status || '',
      jobSubStatus: r.job_sub_status || '',
      count: parseInt(r.cnt),
    }));

    // Process warranty distribution
    const warrantyLabels = {
      inWarranty: 'อยู่ในประกัน',
      noWarranty: 'ไม่อยู่ในประกัน',
      notCovered: 'ไม่ครอบคลุม',
      specialConditions: 'เงื่อนไขพิเศษ',
    };
    const warrantyColors = {
      inWarranty: '#3b82f6',
      noWarranty: '#f59e0b',
      notCovered: '#ef4444',
      specialConditions: '#8b5cf6',
    };
    const warrantyDistribution = warrantyResult.rows.map(r => ({
      warrantyStatus: r.warranty_status || '',
      label: warrantyLabels[r.warranty_status] || r.warranty_status || 'ไม่ระบุ',
      total: parseInt(r.total),
      openJobs: parseInt(r.open_jobs),
      color: warrantyColors[r.warranty_status] || '#9ca3af',
    }));

    // Process request channel distribution
    const channelLabels = {
      smartify: 'Smartify',
      callCenter: 'Call Center',
      ios: 'iOS App',
      android: 'Android App',
      webapp: 'Web App',
      line: 'LINE',
      walkIn: 'Walk-in',
      legalEntity: 'นิติบุคคล',
    };
    const channelColors = {
      smartify: '#3b82f6',
      callCenter: '#f59e0b',
      ios: '#64748b',
      android: '#10b981',
      webapp: '#8b5cf6',
      line: '#22c55e',
      walkIn: '#06b6d4',
      legalEntity: '#ef4444',
    };
    const requestChannelDistribution = channelResult.rows.map(r => ({
      channel: channelLabels[r.request_channel] || r.request_channel || 'ไม่ระบุ',
      total: parseInt(r.total),
      openJobs: parseInt(r.open_jobs),
      color: channelColors[r.request_channel] || '#9ca3af',
    }));

    // Sync info
    const sync = syncResult.rows[0];
    const nullDateOpenJobs = parseInt(nullDateResult.rows[0].null_date_open_jobs);

    res.json({
      kpis: {
        totalJobs: parseInt(kpi.total_jobs),
        openJobs: parseInt(kpi.open_jobs),
        jobsOver14Days: parseInt(kpi.jobs_over_14_days),
        aging: {
          days0to7: parseInt(kpi.aging_0_7),
          days8to14: parseInt(kpi.aging_8_14),
          days15to30: parseInt(kpi.aging_15_30),
          daysOver30: parseInt(kpi.aging_over_30),
        },
        avgResolutionDays: parseFloat(kpi.avg_resolution_days) || 0,
        completionRate: parseFloat(kpi.completion_rate) || 0,
      },
      trend,
      openJobsByCategory,
      projectDefects,
      projectDefectsByCategory,
      allCategories,
      statusDistribution,
      warrantyDistribution,
      requestChannelDistribution,
      syncInfo: {
        lastDataDate: sync.last_data_date,
        totalProjects: parseInt(sync.total_projects),
        totalUnits: parseInt(sync.total_units),
      },
      nullDateOpenJobs,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/quality/projects - list of projects for filter dropdown
router.get('/projects', async (req, res, next) => {
  try {
    const result = await qualityPool.query(`
      SELECT project_id, project_name, COUNT(*) AS total_jobs
      FROM trn_repair
      WHERE project_id IS NOT NULL AND project_name IS NOT NULL AND project_name != ''
      GROUP BY project_id, project_name
      HAVING COUNT(*) > 0
      ORDER BY project_name
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/quality/category-trend - monthly trend for a specific repair_category
router.get('/category-trend', async (req, res, next) => {
  try {
    const { category, project_id, project_type } = req.query;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    // Look up raw categories for this group
    const rawCategories = category ? (CATEGORY_GROUP_MAP[category] || [category]) : null;
    if (rawCategories && rawCategories.length > 0) {
      const placeholders = rawCategories.map(() => `$${paramIdx++}`);
      conditions.push(`repair_category IN (${placeholders.join(', ')})`);
      params.push(...rawCategories);
    }
    if (project_id) {
      conditions.push(`project_id = $${paramIdx++}`);
      params.push(project_id);
    }
    if (project_type) {
      conditions.push(`project_type = $${paramIdx++}`);
      params.push(project_type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await qualityPool.query(`
      SELECT
        TO_CHAR(open_date, 'YYYY-MM') AS month,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE job_sub_status IN ('completed', 'cancel')) AS completed,
        COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel')) AS open_jobs
      FROM trn_repair
      ${whereClause}
      ${whereClause ? 'AND' : 'WHERE'} open_date IS NOT NULL
      GROUP BY TO_CHAR(open_date, 'YYYY-MM')
      ORDER BY month
    `, params);

    // Format Thai month labels
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const trend = result.rows.map(r => ({
      month: thaiMonths[parseInt(r.month.split('-')[1]) - 1] + ' ' + r.month.split('-')[0].slice(2),
      total: parseInt(r.total),
      completed: parseInt(r.completed),
      openJobs: parseInt(r.open_jobs),
    }));

    res.json(trend);
  } catch (err) {
    next(err);
  }
});

export default router;
