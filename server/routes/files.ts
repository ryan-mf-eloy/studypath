import { Hono } from 'hono';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { getDbPath } from '../db.js';
import { dirname } from 'node:path';
import { ReadableStream } from 'node:stream/web';
import { Readable } from 'node:stream';

import { bodyLimit } from 'hono/body-limit';

export const filesRoute = new Hono();

/** Resolve the upload directory — sibling to the DB file. */
function getFilesDir(): string {
  const dbDir = dirname(getDbPath());
  const dir = join(dbDir, 'files');
  mkdirSync(dir, { recursive: true });
  return dir;
}

const ALLOWED_EXTENSIONS = new Set([
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.bmp', '.avif',
  // Video
  '.mp4', '.webm', '.ogg', '.mov', '.avi',
  // Audio
  '.mp3', '.wav', '.flac', '.aac', '.m4a', '.opus',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv',
  '.md', '.json', '.xml', '.zip', '.tar', '.gz',
]);

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.bmp': 'image/bmp', '.avif': 'image/avif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'video/ogg',
  '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.flac': 'audio/flac',
  '.aac': 'audio/aac', '.m4a': 'audio/mp4', '.opus': 'audio/opus',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain', '.csv': 'text/csv', '.md': 'text/markdown',
  '.json': 'application/json', '.xml': 'application/xml',
  '.zip': 'application/zip', '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
};

/**
 * POST /api/files — upload a file.
 * Accepts multipart/form-data with a single "file" field.
 * Returns { url, name, size, type }.
 */
filesRoute.post('/', bodyLimit({ maxSize: MAX_FILE_SIZE }), async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || typeof file === 'string') {
    return c.json({ error: 'no file' }, 400);
  }

  const original = file.name ?? 'untitled';
  const ext = extname(original).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return c.json({ error: `extension ${ext} not allowed` }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_FILE_SIZE) {
    return c.json({ error: 'file too large (max 100 MB)' }, 413);
  }

  const id = randomUUID();
  const filename = `${id}${ext}`;
  const dir = getFilesDir();
  await writeFile(join(dir, filename), buffer);

  const url = `/api/files/${filename}`;
  return c.json({ url, name: original, size: buffer.byteLength, type: file.type });
});

/**
 * GET /api/files/:filename — serve an uploaded file.
 */
filesRoute.get('/:filename', (c) => {
  const filename = c.req.param('filename');
  // Sanitize — no path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return c.json({ error: 'invalid filename' }, 400);
  }

  const dir = getFilesDir();
  const path = join(dir, filename);

  if (!existsSync(path)) {
    return c.json({ error: 'not found' }, 404);
  }

  const stat = statSync(path);
  const ext = extname(filename).toLowerCase();
  const mime = MIME_MAP[ext] ?? 'application/octet-stream';

  const nodeStream = createReadStream(path);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  const headers: Record<string, string> = {
    'Content-Type': mime,
    'Content-Length': String(stat.size),
    'Cache-Control': 'public, max-age=31536000, immutable',
  };
  // SVGs can contain embedded scripts — force download to prevent XSS
  if (ext === '.svg') {
    headers['Content-Disposition'] = `attachment; filename="${filename}"`;
    headers['Content-Security-Policy'] = 'sandbox';
  }
  return new Response(webStream, { headers });
});
