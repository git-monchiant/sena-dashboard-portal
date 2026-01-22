#!/bin/bash

# CSV Import Script for Silverman Schema
# Clears existing data and imports from CSV files

set -e

# Database config
DB_HOST="172.22.22.12"
DB_PORT="5432"
DB_USER="postgres"
DB_NAME="postgres"
export PGPASSWORD="Sen@1775"

CSV_DIR="$(dirname "$0")/../../csv"

echo "═══════════════════════════════════════════════════════"
echo "  CSV Import Script for Silverman Schema"
echo "═══════════════════════════════════════════════════════"
echo ""

# Test connection
echo "🔌 Testing database connection..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT NOW();" > /dev/null
echo "✅ Connected to database"
echo ""

# Step 1: Clear all tables in reverse order
echo "📋 Step 1: Clearing existing data..."
echo "  🗑️  Clearing silverman.invoice_data..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "TRUNCATE silverman.invoice_data CASCADE;" 2>/dev/null || echo "  ⚠️  Table invoice_data not found or already empty"

echo "  🗑️  Clearing silverman.invoice..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "TRUNCATE silverman.invoice CASCADE;" 2>/dev/null || echo "  ⚠️  Table invoice not found or already empty"

echo "  🗑️  Clearing silverman.contact..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "TRUNCATE silverman.contact CASCADE;" 2>/dev/null || echo "  ⚠️  Table contact not found or already empty"

echo "  🗑️  Clearing silverman.site..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "TRUNCATE silverman.site CASCADE;" 2>/dev/null || echo "  ⚠️  Table site not found or already empty"

echo "✅ Cleared all tables"
echo ""

# Step 2: Import data
echo "📋 Step 2: Importing CSV data..."

# Import site
echo "  📥 Importing site.csv..."
SITE_COUNT=$(wc -l < "$CSV_DIR/site.csv" | tr -d ' ')
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\COPY silverman.site FROM '$CSV_DIR/site.csv' WITH (FORMAT csv, HEADER true, NULL '');"
echo "  ✅ Imported site: $((SITE_COUNT - 1)) rows"

# Import contact
echo "  📥 Importing contact.csv..."
CONTACT_COUNT=$(wc -l < "$CSV_DIR/contact.csv" | tr -d ' ')
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\COPY silverman.contact FROM '$CSV_DIR/contact.csv' WITH (FORMAT csv, HEADER true, NULL '');"
echo "  ✅ Imported contact: $((CONTACT_COUNT - 1)) rows"

# Import invoice
echo "  📥 Importing invoice.csv..."
INVOICE_COUNT=$(wc -l < "$CSV_DIR/invoice.csv" | tr -d ' ')
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\COPY silverman.invoice FROM '$CSV_DIR/invoice.csv' WITH (FORMAT csv, HEADER true, NULL '');"
echo "  ✅ Imported invoice: $((INVOICE_COUNT - 1)) rows"

# Import invoice_data
echo "  📥 Importing invoice_data.csv..."
INVOICE_DATA_COUNT=$(wc -l < "$CSV_DIR/invoice_data.csv" | tr -d ' ')
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\COPY silverman.invoice_data FROM '$CSV_DIR/invoice_data.csv' WITH (FORMAT csv, HEADER true, NULL '');"
echo "  ✅ Imported invoice_data: $((INVOICE_DATA_COUNT - 1)) rows"

echo ""

# Step 3: Reset sequences
echo "📋 Step 3: Resetting sequences..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT setval(pg_get_serial_sequence('silverman.site', 'id'), COALESCE((SELECT MAX(id) FROM silverman.site), 1));
SELECT setval(pg_get_serial_sequence('silverman.contact', 'id'), COALESCE((SELECT MAX(id) FROM silverman.contact), 1));
SELECT setval(pg_get_serial_sequence('silverman.invoice', 'id'), COALESCE((SELECT MAX(id) FROM silverman.invoice), 1));
SELECT setval(pg_get_serial_sequence('silverman.invoice_data', 'id'), COALESCE((SELECT MAX(id) FROM silverman.invoice_data), 1));
" > /dev/null 2>&1 || echo "  ⚠️  Some sequences may not exist"
echo "✅ Sequences reset"
echo ""

# Calculate total
TOTAL=$((SITE_COUNT + CONTACT_COUNT + INVOICE_COUNT + INVOICE_DATA_COUNT - 4))

echo "═══════════════════════════════════════════════════════"
echo "  ✅ Import completed! Total: $TOTAL rows"
echo "═══════════════════════════════════════════════════════"

unset PGPASSWORD
