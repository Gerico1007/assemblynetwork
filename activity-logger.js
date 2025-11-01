/**
 * ♠️🌿🎸🧵 Activity Logger Module
 * Logs network activity events to Upstash Redis
 * "Every log is a memory crystal—let the garden remember every echo!"
 */

require('dotenv').config();
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://pro-sponge-51413.upstash.io';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.RESONANCE_TOKEN;

/**
 * Activity Event Model
 * @typedef {Object} ActivityEvent
 * @property {string} id - Unique event ID (UUID)
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {string} eventType - Type of event (scan, service_discovered, service_lost, error)
 * @property {string} host - IP address
 * @property {string} port - Port number
 * @property {string} service - Service name
 * @property {string} status - Status (online, offline, unknown)
 * @property {Object} metadata - Additional metadata
 */

/**
 * Log an activity event to Upstash Redis
 * @param {ActivityEvent} event - Activity event object
 * @returns {Promise<void>}
 */
async function logActivity(event) {
  if (!UPSTASH_TOKEN) {
    console.warn('⚠️  UPSTASH_REDIS_REST_TOKEN not configured, activity logging disabled');
    return;
  }

  try {
    const eventWithId = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...event
    };

    // Store in Redis with key pattern: activity:{date}:{id}
    const date = eventWithId.timestamp.split('T')[0];
    const key = `network_activity:${date}:${eventWithId.id}`;

    const response = await fetch(`${UPSTASH_URL}/set/${key}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventWithId)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Redis SET failed: ${error}`);
    }

    console.log(`📝 Activity logged: ${eventWithId.eventType} - ${eventWithId.host}:${eventWithId.port}`);

    // Also add to activity log list for chronological retrieval
    await fetch(`${UPSTASH_URL}/lpush/activity_log`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([key])
    });

    return eventWithId;

  } catch (error) {
    console.error(`❌ Failed to log activity: ${error.message}`);
    throw error;
  }
}

/**
 * Retrieve activity log from Redis
 * @param {number} limit - Maximum number of events to retrieve (default: 100)
 * @returns {Promise<Array>} Array of activity events
 */
async function getActivityLog(limit = 100) {
  if (!UPSTASH_TOKEN) {
    return [];
  }

  try {
    // Get recent activity keys from the list
    const response = await fetch(`${UPSTASH_URL}/lrange/activity_log/0/${limit - 1}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(`Redis LRANGE failed: ${response.statusText}`);
    }

    const data = await response.json();
    const keys = data.result || [];

    // Fetch each event
    const events = await Promise.all(
      keys.map(async (key) => {
        const eventResponse = await fetch(`${UPSTASH_URL}/get/${key}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${UPSTASH_TOKEN}`
          }
        });

        if (eventResponse.ok) {
          const eventData = await eventResponse.json();
          return typeof eventData.result === 'string'
            ? JSON.parse(eventData.result)
            : eventData.result;
        }
        return null;
      })
    );

    return events.filter(e => e !== null).reverse(); // Most recent first

  } catch (error) {
    console.error(`❌ Failed to retrieve activity log: ${error.message}`);
    return [];
  }
}

/**
 * Get activity for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of activity events for that date
 */
async function getActivityByDate(date) {
  if (!UPSTASH_TOKEN) {
    return [];
  }

  try {
    const pattern = `network_activity:${date}:*`;

    const response = await fetch(`${UPSTASH_URL}/keys/${pattern}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(`Redis KEYS failed: ${response.statusText}`);
    }

    const data = await response.json();
    const keys = data.result || [];

    const events = await Promise.all(
      keys.map(async (key) => {
        const eventResponse = await fetch(`${UPSTASH_URL}/get/${key}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${UPSTASH_TOKEN}`
          }
        });

        if (eventResponse.ok) {
          const eventData = await eventResponse.json();
          return typeof eventData.result === 'string'
            ? JSON.parse(eventData.result)
            : eventData.result;
        }
        return null;
      })
    );

    return events.filter(e => e !== null);

  } catch (error) {
    console.error(`❌ Failed to retrieve activity by date: ${error.message}`);
    return [];
  }
}

module.exports = {
  logActivity,
  getActivityLog,
  getActivityByDate
};
