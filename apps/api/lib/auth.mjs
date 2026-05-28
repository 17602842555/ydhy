import { createHash, randomBytes } from 'node:crypto';
import { fail, permissionsFor } from './domain.mjs';

const sessionTtlMs = 12 * 60 * 60 * 1000;
const defaultPassword = '123456';
const defaultPasswordSalt = 'huage-task-calendar-v1';

export function listLoginUsers(data) {
  return (data.users ?? []).filter((user) => user.active !== false).map((user) => publicUser(data, user));
}

export function login(data, body = {}) {
  const userId = String(body.userId || '').trim();
  const password = String(body.password || '');
  if (!userId || !password) fail(401, 'invalid_credentials', '账号或密码不正确');
  const user = findActiveUser(data, userId);
  if (!verifyPassword(user, password)) fail(401, 'invalid_credentials', '账号或密码不正确');
  const token = `huage_${randomBytes(32).toString('base64url')}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionTtlMs).toISOString();
  const session = {
    id: `SES-${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`,
    tokenHash: hashToken(token),
    userId: user.id,
    issuedAt: now.toISOString(),
    expiresAt,
    revokedAt: null,
  };
  data.sessions = [session, ...(data.sessions ?? [])].slice(0, 200);
  return {
    token,
    expiresAt,
    user: publicUser(data, user),
    permissions: [...permissionsFor(data, user.roleCode)],
  };
}

export function authenticate(data, req) {
  const token = bearerToken(req);
  if (!token) fail(401, 'unauthorized', 'missing bearer token');
  const tokenHash = hashToken(token);
  const session = (data.sessions ?? []).find((entry) => entry.tokenHash === tokenHash);
  if (!session || session.revokedAt) fail(401, 'unauthorized', 'invalid or revoked session');
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    fail(401, 'session_expired', 'session has expired');
  }
  const user = findActiveUser(data, session.userId);
  return actorFromUser(data, user);
}

export function logout(data, req) {
  const token = bearerToken(req);
  if (!token) return { ok: true };
  const tokenHash = hashToken(token);
  const session = (data.sessions ?? []).find((entry) => entry.tokenHash === tokenHash);
  if (session && !session.revokedAt) session.revokedAt = new Date().toISOString();
  return { ok: true };
}

export function actorFromUser(data, user) {
  const role = data.roles?.find((entry) => entry.id === user.roleCode);
  return {
    userId: user.id,
    role: user.roleCode,
    roleName: role?.name ?? user.roleCode,
    name: user.displayName,
    subsidiaryId: user.subsidiaryId ?? null,
  };
}

export function publicUser(data, user) {
  const role = data.roles?.find((entry) => entry.id === user.roleCode);
  const subsidiary = user.subsidiaryId ? data.subsidiaries?.find((entry) => entry.id === user.subsidiaryId) : null;
  return {
    id: user.id,
    displayName: user.displayName,
    roleCode: user.roleCode,
    roleName: role?.name ?? user.roleCode,
    subsidiaryId: user.subsidiaryId ?? null,
    companyName: subsidiary?.name ?? null,
  };
}

export function bearerToken(req) {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function findActiveUser(data, userId) {
  const user = (data.users ?? []).find((entry) => entry.id === userId && entry.active !== false);
  if (!user) fail(401, 'invalid_user', `user ${userId} is not allowed to login`);
  return user;
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function verifyPassword(user, password) {
  if (user.passwordHash) {
    const salt = user.passwordSalt || defaultPasswordSalt;
    return hashPassword(password, salt) === user.passwordHash;
  }
  return password === defaultPassword;
}

function hashPassword(password, salt) {
  return createHash('sha256').update(`${salt}:${password}`).digest('hex');
}
