import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, normalize } from 'node:path';

export class LocalSourceFileStore {
  constructor({ rootDir }) {
    this.rootDir = rootDir;
  }

  save({ batchId, fileName, fileHash, sourceFile }) {
    const safeName = sanitizeFileName(fileName || sourceFile.fileName || 'source-file');
    const hashPrefix = String(fileHash || 'sha256-unknown').replace(/^sha256-/, '').slice(0, 16);
    const objectKey = `import-files/${batchId}/${hashPrefix}-${safeName}`;
    const absolutePath = this.resolveObjectKey(objectKey);
    const bytes = Buffer.from(sourceFile.contentBase64, 'base64');
    mkdirSync(dirnameForFile(absolutePath), { recursive: true });
    writeFileSync(absolutePath, bytes);
    return {
      objectKey,
      byteSize: bytes.length,
      mimeType: sourceFile.mimeType || 'application/octet-stream',
    };
  }

  read(objectKey) {
    const absolutePath = this.resolveObjectKey(objectKey);
    if (!existsSync(absolutePath)) return null;
    return {
      bytes: readFileSync(absolutePath),
      stat: statSync(absolutePath),
      absolutePath,
    };
  }

  resolveObjectKey(objectKey) {
    const normalizedKey = normalize(String(objectKey || '')).replace(/^(\.\.[/\\])+/, '');
    if (!normalizedKey || normalizedKey.startsWith('..')) {
      throw new Error('invalid_object_key');
    }
    return join(this.rootDir, normalizedKey);
  }
}

function sanitizeFileName(fileName) {
  const base = basename(String(fileName || 'source-file'));
  const safe = base.replace(/[^\w\u4e00-\u9fa5.\-()（）\s]/g, '_').replace(/\s+/g, '_');
  return safe || 'source-file';
}

function dirnameForFile(filePath) {
  return filePath.slice(0, Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\')));
}
