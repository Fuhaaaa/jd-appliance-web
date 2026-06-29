// FC Web 函数入口
// 功能：serve 静态文件 + 反向代理 /api 请求到 ECS 后端

const http = require('http');
const fs = require('fs');
const path = require('path');

// 配置：后端 FC 内网地址
// 前端 FC 和后端 FC 需要在同一个 VPC
const API_BACKEND = process.env.API_BACKEND || 'https://applican-applian-service-uzjmdtpnxs.cn-shenzhen-vpc.fcapp.run';

// 静态文件目录（H5 构建产物）
const STATIC_DIR = path.join(__dirname, 'public');

// MIME 类型映射
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

// 获取 Content-Type
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// 代理请求到 ECS 后端
function proxyRequest(req, res) {
  const targetUrl = new URL(req.url, API_BACKEND);

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers: {
      ...req.headers,
      host: targetUrl.host,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 502, message: 'Backend unavailable' }));
  });

  req.pipe(proxyReq);
}

// Serve 静态文件
function serveStatic(req, res) {
  let filePath = path.join(STATIC_DIR, req.url === '/' ? 'index.html' : req.url);

  // 去掉查询参数
  filePath = filePath.split('?')[0];

  // 安全检查：防止目录遍历
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // 如果是目录，尝试找 index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // SPA 路由：如果文件不存在，返回 index.html
  if (!fs.existsSync(filePath)) {
    filePath = path.join(STATIC_DIR, 'index.html');
  }

  try {
    const content = fs.readFileSync(filePath);
    const contentType = getContentType(filePath);

    // 设置缓存头（静态资源长期缓存）
    const headers = { 'Content-Type': contentType };
    if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf)$/)) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    }

    res.writeHead(200, headers);
    res.end(content);
  } catch (err) {
    console.error('Serve static error:', err);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
}

// FC Web 函数入口
exports.initializer = function (context, callback) {
  callback(null, '');
};

exports.handler = function (req, res, context) {
  // API 请求代理到 ECS 后端
  if (req.url.startsWith('/api')) {
    proxyRequest(req, res);
    return;
  }

  // 其他请求 serve 静态文件
  serveStatic(req, res);
};
