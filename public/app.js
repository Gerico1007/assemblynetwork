/**
 * ♠️🌿🎸🧵 AssemblyNetwork Dashboard Frontend
 * Client-side JavaScript for network monitoring
 */

const API_BASE = window.location.origin;

// DOM Elements
const scanBtn = document.getElementById('scanBtn');
const refreshBtn = document.getElementById('refreshBtn');
const activityBtn = document.getElementById('activityBtn');
const scanStatus = document.getElementById('scanStatus');
const lastScanEl = document.getElementById('lastScan');
const serviceCountEl = document.getElementById('serviceCount');
const activityCountEl = document.getElementById('activityCount');
const servicesGrid = document.getElementById('servicesGrid');
const activityTimeline = document.getElementById('activityTimeline');

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
  scanStatus.textContent = message;
  scanStatus.className = `status-message ${type} show`;

  setTimeout(() => {
    scanStatus.classList.remove('show');
  }, 5000);
}

/**
 * Format timestamp to local readable format
 */
function formatTimestamp(isoString) {
  if (!isoString) return 'Never';

  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;

  // Less than 1 minute
  if (diff < 60000) {
    return 'Just now';
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }

  // Today
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString();
  }

  // Older
  return date.toLocaleString();
}

/**
 * Create service card HTML
 */
function createServiceCard(service) {
  const statusClass = service.status === 'online' ? 'status-online' :
                      service.status === 'offline' ? 'status-offline' :
                      'status-unknown';

  const serviceUrl = `http://${service.host}:${service.port}`;

  return `
    <div class="service-card">
      <div class="service-header">
        <div class="service-name">${service.service}</div>
        <div class="status-indicator ${statusClass}" title="${service.status}"></div>
      </div>
      <div class="service-details">
        <div><strong>Host:</strong> ${service.host}</div>
        <div><strong>Port:</strong> ${service.port}</div>
        <div><strong>Last Seen:</strong> ${formatTimestamp(service.lastSeen)}</div>
      </div>
      <a href="${serviceUrl}" target="_blank" class="service-link">
        Open Service →
      </a>
    </div>
  `;
}

/**
 * Create activity item HTML
 */
function createActivityItem(activity) {
  const eventTypeClass = activity.eventType.replace(/_/g, '-');

  const details = [];

  if (activity.host && activity.host !== 'N/A') {
    details.push(`Host: ${activity.host}`);
  }

  if (activity.port && activity.port !== 'N/A') {
    details.push(`Port: ${activity.port}`);
  }

  if (activity.service) {
    details.push(`Service: ${activity.service}`);
  }

  if (activity.metadata) {
    if (activity.metadata.servicesFound !== undefined) {
      details.push(`Services Found: ${activity.metadata.servicesFound}`);
    }
    if (activity.metadata.error) {
      details.push(`Error: ${activity.metadata.error}`);
    }
  }

  return `
    <div class="activity-item ${eventTypeClass}">
      <div class="activity-header">
        <span class="activity-type">${activity.eventType.replace(/_/g, ' ')}</span>
        <span class="activity-timestamp">${formatTimestamp(activity.timestamp)}</span>
      </div>
      <div class="activity-details">
        ${details.join(' • ')}
      </div>
    </div>
  `;
}

/**
 * Trigger network scan
 */
async function scanNetwork() {
  scanBtn.disabled = true;
  scanBtn.innerHTML = '<span class="btn-icon">⏳</span> Scanning...';
  showStatus('🔍 Scanning network for services...', 'info');

  try {
    const response = await fetch(`${API_BASE}/api/scan`);
    const data = await response.json();

    if (data.success) {
      showStatus(`✅ Scan complete! Found ${data.servicesCount} service(s)`, 'success');
      lastScanEl.textContent = formatTimestamp(data.scanTime);
      serviceCountEl.textContent = data.servicesCount;

      // Display services
      if (data.services.length > 0) {
        servicesGrid.innerHTML = data.services.map(createServiceCard).join('');
      } else {
        servicesGrid.innerHTML = '<p class="placeholder">No services found on the network</p>';
      }
    } else {
      showStatus(`❌ Scan failed: ${data.error}`, 'error');
    }
  } catch (error) {
    showStatus(`❌ Network error: ${error.message}`, 'error');
    console.error('Scan error:', error);
  } finally {
    scanBtn.disabled = false;
    scanBtn.innerHTML = '<span class="btn-icon">🔍</span> Scan Network';
  }
}

/**
 * Refresh services from cache
 */
async function refreshServices() {
  refreshBtn.disabled = true;
  showStatus('🔄 Refreshing services...', 'info');

  try {
    const response = await fetch(`${API_BASE}/api/services`);
    const data = await response.json();

    if (data.success) {
      lastScanEl.textContent = formatTimestamp(data.lastScanTime);
      serviceCountEl.textContent = data.servicesCount;

      if (data.services.length > 0) {
        servicesGrid.innerHTML = data.services.map(createServiceCard).join('');
        showStatus('✅ Services refreshed', 'success');
      } else {
        servicesGrid.innerHTML = '<p class="placeholder">No cached services. Click "Scan Network" to discover services.</p>';
        showStatus('ℹ️ No services in cache', 'info');
      }
    } else {
      showStatus(`❌ Refresh failed: ${data.error}`, 'error');
    }
  } catch (error) {
    showStatus(`❌ Network error: ${error.message}`, 'error');
    console.error('Refresh error:', error);
  } finally {
    refreshBtn.disabled = false;
  }
}

/**
 * Load activity log
 */
async function loadActivity() {
  activityBtn.disabled = true;
  activityBtn.innerHTML = '<span class="btn-icon">⏳</span> Loading...';
  showStatus('📊 Loading activity log...', 'info');

  try {
    const response = await fetch(`${API_BASE}/api/activity?limit=50`);
    const data = await response.json();

    if (data.success) {
      activityCountEl.textContent = data.count;

      if (data.activities.length > 0) {
        activityTimeline.innerHTML = data.activities.map(createActivityItem).join('');
        showStatus(`✅ Loaded ${data.count} activity event(s)`, 'success');
      } else {
        activityTimeline.innerHTML = '<p class="placeholder">No activity recorded yet. Start scanning to generate events!</p>';
        showStatus('ℹ️ No activity found', 'info');
      }
    } else {
      showStatus(`❌ Failed to load activity: ${data.error}`, 'error');
    }
  } catch (error) {
    showStatus(`❌ Network error: ${error.message}`, 'error');
    console.error('Activity load error:', error);
  } finally {
    activityBtn.disabled = false;
    activityBtn.innerHTML = '<span class="btn-icon">📊</span> Load Activity';
  }
}

/**
 * Load server status on page load
 */
async function loadServerStatus() {
  try {
    const response = await fetch(`${API_BASE}/api/status`);
    const data = await response.json();

    if (data.success) {
      console.log('✅ Server status:', data);

      if (!data.features.activityLogging) {
        showStatus('⚠️ Activity logging disabled (Redis not configured)', 'error');
      }
    }
  } catch (error) {
    console.error('Failed to load server status:', error);
  }
}

// Event Listeners
scanBtn.addEventListener('click', scanNetwork);
refreshBtn.addEventListener('click', refreshServices);
activityBtn.addEventListener('click', loadActivity);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('♠️🌿🎸🧵 AssemblyNetwork Dashboard initialized');
  loadServerStatus();
  refreshServices(); // Load cached services on startup
});
