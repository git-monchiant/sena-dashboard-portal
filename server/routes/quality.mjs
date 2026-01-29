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

// Keyword-based category detection from free text (complaint_detail)
const CATEGORY_KEYWORDS = [
  { category: 'ลิฟต์', keywords: ['ลิฟต์', 'ลิฟท์', 'elevator', 'lift'] },
  { category: 'ระบบประปา', keywords: ['น้ำ', 'ประปา', 'ท่อ', 'รั่ว', 'ก๊อก', 'วาล์ว', 'ห้องน้ำ', 'น้ำรั่ว', 'น้ำท่วม', 'ท่อระบาย'] },
  { category: 'สุขภัณฑ์', keywords: ['ชักโครก', 'อ่างล้าง', 'สุขภัณฑ์', 'ฝักบัว', 'สายชำระ'] },
  { category: 'ระบบไฟฟ้า', keywords: ['ไฟ', 'ไฟฟ้า', 'ไฟกระชาก', 'สวิตซ์', 'ดวงโคม', 'หลอดไฟ', 'ปลั๊ก', 'ไฟดับ', 'ไฟไม่สว่าง'] },
  { category: 'เครื่องปรับอากาศ', keywords: ['แอร์', 'เครื่องปรับอากาศ', 'aircon', 'air con'] },
  { category: 'ประตู/หน้าต่าง', keywords: ['ประตู', 'หน้าต่าง', 'ลูกบิด', 'กุญแจ', 'คีย์การ์ด', 'key card'] },
  { category: 'ฝ้าและผนัง', keywords: ['ผนัง', 'ฝ้า', 'เพดาน', 'สี', 'สีลอก', 'ผนังร้าว'] },
  { category: 'พื้น', keywords: ['พื้น', 'กระเบื้อง', 'ปูพื้น'] },
  { category: 'หลังคา', keywords: ['หลังคา', 'รางน้ำฝน', 'หลังคารั่ว'] },
  { category: 'โครงสร้าง', keywords: ['โครงสร้าง', 'ร้าว', 'แผ่นดินไหว', 'บันได', 'เสา', 'คาน', 'ฐานราก'] },
  { category: 'สระว่ายน้ำ', keywords: ['สระว่ายน้ำ', 'สระ', 'pool'] },
  { category: 'ฟิตเนส', keywords: ['ฟิตเนส', 'fitness', 'gym', 'ออกกำลังกาย'] },
  { category: 'งานถนน', keywords: ['ถนน', 'ทางเดิน', 'ที่จอดรถ', 'ลานจอด', 'parking'] },
  { category: 'รั้ว/กำแพง', keywords: ['รั้ว', 'กำแพง'] },
  { category: 'เฟอร์นิเจอร์', keywords: ['เฟอร์นิเจอร์', 'โซฟา', 'ตู้', 'ชั้นวาง'] },
  { category: 'งานติดตั้ง', keywords: ['ติดตั้ง'] },
  { category: 'โซล่าเซลล์', keywords: ['โซล่า', 'solar', 'inverter'] },
];

// Complain-specific category keywords: บุคคล / โครงการ / ส่วนกลาง
const COMPLAIN_CATEGORY_KEYWORDS = [
  { category: 'บุคคล', keywords: [ 'แม่บ้าน', 'รปภ', 'ช่าง', 'พนักงาน', 'เจ้าหน้าที่', 'คนขับ', 'ผู้จัดการ', 'พูดจา', 'หยาบคาย', 'ไม่สุภาพ', 'ทัศนคติ',  'สีหน้า', 'ท่าที', 'ไม่เต็มใจ', 'ไม่ให้เกียรติ'] },
  { category: 'สำนักงานใหญ่', keywords: ['สำนักงานใหญ่', 'นโยบาย', 'มาตรฐาน', 'โปร่งใส', 'บริษัท', 'องค์กร', 'ผู้บริหาร', 'เปลี่ยนนิติ', 'sen prop'] },
  { category: 'โครงการ', keywords: ['นิติ','นิติบุคคล','โครงสร้าง', 'แผ่นดินไหว', 'ร้าว', 'ก่อสร้าง', 'ขุดเจาะ', 'ซ่อมแซม', 'ประกัน', 'เคลม', 'คุณภาพ', 'การบริหาร', 'ระเบียบ', 'กฎ', 'ข้อบังคับ', 'ประชุม', 'งบ', 'ค่าส่วนกลาง', 'airbnb', 'ลิฟต์', 'ลิฟท์', 'ที่จอดรถ', 'ถนน', 'ทางเดิน', 'lobby', 'ล็อบบี้', 'สระ', 'pool', 'ฟิตเนส', 'gym', 'ไฟ', 'พัสดุ', 'ขยะ', 'กลิ่น', 'เสียง', 'รถตู้', 'รถรับส่ง', 'สวน', 'พื้นที่ส่วนกลาง'] },
];

// Normalize project name for fuzzy matching
function normalizeProjectName(name) {
  return name
    .split('/')[0]                          // take Thai part before "/"
    .replace(/\(.*?\)/g, '')                // remove parentheses content
    .replace(/เฟส\s*\d*/gi, '')             // remove เฟส 1, เฟส1
    .replace(/phase\s*\d*/gi, '')           // remove Phase 1
    .replace(/\d+\s*อาคาร/g, '')           // remove "7 อาคาร"
    .replace(/อาคาร\s*[A-Za-z,\s]*/g, '')  // remove "อาคาร D, C"
    .replace(/คอนโด/g, '')                  // remove คอนโด prefix
    .replace(/เดอะ/g, '')                   // remove เดอะ
    .replace(/\b(station|interchange|condo)\b/gi, '') // remove common English suffixes
    .replace(/สเตชั่น/g, '')               // remove สเตชั่น
    .replace(/รามคำแหง/g, 'ราม')            // normalize รามคำแหง → ราม
    .replace(/ramkhamhaeng/gi, 'ram')       // normalize Ramkhamhaeng → ram
    .replace(/[-–]/g, ' ')                  // normalize dashes to spaces
    .replace(/\s+/g, ' ')                   // collapse whitespace
    .trim()
    .toLowerCase();
}

// Multi-strategy project name matching
function buildProjectMatcher(masterRows) {
  const exactMap = new Map();
  const normalizedMap = new Map();
  const englishMap = new Map();
  const containsIndex = [];
  const engNormIndex = []; // normalized English names for spaceless matching

  for (const m of masterRows) {
    if (m.project_name_th) {
      const raw = m.project_name_th.trim().toLowerCase();
      const norm = normalizeProjectName(m.project_name_th);
      exactMap.set(raw, m);
      normalizedMap.set(norm, m);
      containsIndex.push({ norm, m });
    }
    if (m.project_name_en) {
      englishMap.set(m.project_name_en.trim().toLowerCase(), m);
      const engNorm = normalizeProjectName(m.project_name_en);
      engNormIndex.push({ norm: engNorm, m });
    }
  }

  return function findMaster(projectName) {
    const rawName = (projectName || '').trim();
    const thaiName = rawName.split('/')[0].trim().toLowerCase();
    const engName = rawName.includes('/') ? rawName.split('/').pop().trim().toLowerCase() : rawName.toLowerCase();

    // 1. Exact Thai match
    let master = exactMap.get(thaiName);
    if (master) return { master, method: 'exact' };

    // 2. Exact English match
    master = englishMap.get(engName);
    if (master) return { master, method: 'english' };

    // 3. Normalized match
    const norm = normalizeProjectName(rawName);
    master = normalizedMap.get(norm);
    if (master) return { master, method: 'normalized' };

    // 4. Contains match
    for (const entry of containsIndex) {
      if (norm.length > 1 && entry.norm.length > 1 && (norm.includes(entry.norm) || entry.norm.includes(norm))) {
        return { master: entry.m, method: 'contains' };
      }
    }

    // 4b. Spaceless contains match (e.g. "เสนาคิทท์ฉลองกรุงลาดกระบัง" vs "เสนาคิทท์ ฉลองกรุง ลาดกระบัง")
    const normNoSpace = norm.replace(/\s/g, '');
    for (const entry of containsIndex) {
      const entryNoSpace = entry.norm.replace(/\s/g, '');
      if (normNoSpace.length > 2 && entryNoSpace.length > 2 && (normNoSpace.includes(entryNoSpace) || entryNoSpace.includes(normNoSpace))) {
        return { master: entry.m, method: 'spaceless' };
      }
    }

    // 4c. Spaceless match against normalized English names (e.g. "plum ram60" vs "plum ram 60")
    for (const entry of engNormIndex) {
      const entryNoSpace = entry.norm.replace(/\s/g, '');
      if (normNoSpace.length > 2 && entryNoSpace.length > 2 && (normNoSpace.includes(entryNoSpace) || entryNoSpace.includes(normNoSpace))) {
        return { master: entry.m, method: 'eng-spaceless' };
      }
    }

    // 5. Token overlap (≥50%)
    const srcTokens = new Set(norm.split(/\s+/).filter(t => t.length > 1));
    if (srcTokens.size > 0) {
      let bestScore = 0, bestMatch = null;
      for (const entry of containsIndex) {
        const mTokens = new Set(entry.norm.split(/\s+/).filter(t => t.length > 1));
        const overlap = [...srcTokens].filter(t => mTokens.has(t)).length;
        const score = overlap / Math.max(srcTokens.size, mTokens.size);
        if (score > bestScore && score >= 0.5) {
          bestScore = score;
          bestMatch = entry.m;
        }
      }
      if (bestMatch) return { master: bestMatch, method: `token(${(bestScore * 100).toFixed(0)}%)` };
    }

    // 6. English token overlap
    const engTokens = new Set(engName.split(/[\s\-–]+/).filter(t => t.length > 1));
    if (engTokens.size > 0) {
      let bestScore = 0, bestMatch = null;
      for (const m of masterRows) {
        if (!m.project_name_en) continue;
        const mTokens = new Set(m.project_name_en.toLowerCase().split(/[\s\-–]+/).filter(t => t.length > 1));
        const overlap = [...engTokens].filter(t => mTokens.has(t)).length;
        const score = overlap / Math.max(engTokens.size, mTokens.size);
        if (score > bestScore && score >= 0.5) {
          bestScore = score;
          bestMatch = m;
        }
      }
      if (bestMatch) return { master: bestMatch, method: `eng-token(${(bestScore * 100).toFixed(0)}%)` };
    }

    return null;
  };
}

function detectCategory(text, jobType) {
  if (!text) return 'อื่นๆ';
  const lower = text.toLowerCase();

  if (jobType === 'complain') {
    // Complain: แยกเป็น บุคคล / โครงการ / ส่วนกลาง
    for (const { category, keywords } of COMPLAIN_CATEGORY_KEYWORDS) {
      for (const kw of keywords) {
        if (lower.includes(kw.toLowerCase())) return category;
      }
    }
    return 'โครงการ'; // default for complain
  }

  // Repair: ใช้ category เดิม
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) return category;
    }
  }
  return 'อื่นๆ';
}

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
    const { project_id, project_type, category, date_from, date_to } = req.query;

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
    if (category && CATEGORY_GROUP_MAP[category]) {
      const cats = CATEGORY_GROUP_MAP[category];
      const placeholders = cats.map(() => `$${paramIdx++}`);
      conditions.push(`repair_category IN (${placeholders.join(',')})`);
      params.push(...cats);
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
      urgentResult,
      slaAgingResult,
      closedTrendResult,
      monthlySlaResult,
      agingScatterOpenResult,
      agingScatterClosedResult,
      workAreaResult,
    ] = await Promise.all([
      // 1. KPIs
      qualityPool.query(`
        SELECT
          COUNT(*) AS total_jobs,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel')) AS open_jobs,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel') AND open_date < NOW() - INTERVAL '14 days') AS jobs_over_14_days,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel') AND open_date >= NOW() - INTERVAL '30 days') AS aging_under_30,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel') AND open_date < NOW() - INTERVAL '30 days' AND open_date >= NOW() - INTERVAL '45 days') AS aging_30_45,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel') AND open_date < NOW() - INTERVAL '45 days' AND open_date >= NOW() - INTERVAL '60 days') AS aging_45_60,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel') AND open_date < NOW() - INTERVAL '60 days' AND open_date >= NOW() - INTERVAL '120 days') AS aging_over_60,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel') AND open_date < NOW() - INTERVAL '120 days') AS aging_over_120,
          ROUND(AVG(EXTRACT(EPOCH FROM (close_date - open_date)) / 86400) FILTER (WHERE close_date IS NOT NULL)::numeric, 1) AS avg_resolution_days,
          ROUND(
            COUNT(*) FILTER (WHERE job_sub_status IN ('completed', 'cancel'))::numeric / NULLIF(COUNT(*), 0) * 100, 1
          ) AS completion_rate,
          COUNT(DISTINCT project_id) AS distinct_projects,
          COUNT(DISTINCT CONCAT(project_id, '|', house_number)) AS distinct_units,
          COUNT(DISTINCT CONCAT(project_id, '|', house_number)) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel')) AS open_units,
          COUNT(DISTINCT CONCAT(project_id, '|', house_number)) FILTER (WHERE job_sub_status IN ('completed', 'cancel')) AS closed_units
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
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel') AND COALESCE(open_date, assign_date, assessment_date, service_date) < NOW() - INTERVAL '14 days') AS defects_over_14_days,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel') AND COALESCE(open_date, assign_date, assessment_date, service_date) < NOW() - INTERVAL '30 days') AS defects_over_30_days,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel') AND COALESCE(open_date, assign_date, assessment_date, service_date) < NOW() - INTERVAL '45 days') AS defects_over_45_days,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel') AND COALESCE(open_date, assign_date, assessment_date, service_date) < NOW() - INTERVAL '60 days') AS defects_over_60_days,
          ROUND(AVG(EXTRACT(EPOCH FROM (close_date - open_date)) / 86400) FILTER (WHERE close_date IS NOT NULL)::numeric, 1) AS avg_resolution_days,
          ROUND(
            COUNT(*) FILTER (WHERE job_sub_status IN ('completed', 'cancel'))::numeric / NULLIF(COUNT(*), 0) * 100, 1
          ) AS completion_rate,
          ROUND(AVG(GREATEST(EXTRACT(EPOCH FROM (assign_date - open_date)) / 86400, 0)) FILTER (WHERE assign_date IS NOT NULL AND open_date IS NOT NULL)::numeric, 1) AS avg_open_to_assign,
          ROUND(AVG(GREATEST(EXTRACT(EPOCH FROM (assessment_date - assign_date)) / 86400, 0)) FILTER (WHERE assessment_date IS NOT NULL AND assign_date IS NOT NULL)::numeric, 1) AS avg_assign_to_assess,
          ROUND(AVG(GREATEST(EXTRACT(EPOCH FROM (service_date - COALESCE(assessment_date, assign_date))) / 86400, 0)) FILTER (WHERE service_date IS NOT NULL AND (assessment_date IS NOT NULL OR assign_date IS NOT NULL))::numeric, 1) AS avg_assess_to_service,
          ROUND(AVG(GREATEST(EXTRACT(EPOCH FROM (close_date - service_date)) / 86400, 0)) FILTER (WHERE close_date IS NOT NULL AND service_date IS NOT NULL)::numeric, 1) AS avg_service_to_close,
          COUNT(DISTINCT CONCAT(project_id, '|', house_number)) AS total_units
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
          COUNT(*) AS cnt,
          COUNT(DISTINCT CONCAT(project_id, '|', house_number)) AS distinct_units
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
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel')) AS open_jobs,
          COUNT(DISTINCT CONCAT(project_id, '|', house_number)) AS distinct_units
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
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel')) AS open_jobs,
          COUNT(DISTINCT CONCAT(project_id, '|', house_number)) AS distinct_units
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

      // 13. Urgent jobs distribution
      qualityPool.query(`
        SELECT
          is_urgent,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel')) AS open_jobs,
          COUNT(*) FILTER (WHERE job_sub_status IN ('completed', 'cancel')) AS closed_jobs
        FROM trn_repair
        ${whereClause}
        GROUP BY is_urgent
        ORDER BY total DESC
      `, params),

      // 12. SLA aging distribution - open vs closed, grouped by age bucket
      qualityPool.query(`
        SELECT
          CASE
            WHEN age_days < 30 THEN 'under30'
            WHEN age_days >= 30 AND age_days < 45 THEN '30to45'
            WHEN age_days >= 45 AND age_days < 60 THEN '45to60'
            ELSE 'over60'
          END AS bucket,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed', 'cancel')) AS open_jobs,
          COUNT(*) FILTER (WHERE job_sub_status IN ('completed', 'cancel')) AS closed_jobs
        FROM (
          SELECT *,
            CASE
              WHEN job_sub_status IN ('completed', 'cancel') AND close_date IS NOT NULL AND open_date IS NOT NULL
                THEN EXTRACT(EPOCH FROM (close_date - open_date)) / 86400
              WHEN open_date IS NOT NULL
                THEN EXTRACT(EPOCH FROM (NOW() - open_date)) / 86400
              ELSE NULL
            END AS age_days
          FROM trn_repair
          ${whereClause ? whereClause + ' AND open_date IS NOT NULL' : 'WHERE open_date IS NOT NULL'}
        ) sub
        WHERE age_days IS NOT NULL
        GROUP BY 1
      `, params),

      // 11. Closed jobs by close_date month (for cumulative closed line)
      // Use COALESCE fallback for jobs without close_date
      qualityPool.query(`
        SELECT
          TO_CHAR(COALESCE(close_date, service_date, assessment_date, assign_date, open_date), 'YYYY-MM') AS month,
          COUNT(*) AS closed
        FROM trn_repair
        ${trendWhereClause}
        ${trendWhereClause ? 'AND' : 'WHERE'} job_sub_status IN ('completed', 'cancel')
          AND COALESCE(close_date, service_date, assessment_date, assign_date, open_date) IS NOT NULL
        GROUP BY TO_CHAR(COALESCE(close_date, service_date, assessment_date, assign_date, open_date), 'YYYY-MM')
        ORDER BY month
      `, trendParams),

      // 14. Monthly SLA breakdown for open jobs
      qualityPool.query(`
        SELECT
          TO_CHAR(open_date, 'YYYY-MM') AS month,
          COUNT(*) FILTER (WHERE age_days < 30) AS under30,
          COUNT(*) FILTER (WHERE age_days >= 30 AND age_days < 45) AS d30to45,
          COUNT(*) FILTER (WHERE age_days >= 45 AND age_days < 60) AS d45to60,
          COUNT(*) FILTER (WHERE age_days >= 60) AS over60,
          COUNT(*) AS total
        FROM (
          SELECT *, EXTRACT(EPOCH FROM (NOW() - open_date)) / 86400 AS age_days
          FROM trn_repair
          ${whereClause ? whereClause + ' AND open_date IS NOT NULL AND job_sub_status NOT IN (\'completed\', \'cancel\')' : 'WHERE open_date IS NOT NULL AND job_sub_status NOT IN (\'completed\', \'cancel\')'}
        ) sub
        GROUP BY 1
        ORDER BY 1
      `, params),

      // 15. Aging scatter: open jobs by age (days), >= 0 only
      qualityPool.query(`
        SELECT age_days, COUNT(*) AS cnt FROM (
          SELECT FLOOR(EXTRACT(EPOCH FROM (NOW() - open_date)) / 86400)::int AS age_days
          FROM trn_repair
          ${whereClause ? whereClause + ' AND open_date IS NOT NULL AND job_sub_status NOT IN (\'completed\', \'cancel\')' : 'WHERE open_date IS NOT NULL AND job_sub_status NOT IN (\'completed\', \'cancel\')'}
        ) sub WHERE age_days >= 0
        GROUP BY 1
        ORDER BY 1
      `, params),

      // 16. Aging scatter: closed jobs by age (days) - use latest process date as end date
      qualityPool.query(`
        SELECT GREATEST(age_days, 0) AS age_days, SUM(cnt)::int AS cnt FROM (
          SELECT FLOOR(EXTRACT(EPOCH FROM (
            COALESCE(close_date, service_date, assessment_date, assign_date, open_date) - open_date
          )) / 86400)::int AS age_days,
                 COUNT(*) AS cnt
          FROM trn_repair
          ${whereClause ? whereClause + ' AND job_sub_status IN (\'completed\', \'cancel\')' : 'WHERE job_sub_status IN (\'completed\', \'cancel\')'}
          GROUP BY 1
        ) sub
        GROUP BY 1
        ORDER BY 1
      `, params),

      // 17. Work area breakdown
      qualityPool.query(`
        SELECT COALESCE(work_area, 'customer_room') AS work_area, COUNT(*) AS total
        FROM trn_repair
        ${whereClause}
        GROUP BY 1
      `, params),
    ]);

    // Process KPIs
    const kpi = kpiResult.rows[0];

    // Process trend - format month labels in Thai
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const trend = trendResult.rows.map(r => {
      const label = thaiMonths[parseInt(r.month.split('-')[1]) - 1] + ' ' + r.month.split('-')[0].slice(2);
      return {
        month: label,
        total: parseInt(r.total),
        completed: parseInt(r.completed),
      };
    });

    // Separate closed trend (by close_date)
    const closedTrend = closedTrendResult.rows.map(r => ({
      month: thaiMonths[parseInt(r.month.split('-')[1]) - 1] + ' ' + r.month.split('-')[0].slice(2),
      closed: parseInt(r.closed),
    }));

    // Group raw categories into mapped groups
    const groupColorMap = {
      'ฝ้าและผนัง': '#6366f1',      // indigo
      'ประตู/หน้าต่าง': '#8b5cf6',  // violet
      'ระบบประปา': '#3b82f6',       // blue
      'สุขภัณฑ์': '#14b8a6',        // teal
      'พื้น': '#a16207',            // dark amber
      'งานถนน': '#78716c',          // stone
      'ระบบไฟฟ้า': '#f59e0b',       // amber
      'โครงสร้าง': '#0d9488',       // dark teal
      'หลังคา': '#ef4444',          // red
      'งานตกแต่ง/สี': '#e879f9',    // fuchsia light
      'เฟอร์นิเจอร์': '#d946ef',    // fuchsia
      'รั้ว/กำแพง': '#92400e',      // brown
      'เครื่องปรับอากาศ': '#06b6d4', // cyan
      'โซล่าเซลล์': '#f97316',      // orange
      'งานติดตั้ง': '#84cc16',       // lime
      'สระว่ายน้ำ': '#0ea5e9',      // sky
      'ลิฟต์': '#a855f7',           // purple
      'ฟิตเนส': '#ec4899',          // pink
      'อื่นๆ': '#9ca3af',           // gray
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
      projectId: r.project_id || 'NO_PROJECT',
      projectName: r.project_name || r.project_id || '(ไม่สามารถระบุโครงการได้)',
      totalDefects: parseInt(r.total_defects),
      openDefects: parseInt(r.open_defects),
      defectsOver14Days: parseInt(r.defects_over_14_days),
      defectsOver30Days: parseInt(r.defects_over_30_days),
      defectsOver45Days: parseInt(r.defects_over_45_days),
      defectsOver60Days: parseInt(r.defects_over_60_days),
      avgResolutionDays: parseFloat(r.avg_resolution_days) || 0,
      completionRate: parseFloat(r.completion_rate) || 0,
      avgOpenToAssign: parseFloat(r.avg_open_to_assign) || 0,
      avgAssignToAssess: parseFloat(r.avg_assign_to_assess) || 0,
      avgAssessToService: parseFloat(r.avg_assess_to_service) || 0,
      avgServiceToClose: parseFloat(r.avg_service_to_close) || 0,
      totalUnits: parseInt(r.total_units) || 0,
    }));

    // Process project x category pivot
    const projectCatMap = {};
    for (const r of projectCategoryResult.rows) {
      const key = r.project_id;
      if (!projectCatMap[key]) {
        projectCatMap[key] = { projectId: r.project_id, projectName: r.project_name, categories: {}, total: 0 };
      }
      const cat = getCategoryGroup(r.repair_category || 'ไม่ระบุ');
      projectCatMap[key].categories[cat] = (projectCatMap[key].categories[cat] || 0) + parseInt(r.cnt);
      projectCatMap[key].total += parseInt(r.cnt);
    }
    const projectDefectsByCategory = Object.values(projectCatMap)
      .sort((a, b) => b.total - a.total);

    // Get all unique categories for the pivot
    const allCategories = [...new Set(projectCategoryResult.rows.map(r => getCategoryGroup(r.repair_category || 'ไม่ระบุ')))];

    // Process status distribution
    const statusDistribution = statusDistResult.rows.map(r => ({
      jobStatus: r.job_status || '',
      jobSubStatus: r.job_sub_status || '',
      count: parseInt(r.cnt),
      units: parseInt(r.distinct_units) || 0,
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
      units: parseInt(r.distinct_units) || 0,
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
      units: parseInt(r.distinct_units) || 0,
      color: channelColors[r.request_channel] || '#9ca3af',
    }));

    // Sync info
    const sync = syncResult.rows[0];
    const nullDateOpenJobs = parseInt(nullDateResult.rows[0].null_date_open_jobs);

    // Process SLA aging distribution
    const bucketOrder = ['under30', '30to45', '45to60', 'over60'];
    const bucketLabels = { under30: '<30 วัน', '30to45': '30-45 วัน', '45to60': '45-60 วัน', over60: '>60 วัน' };
    const bucketColors = { under30: '#60a5fa', '30to45': '#f59e0b', '45to60': '#f97316', over60: '#ef4444' };
    const slaAgingMap = {};
    for (const r of slaAgingResult.rows) {
      slaAgingMap[r.bucket] = { total: parseInt(r.total), openJobs: parseInt(r.open_jobs), closedJobs: parseInt(r.closed_jobs) };
    }
    const slaAging = bucketOrder.map(b => ({
      bucket: b,
      label: bucketLabels[b],
      color: bucketColors[b],
      total: slaAgingMap[b]?.total || 0,
      openJobs: slaAgingMap[b]?.openJobs || 0,
      closedJobs: slaAgingMap[b]?.closedJobs || 0,
    }));

    // Process urgent distribution
    const urgentDistribution = urgentResult.rows.map(r => ({
      isUrgent: r.is_urgent === 'True',
      label: r.is_urgent === 'True' ? 'งานเร่งด่วน' : 'งานปกติ',
      total: parseInt(r.total),
      openJobs: parseInt(r.open_jobs),
      closedJobs: parseInt(r.closed_jobs),
      color: r.is_urgent === 'True' ? '#ef4444' : '#3b82f6',
    }));

    res.json({
      kpis: {
        totalJobs: parseInt(kpi.total_jobs),
        openJobs: parseInt(kpi.open_jobs),
        jobsOver14Days: parseInt(kpi.jobs_over_14_days),
        aging: {
          under30: parseInt(kpi.aging_under_30),
          days30to45: parseInt(kpi.aging_30_45),
          days45to60: parseInt(kpi.aging_45_60),
          over60: parseInt(kpi.aging_over_60),
          over120: parseInt(kpi.aging_over_120),
        },
        avgResolutionDays: parseFloat(kpi.avg_resolution_days) || 0,
        completionRate: parseFloat(kpi.completion_rate) || 0,
        distinctProjects: parseInt(kpi.distinct_projects) || 0,
        distinctUnits: parseInt(kpi.distinct_units) || 0,
        openUnits: parseInt(kpi.open_units) || 0,
        closedUnits: parseInt(kpi.closed_units) || 0,
      },
      trend,
      closedTrend,
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
      slaAging,
      urgentDistribution,
      monthlySlaBreakdown: monthlySlaResult.rows.map(r => ({
        month: thaiMonths[parseInt(r.month.split('-')[1]) - 1] + ' ' + r.month.split('-')[0].slice(2),
        under30: parseInt(r.under30),
        d30to45: parseInt(r.d30to45),
        d45to60: parseInt(r.d45to60),
        over60: parseInt(r.over60),
        total: parseInt(r.total),
      })),
      agingScatter: {
        open: agingScatterOpenResult.rows.map(r => ({ day: parseInt(r.age_days), count: parseInt(r.cnt) })),
        closed: agingScatterClosedResult.rows.map(r => ({ day: parseInt(r.age_days), count: parseInt(r.cnt) })),
      },
      workAreaBreakdown: workAreaResult.rows.map(r => ({
        workArea: r.work_area,
        total: parseInt(r.total),
      })),
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

// GET /api/quality/categories - list of category groups for filter dropdown
router.get('/categories', async (_req, res) => {
  const groups = Object.keys(CATEGORY_GROUP_MAP).sort((a, b) => a.localeCompare(b, 'th'));
  res.json(groups.map(g => ({ value: g, label: g })));
});

// GET /api/quality/category-trend - monthly trend for a specific repair_category
router.get('/category-trend', async (req, res, next) => {
  try {
    const { category, project_id, project_type, date_from, date_to } = req.query;

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
    if (date_from) {
      conditions.push(`open_date >= $${paramIdx++}::date`);
      params.push(date_from + '-01');
    }
    if (date_to) {
      conditions.push(`open_date < ($${paramIdx++}::date + INTERVAL '1 month')`);
      params.push(date_to + '-01');
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

// ==================== ETL: stg_repair → trn_repair ====================
router.post('/etl/repair', async (req, res, next) => {
  const client = await qualityPool.connect();
  try {
    await client.query('BEGIN');

    // 0) Ensure extra columns exist
    await client.query(`ALTER TABLE trn_repair ADD COLUMN IF NOT EXISTS datasource TEXT`);
    await client.query(`ALTER TABLE trn_repair_err ADD COLUMN IF NOT EXISTS datasource TEXT`);
    await client.query(`ALTER TABLE trn_repair ADD COLUMN IF NOT EXISTS job_type TEXT`);
    await client.query(`ALTER TABLE trn_repair_err ADD COLUMN IF NOT EXISTS job_type TEXT`);
    await client.query(`ALTER TABLE trn_repair ADD COLUMN IF NOT EXISTS work_area TEXT`);
    await client.query(`ALTER TABLE trn_repair_err ADD COLUMN IF NOT EXISTS work_area TEXT`);

    // 1) TRUNCATE both target tables
    await client.query('TRUNCATE TABLE trn_repair');
    await client.query('TRUNCATE TABLE trn_repair_err');

    // 2) Load master_project_id lookup
    const masterRows = (await client.query('SELECT project_id, project_name_th, project_type FROM master_project_id')).rows;
    const masterByCode = new Map();
    const masterByName = new Map();
    for (const m of masterRows) {
      masterByCode.set(m.project_id.trim(), m);
      // Build name lookup (normalize: trim, lowercase)
      if (m.project_name_th) {
        masterByName.set(m.project_name_th.trim().toLowerCase(), m);
      }
    }

    // 3) Load senprop type lookup (smartify_code → type)
    const senpropRows = (await client.query('SELECT smartify_code, type FROM stg_repair_senprop')).rows;
    const senpropTypeMap = new Map();
    for (const sp of senpropRows) {
      if (sp.smartify_code) senpropTypeMap.set(sp.smartify_code.trim(), (sp.type || '').trim().toLowerCase());
    }

    // 4) Read all stg_repair
    const stgRows = (await client.query('SELECT * FROM stg_repair')).rows;

    // Helper: parse "d/m/yyyy" → Date or null
    function parseDateDMY(val) {
      if (!val || val.trim() === '') return null;
      const parts = val.trim().split('/');
      if (parts.length !== 3) return null;
      const d = parseInt(parts[0]), m = parseInt(parts[1]);
      let y = parseInt(parts[2]);
      if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
      // Handle Buddhist year (> 2400)
      if (y > 2400) y -= 543;
      return new Date(y, m - 1, d);
    }

    // 4) Column mapping: stg (Thai) → trn (English)
    function mapRow(stg) {
      return {
        original_project_code: stg['รหัสโครงการ'] || '',
        original_project_name: stg['ชื่อโครงการ'] || '',
        open_date: parseDateDMY(stg['วันที่เปิดงาน']),
        close_date: parseDateDMY(stg['วันที่ปิดงาน']),
        assessment_date: parseDateDMY(stg['วันที่นัดประเมิน']),
        assign_date: parseDateDMY(stg['วันที่มอบหมายช่าง']),
        service_date: parseDateDMY(stg['วันที่เข้าบริการ']),
        sla_date: parseDateDMY(stg['วันที่ตาม SLA']),
        document_id: stg['ไอดีเอกสาร'] || '',
        document_number: stg['เลขที่เอกสาร'] || '',
        job_status: stg['สถานะใบงาน'] || '',
        job_sub_status: stg['สถานะย่อยใบงาน'] || '',
        warranty_status: stg['สถานะประกัน'] || '',
        sla_exceeded: stg['สถานะเกิน SLA'] || '',
        is_urgent: stg['สถานะด่วน'] || '',
        house_number: stg['บ้านเลขที่'] || '',
        address_detail: stg['รายละเอียดที่อยู่'] || '',
        residence_type: stg['ประเภทที่อยู่'] || '',
        address_warranty_status: stg['สถานะประกันของที่อยู่'] || '',
        repair_category: stg['หมวดหมู่ย่อยแจ้งซ่อม'] || '',
        issue: stg['issue'] || '',
        symptom: stg['อาการ'] || '',
        symptom_detail: stg['รายละเอียดอาการ'] || '',
        customer_name: stg['ชื่อ-สกุลลูกค้า'] || '',
        customer_phone: stg['เบอร์โทรลูกค้า'] || '',
        customer_phone_alt: stg['เบอร์โทรสำรองลูกค้า'] || '',
        reporter_type: stg['ประเภทผู้แจ้งซ่อม'] || '',
        request_channel: stg['ช่องทางการแจ้งซ่อม'] || '',
        technician_name: stg['ชื่อช่าง'] || '',
        technician_email: stg['อีเมลช่าง'] || '',
        technician_detail: stg['รายละเอียดช่างผู้ให้บ'] || '',
        technician_note: stg['บันทึกของช่าง'] || '',
        admin_note: stg['บันทึกของแอดมิน'] || '',
        job_history: stg['ประวัติการดำเนินการใน'] || '',
        admin_read_status: stg['สถานะการเปิดอ่านของแอ'] || '',
        before_image_url: stg['รูปภาพก่อนดำเนินการ'] || '',
        after_image_url: stg['รูปภาพหลังดำเนินการ'] || '',
        customer_image_url: stg['รูปภาพที่ลูกค้าแนบมา'] || '',
        review_date: stg['วันที่รีวิว'] || '',
        review_id: stg['ไอดีรีวิว'] || '',
        review_score: stg['คะแนนรีวิว'] || '',
        review_comment: stg['ความคิดเห็นรีวิว'] || '',
        review_tracking_failed: stg['ไม่สามารถติดตามรีวิวไ'] || '',
        assessment_time: stg['เวลาที่นัดประเมิน'] || '',
        service_time: stg['เวลาที่เข้าบริการ'] || '',
      };
    }

    // 5) Process each row
    let insertedCount = 0;
    let errorCount = 0;

    const trnCols = [
      'datasource',
      'project_id', 'project_name', 'project_type',
      'original_project_code', 'original_project_name',
      'open_date', 'close_date', 'assessment_date', 'assign_date', 'service_date', 'sla_date',
      'document_id', 'document_number', 'job_status', 'job_sub_status',
      'warranty_status', 'sla_exceeded', 'is_urgent',
      'house_number', 'address_detail', 'residence_type', 'address_warranty_status',
      'repair_category', 'issue', 'symptom', 'symptom_detail',
      'customer_name', 'customer_phone', 'customer_phone_alt',
      'reporter_type', 'request_channel',
      'technician_name', 'technician_email', 'technician_detail', 'technician_note',
      'admin_note', 'job_history', 'admin_read_status',
      'before_image_url', 'after_image_url', 'customer_image_url',
      'review_date', 'review_id', 'review_score', 'review_comment', 'review_tracking_failed',
      'assessment_time', 'service_time',
      'job_type', 'work_area', 'is_special_case',
    ];
    const placeholders = trnCols.map((_, i) => `$${i + 1}`).join(', ');
    const insertSQL = `INSERT INTO trn_repair (${trnCols.join(', ')}) VALUES (${placeholders})`;
    const insertErrSQL = `INSERT INTO trn_repair_err (${trnCols.join(', ')}) VALUES (${placeholders})`;

    for (const stg of stgRows) {
      const mapped = mapRow(stg);
      const code = (stg['รหัสโครงการ'] || '').trim();

      // Lookup master by project code (try padding 0, 00), fallback by project name
      // Strip parentheses content e.g. "(RAMK) นิช โมโน รามคำแหง" → "นิช โมโน รามคำแหง"
      const stgName = (stg['ชื่อโครงการ'] || '').replace(/\(.*?\)/g, '').trim().toLowerCase();
      const master = (code ? (
        masterByCode.get(code)
        || masterByCode.get('0' + code)
        || masterByCode.get('00' + code)
      ) : null)
        || (stgName ? masterByName.get(stgName) : null);

      const values = [
        'smartifyhome',
        master ? master.project_id : '',
        master ? master.project_name_th : '',
        master ? master.project_type : '',
        mapped.original_project_code,
        mapped.original_project_name,
        mapped.open_date, mapped.close_date, mapped.assessment_date,
        mapped.assign_date, mapped.service_date, mapped.sla_date,
        mapped.document_id, mapped.document_number,
        mapped.job_status, mapped.job_sub_status,
        mapped.warranty_status, mapped.sla_exceeded, mapped.is_urgent,
        mapped.house_number, mapped.address_detail, mapped.residence_type, mapped.address_warranty_status,
        mapped.repair_category, mapped.issue, mapped.symptom, mapped.symptom_detail,
        mapped.customer_name, mapped.customer_phone, mapped.customer_phone_alt,
        mapped.reporter_type, mapped.request_channel,
        mapped.technician_name, mapped.technician_email, mapped.technician_detail, mapped.technician_note,
        mapped.admin_note, mapped.job_history, mapped.admin_read_status,
        mapped.before_image_url, mapped.after_image_url, mapped.customer_image_url,
        mapped.review_date, mapped.review_id, mapped.review_score, mapped.review_comment, mapped.review_tracking_failed,
        mapped.assessment_time, mapped.service_time,
        'repair',
        senpropTypeMap.get(mapped.document_number) === 'central' ? 'central_area'
          : (mapped.house_number || '').includes('สำนักงานขาย') ? 'sales_office'
          : (mapped.house_number || '').includes('ส่วนกลาง') ? 'central_area' : 'customer_room',
        // is_special_case: นอกประกัน + มีช่างจริง (ไม่ใช่ SEN PROP, ไม่ขึ้นต้นด้วย ช่าง)
        !!(['noWarranty', 'notCovered'].includes(mapped.warranty_status)
          && mapped.technician_name && mapped.technician_name.trim() !== ''
          && !mapped.technician_name.toLowerCase().includes('sen prop')
          && !mapped.technician_name.startsWith('ช่าง')),
      ];

      // Filter out excluded request channels → send to error table
      // const EXCLUDED_CHANNELS = ['webapp', 'walkin', 'android', 'ios'];
      // const channel = (mapped.request_channel || '').trim().toLowerCase();
      // const isExcludedChannel = EXCLUDED_CHANNELS.includes(channel);

      // Filter out test records (admin_note contains เทส or test)
      const adminNote = (mapped.admin_note || '').toLowerCase();
      const isTestRecord = adminNote.includes('เทส') || adminNote.includes('test');

      if (master && !isTestRecord) {
        await client.query(insertSQL, values);
        insertedCount++;
      } else {
        await client.query(insertErrSQL, values);
        errorCount++;
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      totalStg: stgRows.length,
      inserted: insertedCount,
      errors: errorCount,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ==================== ETL: stg_condo_qr → trn_repair ====================
router.post('/etl/condo-qr', async (req, res, next) => {
  const client = await qualityPool.connect();
  try {
    await client.query('BEGIN');

    // 0) Ensure target tables & columns exist
    await client.query(`ALTER TABLE trn_repair ADD COLUMN IF NOT EXISTS job_type TEXT`);
    await client.query(`ALTER TABLE trn_repair ADD COLUMN IF NOT EXISTS work_area TEXT`);

    // Create error table if not exists (same structure as trn_repair + error_reason)
    await client.query(`
      CREATE TABLE IF NOT EXISTS trn_condo_qr_err (
        id SERIAL PRIMARY KEY,
        datasource TEXT,
        original_project_name TEXT,
        complaint_topic TEXT,
        complaint_detail TEXT,
        room_no TEXT,
        status TEXT,
        consent TEXT,
        open_date TIMESTAMP,
        job_type TEXT,
        work_area TEXT,
        error_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 1) Delete previous condo_qr data (idempotent reload)
    await client.query("DELETE FROM trn_repair WHERE datasource = 'condo_qr'");
    await client.query('TRUNCATE TABLE trn_condo_qr_err');

    // 2) Load master_project_id lookup (with fuzzy matching)
    const masterRows = (await client.query('SELECT project_id, project_name_th, project_name_en, project_type FROM master_project_id')).rows;
    const findMaster = buildProjectMatcher(masterRows);

    // 3) Read all stg_condo_qr
    const stgRows = (await client.query('SELECT * FROM stg_condo_qr')).rows;

    // 4) Process each row
    let insertedCount = 0;
    let errorCount = 0;
    const matchMethods = {};

    const trnCols = [
      'datasource',
      'project_id', 'project_name', 'project_type',
      'original_project_code', 'original_project_name',
      'open_date', 'close_date', 'assessment_date', 'assign_date', 'service_date', 'sla_date',
      'document_id', 'document_number', 'job_status', 'job_sub_status',
      'warranty_status', 'sla_exceeded', 'is_urgent',
      'house_number', 'address_detail', 'residence_type', 'address_warranty_status',
      'repair_category', 'issue', 'symptom', 'symptom_detail',
      'customer_name', 'customer_phone', 'customer_phone_alt',
      'reporter_type', 'request_channel',
      'technician_name', 'technician_email', 'technician_detail', 'technician_note',
      'admin_note', 'job_history', 'admin_read_status',
      'before_image_url', 'after_image_url', 'customer_image_url',
      'review_date', 'review_id', 'review_score', 'review_comment', 'review_tracking_failed',
      'assessment_time', 'service_time',
      'job_type', 'work_area', 'is_special_case',
    ];
    const placeholders = trnCols.map((_, i) => `$${i + 1}`).join(', ');
    const insertSQL = `INSERT INTO trn_repair (${trnCols.join(', ')}) VALUES (${placeholders})`;

    const insertErrSQL = `INSERT INTO trn_condo_qr_err
      (datasource, original_project_name, complaint_topic, complaint_detail, room_no, status, consent, open_date, job_type, work_area, error_reason)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`;

    for (const stg of stgRows) {
      const rawName = (stg.project_name || '').trim();
      const result = findMaster(rawName);
      const master = result ? result.master : null;
      if (result) {
        matchMethods[result.method] = (matchMethods[result.method] || 0) + 1;
      }

      // Parse timestamp_str → Date
      const openDate = stg.timestamp_str ? new Date(stg.timestamp_str) : null;

      // Map complaint_topic → job_type
      const jobType = (stg.complaint_topic || '').toLowerCase() === 'repair' ? 'repair' : 'complain';
      const detectedCategory = detectCategory(stg.complaint_detail, jobType);

      if (master) {
        const values = [
          'condo_qr',
          master.project_id, master.project_name_th, master.project_type,
          '', rawName,
          openDate, null, null, null, null, null,
          `cqr-${stg.id}`, '', '', stg.status || '',
          '', '', '',
          stg.room_no || '', '', '', '',
          detectedCategory, stg.complaint_detail || '', '', stg.complaint_detail || '',
          '', '', '',
          '', 'condo_qr',
          '', '', '', '',
          '', '', '',
          '', '', '',
          '', '', '', '', '',
          '', '',
          jobType, 'common_area', false,
        ];
        await client.query(insertSQL, values);
        insertedCount++;
      } else {
        await client.query(insertErrSQL, [
          'condo_qr', rawName, stg.complaint_topic || '', stg.complaint_detail || '',
          stg.room_no || '', stg.status || '', stg.consent || '',
          openDate, jobType, 'common_area',
          `Project not found in master: "${rawName}"`,
        ]);
        errorCount++;
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      totalStg: stgRows.length,
      inserted: insertedCount,
      errors: errorCount,
      matchMethods,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// ==================== Data Quality ====================
router.get('/data-quality', async (req, res, next) => {
  try {
    // 1) Total records & date range
    const summaryQ = await qualityPool.query(`
      SELECT COUNT(*) AS total,
        MIN(open_date)::date AS min_date,
        MAX(open_date)::date AS max_date
      FROM trn_repair
    `);
    const totalRecords = parseInt(summaryQ.rows[0].total);
    const dateRange = {
      min: summaryQ.rows[0].min_date?.toISOString().slice(0, 10) || null,
      max: summaryQ.rows[0].max_date?.toISOString().slice(0, 10) || null,
    };

    // 2) Column completeness for important columns
    const columns = [
      { col: 'project_id', label: 'รหัสโครงการ' },
      { col: 'project_name', label: 'ชื่อโครงการ' },
      { col: 'house_number', label: 'บ้านเลขที่' },
      { col: 'open_date', label: 'วันที่เปิดงาน' },
      { col: 'close_date', label: 'วันที่ปิดงาน' },
      { col: 'assessment_date', label: 'วันที่ประเมิน' },
      { col: 'assign_date', label: 'วันที่มอบหมาย' },
      { col: 'service_date', label: 'วันที่เข้าซ่อม' },
      { col: 'sla_date', label: 'วันครบ SLA' },
      { col: 'job_status', label: 'สถานะงาน' },
      { col: 'job_sub_status', label: 'สถานะย่อย' },
      { col: 'warranty_status', label: 'สถานะรับประกัน' },
      { col: 'repair_category', label: 'ประเภทซ่อม' },
      { col: 'customer_name', label: 'ชื่อลูกค้า' },
      { col: 'customer_phone', label: 'เบอร์ลูกค้า' },
      { col: 'request_channel', label: 'ช่องทางแจ้ง' },
      { col: 'technician_name', label: 'ชื่อช่าง' },
      { col: 'document_number', label: 'เลขที่เอกสาร' },
    ];

    const colCases = columns.map(c => `COUNT(*) FILTER (WHERE ${c.col} IS NULL OR CAST(${c.col} AS TEXT) = '') AS null_${c.col}`).join(',\n        ');
    const colResult = await qualityPool.query(`SELECT ${colCases} FROM trn_repair`);
    const colRow = colResult.rows[0];
    const columnCompleteness = columns.map(c => {
      const nullCount = parseInt(colRow[`null_${c.col}`]);
      return {
        column: c.col,
        label: c.label,
        total: totalRecords,
        filled: totalRecords - nullCount,
        nullCount,
        fillRate: totalRecords > 0 ? Math.round(((totalRecords - nullCount) / totalRecords) * 10000) / 100 : 0,
      };
    });

    // 3) Date field analysis - also count NULL among open jobs
    const dateFields = [
      { col: 'open_date', label: 'วันที่เปิดงาน' },
      { col: 'assessment_date', label: 'วันที่ประเมิน' },
      { col: 'assign_date', label: 'วันที่มอบหมาย' },
      { col: 'service_date', label: 'วันที่เข้าซ่อม' },
      { col: 'sla_date', label: 'วันครบ SLA' },
      { col: 'close_date', label: 'วันที่ปิดงาน' },
    ];
    const dateCases = dateFields.map(f =>
      `COUNT(*) FILTER (WHERE ${f.col} IS NULL) AS null_${f.col},
       COUNT(*) FILTER (WHERE ${f.col} IS NULL AND job_sub_status NOT IN ('completed','cancel')) AS null_open_${f.col}`
    ).join(',\n        ');
    const dateResult = await qualityPool.query(`SELECT ${dateCases} FROM trn_repair`);
    const dateRow = dateResult.rows[0];
    const dateFieldAnalysis = dateFields.map(f => ({
      field: f.col,
      label: f.label,
      total: totalRecords,
      filled: totalRecords - parseInt(dateRow[`null_${f.col}`]),
      nullCount: parseInt(dateRow[`null_${f.col}`]),
      nullOpenJobs: parseInt(dateRow[`null_open_${f.col}`]),
    }));

    // 4) NULL open_date by project (only projects with NULL open_date)
    const nullByProjResult = await qualityPool.query(`
      SELECT project_id, project_name,
        COUNT(*) AS total_jobs,
        COUNT(*) FILTER (WHERE open_date IS NULL) AS null_open_date
      FROM trn_repair
      GROUP BY project_id, project_name
      HAVING COUNT(*) FILTER (WHERE open_date IS NULL) > 0
      ORDER BY COUNT(*) FILTER (WHERE open_date IS NULL) DESC
      LIMIT 30
    `);
    const nullOpenDateByProject = nullByProjResult.rows.map(r => ({
      projectId: r.project_id,
      projectName: r.project_name,
      totalJobs: parseInt(r.total_jobs),
      nullOpenDate: parseInt(r.null_open_date),
      nullRate: Math.round((parseInt(r.null_open_date) / parseInt(r.total_jobs)) * 10000) / 100,
    }));

    // 5) Data anomalies
    const anomalyQueries = [
      {
        type: 'close_before_open',
        label: 'ปิดงานก่อนเปิดงาน',
        description: 'close_date < open_date',
        sql: `COUNT(*) FILTER (WHERE close_date IS NOT NULL AND open_date IS NOT NULL AND close_date < open_date)`,
      },
      {
        type: 'completed_no_close',
        label: 'สถานะเสร็จแต่ไม่มี close_date',
        description: 'job_sub_status = completed แต่ close_date IS NULL',
        sql: `COUNT(*) FILTER (WHERE job_sub_status = 'completed' AND close_date IS NULL)`,
      },
      {
        type: 'open_no_open_date',
        label: 'งานเปิดอยู่แต่ไม่มี open_date',
        description: 'job_sub_status ไม่ใช่ completed/cancel แต่ open_date IS NULL',
        sql: `COUNT(*) FILTER (WHERE job_sub_status NOT IN ('completed','cancel') AND open_date IS NULL)`,
      },
      {
        type: 'no_category',
        label: 'ไม่มีประเภทซ่อม',
        description: 'repair_category IS NULL หรือว่าง',
        sql: `COUNT(*) FILTER (WHERE repair_category IS NULL OR repair_category = '')`,
      },
      {
        type: 'no_customer',
        label: 'ไม่มีข้อมูลลูกค้า',
        description: 'customer_name IS NULL หรือว่าง',
        sql: `COUNT(*) FILTER (WHERE customer_name IS NULL OR customer_name = '')`,
      },
      {
        type: 'closed_no_open',
        label: 'ปิดงานแล้วแต่ไม่มี open_date',
        description: 'job_sub_status = completed/cancel แต่ open_date IS NULL',
        sql: `COUNT(*) FILTER (WHERE job_sub_status IN ('completed','cancel') AND open_date IS NULL)`,
      },
      {
        type: 'assigned_no_technician',
        label: 'มอบหมายแล้วแต่ไม่มีชื่อช่าง',
        description: 'assign_date มีค่าแต่ technician_name IS NULL',
        sql: `COUNT(*) FILTER (WHERE assign_date IS NOT NULL AND (technician_name IS NULL OR technician_name = ''))`,
      },
      {
        type: 'serviced_no_assign',
        label: 'เข้าซ่อมแล้วแต่ยังไม่มอบหมาย',
        description: 'service_date มีค่าแต่ assign_date IS NULL',
        sql: `COUNT(*) FILTER (WHERE service_date IS NOT NULL AND assign_date IS NULL)`,
      },
      {
        type: 'completed_no_service',
        label: 'เสร็จแล้วแต่ไม่มีวันเข้าซ่อม',
        description: 'job_sub_status = completed แต่ service_date IS NULL',
        sql: `COUNT(*) FILTER (WHERE job_sub_status = 'completed' AND service_date IS NULL)`,
      },
    ];
    const anomalySql = anomalyQueries.map(a => `${a.sql} AS ${a.type}`).join(',\n        ');
    const anomalyResult = await qualityPool.query(`SELECT ${anomalySql} FROM trn_repair`);
    const anomalyRow = anomalyResult.rows[0];
    const anomalies = anomalyQueries.map(a => ({
      type: a.type,
      label: a.label,
      count: parseInt(anomalyRow[a.type]),
      description: a.description,
    }));

    res.json({
      totalRecords,
      dateRange,
      columnCompleteness,
      dateFieldAnalysis,
      nullOpenDateByProject,
      anomalies,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/quality/job/:id - single job detail
router.get('/job/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await qualityPool.query(`
      SELECT *,
        FLOOR(EXTRACT(EPOCH FROM (
          CASE WHEN job_sub_status IN ('completed','cancel') AND close_date IS NOT NULL
            THEN close_date - open_date
            ELSE NOW() - open_date
          END
        )) / 86400)::int AS age_days
      FROM trn_repair
      WHERE document_id = $1
      LIMIT 1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const r = result.rows[0];
    res.json({
      id: r.document_id,
      requestNumber: r.document_number || '-',
      projectName: r.project_name || '-',
      unitNumber: r.house_number || '-',
      customerName: r.customer_name || '-',
      customerPhone: r.customer_phone || '',
      category: r.repair_category || '-',
      status: r.job_sub_status || '-',
      jobStatus: r.job_status || '-',
      issue: r.issue || '',
      symptom: r.symptom || '',
      symptomDetail: r.symptom_detail || '',
      openDate: r.open_date,
      assessmentDate: r.assessment_date,
      assignDate: r.assign_date,
      serviceDate: r.service_date,
      closeDate: r.close_date,
      slaDate: r.sla_date,
      assignee: r.technician_name || '-',
      technicianEmail: r.technician_email || '',
      technicianDetail: r.technician_detail || '',
      technicianNote: r.technician_note || '',
      adminNote: r.admin_note || '',
      jobHistory: r.job_history || '',
      beforeImageUrl: r.before_image_url || '',
      afterImageUrl: r.after_image_url || '',
      customerImageUrl: r.customer_image_url || '',
      isUrgent: r.is_urgent === 'True',
      warrantyStatus: r.warranty_status || '',
      slaExceeded: r.sla_exceeded === true || r.sla_exceeded === 'True',
      requestChannel: r.request_channel || '',
      reviewScore: r.review_score ? parseFloat(r.review_score) : null,
      reviewComment: r.review_comment || '',
      reviewDate: r.review_date,
      daysOpen: parseInt(r.age_days) || 0,
      jobType: r.job_type || null,
      workArea: r.work_area || null,
    });
  } catch (err) { next(err); }
});

// GET /api/quality/aging - long pending jobs list with sort/search/pagination/bucket filter
router.get('/aging', async (req, res, next) => {
  try {
    const { project_id, project_type, category, date_from, date_to, job_filter, bucket, search, sort_by, sort_order, limit, offset } = req.query;

    const conditions = [];
    const params = [];
    let paramIdx = 1;

    // Job filter: open (default), closed, or all
    if (job_filter === 'closed') {
      conditions.push("job_sub_status IN ('completed', 'cancel')");
    } else if (job_filter !== 'all') {
      conditions.push("job_sub_status NOT IN ('completed', 'cancel')");
    }

    if (project_id) { conditions.push(`project_id = $${paramIdx++}`); params.push(project_id); }
    if (project_type) { conditions.push(`project_type = $${paramIdx++}`); params.push(project_type); }
    if (category && CATEGORY_GROUP_MAP[category]) {
      const cats = CATEGORY_GROUP_MAP[category];
      const placeholders = cats.map(() => `$${paramIdx++}`);
      conditions.push(`repair_category IN (${placeholders.join(',')})`);
      params.push(...cats);
    }
    if (date_from) { conditions.push(`open_date >= $${paramIdx++}`); params.push(date_from.length <= 7 ? `${date_from}-01` : date_from); }
    if (date_to) {
      // Convert YYYY-MM to last day of that month
      let toDate = date_to;
      if (date_to.length <= 7) {
        const [y, m] = date_to.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        toDate = `${date_to}-${String(lastDay).padStart(2, '0')}`;
      }
      conditions.push(`open_date <= $${paramIdx++}`);
      params.push(toDate);
    }

    // Bucket filter
    const bucketConditions = {
      '0-30': 'age_days <= 30',
      '31-45': 'age_days > 30 AND age_days <= 45',
      '46-60': 'age_days > 45 AND age_days <= 60',
      '61-120': 'age_days > 60 AND age_days <= 120',
      '120+': 'age_days > 120',
    };

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const bucketWhere = bucket && bucketConditions[bucket] ? `WHERE ${bucketConditions[bucket]}` : '';
    const searchWhere = search ? `${bucketWhere ? ' AND' : 'WHERE'} (document_number ILIKE '%' || $${paramIdx} || '%' OR project_name ILIKE '%' || $${paramIdx} || '%' OR house_number ILIKE '%' || $${paramIdx} || '%' OR customer_name ILIKE '%' || $${paramIdx} || '%' OR technician_name ILIKE '%' || $${paramIdx} || '%')` : '';
    if (search) { params.push(search); paramIdx++; }

    const sortMap = {
      daysOpen: 'age_days',
      requestNumber: 'document_number',
      projectName: 'project_name',
      unitNumber: 'house_number',
      category: 'repair_category',
      assignee: 'technician_name',
      status: 'job_sub_status',
      openDate: 'open_date',
    };
    const sortField = sortMap[sort_by] || 'age_days';
    const sortDir = sort_order === 'asc' ? 'ASC' : 'DESC';
    const effectiveLimit = parseInt(limit) || 10;
    const effectiveOffset = parseInt(offset) || 0;

    // Count total
    const countResult = await qualityPool.query(`
      SELECT COUNT(*) AS total FROM (
        SELECT FLOOR(EXTRACT(EPOCH FROM (NOW() - open_date)) / 86400)::int AS age_days
        FROM trn_repair
        ${whereClause}
      ) sub ${bucketWhere} ${searchWhere}
    `, params);

    // Get data
    const dataResult = await qualityPool.query(`
      SELECT * FROM (
        SELECT
          document_id,
          document_number,
          project_name,
          house_number,
          repair_category,
          technician_name,
          job_sub_status,
          open_date,
          assessment_date,
          assign_date,
          service_date,
          customer_name,
          job_type,
          work_area,
          FLOOR(EXTRACT(EPOCH FROM (NOW() - open_date)) / 86400)::int AS age_days
        FROM trn_repair
        ${whereClause}
      ) sub ${bucketWhere} ${searchWhere}
      ORDER BY ${sortField} ${sortDir} NULLS LAST
      LIMIT ${effectiveLimit} OFFSET ${effectiveOffset}
    `, params);

    const jobs = dataResult.rows.map(r => {
      const days = parseInt(r.age_days) || 0;
      const bucket = days <= 30 ? '0-30' : days <= 45 ? '31-45' : days <= 60 ? '46-60' : days <= 120 ? '61-120' : '120+';
      return {
        id: r.document_id,
        requestNumber: r.document_number || '-',
        projectName: r.project_name || '-',
        unitNumber: r.house_number || '-',
        category: r.repair_category || '-',
        assignee: r.technician_name || '-',
        status: r.job_sub_status || '-',
        openDate: r.open_date,
        assessmentDate: r.assessment_date,
        assignDate: r.assign_date,
        serviceDate: r.service_date,
        customerName: r.customer_name || '-',
        daysOpen: days,
        bucket,
        jobType: r.job_type || null,
        workArea: r.work_area || null,
      };
    });

    res.json({
      jobs,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: effectiveLimit,
        offset: effectiveOffset,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
