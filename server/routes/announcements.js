import { Router } from 'express';
import { ah, check, pick, requireRole, HttpError } from '../middleware.js';

const router = Router();

router.get('/', ah(async (req, res) => {
  const data = check(await req.sb
    .from('announcements')
    .select('*, author:profiles(full_name, role), course:courses(id, code, title)')
    .order('created_at', { ascending: false })
    .limit(100));
  res.json(data);
}));

router.post('/', requireRole('faculty', 'admin'), ah(async (req, res) => {
  const body = pick(req.body, ['title', 'body'], ['course_id']);
  if (!body.course_id) {
    if (req.profile.role !== 'admin') throw new HttpError(400, 'Please choose a course');
    body.course_id = null;
  }
  body.author_id = req.user.id;
  const data = check(await req.sb.from('announcements').insert(body).select().single());
  res.status(201).json(data);
}));

router.delete('/:id', requireRole('faculty', 'admin'), ah(async (req, res) => {
  const data = check(await req.sb.from('announcements').delete().eq('id', req.params.id).select());
  if (!data.length) throw new HttpError(403, 'You can only delete your own announcements');
  res.json({ ok: true });
}));

export default router;
