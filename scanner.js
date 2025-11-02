/**
 * ♠️🌿🎸🧵 Network Scanner Module
 * Discovers active services on the local network (192.168.7.0/24)
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Common port-to-service mapping
const SERVICE_SIGNATURES = {
  '21': 'FTP',
  '22': 'SSH',
  '80': 'HTTP',
  '443': 'HTTPS',
  '3000': 'Node.js/Next.js',
  '3306': 'MySQL',
  '5000': 'Flask/Python',
  '5173': 'Vite Dev Server',
  '5432': 'PostgreSQL',
  '6379': 'Redis',
  '8000': 'HTTP Server',
  '8080': 'HTTP Proxy/Server',
  '8083': 'Gradio/Custom',
  '8765': 'WebSocket',
  '8888': 'HTTP Server',
  '9000': 'Dashboard',
  '9999': 'Custom Service',
  '10001': 'A2A Weather Agent',
  '10002': 'A2A Airbnb Agent',
  '10070': 'AssemblyLook Dashboard',
  '27017': 'MongoDB'
};

/**
 * Scan network for active hosts and open ports
 * @param {string} subnet - Network subnet to scan (e.g., '192.168.7.0/24')
 * @param {string} customPorts - Optional comma-separated custom ports to scan
 * @returns {Promise<Array>} Array of discovered services
 */
async function scanNetwork(subnet = '192.168.7.0/24', customPorts = null) {
  const timestamp = new Date().toISOString();
  console.log(`🔍 [${timestamp}] Starting network scan on ${subnet}...`);

  try {
    // Quick scan of common ports (including custom AssemblyNetwork ports)
    let commonPorts = '21,22,80,443,3000,3306,5000,5173,5432,6379,8000,8080,8083,8765,8888,9000,9999,10001,10002,10070,27017';

    // Merge with custom ports from environment or parameter
    const envCustomPorts = process.env.CUSTOM_PORTS;
    if (customPorts || envCustomPorts) {
      const additionalPorts = customPorts || envCustomPorts;
      const allPorts = new Set([...commonPorts.split(','), ...additionalPorts.split(',')]);
      commonPorts = Array.from(allPorts).sort((a, b) => parseInt(a) - parseInt(b)).join(',');
      console.log(`📋 Scanning ${allPorts.size} ports (including custom ports: ${additionalPorts})`);
    }

    const { stdout, stderr } = await execAsync(
      `nmap -sn ${subnet} -oG - | grep "Host:" | awk '{print $2}'`,
      { timeout: 120000 }
    );

    if (stderr && !stderr.includes('Warning')) {
      console.error(`⚠️  Scan warning: ${stderr}`);
    }

    const hosts = stdout.trim().split('\n').filter(ip => ip && ip !== '');

    if (hosts.length === 0) {
      console.log('ℹ️  No active hosts found');
      return [];
    }

    console.log(`✅ Found ${hosts.length} active host(s)`);

    // Scan each host for open ports
    const services = [];

    for (const host of hosts) {
      try {
        const { stdout: portScan } = await execAsync(
          `nmap -p ${commonPorts} ${host} -oG - | grep "Ports:" | sed 's/.*Ports: //'`,
          { timeout: 60000 }
        );

        const openPorts = portScan
          .split(',')
          .map(p => p.trim())
          .filter(p => p.includes('open'))
          .map(p => {
            const port = p.split('/')[0];
            return {
              host,
              port,
              service: SERVICE_SIGNATURES[port] || 'Unknown',
              status: 'online',
              lastSeen: new Date().toISOString()
            };
          });

        services.push(...openPorts);

        if (openPorts.length > 0) {
          console.log(`  🟢 ${host}: ${openPorts.length} service(s) found`);
        }
      } catch (error) {
        console.error(`  🔴 ${host}: Scan failed - ${error.message}`);
      }
    }

    console.log(`\n📊 Total services discovered: ${services.length}`);
    return services;

  } catch (error) {
    console.error(`❌ Network scan failed: ${error.message}`);
    throw error;
  }
}

/**
 * Quick port check for a specific host
 * @param {string} host - IP address to check
 * @param {number} port - Port number to check
 * @returns {Promise<boolean>} True if port is open
 */
async function checkPort(host, port) {
  try {
    const { stdout } = await execAsync(
      `nc -z -v -w1 ${host} ${port} 2>&1`,
      { timeout: 2000 }
    );
    return stdout.includes('succeeded') || stdout.includes('open');
  } catch {
    return false;
  }
}

module.exports = {
  scanNetwork,
  checkPort,
  SERVICE_SIGNATURES
};

// CLI mode
if (require.main === module) {
  const subnet = process.argv[2] || '192.168.7.0/24';

  scanNetwork(subnet)
    .then(services => {
      console.log('\n📋 Discovered Services:');
      console.table(services);
    })
    .catch(error => {
      console.error('Scan failed:', error);
      process.exit(1);
    });
}
