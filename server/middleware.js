import { clientForToken, isConfigured } from './supabase.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Wrap async route handlers so rejected promises reach the error handler.
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Throws a 400 for a Supabase/Postgres error, with a friendly message.
export function check({ data, error }) {
  if (error) {
    let message = error.message;
    if (error.code === '23505') message = 'This record already exists (duplicate value).';
    if (error.code === '42501') message = 'You are not allowed to perform this action.';
    throw new HttpError(error.code === '42501' ? 403 : 400, message);
  }
  return data;
}

export const requireAuth = ah(async (req, _res, next) => {
  if (!isConfigured) throw new HttpError(500, 'Server is missing Supabase configuration');
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Missing access token');

  const sb = clientForToken(token);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, 'Session expired, please log in again');

  const { data: profile } = await sb.from('profiles').select('*').eq('id', data.user.id).single();
  if (!profile) throw new HttpError(403, 'Profile not found');

  req.sb = sb;
  req.user = data.user;
  req.profile = profile;
  next();
});

export const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.profile.role)) {
    return next(new HttpError(403, `Only ${roles.join(' or ')} users can do this`));
  }
  next();
};

// Minimal body validation: returns trimmed values, throws on missing required fields.
export function pick(body, required = [], optional = []) {
  const out = {};
  for (const key of required) {
    const value = typeof body?.[key] === 'string' ? body[key].trim() : body?.[key];
    if (value === undefined || value === null || value === '') {
      throw new HttpError(400, `"${key}" is required`);
    }
    out[key] = value;
  }
  for (const key of optional) {
    if (body?.[key] !== undefined) {
      out[key] = typeof body[key] === 'string' ? body[key].trim() : body[key];
    }
  }
  return out;
}
