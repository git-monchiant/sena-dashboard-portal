/**
 * Generate ER Diagram HTML for silverman schema
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

    // 1. Get all tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'silverman' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    // 2. Get columns for each table
    const tables = {};
    for (const row of tablesResult.rows) {
      const columnsResult = await client.query(`
        SELECT
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'silverman' AND table_name = $1
        ORDER BY ordinal_position
      `, [row.table_name]);

      // Get row count
      const countResult = await client.query(`SELECT COUNT(*) as count FROM silverman."${row.table_name}"`);

      tables[row.table_name] = {
        columns: columnsResult.rows,
        rowCount: parseInt(countResult.rows[0].count),
      };
    }

    // 3. Get foreign key relationships
    const fkResult = await client.query(`
      SELECT
        tc.table_name as from_table,
        kcu.column_name as from_column,
        ccu.table_name as to_table,
        ccu.column_name as to_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'silverman'
    `);

    // 4. Infer relationships from column names (site_id, invoice_id, etc.)
    const inferredRelations = [];
    for (const [tableName, tableData] of Object.entries(tables)) {
      for (const col of tableData.columns) {
        if (col.column_name.endsWith('_id') && col.column_name !== 'id') {
          const targetTable = col.column_name.replace('_id', '');
          if (tables[targetTable]) {
            inferredRelations.push({
              from_table: tableName,
              from_column: col.column_name,
              to_table: targetTable,
              to_column: 'id',
            });
          }
        }
      }
    }

    // Combine FK and inferred relations
    const allRelations = [...fkResult.rows, ...inferredRelations];

    // Generate HTML
    const html = generateHTML(tables, allRelations);

    // Save to file
    const outputPath = path.join(__dirname, '..', 'er-diagram-silverman.html');
    fs.writeFileSync(outputPath, html);
    console.log(`\n✅ ER Diagram saved to: ${outputPath}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

function generateHTML(tables, relations) {
  const tableNames = Object.keys(tables);

  // Group tables by category
  const categories = {
    'Core': ['project', 'site', 'juristic', 'residential'],
    'Customer': ['icon_custumer', 'icon_tenant', 'tenant', 'contact'],
    'Finance': ['invoice', 'invoice_data', 'receive', 'receive_data', 'transaction', 'bank_account', 'bank_account_transaction'],
    'Fine': ['fine', 'fine_group'],
    'Other': [],
  };

  // Assign remaining tables to 'Other'
  const categorized = new Set(Object.values(categories).flat());
  categories['Other'] = tableNames.filter(t => !categorized.has(t) && !t.startsWith('v_'));

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ER Diagram - Silverman Schema</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      color: #e0e0e0;
      padding: 20px;
    }
    h1 {
      text-align: center;
      color: #00d9ff;
      margin-bottom: 10px;
      font-size: 2rem;
    }
    .subtitle {
      text-align: center;
      color: #888;
      margin-bottom: 30px;
    }
    .stats {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 15px 25px;
      text-align: center;
    }
    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: #00d9ff;
    }
    .stat-label {
      color: #888;
      font-size: 0.9rem;
    }
    .category {
      margin-bottom: 40px;
    }
    .category-title {
      font-size: 1.3rem;
      color: #ffd700;
      margin-bottom: 15px;
      padding-left: 10px;
      border-left: 4px solid #ffd700;
    }
    .tables-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    .table-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    .table-card:hover {
      border-color: #00d9ff;
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(0,217,255,0.1);
    }
    .table-header {
      background: linear-gradient(135deg, #0f3460 0%, #16213e 100%);
      padding: 12px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    }
    .table-name {
      font-weight: bold;
      color: #00d9ff;
      font-size: 1rem;
    }
    .table-count {
      font-size: 0.8rem;
      color: #888;
      background: rgba(0,0,0,0.3);
      padding: 3px 10px;
      border-radius: 10px;
    }
    .columns {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }
    .table-card.expanded .columns {
      max-height: 500px;
    }
    .column {
      padding: 8px 15px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }
    .column:last-child {
      border-bottom: none;
    }
    .column-name {
      color: #e0e0e0;
    }
    .column-name.pk {
      color: #ffd700;
    }
    .column-name.fk {
      color: #ff6b6b;
    }
    .column-type {
      color: #666;
      font-size: 0.75rem;
    }
    .relations-section {
      margin-top: 40px;
      background: rgba(255,255,255,0.03);
      border-radius: 12px;
      padding: 20px;
    }
    .relations-title {
      font-size: 1.3rem;
      color: #ff6b6b;
      margin-bottom: 15px;
    }
    .relation {
      display: flex;
      align-items: center;
      padding: 8px 0;
      font-size: 0.9rem;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .relation-from, .relation-to {
      color: #00d9ff;
    }
    .relation-arrow {
      margin: 0 15px;
      color: #ff6b6b;
    }
    .search-box {
      width: 100%;
      max-width: 400px;
      margin: 0 auto 30px;
      display: block;
      padding: 12px 20px;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 25px;
      background: rgba(255,255,255,0.05);
      color: #fff;
      font-size: 1rem;
    }
    .search-box:focus {
      outline: none;
      border-color: #00d9ff;
    }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <h1>ER Diagram - Silverman Schema</h1>
  <p class="subtitle">Database: postgres | Schema: silverman</p>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">${tableNames.length}</div>
      <div class="stat-label">Tables</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${relations.length}</div>
      <div class="stat-label">Relations</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${Object.values(tables).reduce((sum, t) => sum + t.rowCount, 0).toLocaleString()}</div>
      <div class="stat-label">Total Rows</div>
    </div>
  </div>

  <input type="text" class="search-box" placeholder="Search tables..." id="searchBox">

  ${Object.entries(categories).map(([category, categoryTables]) => {
    if (categoryTables.length === 0) return '';
    return `
    <div class="category" data-category="${category}">
      <h2 class="category-title">${category}</h2>
      <div class="tables-grid">
        ${categoryTables.map(tableName => {
          const table = tables[tableName];
          if (!table) return '';
          const fkColumns = table.columns.filter(c => c.column_name.endsWith('_id') && c.column_name !== 'id');
          return `
          <div class="table-card" data-table="${tableName}">
            <div class="table-header" onclick="this.parentElement.classList.toggle('expanded')">
              <span class="table-name">${tableName}</span>
              <span class="table-count">${table.rowCount.toLocaleString()} rows</span>
            </div>
            <div class="columns">
              ${table.columns.map(col => {
                const isPK = col.column_name === 'id';
                const isFK = col.column_name.endsWith('_id') && col.column_name !== 'id';
                return `
                <div class="column">
                  <span class="column-name ${isPK ? 'pk' : ''} ${isFK ? 'fk' : ''}">${isPK ? '🔑 ' : ''}${isFK ? '🔗 ' : ''}${col.column_name}</span>
                  <span class="column-type">${col.data_type}${col.is_nullable === 'YES' ? '?' : ''}</span>
                </div>`;
              }).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('')}

  <div class="relations-section">
    <h2 class="relations-title">Relationships (${relations.length})</h2>
    ${relations.slice(0, 50).map(rel => `
      <div class="relation">
        <span class="relation-from">${rel.from_table}.${rel.from_column}</span>
        <span class="relation-arrow">→</span>
        <span class="relation-to">${rel.to_table}.${rel.to_column}</span>
      </div>
    `).join('')}
    ${relations.length > 50 ? `<p style="color:#888;margin-top:10px;">... and ${relations.length - 50} more</p>` : ''}
  </div>

  <script>
    document.getElementById('searchBox').addEventListener('input', function(e) {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll('.table-card').forEach(card => {
        const tableName = card.dataset.table.toLowerCase();
        card.classList.toggle('hidden', !tableName.includes(query));
      });
    });
  </script>
</body>
</html>`;
}

main();
