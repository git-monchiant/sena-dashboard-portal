import pg from 'pg';

const pool = new pg.Pool({
  host: '172.22.22.12',
  port: 5432,
  database: 'RPT2025',
  user: 'postgres',
  password: 'Sen@1775'
});

const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Generate column definitions for LivNex and RentNex
const columns = [];

// LivNex columns (52)
months.forEach(m => columns.push(`livnex_${m}_unit`));
columns.push('livnex_totalunit');
months.forEach(m => columns.push(`livnex_${m}_thb`));
columns.push('livnex_totalthb');
months.forEach(m => columns.push(`target_livnex_${m}_unit`));
columns.push('target_livnex_totalunit');
months.forEach(m => columns.push(`target_livnex_${m}_thb`));
columns.push('target_livnex_totalthb');

// RentNex columns (52)
months.forEach(m => columns.push(`rentnex_${m}_unit`));
columns.push('rentnex_totalunit');
months.forEach(m => columns.push(`rentnex_${m}_thb`));
columns.push('rentnex_totalthb');
months.forEach(m => columns.push(`target_rentnex_${m}_unit`));
columns.push('target_rentnex_totalunit');
months.forEach(m => columns.push(`target_rentnex_${m}_thb`));
columns.push('target_rentnex_totalthb');

console.log(`Adding ${columns.length} columns to sales_mkt table...`);

try {
  // Build ALTER TABLE statements with default value '0'
  const alterStatements = columns.map(col =>
    `ALTER TABLE sales_mkt ADD COLUMN IF NOT EXISTS ${col} TEXT DEFAULT '0'`
  );

  // Execute each statement
  for (const stmt of alterStatements) {
    await pool.query(stmt);
    process.stdout.write('.');
  }

  // Update existing rows to have '0' values
  console.log('\nUpdating existing rows to 0...');
  const updateCols = columns.map(col => `${col} = COALESCE(${col}, '0')`).join(', ');
  await pool.query(`UPDATE sales_mkt SET ${updateCols}`);

  console.log(`✅ Successfully added ${columns.length} columns with value 0!`);

  // Verify
  const result = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'sales_mkt'
    AND (column_name LIKE '%livnex%' OR column_name LIKE '%rentnex%')
    ORDER BY column_name
  `);
  console.log(`\nVerification: Found ${result.rows.length} LivNex/RentNex columns`);

} catch (e) {
  console.error('\n❌ Error:', e.message);
} finally {
  await pool.end();
}
