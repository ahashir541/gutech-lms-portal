import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDateTime, initials, timeLeft } from '../lib/format';
import { Badge, EmptyState, ErrorState, Modal, PageLoader, Spinner, useFeedback, useLoader } from '../components/ui';
import Icon from '../components/Icon';

function SubmitPanel({ assignment, onSaved }) {
  const { toast, confirm } = useFeedback();
  const mine = assignment.my_submission;
  const [form, setForm] = useState({ content: mine?.content || '', link: mine?.link || '' });
  const [editing, setEditing] = useState(!mine);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const closed = new Date(assignment.due_date) < new Date();

  useEffect(() => {
    setForm({ content: mine?.content || '', link: mine?.link || '' });
    setEditing(!mine);
  }, [mine]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post(`/assignments/${assignment.id}/submit`, form);
      toast(mine ? 'Submission updated' : 'Assignment submitted');
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    if (!(await confirm('Withdraw your submission? You can submit again before the deadline.', { title: 'Withdraw submission', confirmLabel: 'Withdraw' }))) return;
    try {
      await api.del(`/submissions/${mine.id}`);
      toast('Submission withdrawn');
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (mine?.marks != null) {
    const pct = Math.round((mine.marks / assignment.total_marks) * 100);
    return (
      <section className="card">
        <div className="card-head"><h2>Your result</h2><Badge tone="success">Graded</Badge></div>
        <div className="score">
          <div className="score-ring" style={{ '--pct': pct }}>
            <span>{pct}%</span>
          </div>
          <div>
            <div className="score-value">{mine.marks} / {assignment.total_marks}</div>
            <p className="muted small">Graded {formatDateTime(mine.graded_at)}</p>
          </div>
        </div>
        {mine.feedback && <div className="feedback"><strong>Instructor feedback</strong><p className="pre">{mine.feedback}</p></div>}
        <SubmissionView submission={mine} />
      </section>
    );
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Your submission</h2>
        {mine ? <Badge tone="navy">Submitted {formatDateTime(mine.submitted_at)}</Badge> : <Badge tone="warning">Not submitted</Badge>}
      </div>
      {!editing ? (
        <>
          <SubmissionView submission={mine} />
          <div className="row-gap">
            <button className="btn btn-secondary" onClick={() => setEditing(true)}><Icon name="edit" size={18} /> Edit submission</button>
            <button className="btn btn-danger-ghost" onClick={withdraw}>Withdraw</button>
          </div>
        </>
      ) : (
        <form className="form" onSubmit={submit}>
          {closed && <div className="alert alert-warning">The deadline has passed — late submissions are marked with their submission time.</div>}
          {error && <div className="alert alert-error">{error}</div>}
          <label>Answer
            <textarea rows={7} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Write your answer or a short summary of your work" />
          </label>
          <label>Link (GitHub, Google Drive, deployed URL…)
            <input type="url" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="https://github.com/you/project" />
          </label>
          <div className="row-gap">
            <button className="btn btn-primary" disabled={busy}>{busy ? <Spinner size={18} /> : mine ? 'Update submission' : 'Submit assignment'}</button>
            {mine && <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>}
          </div>
        </form>
      )}
    </section>
  );
}

function SubmissionView({ submission }) {
  if (!submission) return null;
  return (
    <div className="submission-view">
      {submission.content && <p className="pre">{submission.content}</p>}
      {submission.link && (
        <a href={submission.link} target="_blank" rel="noreferrer" className="link-chip">
          <Icon name="link" size={16} /> {submission.link}
        </a>
      )}
    </div>
  );
}

function GradeModal({ submission, total, onClose, onSaved }) {
  const { toast } = useFeedback();
  const [marks, setMarks] = useState(submission.marks ?? '');
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.put(`/submissions/${submission.id}/grade`, { marks: Number(marks), feedback });
      toast(`Graded ${submission.student?.full_name}`);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Grade — ${submission.student?.full_name}`} onClose={onClose} wide
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" form="grade-form" disabled={busy}>{busy ? <Spinner size={18} /> : 'Save grade'}</button>
        </>
      }>
      <SubmissionView submission={submission} />
      <form id="grade-form" className="form" onSubmit={save}>
        {error && <div className="alert alert-error">{error}</div>}
        <label>Marks (out of {total})
          <input type="number" min={0} max={total} step="0.5" required value={marks} onChange={(e) => setMarks(e.target.value)} />
        </label>
        <label>Feedback
          <textarea rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Great work! Next time…" />
        </label>
      </form>
    </Modal>
  );
}

export default function AssignmentDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const { data: a, loading, error, reload } = useLoader(() => api.get(`/assignments/${id}`), [id]);
  const [grading, setGrading] = useState(null);

  if (loading && !a) return <PageLoader label="Loading assignment…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const t = timeLeft(a.due_date);
  const graded = a.submissions.filter((s) => s.marks !== null);
  const avg = graded.length ? Math.round((graded.reduce((n, s) => n + Number(s.marks), 0) / graded.length) * 10) / 10 : null;

  return (
    <div className="stack">
      <Link to={`/courses/${a.course?.id}`} className="back-link"><Icon name="arrowLeft" size={18} /> {a.course?.code} — {a.course?.title}</Link>

      <section className="card">
        <div className="row-between wrap">
          <div>
            <span className="eyebrow">{a.course?.code}</span>
            <h1>{a.title}</h1>
          </div>
          <div className="row-gap">
            <Badge tone="light">{a.total_marks} marks</Badge>
            <Badge tone={t.tone}>{t.label}</Badge>
          </div>
        </div>
        <p className="muted small"><Icon name="clock" size={16} /> Due {formatDateTime(a.due_date)}</p>
        <p className="pre">{a.description || 'No instructions provided.'}</p>
      </section>

      {profile.role === 'student' && <SubmitPanel assignment={a} onSaved={reload} />}

      {a.can_grade && (
        <section className="card table-card">
          <div className="card-head pad">
            <h2>Submissions ({a.submissions.length})</h2>
            <span className="muted small">{graded.length} graded{avg !== null && ` · average ${avg}/${a.total_marks}`}</span>
          </div>
          {a.submissions.length === 0 ? (
            <EmptyState icon="clipboard" title="No submissions yet">Students will appear here once they submit.</EmptyState>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Student</th><th>Submitted</th><th>Work</th><th>Marks</th><th aria-label="Actions" /></tr>
              </thead>
              <tbody>
                {a.submissions.map((s) => (
                  <tr key={s.id}>
                    <td data-label="Student">
                      <div className="person compact">
                        <span className="avatar">{initials(s.student?.full_name)}</span>
                        <div><strong>{s.student?.full_name}</strong><span className="muted small">{s.student?.roll_number || s.student?.email}</span></div>
                      </div>
                    </td>
                    <td data-label="Submitted">
                      {formatDateTime(s.submitted_at)}
                      {new Date(s.submitted_at) > new Date(a.due_date) && <> <Badge tone="danger">Late</Badge></>}
                    </td>
                    <td data-label="Work" className="clamp-cell">
                      {s.link && <a href={s.link} target="_blank" rel="noreferrer" className="link">Open link</a>}
                      {s.content && <span className="clamp-2 muted small">{s.content}</span>}
                    </td>
                    <td data-label="Marks">{s.marks !== null ? <Badge tone="success">{s.marks}/{a.total_marks}</Badge> : <Badge tone="warning">Ungraded</Badge>}</td>
                    <td className="actions">
                      <button className="btn btn-sm btn-primary" onClick={() => setGrading(s)}>{s.marks !== null ? 'Regrade' : 'Grade'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {grading && (
        <GradeModal submission={grading} total={a.total_marks} onClose={() => setGrading(null)}
          onSaved={() => { setGrading(null); reload(); }} />
      )}
    </div>
  );
}
