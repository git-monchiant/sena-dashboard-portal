/**
 * Script to explore silverman schema
 */
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: '172.22.22.12',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Sen@1775',
  connectionTimeoutMillis: 10000,
});

async function main() {
  try {
    await client.connect();
    console.log('✅ Connected to postgres database\n');

    // 1. List all tables in silverman schema
    console.log('📋 Tables in silverman schema:');
    console.log('=' .repeat(60));

    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'silverman'
      ORDER BY table_name
    `);

    console.log(`Found ${tablesResult.rows.length} tables:\n`);
    tablesResult.rows.forEach((row, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${row.table_name}`);
    });

    // 2. Get row counts for each table
    console.log('\n\n📊 Table row counts:');
    console.log('=' .repeat(60));

    for (const row of tablesResult.rows) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM silverman."${row.table_name}"`);
        const count = countResult.rows[0].count;
        console.log(`  ${row.table_name.padEnd(40)} ${count.toString().padStart(10)} rows`);
      } catch (err) {
        console.log(`  ${row.table_name.padEnd(40)} [error: ${err.message}]`);
      }
    }

    // 3. Show columns for key tables (common-fee related)
    const keyTables = ['fine', 'fine_group', 'icon_tenant', 'icon_custumer', 'bank_account', 'bank_account_transaction'];

    console.log('\n\n📝 Key table structures:');
    console.log('=' .repeat(60));

    for (const tableName of keyTables) {
      const exists = tablesResult.rows.some(r => r.table_name === tableName);
      if (!exists) continue;

      console.log(`\n[${tableName}]`);

      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'silverman' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? '?' : '';
        console.log(`  - ${col.column_name}: ${col.data_type}${nullable}`);
      });
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

main();
