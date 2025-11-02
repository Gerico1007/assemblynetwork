/**
 * ♠️🌿🎸🧵 AssemblyNetwork Dashboard Server
 * Network Activity Tracking & Service Discovery
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const { scanNetwork, checkPort } = require('./scanner');
const { logActivity, getActivityLog, getActivityByDate } = require('./activity-logger');

const app = express();
const PORT = process.env.PORT || 9000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// In-memory cache for discovered services
let discoveredServices = [];
let lastScanTime = null;

/**
 * GET /
 * Serve dashboard HTML
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * GET /api/scan
 * Trigger network scan and return discovered services
 */
app.get('/api/scan', async (req, res) => {
  try {
    const subnet = req.query.subnet || '192.168.7.0/24';
    const customPorts = req.query.ports || null;

    console.log(`🔍 Scan request received for subnet: ${subnet}${customPorts ? ` with custom ports: ${customPorts}` : ''}`);

    // Log scan start event
    await logActivity({
      eventType: 'scan_started',
      host: subnet,
      port: 'N/A',
      service: 'Network Scanner',
      status: 'in_progress',
      metadata: { triggeredBy: req.ip }
    });

    // Perform network scan (with optional custom ports)
    const services = await scanNetwork(subnet, customPorts);

    // Update cache
    discoveredServices = services;
    lastScanTime = new Date().toISOString();

    // Log discovered services
    for (const service of services) {
      await logActivity({
        eventType: 'service_discovered',
        host: service.host,
        port: service.port,
        service: service.service,
        status: service.status,
        metadata: { scanTime: lastScanTime }
      });
    }

    // Log scan completion
    await logActivity({
      eventType: 'scan_completed',
      host: subnet,
      port: 'N/A',
      service: 'Network Scanner',
      status: 'success',
      metadata: {
        servicesFound: services.length,
        scanTime: lastScanTime
      }
    });

    res.json({
      success: true,
      scanTime: lastScanTime,
      subnet,
      servicesCount: services.length,
      services
    });

  } catch (error) {
    console.error('Scan error:', error);

    await logActivity({
      eventType: 'scan_error',
      host: 'N/A',
      port: 'N/A',
      service: 'Network Scanner',
      status: 'error',
      metadata: { error: error.message }
    });

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/services
 * Get cached discovered services
 */
app.get('/api/services', (req, res) => {
  res.json({
    success: true,
    lastScanTime,
    servicesCount: discoveredServices.length,
    services: discoveredServices
  });
});

/**
 * GET /api/activity
 * Get activity log
 */
app.get('/api/activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const date = req.query.date; // Optional: YYYY-MM-DD format

    let activities;
    if (date) {
      activities = await getActivityByDate(date);
    } else {
      activities = await getActivityLog(limit);
    }

    res.json({
      success: true,
      count: activities.length,
      activities
    });

  } catch (error) {
    console.error('Activity retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/check
 * Check if a specific host:port is reachable
 */
app.post('/api/check', async (req, res) => {
  try {
    const { host, port } = req.body;

    if (!host || !port) {
      return res.status(400).json({
        success: false,
        error: 'Host and port are required'
      });
    }

    const isOpen = await checkPort(host, port);

    await logActivity({
      eventType: 'port_check',
      host,
      port: port.toString(),
      service: 'Manual Check',
      status: isOpen ? 'online' : 'offline',
      metadata: { method: 'manual' }
    });

    res.json({
      success: true,
      host,
      port,
      isOpen,
      status: isOpen ? 'online' : 'offline'
    });

  } catch (error) {
    console.error('Port check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/status
 * Get server status and configuration
 */
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    server: 'AssemblyNetwork Dashboard',
    version: '1.0.0',
    uptime: process.uptime(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    lastScanTime,
    cachedServices: discoveredServices.length,
    features: {
      networkScanning: true,
      activityLogging: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      redisStorage: !!process.env.UPSTASH_REDIS_REST_TOKEN
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
♠️🌿🎸🧵 AssemblyNetwork Dashboard Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Server running on: http://0.0.0.0:${PORT}
📡 Network scope: 192.168.7.0/24
📊 Activity logging: ${process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ Enabled' : '⚠️  Disabled (no Redis token)'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

API Endpoints:
  GET  /api/scan      - Trigger network scan
  GET  /api/services  - Get discovered services
  GET  /api/activity  - Get activity log
  POST /api/check     - Check specific port
  GET  /api/status    - Server status

Ready to discover your network! 🚀
  `);

  // Log server startup
  logActivity({
    eventType: 'server_started',
    host: '0.0.0.0',
    port: PORT.toString(),
    service: 'AssemblyNetwork Dashboard',
    status: 'online',
    metadata: {
      version: '1.0.0',
      nodeVersion: process.version
    }
  }).catch(err => console.warn('Failed to log startup:', err.message));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');

  await logActivity({
    eventType: 'server_stopped',
    host: '0.0.0.0',
    port: PORT.toString(),
    service: 'AssemblyNetwork Dashboard',
    status: 'offline',
    metadata: { reason: 'SIGTERM' }
  }).catch(() => {});

  process.exit(0);
});

module.exports = app;
