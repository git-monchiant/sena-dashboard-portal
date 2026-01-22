import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: '172.22.22.12',
  port: 5432,
  user: 'postgres',
  password: 'Sen@1775',
  database: 'postgres'
});

async function checkSchema() {
  try {
    // Get invoice table columns
    const invoiceCols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'silverman' AND table_name = 'invoice'
      ORDER BY ordinal_position
    `);

    console.log('=== INVOICE TABLE COLUMNS ===');
    invoiceCols.rows.forEach(col => {
      const nullable = col.is_nullable === 'NO' ? 'NOT NULL' : '';
      console.log('  ' + col.column_name + ': ' + col.data_type + ' ' + nullable);
    });

    // Sample invoice data
    console.log('\n=== SAMPLE INVOICE DATA ===');
    const sample = await pool.query(`
      SELECT * FROM silverman.invoice LIMIT 2
    `);
    console.log(JSON.stringify(sample.rows, null, 2));

    // Check related tables - invoice_item
    const invoiceItemCols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'silverman' AND table_name = 'invoice_item'
      ORDER BY ordinal_position
    `);

    if (invoiceItemCols.rows.length > 0) {
      console.log('\n=== INVOICE_ITEM COLUMNS ===');
      invoiceItemCols.rows.forEach(col => {
        console.log('  ' + col.column_name + ': ' + col.data_type);
      });

      // Sample invoice_item data
      console.log('\n=== SAMPLE INVOICE_ITEM DATA ===');
      const sampleItem = await pool.query(`
        SELECT * FROM silverman.invoice_item LIMIT 3
      `);
      console.log(JSON.stringify(sampleItem.rows, null, 2));
    }

    // Check icon_custumer (customer/unit info)
    console.log('\n=== ICON_CUSTUMER (CUSTOMER) COLUMNS ===');
    const custCols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'silverman' AND table_name = 'icon_custumer'
      ORDER BY ordinal_position
    `);
    custCols.rows.forEach(col => {
      console.log('  ' + col.column_name + ': ' + col.data_type);
    });

    // Check receive table (payments)
    console.log('\n=== RECEIVE TABLE COLUMNS ===');
    const recCols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'silverman' AND table_name = 'receive'
      ORDER BY ordinal_position
    `);
    recCols.rows.forEach(col => {
      console.log('  ' + col.column_name + ': ' + col.data_type);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
