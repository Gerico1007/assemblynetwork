/**
 * ♠️🌿🎸🧵 HTTP Path Discovery Module
 * Discovers web endpoints and directories on HTTP services
 * Enhancement #1: HTTP Path Discovery
 */

const fetch = require('node-fetch');

// Default common paths to probe
const DEFAULT_PATHS = [
  '/',
  '/index.html',
  '/index.htm',
  '/api',
  '/api/status',
  '/api/health',
  '/health',
  '/status',
  '/admin',
  '/dashboard',
  '/docs',
  '/swagger',
  '/graphql',
  '/metrics',
  '/actuator',
  '/favicon.ico',
  '/robots.txt',
  '/.env',
  '/.git/config',
  '/.assemblylook',
  '/.assemblylook/index.html'
];

// HTTP protocols to try
const PROTOCOLS = ['http', 'https'];

/**
 * Check if a specific path is available on a host:port
 * @param {string} protocol - http or https
 * @param {string} host - IP address or hostname
 * @param {string|number} port - Port number
 * @param {string} path - URL path to check
 * @param {number} timeout - Request timeout in milliseconds
 * @returns {Promise<Object>} Path availability details
 */
async function checkPath(protocol, host, port, path, timeout = 2000) {
  const url = `${protocol}://${host}:${port}${path}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'AssemblyNetwork-PathDiscovery/1.0'
      },
      redirect: 'manual', // Don't follow redirects automatically
      timeout: timeout
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || 'unknown';
    const contentLength = response.headers.get('content-length') || 'unknown';

    return {
      path,
      url,
      protocol,
      available: true,
      statusCode: response.status,
      statusText: response.statusText,
      contentType,
      contentLength,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    // Path not available or error occurred
    return {
      path,
      url,
      protocol,
      available: false,
      statusCode: null,
      statusText: error.message,
      error: error.code || error.type || 'UNKNOWN',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Discover paths on a specific host:port
 * Tries both HTTP and HTTPS
 * @param {string} host - IP address or hostname
 * @param {string|number} port - Port number
 * @param {Array<string>} customPaths - Optional custom paths to probe
 * @param {Object} options - Discovery options
 * @returns {Promise<Object>} Discovery results
 */
async function discoverPaths(host, port, customPaths = [], options = {}) {
  const {
    timeout = 2000,
    maxPaths = 20,
    enableHttps = true,
    onlySuccessful = false
  } = options;

  console.log(`🔍 Discovering paths on ${host}:${port}...`);

  // Merge default and custom paths
  const pathsToProbe = [...new Set([...DEFAULT_PATHS, ...customPaths])].slice(0, maxPaths);

  // Determine protocols to try based on port
  let protocols = ['http'];
  if (enableHttps && (port === 443 || port === 8443)) {
    protocols = ['https'];
  } else if (enableHttps) {
    protocols = ['http', 'https'];
  }

  const discoveredPaths = [];
  let workingProtocol = null;

  // Try to find a working protocol first with root path
  for (const protocol of protocols) {
    const result = await checkPath(protocol, host, port, '/', timeout);
    if (result.available) {
      workingProtocol = protocol;
      discoveredPaths.push(result);
      console.log(`  ✅ ${protocol}://${host}:${port}/ → ${result.statusCode}`);
      break;
    }
  }

  // If no protocol works, service might not be HTTP
  if (!workingProtocol) {
    console.log(`  ⚠️  ${host}:${port} - Not an HTTP service`);
    return {
      host,
      port: port.toString(),
      isHttp: false,
      protocol: null,
      paths: [],
      totalProbed: 1,
      totalFound: 0
    };
  }

  // Probe remaining paths with working protocol
  for (const path of pathsToProbe) {
    if (path === '/') continue; // Already checked

    const result = await checkPath(workingProtocol, host, port, path, timeout);

    // Only include successful responses if onlySuccessful is true
    if (onlySuccessful && !result.available) {
      continue;
    }

    discoveredPaths.push(result);

    if (result.available && result.statusCode >= 200 && result.statusCode < 400) {
      console.log(`  ✅ ${result.url} → ${result.statusCode} ${result.statusText}`);
    } else if (result.available) {
      console.log(`  ⚠️  ${result.url} → ${result.statusCode} ${result.statusText}`);
    }
  }

  const foundPaths = discoveredPaths.filter(p => p.available);

  console.log(`  📊 Found ${foundPaths.length}/${discoveredPaths.length} available paths`);

  return {
    host,
    port: port.toString(),
    isHttp: true,
    protocol: workingProtocol,
    paths: discoveredPaths,
    totalProbed: discoveredPaths.length,
    totalFound: foundPaths.length,
    timestamp: new Date().toISOString()
  };
}

/**
 * Probe a single custom path
 * @param {string} host - IP address or hostname
 * @param {string|number} port - Port number
 * @param {string} path - URL path to check
 * @param {Object} options - Probe options
 * @returns {Promise<Object>} Path check result
 */
async function probeSinglePath(host, port, path, options = {}) {
  const {
    timeout = 2000,
    protocol = 'http'
  } = options;

  console.log(`🔍 Probing ${protocol}://${host}:${port}${path}...`);

  const result = await checkPath(protocol, host, port, path, timeout);

  if (result.available) {
    console.log(`  ✅ ${result.statusCode} ${result.statusText}`);
  } else {
    console.log(`  ❌ Not available (${result.error})`);
  }

  return result;
}

/**
 * Get common paths for a specific service type
 * @param {string} serviceType - Service name (e.g., 'Node.js', 'Flask')
 * @returns {Array<string>} Service-specific paths
 */
function getServiceSpecificPaths(serviceType) {
  const servicePaths = {
    'Node.js': ['/api', '/health', '/status', '/graphql'],
    'Flask': ['/api', '/health', '/admin', '/swagger'],
    'Vite Dev Server': ['/', '/src', '/@vite/client'],
    'Gradio': ['/api', '/gradio_api', '/queue/status'],
    'Dashboard': ['/api/status', '/api/services', '/api/activity'],
    'HTTP Server': ['/', '/index.html', '/api'],
    'Next.js': ['/_next', '/api', '/api/health']
  };

  return servicePaths[serviceType] || [];
}

/**
 * Enhanced discovery with service-aware paths
 * @param {string} host - IP address
 * @param {string|number} port - Port number
 * @param {string} serviceType - Service type from scanner
 * @param {Array<string>} customPaths - Custom paths
 * @param {Object} options - Options
 * @returns {Promise<Object>} Discovery results
 */
async function discoverServicePaths(host, port, serviceType, customPaths = [], options = {}) {
  // Add service-specific paths
  const serviceSpecific = getServiceSpecificPaths(serviceType);
  const allCustomPaths = [...customPaths, ...serviceSpecific];

  return discoverPaths(host, port, allCustomPaths, options);
}

module.exports = {
  discoverPaths,
  probeSinglePath,
  checkPath,
  discoverServicePaths,
  getServiceSpecificPaths,
  DEFAULT_PATHS
};

// CLI mode for testing
if (require.main === module) {
  const host = process.argv[2] || '192.168.7.241';
  const port = process.argv[3] || '8000';
  const customPath = process.argv[4];

  if (customPath) {
    // Probe single path
    probeSinglePath(host, port, customPath)
      .then(result => {
        console.log('\n📋 Result:');
        console.log(JSON.stringify(result, null, 2));
      })
      .catch(error => {
        console.error('Probe failed:', error);
        process.exit(1);
      });
  } else {
    // Full discovery
    discoverPaths(host, port)
      .then(result => {
        console.log('\n📋 Discovery Results:');
        console.log(JSON.stringify(result, null, 2));
      })
      .catch(error => {
        console.error('Discovery failed:', error);
        process.exit(1);
      });
  }
}
