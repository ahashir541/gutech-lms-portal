import { Router } from 'express';
import { ah, check } from '../middleware.js';

const router = Router();

router.get('/', ah(async (req, res) => {
  const { role } = req.profile;
  const uid = req.user.id;
  const now = new Date().toISOString();

  const [courses, assignments, announcements] = (await Promise.all([
    req.sb.from('courses').select('id, code, title, faculty_id, enrollments(student_id)'),
    req.sb.from('assignments')
      .select('id, title, due_date, total_marks, course:courses(id, code, title, faculty_id), submissions(student_id, marks)')
      .order('due_date'),
    req.sb.from('announcements')
      .select('id, title, body, created_at, course:courses(code), author:profiles(full_name)')
      .order('created_at', { ascending: false }).limit(5),
  ])).map(check);

  const stats = {};
  let upcoming = [];

  if (role === 'student') {
    const mySubmission = (a) => a.submissions.find((s) => s.student_id === uid);
    const graded = assignments.filter((a) => mySubmission(a)?.marks != null);
    const pending = assignments.filter((a) => !mySubmission(a) && a.due_date >= now);
    stats.courses = courses.filter((c) => c.enrollments.some((e) => e.student_id === uid)).length;
    stats.pending = pending.length;
    stats.submitted = assignments.filter(mySubmission).length;
    stats.average = graded.length
      ? Math.round((graded.reduce((sum, a) => sum + Number(mySubmission(a).marks) / a.total_marks, 0) / graded.length) * 1000) / 10
      : null;
    upcoming = pending.slice(0, 5);
  } else {
    const mine = role === 'admin' ? courses : courses.filter((c) => c.faculty_id === uid);
    const ids = new Set(mine.map((c) => c.id));
    const mineAssignments = assignments.filter((a) => ids.has(a.course?.id));
    stats.courses = mine.length;
    stats.students = new Set(mine.flatMap((c) => c.enrollments.map((e) => e.student_id))).size;
    stats.assignments = mineAssignments.length;
    stats.to_grade = mineAssignments.reduce((n, a) => n + a.submissions.filter((s) => s.marks === null).length, 0);
    upcoming = mineAssignments.filter((a) => a.due_date >= now).slice(0, 5);
    if (role === 'admin') {
      const { count } = await req.sb.from('profiles').select('id', { count: 'exact', head: true });
      stats.users = count ?? 0;
    }
  }

  res.json({
    stats,
    upcoming: upcoming.map(({ submissions, ...a }) => a),
    announcements,
  });
}));

export default router;
