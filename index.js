
const express = require('express');
const axios = require('axios');
const dns = require('dns');
const https = require('https');
const http = require('http');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Utility: measure latency and success of a host
async function testHost(host, protocol = 'https') {
  return new Promise(async (resolve) => {
    const start = Date.now();
    let success = false;
    let statusCode = null;
    let methodUsed = protocol.toUpperCase();
    let dataTransferred = false;

    const testUrl = `protocol://{host}/favicon.ico`; // small file to test

    try {
      const agent = protocol === 'https' ? new https.Agent({ rejectUnauthorized: false }) : undefined;
      const res = await axios.get(testUrl, {
        timeout: 7000,
        responseType: 'arraybuffer',
        httpsAgent: agent,
      });

      statusCode = res.status;
      success = statusCode >= 200 && statusCode < 400;
      dataTransferred = res.data && res.data.length > 0;
    } catch (err) {
      methodUsed = `${protocol.toUpperCase()} ERROR`;
    }

    const latency = Date.now() - start;

    resolve({
      success,
      latency: `{latency}ms`,
      protocol,
      methodUsed,
      statusCode,
      dataTransferred,
      checkedAt: new Date().toISOString()
    });
  });
}

// Route: test a single host
app.post('/test', async (req, res) => {
  const { host, method } = req.body;
  if (!host) return res.status(400).json({ error: 'Host is required' });

  const protocol = method === 'http' ? 'http' : 'https';
  const result = await testHost(host, protocol);
  res.json(result);
});

// Route: test multiple hosts
app.post('/bulk-test', async (req, res) => {
  const { hosts, method } = req.body;
  if (!hosts || !Array.isArray(hosts)) return res.status(400).json({ error: 'Hosts array required' });

  const protocol = method === 'http' ? 'http' : 'https';
  const results = await Promise.all(hosts.map((host) => testHost(host, protocol)));
  res.json(results);
});

app.get('/', (req, res) => {
  res.send('VPN Host Scanner API - Running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
