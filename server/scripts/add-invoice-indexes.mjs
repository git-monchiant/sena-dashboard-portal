/**
 * Add indexes to silverman.invoice table for better query performance
 * Run: node server/scripts/add-invoice-indexes.mjs
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || '172.22.22.12',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'postgres', // silverman schema is in postgres database
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Sen@1775',
});

const indexes = [
  // Single column indexes for common filters
  {
    name: 'idx_invoice_issued_date',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_issued_date ON silverman.invoice(issued_date)',
  },
  {
    name: 'idx_invoice_due_date',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_due_date ON silverman.invoice(due_date)',
  },
  {
    name: 'idx_invoice_paid_date',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_paid_date ON silverman.invoice(paid_date)',
  },
  {
    name: 'idx_invoice_status',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_status ON silverman.invoice(status)',
  },
  {
    name: 'idx_invoice_site_id',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_site_id ON silverman.invoice(site_id)',
  },
  {
    name: 'idx_invoice_pay_group',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_pay_group ON silverman.invoice(pay_group)',
  },
  // Composite indexes for common query patterns
  {
    name: 'idx_invoice_site_status',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_site_status ON silverman.invoice(site_id, status)',
  },
  {
    name: 'idx_invoice_site_issued',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_site_issued ON silverman.invoice(site_id, issued_date)',
  },
  {
    name: 'idx_invoice_status_due',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_status_due ON silverman.invoice(status, due_date)',
  },
  // For overdue queries (status active/partial + due_date < now)
  {
    name: 'idx_invoice_overdue',
    sql: `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_overdue ON silverman.invoice(due_date, total) WHERE status IN ('active', 'partial_payment')`,
  },
  // For name (unit) lookups and distinct counts
  {
    name: 'idx_invoice_name',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_name ON silverman.invoice(name)',
  },
];

async function checkExistingIndexes() {
  const result = await pool.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'silverman' AND tablename = 'invoice'
  `);
  return new Set(result.rows.map(r => r.indexname));
}

async function main() {
  console.log('🔍 Checking existing indexes on silverman.invoice...\n');

  const existingIndexes = await checkExistingIndexes();
  console.log(`Found ${existingIndexes.size} existing indexes:`);
  for (const idx of existingIndexes) {
    console.log(`  - ${idx}`);
  }
  console.log('');

  let created = 0;
  let skipped = 0;

  for (const idx of indexes) {
    if (existingIndexes.has(idx.name)) {
      console.log(`⏭️  ${idx.name} - already exists`);
      skipped++;
      continue;
    }

    console.log(`📦 Creating ${idx.name}...`);
    try {
      const start = Date.now();
      await pool.query(idx.sql);
      const duration = ((Date.now() - start) / 1000).toFixed(2);
      console.log(`   ✅ Created in ${duration}s`);
      created++;
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }
  }

  console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`);

  // Show final index list
  console.log('\n📋 Final index list:');
  const finalIndexes = await checkExistingIndexes();
  for (const idx of finalIndexes) {
    console.log(`  - ${idx}`);
  }

  await pool.end();
}

main().catch(console.error);
