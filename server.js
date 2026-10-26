const http = require('http');
const fs = require('fs');
const path = require('path');

// MIME types mapping
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.csv': 'text/csv',
  '.svg': 'image/svg+xml'
};

// Document root is the directory containing this server file
const ROOT = path.resolve(__dirname);

// Resolve a request URL to an absolute file path inside ROOT, or null if unsafe/not found
function resolveSafePath(reqUrl) {
  // Strip query string and fragment
  let pathname = String(reqUrl).split('?')[0].split('#')[0];

  // Decode percent-encoding
  try {
    pathname = decodeURIComponent(pathname);
  } catch (e) {
    return null;
  }

  // Reject null bytes
  if (pathname.indexOf('\u0000') !== -1) {
    return null;
  }

  // Remove leading slashes and resolve against ROOT
  const relative = pathname.replace(/^[/\\]+/, '');
  const resolved = path.resolve(ROOT, relative);

  // Containment check: resolved must be ROOT or inside ROOT
  if (resolved !== ROOT && resolved.indexOf(ROOT + path.sep) !== 0) {
    return null;
  }

  // Avoid serving dotfiles
  if (path.basename(resolved).startsWith('.')) {
    return null;
  }

  return resolved;
}

// Create HTTP server
const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);

  const resolved = resolveSafePath(req.url);
  if (!resolved) {
    console.error(`Forbidden path: ${req.url}`);
    res.writeHead(403);
    res.end('403 - Forbidden');
    return;
  }

  fs.stat(resolved, (statErr, stat) => {
    if (statErr) {
      console.error(`File not found: ${resolved}`);
      res.writeHead(404);
      res.end('404 - File Not Found');
      return;
    }

    let filePath = resolved;
    if (stat.isDirectory()) {
      filePath = path.join(resolved, 'index.html');
    }

    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          console.error(`File not found: ${filePath}`);
          res.writeHead(404);
          res.end('404 - File Not Found');
        } else {
          console.error(`Server error: ${err}`);
          res.writeHead(500);
          res.end('500 - Internal Server Error');
        }
      } else {
        console.log(`Serving file: ${filePath}`);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

// Start server
const PORT = 5000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
  console.log('Available files:');
  console.log('- index.html (main application)');
  console.log('- bin-list-data.csv (BIN data file)');
});
