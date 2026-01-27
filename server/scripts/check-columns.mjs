import pg from 'pg';

const pool = new pg.Pool({
  host: '172.22.22.12',
  port: 5432,
  database: 'RPT2025',
  user: 'postgres',
  password: 'Sen@1775'
});

try {
  const result = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'sales_mkt'
    ORDER BY ordinal_position
  `);

  console.log('Total columns:', result.rows.length);
  console.log('');
  console.log('=== All Columns ===');
  result.rows.forEach((r, i) => console.log(`${i+1}. ${r.column_name} (${r.data_type})`));

  const livnexCols = result.rows.filter(r => r.column_name.includes('livnex') || r.column_name.includes('rentnex'));
  console.log('');
  console.log(`=== LivNex/RentNex Columns (${livnexCols.length}) ===`);
  livnexCols.forEach(r => console.log(`- ${r.column_name} (${r.data_type})`));

} catch (e) {
  console.error('Error:', e.message);
  console.error('Stack:', e.stack);
} finally {
  try {
    await pool.end();
  } catch (e2) {
    console.error('Pool end error:', e2.message);
  }
}
