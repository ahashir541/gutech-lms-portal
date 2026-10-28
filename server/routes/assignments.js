import { Router } from 'express';
import { ah, check, pick, requireRole, HttpError } from '../middleware.js';

const router = Router();

// All assignments visible to the user (RLS limits to enrolled/teaching courses).
router.get('/', ah(async (req, res) => {
  const data = check(await req.sb
    .from('assignments')
    .select('*, course:courses(id, code, title, faculty_id), submissions(id, student_id, marks, submitted_at)')
    .order('due_date'));

  const { role } = req.profile;
  const rows = data
    .filter((a) => role !== 'faculty' || a.course?.faculty_id === req.user.id)
    .map(({ submissions = [], ...a }) => ({
      ...a,
      submission_count: submissions.length,
      ungraded_count: submissions.filter((s) => s.marks === null).length,
      my_submission: submissions.find((s) => s.student_id === req.user.id) || null,
    }));
  res.json(rows);
}));

router.get('/:id', ah(async (req, res) => {
  const a = check(await req.sb
    .from('assignments')
    .select('*, course:courses(id, code, title, faculty_id)')
    .eq('id', req.params.id)
    .maybeSingle());
  if (!a) throw new HttpError(404, 'Assignment not found');

  const canGrade = a.course?.faculty_id === req.user.id || req.profile.role === 'admin';
  const subs = check(await req.sb
    .from('submissions')
    .select('*, student:profiles(id, full_name, email, roll_number)')
    .eq('assignment_id', a.id)
    .order('submitted_at', { ascending: false }));

  res.json({
    ...a,
    can_grade: canGrade,
    submissions: canGrade ? subs : [],
    my_submission: subs.find((s) => s.student_id === req.user.id) || null,
  });
}));

router.put('/:id', requireRole('faculty', 'admin'), ah(async (req, res) => {
  const body = pick(req.body, [], ['title', 'description', 'due_date', 'total_marks']);
  const data = check(await req.sb.from('assignments').update(body).eq('id', req.params.id).select().maybeSingle());
  if (!data) throw new HttpError(403, 'You can only edit assignments in your courses');
  res.json(data);
}));

router.delete('/:id', requireRole('faculty', 'admin'), ah(async (req, res) => {
  const data = check(await req.sb.from('assignments').delete().eq('id', req.params.id).select());
  if (!data.length) throw new HttpError(403, 'You can only delete assignments in your courses');
  res.json({ ok: true });
}));

// Student submits or updates their work.
router.post('/:id/submit', requireRole('student'), ah(async (req, res) => {
  const body = pick(req.body, [], ['content', 'link']);
  if (!body.content && !body.link) throw new HttpError(400, 'Add an answer or a link before submitting');
  if (body.link && !/^https?:\/\//i.test(body.link)) throw new HttpError(400, 'Link must start with http:// or https://');

  const existing = check(await req.sb.from('submissions').select('id, marks')
    .eq('assignment_id', req.params.id).eq('student_id', req.user.id).maybeSingle());

  let data;
  if (existing) {
    if (existing.marks !== null) throw new HttpError(400, 'This submission has already been graded');
    data = check(await req.sb.from('submissions').update(body).eq('id', existing.id).select().single());
  } else {
    data = check(await req.sb.from('submissions')
      .insert({ ...body, assignment_id: req.params.id, student_id: req.user.id }).select().single());
  }
  res.status(existing ? 200 : 201).json(data);
}));

export default router;
