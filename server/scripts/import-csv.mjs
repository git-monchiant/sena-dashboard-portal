/**
 * CSV Import Script for Silverman Schema
 * Drops and recreates tables, then imports from CSV files
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import readline from 'readline';
import copyFrom from 'pg-copy-streams';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database config
const pool = new Pool({
  host: '172.22.22.12',
  port: 5432,
  user: 'postgres',
  password: 'Sen@1775',
  database: 'postgres',
  max: 1,
});

const CSV_DIR = path.resolve(__dirname, '../../csv');

// Table definitions - columns from CSV headers
const TABLE_DEFS = {
  site: {
    file: 'site.csv',
    columns: 'id INTEGER PRIMARY KEY, domain TEXT, name TEXT',
  },
  contact: {
    file: 'contact.csv',
    columns: `
      id INTEGER PRIMARY KEY,
      ref_number TEXT, tax_id_number TEXT, name TEXT, first_name TEXT, last_name TEXT,
      nick_name TEXT, position TEXT, phone TEXT, email TEXT, main_phone TEXT, main_email TEXT,
      fax TEXT, web_site TEXT, registered_name TEXT, registered_address TEXT,
      registered_country TEXT, registered_province TEXT, registered_district TEXT,
      registered_city TEXT, registered_postal_code TEXT, mailing_name TEXT, mailing_address TEXT,
      mailing_country TEXT, mailing_province TEXT, mailing_district TEXT, mailing_city TEXT,
      mailing_postal_code TEXT, type_of_payment TEXT, total_amount NUMERIC, type_of_supplier TEXT,
      type_of_contact TEXT, size_residential NUMERIC, type_of_company TEXT, name_branch TEXT,
      vat TEXT, added TIMESTAMPTZ, updated TIMESTAMPTZ, residential_id INTEGER, site_id INTEGER,
      email_renter TEXT, first_name_renter TEXT, last_name_renter TEXT, nick_name_renter TEXT,
      phone_renter TEXT, tax_id_number_renter TEXT, account_name TEXT, account_name_en TEXT,
      account_number TEXT, bank_branch_number TEXT, bank_name TEXT, email_contact TEXT,
      first_name_contact TEXT, last_name_contact TEXT, nick_name_contact TEXT, phone_contact TEXT,
      prefix_name TEXT, prefix_name_contact TEXT, prefix_name_renter TEXT, registered_capital TEXT,
      status_of_company TEXT, type_of_country TEXT, type_of_people TEXT,
      agent_address TEXT, agent_city TEXT, agent_country TEXT, agent_district TEXT,
      agent_postal_code TEXT, agent_province TEXT, email_agent TEXT, first_name_agent TEXT,
      last_name_agent TEXT, nick_name_agent TEXT, phone_agent TEXT, renter_address TEXT,
      renter_city TEXT, renter_country TEXT, renter_district TEXT, renter_postal_code TEXT,
      renter_province TEXT, tax_id_number_agent TEXT
    `,
  },
  invoice: {
    file: 'invoice.csv',
    columns: `
      id INTEGER PRIMARY KEY,
      due_date DATE, issued_date DATE, doc_number TEXT, ref_number TEXT, status TEXT,
      remark TEXT, creator TEXT, approver TEXT, updater TEXT, total NUMERIC, tax_type TEXT,
      invoice_type TEXT, paid_date DATE, added TIMESTAMPTZ, updated TIMESTAMPTZ,
      contact_id INTEGER, site_id INTEGER, void_remark TEXT, first_name TEXT, last_name TEXT,
      name TEXT, email TEXT, phone TEXT, tax_id_number TEXT, address TEXT, city TEXT,
      country TEXT, district TEXT, postal_code TEXT, province TEXT, history_show BOOLEAN,
      schedule_time TEXT, pay_group TEXT, contract_revenue_id INTEGER, editor TEXT,
      publish_status BOOLEAN, time_active_draft TEXT
    `,
  },
  invoice_data: {
    file: 'invoice_data.csv',
    columns: `
      id INTEGER PRIMARY KEY,
      url TEXT, due_date DATE, issued_date DATE, doc_number TEXT, ref_number TEXT,
      status TEXT, total NUMERIC, first_name TEXT, last_name TEXT, email TEXT, pay_group TEXT,
      transaction TEXT, payment_fee TEXT, net NUMERIC, added TIMESTAMPTZ, updated TIMESTAMPTZ,
      contact_id INTEGER, invoice_id INTEGER, residential_id INTEGER, site_id INTEGER,
      bank_account_list TEXT, sum_total NUMERIC, response_data TEXT, project_id TEXT,
      residential_name TEXT
    `,
  },
};

// Read only the first line of a file (streaming)
async function getFirstLine(filePath) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity
    });
    rl.on('line', (line) => {
      rl.close();
      resolve(line);
    });
    rl.on('error', reject);
  });
}

async function getColumns(filePath) {
  const firstLine = await getFirstLine(filePath);
  return firstLine.trim().split(',');
}

async function dropAndCreateTable(client, schema, table, columnsDef) {
  console.log(`  📦 Recreating ${schema}.${table}...`);
  await client.query(`DROP TABLE IF EXISTS ${schema}.${table} CASCADE`);
  await client.query(`CREATE TABLE ${schema}.${table} (${columnsDef})`);
  console.log(`  ✅ Created ${schema}.${table}`);
}

async function importTable(client, schema, table, filePath) {
  const columns = await getColumns(filePath);

  console.log(`  📥 Importing ${table}...`);

  const copyQuery = `COPY ${schema}.${table} (${columns.join(', ')}) FROM STDIN WITH (FORMAT csv, HEADER true, NULL '')`;

  const stream = client.query(copyFrom.from(copyQuery));
  const fileStream = createReadStream(filePath);

  await pipeline(fileStream, stream);

  // Count rows after import
  const countResult = await client.query(`SELECT COUNT(*) FROM ${schema}.${table}`);
  const rowCount = parseInt(countResult.rows[0].count);

  console.log(`  ✅ Imported ${table}: ${rowCount.toLocaleString()} rows`);
  return rowCount;
}

async function resetSequence(client, schema, table) {
  try {
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS ${schema}.${table}_id_seq;
      ALTER TABLE ${schema}.${table} ALTER COLUMN id SET DEFAULT nextval('${schema}.${table}_id_seq');
      SELECT setval('${schema}.${table}_id_seq', COALESCE((SELECT MAX(id) FROM ${schema}.${table}), 1));
    `);
    console.log(`  ✅ Reset sequence for ${table}`);
  } catch (err) {
    console.log(`  ⚠️  Sequence for ${table}: ${err.message}`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  CSV Import Script for Silverman Schema');
  console.log('  (DROP and RECREATE tables)');
  console.log('═══════════════════════════════════════════════════════\n');

  const client = await pool.connect();

  try {
    // Test connection
    const testResult = await client.query('SELECT NOW()');
    console.log(`✅ Connected to database at ${testResult.rows[0].now}\n`);

    // Ensure schema exists
    await client.query('CREATE SCHEMA IF NOT EXISTS silverman');

    // Step 1: Drop and recreate tables in reverse order
    console.log('📋 Step 1: Dropping and recreating tables...');
    const tables = ['invoice_data', 'invoice', 'contact', 'site'];
    for (const table of tables) {
      await dropAndCreateTable(client, 'silverman', table, TABLE_DEFS[table].columns);
    }

    // Step 2: Import data in order
    console.log('\n📋 Step 2: Importing CSV data...');
    let totalRows = 0;
    const importOrder = ['site', 'contact', 'invoice', 'invoice_data'];

    for (const table of importOrder) {
      const filePath = path.join(CSV_DIR, TABLE_DEFS[table].file);

      if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️  File not found: ${TABLE_DEFS[table].file}, skipping...`);
        continue;
      }

      const rows = await importTable(client, 'silverman', table, filePath);
      totalRows += rows;
    }

    // Step 3: Reset sequences
    console.log('\n📋 Step 3: Resetting sequences...');
    for (const table of importOrder) {
      await resetSequence(client, 'silverman', table);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`  ✅ Import completed! Total: ${totalRows.toLocaleString()} rows`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n❌ Import failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
