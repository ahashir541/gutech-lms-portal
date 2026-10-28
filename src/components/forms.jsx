import { useState } from 'react';
import { api } from '../lib/api';
import { toLocalInput } from '../lib/format';
import { Modal, Spinner, useFeedback } from './ui';

// Shared submit handling for the create/edit modals below.
function useSubmit(onDone) {
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (fn, successMessage) => {
    setBusy(true);
    setError('');
    try {
      const result = await fn();
      toast(successMessage);
      onDone(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function Footer({ onClose, busy, label, form }) {
  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
      <button type="submit" form={form} className="btn btn-primary" disabled={busy}>
        {busy ? <Spinner size={18} /> : label}
      </button>
    </>
  );
}

export function CourseForm({ course, onClose, onSaved }) {
  const [form, setForm] = useState({
    code: course?.code || '',
    title: course?.title || '',
    description: course?.description || '',
    credit_hours: course?.credit_hours || 3,
    semester: course?.semester || 'Fall 2026',
  });
  const { busy, error, run } = useSubmit(onSaved);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const body = { ...form, credit_hours: Number(form.credit_hours) };
    run(
      () => (course ? api.put(`/courses/${course.id}`, body) : api.post('/courses', body)),
      course ? 'Course updated' : 'Course created',
    );
  };

  return (
    <Modal title={course ? 'Edit course' : 'Create a new course'} onClose={onClose}
      footer={<Footer onClose={onClose} busy={busy} form="course-form" label={course ? 'Save changes' : 'Create course'} />}>
      <form id="course-form" className="form" onSubmit={submit}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="grid-2">
          <label>Course code<input required value={form.code} onChange={set('code')} placeholder="CS-301" /></label>
          <label>Credit hours
            <select value={form.credit_hours} onChange={set('credit_hours')}>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <label>Title<input required value={form.title} onChange={set('title')} placeholder="Web Technologies" /></label>
        <label>Semester<input required value={form.semester} onChange={set('semester')} /></label>
        <label>Description
          <textarea rows={4} value={form.description} onChange={set('description')} placeholder="What will students learn?" />
        </label>
      </form>
    </Modal>
  );
}

export function AssignmentForm({ courseId, assignment, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: assignment?.title || '',
    description: assignment?.description || '',
    due_date: toLocalInput(assignment?.due_date),
    total_marks: assignment?.total_marks || 100,
  });
  const { busy, error, run } = useSubmit(onSaved);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const body = { ...form, total_marks: Number(form.total_marks), due_date: new Date(form.due_date).toISOString() };
    run(
      () => (assignment ? api.put(`/assignments/${assignment.id}`, body) : api.post(`/courses/${courseId}/assignments`, body)),
      assignment ? 'Assignment updated' : 'Assignment published',
    );
  };

  return (
    <Modal title={assignment ? 'Edit assignment' : 'New assignment'} onClose={onClose}
      footer={<Footer onClose={onClose} busy={busy} form="assignment-form" label={assignment ? 'Save changes' : 'Publish'} />}>
      <form id="assignment-form" className="form" onSubmit={submit}>
        {error && <div className="alert alert-error">{error}</div>}
        <label>Title<input required value={form.title} onChange={set('title')} placeholder="Lab 3: REST APIs" /></label>
        <label>Instructions
          <textarea rows={5} value={form.description} onChange={set('description')} placeholder="Describe the task, deliverables and rubric" />
        </label>
        <div className="grid-2">
          <label>Due date<input type="datetime-local" required value={form.due_date} onChange={set('due_date')} /></label>
          <label>Total marks<input type="number" min={1} max={1000} required value={form.total_marks} onChange={set('total_marks')} /></label>
        </div>
      </form>
    </Modal>
  );
}

export function AnnouncementForm({ courses, defaultCourseId, allowCampus, onClose, onSaved }) {
  const [form, setForm] = useState({
    course_id: defaultCourseId || (allowCampus ? '' : courses[0]?.id || ''),
    title: '',
    body: '',
  });
  const { busy, error, run } = useSubmit(onSaved);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    run(() => api.post('/announcements', { ...form, course_id: form.course_id || null }), 'Announcement posted');
  };

  return (
    <Modal title="Post an announcement" onClose={onClose}
      footer={<Footer onClose={onClose} busy={busy} form="announcement-form" label="Post" />}>
      <form id="announcement-form" className="form" onSubmit={submit}>
        {error && <div className="alert alert-error">{error}</div>}
        {!defaultCourseId && (
          <label>Audience
            <select value={form.course_id} onChange={set('course_id')} required={!allowCampus}>
              {allowCampus && <option value="">Entire campus</option>}
              {courses.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
            </select>
          </label>
        )}
        <label>Title<input required value={form.title} onChange={set('title')} placeholder="Quiz moved to Thursday" /></label>
        <label>Message<textarea rows={5} required value={form.body} onChange={set('body')} /></label>
      </form>
    </Modal>
  );
}
