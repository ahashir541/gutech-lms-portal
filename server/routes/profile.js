import { Router } from 'express';
import { ah, check, pick, requireRole, HttpError } from '../middleware.js';

const router = Router();

router.get('/me', (req, res) => res.json(req.profile));

router.put('/me', ah(async (req, res) => {
  const updates = pick(req.body, ['full_name'], ['department', 'roll_number', 'phone', 'bio']);
  const data = check(await req.sb.from('profiles').update(updates).eq('id', req.user.id).select().single());
  res.json(data);
}));

// ---- Admin: user directory ----
router.get('/users', requireRole('admin'), ah(async (req, res) => {
  const data = check(await req.sb.from('profiles').select('*').order('created_at', { ascending: false }));
  res.json(data);
}));

router.put('/users/:id/role', requireRole('admin'), ah(async (req, res) => {
  const { role } = pick(req.body, ['role']);
  if (!['student', 'faculty', 'admin'].includes(role)) throw new HttpError(400, 'Invalid role');
  if (req.params.id === req.user.id) throw new HttpError(400, 'You cannot change your own role');
  const data = check(await req.sb.from('profiles').update({ role }).eq('id', req.params.id).select().single());
  res.json(data);
}));

export default router;
