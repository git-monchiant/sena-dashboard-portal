/**
 * Add indexes to silverman.project table for better query performance
 * This optimizes the project_type subqueries used in common-fee APIs
 * Run: node server/scripts/add-project-indexes.mjs
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
  // Composite index for project type lookups (most efficient for IN subqueries)
  {
    name: 'idx_project_type_site',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_type_site ON silverman.project(type_of_project, site_id)',
  },
  // Single column indexes
  {
    name: 'idx_project_site_id',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_site_id ON silverman.project(site_id)',
  },
  {
    name: 'idx_project_type',
    sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_type ON silverman.project(type_of_project)',
  },
];

async function checkExistingIndexes() {
  const result = await pool.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'silverman' AND tablename = 'project'
  `);
  return new Set(result.rows.map(r => r.indexname));
}

async function main() {
  console.log('🔍 Checking existing indexes on silverman.project...\n');

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
