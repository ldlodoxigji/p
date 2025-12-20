const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');
const cluster = require('cluster');
const { loadProducts, buildOverview, buildCharts } = require('./services/analyticsService');

const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.HOST || '0.0.0.0';

const viewsDir = path.join(__dirname, 'views');
const publicDir = path.join(__dirname, 'public');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function render(templateName, replacements) {
  const templatePath = path.join(viewsDir, `${templateName}.html`);
  const content = fs.readFileSync(templatePath, 'utf-8');
  return content.replace(/<%=\s*(\w+)\s*%>/g, (_, key) => {
    const value = replacements[key];
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    return String(value);
  });
}

function serveStatic(parsedUrl, res) {
  const safePath = path
    .normalize(parsedUrl.pathname)
    .replace(/^([/\\])+/, '');
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    send(res, 403, 'Forbidden');
    return true;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const mime = mimeTypes[ext] || 'application/octet-stream';
    const stream = fs.createReadStream(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    stream.pipe(res);
    return true;
  }
  return false;
}

function json(res, payload) {
  send(res, 200, JSON.stringify(payload), { 'Content-Type': 'application/json; charset=utf-8' });
}

async function handleRequest(req, res) {
  const parsedUrl = new url.URL(req.url, `http://${req.headers.host}`);
  if (req.method !== 'GET') {
    send(res, 405, 'Method Not Allowed');
    return;
  }

  if (parsedUrl.pathname.startsWith('/css') || parsedUrl.pathname.startsWith('/js') || parsedUrl.pathname.startsWith('/public')) {
    if (serveStatic(parsedUrl, res)) return;
  }

  try {
    if (parsedUrl.pathname === '/') {
      const products = await loadProducts();
      const overview = buildOverview(products);
      const charts = buildCharts(products);

      const payload = {
        products,
        insights: overview.insights,
        kpis: overview.kpis,
        topProducts: overview.topProducts,
        charts,
      };

      const page = render('index', {
        payload: JSON.stringify(payload),
      });
      send(res, 200, page, { 'Content-Type': mimeTypes['.html'] });
      return;
    }

    if (parsedUrl.pathname === '/chart1' || parsedUrl.pathname === '/chart2') {
      const products = await loadProducts();
      const charts = buildCharts(products);
      const page = render(parsedUrl.pathname.slice(1), {
        chartData: JSON.stringify({ products, charts }),
      });
      send(res, 200, page, { 'Content-Type': mimeTypes['.html'] });
      return;
    }

    if (parsedUrl.pathname === '/api/products') {
      const products = await loadProducts();
      json(res, products);
      return;
    }

    send(res, 404, 'Not Found');
  } catch (err) {
    console.error('Server error:', err);
    send(res, 500, 'Internal Server Error');
  }
}

function startWorker() {
  const server = http.createServer(handleRequest);
  server.listen(PORT, HOSTNAME, () => {
    console.log(`Worker ${process.pid} listening on http://${HOSTNAME}:${PORT}`);
  });
}

function startCluster() {
  const cpuCount = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
  console.log(`Primary ${process.pid} is running. Spawning ${cpuCount} workers.`);

  for (let i = 0; i < cpuCount; i += 1) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.warn(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
}

if (cluster.isPrimary) {
  startCluster();
} else {
  startWorker();
}
