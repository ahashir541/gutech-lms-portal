import { Router } from 'express';
import { ah, check, pick, requireRole, HttpError } from '../middleware.js';

const router = Router();

// Student gradebook, grouped by course.
router.get('/grades', ah(async (req, res) => {
  const data = check(await req.sb
    .from('submissions')
    .select('id, marks, feedback, submitted_at, graded_at, assignment:assignments(id, title, total_marks, due_date, course:courses(id, code, title, credit_hours))')
    .eq('student_id', req.user.id));

  const byCourse = {};
  for (const s of data) {
    const course = s.assignment?.course;
    if (!course) continue;
    byCourse[course.id] ??= { course, items: [], obtained: 0, total: 0 };
    byCourse[course.id].items.push(s);
    if (s.marks !== null) {
      byCourse[course.id].obtained += Number(s.marks);
      byCourse[course.id].total += s.assignment.total_marks;
    }
  }
  const courses = Object.values(byCourse).map((c) => ({
    ...c,
    percentage: c.total ? Math.round((c.obtained / c.total) * 1000) / 10 : null,
  }));
  res.json(courses);
}));

router.put('/:id/grade', requireRole('faculty', 'admin'), ah(async (req, res) => {
  const { marks } = pick(req.body, ['marks']);
  const { feedback } = pick(req.body, [], ['feedback']);
  const value = Number(marks);
  if (!Number.isFinite(value) || value < 0) throw new HttpError(400, 'Marks must be a positive number');
  const data = check(await req.sb.from('submissions')
    .update({ marks: value, feedback: feedback || null })
    .eq('id', req.params.id).select().maybeSingle());
  if (!data) throw new HttpError(403, 'You can only grade submissions in your courses');
  res.json(data);
}));

router.delete('/:id', requireRole('student', 'admin'), ah(async (req, res) => {
  const data = check(await req.sb.from('submissions').delete().eq('id', req.params.id).select());
  if (!data.length) throw new HttpError(400, 'Graded submissions cannot be withdrawn');
  res.json({ ok: true });
}));

export default router;
