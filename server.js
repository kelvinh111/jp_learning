const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DIR  = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.md':   'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.ico':  'image/x-icon',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
};

http.createServer((req, res) => {
  const urlPath  = req.url === '/' ? '/quiz.html' : req.url.split('?')[0];
  const filePath = path.join(DIR, decodeURIComponent(urlPath));

  // Prevent path traversal outside DIR
  if (!filePath.startsWith(DIR + path.sep) && filePath !== DIR) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext  = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      res.end(err.code === 'ENOENT' ? 'Not Found' : 'Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}).listen(PORT, '0.0.0.0', () => {
  console.log(`✅  Serving at http://localhost:${PORT}`);
});
