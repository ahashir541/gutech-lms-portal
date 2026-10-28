import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate, grade } from '../lib/format';
import { Badge, EmptyState, ErrorState, PageLoader, StatCard, useLoader } from '../components/ui';

export default function Grades() {
  const { data, loading, error, reload } = useLoader(() => api.get('/submissions/grades'), []);

  if (loading && !data) return <PageLoader label="Loading grades…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const graded = data.filter((c) => c.percentage !== null);
  const credits = graded.reduce((n, c) => n + c.course.credit_hours, 0);
  const weighted = credits ? graded.reduce((n, c) => n + c.percentage * c.course.credit_hours, 0) / credits : null;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Gradebook</h1>
          <p className="muted">Your marks across all courses, updated as soon as faculty grade your work.</p>
        </div>
      </div>

      <section className="stats">
        <StatCard icon="book" label="Courses with grades" value={graded.length} />
        <StatCard icon="award" label="Weighted average" value={weighted === null ? '—' : `${Math.round(weighted * 10) / 10}%`} tone="purple" />
        <StatCard icon="check" label="Overall letter" value={grade(weighted)} tone="green" />
      </section>

      {data.length === 0 ? (
        <EmptyState icon="award" title="No grades yet">Submit assignments and your results will appear here once graded.</EmptyState>
      ) : (
        data.map((c) => (
          <section key={c.course.id} className="card table-card">
            <div className="card-head pad">
              <div>
                <Link to={`/courses/${c.course.id}`} className="strong-link">{c.course.code} — {c.course.title}</Link>
                <span className="muted small"> · {c.course.credit_hours} CH</span>
              </div>
              <div className="row-gap">
                {c.percentage !== null && <Badge tone="navy">{c.obtained}/{c.total}</Badge>}
                <Badge tone={c.percentage === null ? 'neutral' : c.percentage >= 50 ? 'success' : 'danger'}>
                  {c.percentage === null ? 'Not graded' : `${c.percentage}% · ${grade(c.percentage)}`}
                </Badge>
              </div>
            </div>
            <div className="progress"><span style={{ width: `${c.percentage || 0}%` }} /></div>
            <table className="table">
              <thead><tr><th>Assignment</th><th>Submitted</th><th>Marks</th><th>Feedback</th></tr></thead>
              <tbody>
                {c.items.map((s) => (
                  <tr key={s.id}>
                    <td data-label="Assignment"><Link to={`/assignments/${s.assignment.id}`}>{s.assignment.title}</Link></td>
                    <td data-label="Submitted">{formatDate(s.submitted_at)}</td>
                    <td data-label="Marks">{s.marks !== null ? `${s.marks}/${s.assignment.total_marks}` : <Badge tone="warning">Pending</Badge>}</td>
                    <td data-label="Feedback" className="muted small">{s.feedback || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}
    </div>
  );
}
