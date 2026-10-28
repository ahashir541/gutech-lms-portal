import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDateTime, timeLeft } from '../lib/format';
import { Badge, EmptyState, ErrorState, PageLoader, useLoader } from '../components/ui';

function studentStatus(a) {
  const s = a.my_submission;
  if (s?.marks != null) return { key: 'graded', label: `Graded ${s.marks}/${a.total_marks}`, tone: 'success' };
  if (s) return { key: 'submitted', label: 'Submitted', tone: 'navy' };
  if (new Date(a.due_date) < new Date()) return { key: 'missed', label: 'Missed', tone: 'danger' };
  return { key: 'pending', label: 'Pending', tone: 'warning' };
}

export default function Assignments() {
  const { profile } = useAuth();
  const isStudent = profile.role === 'student';
  const { data, loading, error, reload } = useLoader(() => api.get('/assignments'), []);
  const [filter, setFilter] = useState('all');

  const filters = isStudent
    ? [['all', 'All'], ['pending', 'Pending'], ['submitted', 'Submitted'], ['graded', 'Graded'], ['missed', 'Missed']]
    : [['all', 'All'], ['to_grade', 'Needs grading'], ['open', 'Open'], ['closed', 'Closed']];

  const rows = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    return data.filter((a) => {
      if (filter === 'all') return true;
      if (isStudent) return studentStatus(a).key === filter;
      if (filter === 'to_grade') return a.ungraded_count > 0;
      if (filter === 'open') return new Date(a.due_date) >= now;
      return new Date(a.due_date) < now;
    });
  }, [data, filter, isStudent]);

  if (loading && !data) return <PageLoader label="Loading assignments…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Assignments</h1>
          <p className="muted">
            {isStudent ? 'Everything due across your enrolled courses.' : 'Assignments across the courses you teach.'}
          </p>
        </div>
      </div>

      <div className="tabs tabs-scroll">
        {filters.map(([key, label]) => (
          <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}</button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="clipboard" title="Nothing here">
          {data.length === 0
            ? isStudent ? 'Enroll in a course to see its assignments.' : 'Open one of your courses to publish an assignment.'
            : 'No assignments match this filter.'}
        </EmptyState>
      ) : (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Course</th>
                <th>Due</th>
                <th>{isStudent ? 'Status' : 'Submissions'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const t = timeLeft(a.due_date);
                const st = isStudent && studentStatus(a);
                return (
                  <tr key={a.id}>
                    <td data-label="Assignment"><Link to={`/assignments/${a.id}`} className="strong-link">{a.title}</Link></td>
                    <td data-label="Course"><Link to={`/courses/${a.course?.id}`}>{a.course?.code}</Link></td>
                    <td data-label="Due">{formatDateTime(a.due_date)} <Badge tone={t.tone}>{t.label}</Badge></td>
                    <td data-label={isStudent ? 'Status' : 'Submissions'}>
                      {isStudent ? (
                        <Badge tone={st.tone}>{st.label}</Badge>
                      ) : (
                        <span>
                          {a.submission_count} submitted
                          {a.ungraded_count > 0 && <> · <Badge tone="warning">{a.ungraded_count} to grade</Badge></>}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
