const { spawn } = require('child_process');
const http = require('http');

const PORT = 5000;
const child = spawn(process.execPath, ['server.js'], {
  cwd: __dirname,
  stdio: ['ignore', 'ignore', 'ignore']
});

function request(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: PORT, path, timeout: 5000 }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

(async () => {
  // Wait for server to be ready
  for (let i = 0; i < 50; i++) {
    try {
      await request('/index.html');
      break;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  let failed = false;
  const cases = [
    { path: '/index.html', expect: 200, label: 'normal file' },
    { path: '/bin-list-data.csv', expect: 200, label: 'csv file' },
    { path: '/../TextFile1.txt', expect: 403, label: 'traversal (raw)' },
    { path: '/%2e%2e/%2e%2e/TextFile1.txt', expect: 403, label: 'traversal (encoded)' },
  ];

  for (const c of cases) {
    try {
      const r = await request(c.path);
      const ok = r.status === c.expect;
      console.log(`${ok ? 'PASS' : 'FAIL'}: ${c.label} (${c.path}) -> ${r.status} (expected ${c.expect})`);
      if (!ok) failed = true;
    } catch (e) {
      console.log(`FAIL: ${c.label} (${c.path}) -> ${e.message}`);
      failed = true;
    }
  }

  child.kill();
  process.exit(failed ? 1 : 0);
})();
