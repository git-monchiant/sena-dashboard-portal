/**
 * SENA Dashboard API Server
 * Main entry point - uses modular route structure
 */
import express from 'express';
import cors from 'cors';

// Core database connection
import { testConnection, closePool } from './db/index.mjs';

// Route modules
import sales2025Routes from './routes/sales-2025.mjs';
import commonFeeRoutes from './routes/common-fee.mjs';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount route modules
app.use('/api/sales-2025', sales2025Routes);
app.use('/api/common-fee', commonFeeRoutes);

// TODO: Add more route modules here
// app.use('/api/maintenance', maintenanceRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Server startup
const PORT = process.env.PORT || 3001;

async function startServer() {
  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('Failed to connect to database. Exiting...');
    process.exit(1);
  }

  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 API Server running on http://localhost:${PORT}`);
    console.log(`📊 Available modules:`);
    console.log(`   - Sales 2025: /api/sales-2025`);
    console.log(`   - Common Fee: /api/common-fee`);
    // console.log(`   - Maintenance: /api/maintenance`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down...');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down...');
  await closePool();
  process.exit(0);
});

startServer();
