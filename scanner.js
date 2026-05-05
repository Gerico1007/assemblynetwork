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

/**
 * Per-node known-port hints from issue #2 (Architecture: Tailscale-Aware Mesh Dashboard).
 * Used as the default probe set per node — keeps scans fast and avoids probing
 * ports that have no service on a given device (e.g. 4444 on an iOS peer).
 *
 * Empty array = use DEFAULT_TS_PORTS instead.
 */
const KNOWN_PORTS_PER_NODE = {
  eury:   [22, 4444, 8000, 8083, 8765, 8888, 9000, 10070],
  ginkgo: [22],
  ilex:   [8022, 8766, 8768],
  iriko:  [],
  itea:   [],
  larix:  [8022, 8766],
  tilia:  [8022, 8766, 8768]
};

/**
 * Default candidate ports for nodes with no hint (or when explicit override is requested).
 */
const DEFAULT_TS_PORTS = [22, 80, 443, 3000, 4444, 8000, 8022, 8083, 8765, 8766, 8888, 9000, 9090, 10070];

/**
 * Run `tailscale status --json` and project the peer list into the dashboard's shape.
 * @returns {Promise<{self: object, tailnet: string, nodes: Array}>}
 */
async function getTailscaleNodes() {
  const { stdout } = await execAsync('tailscale status --json', { timeout: 10000 });
  const data = JSON.parse(stdout);

  // For Self, `Online` flaps based on DERP state — use BackendState as the truth.
  // For peers, `Online` is authoritative.
  const selfIsUp = data.BackendState === 'Running';

  const projectPeer = (p, isSelf = false) => {
    const dns = (p.DNSName || '').replace(/\.$/, '');
    const name = dns.split('.')[0] || p.HostName || 'unknown';
    const ip = (p.TailscaleIPs || []).find(ip => /^\d+\.\d+\.\d+\.\d+$/.test(ip)) || (p.TailscaleIPs || [])[0] || null;
    const isOnline = isSelf ? selfIsUp : !!p.Online;
    return {
      name,
      dns,
      ip,
      os: (p.OS || 'unknown').toLowerCase(),
      status: isOnline ? 'online' : 'offline',
      lastSeen: p.LastSeen && !p.LastSeen.startsWith('0001-') ? p.LastSeen : null,
      self: isSelf
    };
  };

  const selfNode = data.Self ? projectPeer(data.Self, true) : null;
  const peers = Object.values(data.Peer || {}).map(p => projectPeer(p, false));

  const nodes = (selfNode ? [selfNode, ...peers] : peers)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    self: selfNode,
    tailnet: data.MagicDNSSuffix || (data.CurrentTailnet && data.CurrentTailnet.MagicDNSSuffix) || null,
    nodes
  };
}

/**
 * Probe a list of nodes for open TCP ports in parallel.
 * Each node's port set defaults to KNOWN_PORTS_PER_NODE[name] || DEFAULT_TS_PORTS,
 * but a caller can override via portsByNode or a flat overridePorts list.
 *
 * @param {Array} nodes - [{name, ip, status, ...}] from getTailscaleNodes()
 * @param {object} [opts]
 * @param {Array<number>} [opts.overridePorts] - flat port list applied to every node
 * @param {object} [opts.portsByNode] - { nodeName: [ports] } per-node override
 * @param {boolean} [opts.skipOffline=true] - skip nodes whose Tailscale status is 'offline'
 * @returns {Promise<Array<{name, ip, openPorts}>>}
 */
async function scanTailscalePorts(nodes, opts = {}) {
  const { overridePorts, portsByNode = {}, skipOffline = true } = opts;

  const tasks = nodes.map(async (node) => {
    if (skipOffline && node.status === 'offline') {
      return { name: node.name, ip: node.ip, status: node.status, openPorts: [], probedPorts: [] };
    }
    if (!node.ip) {
      return { name: node.name, ip: null, status: node.status, openPorts: [], probedPorts: [] };
    }

    // Resolve port list: caller override > per-node override > known hint > default.
    // A *known hint* of `[]` is meaningful — it means "no services expected, skip probe."
    let portsToProbe;
    if (overridePorts) portsToProbe = overridePorts;
    else if (portsByNode[node.name]) portsToProbe = portsByNode[node.name];
    else if (Object.prototype.hasOwnProperty.call(KNOWN_PORTS_PER_NODE, node.name)) {
      portsToProbe = KNOWN_PORTS_PER_NODE[node.name];
    } else portsToProbe = DEFAULT_TS_PORTS;

    if (portsToProbe.length === 0) {
      return { name: node.name, ip: node.ip, status: node.status, openPorts: [], probedPorts: [] };
    }

    const probes = await Promise.all(
      portsToProbe.map(port =>
        checkPort(node.ip, port).then(open => (open ? port : null))
      )
    );

    return {
      name: node.name,
      ip: node.ip,
      status: node.status,
      probedPorts: portsToProbe,
      openPorts: probes.filter(p => p !== null)
    };
  });

  return Promise.all(tasks);
}

module.exports = {
  scanNetwork,
  checkPort,
  getTailscaleNodes,
  scanTailscalePorts,
  SERVICE_SIGNATURES,
  KNOWN_PORTS_PER_NODE,
  DEFAULT_TS_PORTS
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
