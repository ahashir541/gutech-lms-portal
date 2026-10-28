import { Router } from 'express';
import { ah, check, pick, requireRole, HttpError } from '../middleware.js';

const router = Router();
const COURSE_FIELDS = '*, faculty:profiles!courses_faculty_id_fkey(id, full_name, email, department), enrollments(student_id)';

function shapeCourse(course, userId) {
  const { enrollments = [], ...rest } = course;
  return {
    ...rest,
    enrollment_count: enrollments.length,
    is_enrolled: enrollments.some((e) => e.student_id === userId),
    is_owner: course.faculty_id === userId,
  };
}

router.get('/', ah(async (req, res) => {
  const data = check(await req.sb.from('courses').select(COURSE_FIELDS).order('code'));
  res.json(data.map((c) => shapeCourse(c, req.user.id)));
}));

router.post('/', requireRole('faculty', 'admin'), ah(async (req, res) => {
  const body = pick(req.body, ['code', 'title'], ['description', 'credit_hours', 'semester']);
  body.code = body.code.toUpperCase();
  body.faculty_id = req.user.id;
  const data = check(await req.sb.from('courses').insert(body).select().single());
  res.status(201).json(data);
}));

router.get('/:id', ah(async (req, res) => {
  const course = check(await req.sb.from('courses').select(COURSE_FIELDS).eq('id', req.params.id).maybeSingle());
  if (!course) throw new HttpError(404, 'Course not found');
  const shaped = shapeCourse(course, req.user.id);
  const canSeeContent = shaped.is_enrolled || shaped.is_owner || req.profile.role === 'admin';

  const [assignments, announcements, people] = await Promise.all([
    canSeeContent
      ? req.sb.from('assignments').select('*, submissions(id, student_id, marks)').eq('course_id', course.id).order('due_date')
      : { data: [] },
    canSeeContent
      ? req.sb.from('announcements').select('*, author:profiles(full_name, role)').eq('course_id', course.id).order('created_at', { ascending: false })
      : { data: [] },
    req.sb.from('enrollments').select('enrolled_at, student:profiles(id, full_name, email, roll_number, department)').eq('course_id', course.id),
  ]);

  const shapedAssignments = (assignments.data || []).map(({ submissions = [], ...a }) => ({
    ...a,
    submission_count: submissions.length,
    graded_count: submissions.filter((s) => s.marks !== null).length,
    my_submission: submissions.find((s) => s.student_id === req.user.id) || null,
  }));

  res.json({
    ...shaped,
    can_see_content: canSeeContent,
    assignments: shapedAssignments,
    announcements: announcements.data || [],
    students: (people.data || []).map((p) => ({ ...p.student, enrolled_at: p.enrolled_at })),
  });
}));

router.put('/:id', requireRole('faculty', 'admin'), ah(async (req, res) => {
  const body = pick(req.body, [], ['code', 'title', 'description', 'credit_hours', 'semester']);
  if (body.code) body.code = body.code.toUpperCase();
  const data = check(await req.sb.from('courses').update(body).eq('id', req.params.id).select().maybeSingle());
  if (!data) throw new HttpError(403, 'You can only edit your own courses');
  res.json(data);
}));

router.delete('/:id', requireRole('faculty', 'admin'), ah(async (req, res) => {
  const data = check(await req.sb.from('courses').delete().eq('id', req.params.id).select());
  if (!data.length) throw new HttpError(403, 'You can only delete your own courses');
  res.json({ ok: true });
}));

// ---- Enrollment ----
router.post('/:id/enroll', requireRole('student'), ah(async (req, res) => {
  check(await req.sb.from('enrollments').insert({ course_id: req.params.id, student_id: req.user.id }));
  res.status(201).json({ ok: true });
}));

router.delete('/:id/enroll', requireRole('student'), ah(async (req, res) => {
  check(await req.sb.from('enrollments').delete().eq('course_id', req.params.id).eq('student_id', req.user.id));
  res.json({ ok: true });
}));

// ---- Assignments inside a course ----
router.post('/:id/assignments', requireRole('faculty', 'admin'), ah(async (req, res) => {
  const body = pick(req.body, ['title', 'due_date'], ['description', 'total_marks']);
  body.course_id = req.params.id;
  const data = check(await req.sb.from('assignments').insert(body).select().single());
  res.status(201).json(data);
}));

export default router;
