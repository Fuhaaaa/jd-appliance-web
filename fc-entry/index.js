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

function serveFile(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    const contentType = getContentType(filePath);

    const isBinary = ['.png', '.jpg', '.jpeg', '.gif', '.ico'].some(ext =>
      filePath.toLowerCase().endsWith(ext)
    );

    // ✅ 必须返回包含 statusCode 的对象
    const response = {
      statusCode: 200,
      headers: {
        'content-type': contentType,
        'content-disposition': 'inline',  // 关键：覆盖默认 attachment
        'cache-control': 'public, max-age=31536000'
      },
      isBase64Encoded: isBinary
    };

    if (isBinary) {
      response.body = content.toString('base64');
    } else {
      response.body = content.toString('utf-8');
    }

    return response;
  } catch (err) {
    console.error('File read error:', err);
    return {
      statusCode: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'content-disposition': 'inline'
      },
      body: 'Not Found',
      isBase64Encoded: false
    };
  }
}

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

    return {
      statusCode: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json; charset=utf-8',
        'content-disposition': 'inline'
      },
      body: data,
      isBase64Encoded: false
    };
  } catch (err) {
    console.error('Proxy error:', err);
    return {
      statusCode: 502,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': 'inline'
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

  if (reqPath.startsWith('/api')) {
    return await proxyRequest(event);
  }

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

  // ✅ 返回对象，不要直接返回字符串
  return serveFile(fullPath);
}
