// FC 3.0 HTTP 触发器入口
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATIC_DIR = path.join(__dirname, 'public');
const API_BACKEND = process.env.API_BACKEND || 'http://fc.cheapgo.top';

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
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// 关键：必须返回包含 statusCode 的对象
function serveFile(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    const contentType = getContentType(filePath);

    const isBinary = ['.png', '.jpg', '.jpeg', '.gif', '.ico'].some(ext =>
      filePath.toLowerCase().endsWith(ext)
    );

    // ✅ 正确：返回包含 statusCode 的对象
    if (isBinary) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000'
        },
        body: content.toString('base64'),
        isBase64Encoded: true
      };
    } else {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000'
        },
        body: content.toString('utf-8'),
        isBase64Encoded: false
      };
    }
  } catch (err) {
    console.error('File read error:', err);
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      },
      body: 'Not Found',
      isBase64Encoded: false
    };
  }
}

// 代理请求到后端
async function proxyRequest(event) {
  const reqPath = event.requestURI || '/';
  const url = `${API_BACKEND}${reqPath}`;

  console.log('Proxying to:', url);

  try {
    const response = await fetch(url, {
      method: event.httpMethod || 'GET',
      headers: event.headers || {},
      body: event.body || undefined,
    });

    const data = await response.text();

    // ✅ 正确：返回包含 statusCode 的对象
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json; charset=utf-8'
      },
      body: data,
      isBase64Encoded: false
    };
  } catch (err) {
    console.error('Proxy error:', err);
    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({ code: 502, message: 'Backend unavailable' }),
      isBase64Encoded: false
    };
  }
}

export async function handler(event, context) {
  console.log('Request:', event.requestURI);
  console.log('Event:', JSON.stringify(event, null, 2));

  const reqPath = event.requestURI || '/';

  // API 请求代理到后端
  if (reqPath.startsWith('/api')) {
    return await proxyRequest(event);
  }

  // 静态文件请求
  let filePath = reqPath;

  if (filePath === '/') {
    filePath = '/index.html';
  }

  filePath = filePath.split('?')[0];

  let fullPath = path.join(STATIC_DIR, filePath);

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    fullPath = path.join(fullPath, 'index.html');
  }

  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(STATIC_DIR, 'index.html');
  }

  // ✅ 必须返回对象，不能返回原始内容
  return serveFile(fullPath);
}
