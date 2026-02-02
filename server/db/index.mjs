/**
 * Core Database Connection Pool
 * Shared database connections for all modules
 * Supports multiple databases
 */
import pg from 'pg';

const { Pool } = pg;

// Base connection config (shared)
const baseConfig = {
  host: process.env.DB_HOST || '172.22.22.12',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Sen@1775',
  max: parseInt(process.env.DB_POOL_SIZE || '30'),
  connectionTimeoutMillis: 30000,
};

// Database pools registry
const pools = {};

/**
 * Get or create a connection pool for a specific database
 * @param {string} database - Database name (default: 'RPT2025')
 * @returns {Pool} PostgreSQL connection pool
 */
export function getPool(database = 'RPT2025') {
  if (!pools[database]) {
    pools[database] = new Pool({
      ...baseConfig,
      database,
    });
    console.log(`📦 Created pool for database: ${database}`);
  }
  return pools[database];
}

// Pre-configured pools for convenience
export const pool = getPool('RPT2025');           // Sales 2025, Performance data
export const silvermanPool = getPool('postgres'); // Common Fee (silverman schema)
export const qualityPool = getPool('dbquality');  // Quality Reports (repair/complaint)

// Test connection for a specific pool
export async function testPoolConnection(poolInstance, name = 'default') {
  try {
    const result = await poolInstance.query('SELECT NOW()');
    console.log(`✅ Database [${name}] connected:`, result.rows[0].now);
    return true;
  } catch (err) {
    console.error(`❌ Database [${name}] connection failed:`, err.message);
    return false;
  }
}

// Test all connections on startup
export async function testConnection() {
  const results = await Promise.all([
    testPoolConnection(pool, 'RPT2025'),
    testPoolConnection(silvermanPool, 'postgres/silverman'),
  ]);
  return results.every(r => r);
}

// Graceful shutdown - close all pools
export async function closePool() {
  const closePromises = Object.entries(pools).map(async ([name, p]) => {
    await p.end();
    console.log(`Database pool [${name}] closed`);
  });
  await Promise.all(closePromises);
}

// Helper: Execute query with error handling
export async function query(text, params, poolInstance = pool) {
  const start = Date.now();
  try {
    const result = await poolInstance.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log('Query executed', { text: text.substring(0, 100), duration, rows: result.rowCount });
    }
    return result;
  } catch (err) {
    console.error('Query error:', err.message);
    throw err;
  }
}

export default pool;
