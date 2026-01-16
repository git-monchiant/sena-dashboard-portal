import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: '172.22.22.12',
  port: 5432,
  database: 'RPT2025',
  user: 'postgres',
  password: 'Sen@1775',
  connectionTimeoutMillis: 5000,
});

async function main() {
  try {
    await client.connect();
    console.log('✅ Connected to RPT2025\n');

    // Check distinct months
    console.log('📅 Months in data:');
    const months = await client.query(`SELECT DISTINCT month FROM "Project_User_Mapping"`);
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const sortedMonths = months.rows.map(m => m.month).sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
    console.log(`  ${sortedMonths.join(', ')}`);

    // Example: One project - who is responsible each month
    console.log('\n📊 ตัวอย่าง: โครงการ BPEF ใครรับผิดชอบบ้าง');
    const project = await client.query(`
      SELECT department, role_type, position, name, month
      FROM "Project_User_Mapping"
      WHERE project_code = 'BPEF'
      ORDER BY department, role_type DESC, name
    `);

    // Group by person
    const grouped = {};
    project.rows.forEach(p => {
      const key = `${p.department}|${p.role_type}|${p.position}|${p.name}`;
      if (!grouped[key]) {
        grouped[key] = { ...p, months: [] };
      }
      grouped[key].months.push(p.month);
    });

    Object.values(grouped).forEach(p => {
      const sortedM = p.months.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
      console.log(`  - ${p.department}/${p.role_type} ${p.name} (${p.position}): ${sortedM.join(', ')}`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
