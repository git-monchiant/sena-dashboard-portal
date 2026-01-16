import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({
  host: '172.22.22.12',
  port: 5432,
  database: 'RPT2025',
  user: 'postgres',
  password: 'Sen@1775',
  connectionTimeoutMillis: 10000,
});

async function main() {
  try {
    await client.connect();
    console.log('✅ Connected to RPT2025\n');

    // 1. Fetch Performance data
    console.log('📊 Fetching Performance2025...');
    const perfResult = await client.query(`
      SELECT
        bud, opm, corp, jv_status, project_code, project_name, quarter,
        CAST(booking_actual AS NUMERIC) as booking_actual,
        CAST(livnex_actual AS NUMERIC) as livnex_actual,
        CAST(presale_target AS NUMERIC) as presale_target,
        CAST(presale_actual AS NUMERIC) as presale_actual,
        CAST(presale_achieve_pct AS NUMERIC) as presale_achieve_pct,
        CAST(revenue_target AS NUMERIC) as revenue_target,
        CAST(revenue_actual AS NUMERIC) as revenue_actual,
        CAST(revenue_achieve_pct AS NUMERIC) as revenue_achieve_pct,
        CAST(mkt_expense_actual AS NUMERIC) as mkt_expense_actual,
        CAST(mkt_pct_booking AS NUMERIC) as mkt_pct_booking,
        CAST(mkt_pct_presale_livnex AS NUMERIC) as mkt_pct_presale_livnex,
        CAST(mkt_pct_revenue AS NUMERIC) as mkt_pct_revenue
      FROM "Performance2025"
      ORDER BY bud, project_code, quarter
    `);
    console.log(`   Found ${perfResult.rows.length} records`);

    // 2. Fetch User Mapping - Sale department only
    console.log('📊 Fetching Sale User Mappings...');
    const saleResult = await client.query(`
      SELECT
        bud, project_code, project_name,
        department, role_type, position, name, month
      FROM "Project_User_Mapping"
      WHERE department = 'Sale'
      ORDER BY bud, project_code, role_type DESC, name
    `);
    console.log(`   Found ${saleResult.rows.length} records`);

    // 3. Get unique VP and MGR lists
    console.log('📊 Building VP/MGR lists...');
    const vpList = await client.query(`
      SELECT DISTINCT name, position
      FROM "Project_User_Mapping"
      WHERE department = 'Sale' AND role_type = 'VP'
      ORDER BY name
    `);
    const mgrList = await client.query(`
      SELECT DISTINCT name, position
      FROM "Project_User_Mapping"
      WHERE department = 'Sale' AND role_type = 'MGR'
      ORDER BY name
    `);

    // 4. Get unique projects
    const projectList = await client.query(`
      SELECT DISTINCT project_code, project_name, bud
      FROM "Performance2025"
      ORDER BY bud, project_code
    `);

    // 5. Group sale mappings by project
    const saleMappings = {};
    saleResult.rows.forEach(row => {
      const key = row.project_code;
      if (!saleMappings[key]) {
        saleMappings[key] = { vp: [], mgr: [] };
      }

      const personKey = `${row.name}|${row.position}`;
      const group = row.role_type === 'VP' ? 'vp' : 'mgr';

      let person = saleMappings[key][group].find(p => p.key === personKey);
      if (!person) {
        person = { key: personKey, name: row.name, position: row.position, months: [] };
        saleMappings[key][group].push(person);
      }
      person.months.push(row.month);
    });

    // Clean up keys
    Object.values(saleMappings).forEach(mapping => {
      mapping.vp.forEach(p => delete p.key);
      mapping.mgr.forEach(p => delete p.key);
    });

    // Build final data structure
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        year: 2025,
      },
      performance: perfResult.rows,
      saleMappings: saleMappings,
      filters: {
        vpList: vpList.rows,
        mgrList: mgrList.rows,
        projectList: projectList.rows,
        quarterList: ['Q1', 'Q2', 'Q3', 'Q4'],
        budList: [...new Set(perfResult.rows.map(r => r.bud))].sort(),
      },
    };

    // Save to file
    const outputPath = path.join(__dirname, '..', 'src', 'reports', 'sales-2025', 'data.json');
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    console.log(`\n✅ Data exported to ${outputPath}`);
    console.log(`   - Performance records: ${perfResult.rows.length}`);
    console.log(`   - Projects with mappings: ${Object.keys(saleMappings).length}`);
    console.log(`   - VP list: ${vpList.rows.length} people`);
    console.log(`   - MGR list: ${mgrList.rows.length} people`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
