// FC 3.0 HTTP 触发器入口
// 使用 Hono 框架处理 HTTP 请求

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置：后端 FC 内网地址
const API_BACKEND = process.env.API_BACKEND || 'https://applican-applian-service-uzjmdtpnxs.cn-shenzhen-vpc.fcapp.run';

// 静态文件目录（H5 构建产物放在 public 子目录）
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

// 创建 Hono 应用
const app = new Hono();

// 全局 CORS 跨域
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));

// API 请求代理到后端 FC
app.all('/api/*', async (c) => {
  const url = new URL(c.req.url);
  const targetUrl = new URL(url.pathname + url.search, API_BACKEND);

  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || 443,
    path: targetUrl.pathname + targetUrl.search,
    method: c.req.method,
    headers: {
      ...Object.fromEntries(c.req.raw.headers.entries()),
      host: targetUrl.host,
    },
  };

  const client = targetUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const proxyReq = client.request(options, (proxyRes) => {
      let body = '';
      proxyRes.on('data', (chunk) => { body += chunk; });
      proxyRes.on('end', () => {
        resolve(c.text(body, proxyRes.statusCode));
      });
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      resolve(c.json({ code: 502, message: 'Backend unavailable' }, 502));
    });

    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      proxyReq.write(c.req.body);
    }
    proxyReq.end();
  });
});

// 静态文件服务
app.get('*', (c) => {
  let reqPath = c.req.path;

  // 默认文件
  if (reqPath === '/') {
    reqPath = '/index.html';
  }

  // 去掉查询参数
  reqPath = reqPath.split('?')[0];

  let filePath = path.join(STATIC_DIR, reqPath);

  // 安全检查
  if (!filePath.startsWith(STATIC_DIR)) {
    return c.text('Forbidden', 403);
  }

  // 如果是目录，找 index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // SPA 路由：文件不存在返回 index.html
  if (!fs.existsSync(filePath)) {
    filePath = path.join(STATIC_DIR, 'index.html');
  }

  try {
    const content = fs.readFileSync(filePath);
    const contentType = getContentType(filePath);

    // 判断是否是二进制文件
    const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf'];
    const isBinary = binaryExtensions.includes(path.extname(filePath).toLowerCase());

    if (isBinary) {
      return c.body(content, 200, { 'Content-Type': contentType });
    }

    return c.text(content.toString('utf-8'), 200, { 'Content-Type': contentType });
  } catch (err) {
    console.error('Serve static error:', err);
    return c.text('Internal Server Error', 500);
  }
});

// 启动服务器
const port = 3000;
const host = '0.0.0.0';
console.log(`🚀 服务启动在 http://${host}:${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname: host
});
