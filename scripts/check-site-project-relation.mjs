import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: '172.22.22.12',
  port: 5432,
  user: 'postgres',
  password: 'Sen@1775',
  database: 'postgres'
});

async function checkRelation() {
  try {
    // Check site table structure
    console.log('=== SITE TABLE COLUMNS ===');
    const siteCols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'silverman' AND table_name = 'site'
      ORDER BY ordinal_position
    `);
    siteCols.rows.forEach(col => {
      console.log('  ' + col.column_name + ': ' + col.data_type);
    });

    // Sample site data
    console.log('\n=== SAMPLE SITE DATA ===');
    const sampleSite = await pool.query(`
      SELECT * FROM silverman.site LIMIT 3
    `);
    console.log(JSON.stringify(sampleSite.rows, null, 2));

    // Check if there's a site_project or juristic relation
    console.log('\n=== CHECK JURISTIC COLUMNS ===');
    const juristicCols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'silverman' AND table_name = 'juristic'
      ORDER BY ordinal_position
    `);
    juristicCols.rows.forEach(col => {
      console.log('  ' + col.column_name + ': ' + col.data_type);
    });

    // Sample juristic with site relation
    console.log('\n=== SAMPLE JURISTIC WITH NAME ===');
    const sampleJuristic = await pool.query(`
      SELECT * FROM silverman.juristic WHERE name IS NOT NULL LIMIT 5
    `);
    console.log(JSON.stringify(sampleJuristic.rows, null, 2));

    // Check distinct statuses in invoice
    console.log('\n=== INVOICE STATUSES ===');
    const statuses = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM silverman.invoice
      GROUP BY status
      ORDER BY count DESC
    `);
    statuses.rows.forEach(row => {
      console.log('  ' + row.status + ': ' + row.count);
    });

    // Check period options (issued_date ranges)
    console.log('\n=== ISSUED DATE RANGE ===');
    const dateRange = await pool.query(`
      SELECT
        MIN(issued_date) as min_date,
        MAX(issued_date) as max_date,
        COUNT(DISTINCT DATE_TRUNC('month', issued_date)) as month_count
      FROM silverman.invoice
      WHERE issued_date IS NOT NULL
    `);
    console.log(JSON.stringify(dateRange.rows[0], null, 2));

    // Available months
    console.log('\n=== AVAILABLE MONTHS (recent 12) ===');
    const months = await pool.query(`
      SELECT
        DATE_TRUNC('month', issued_date)::date as month,
        COUNT(*) as invoice_count
      FROM silverman.invoice
      WHERE issued_date IS NOT NULL
      GROUP BY DATE_TRUNC('month', issued_date)
      ORDER BY month DESC
      LIMIT 12
    `);
    months.rows.forEach(row => {
      console.log('  ' + row.month + ': ' + row.invoice_count + ' invoices');
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkRelation();
