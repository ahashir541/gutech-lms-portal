import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Badge, EmptyState, ErrorState, PageLoader, Spinner, useFeedback, useLoader } from '../components/ui';
import { CourseForm } from '../components/forms';
import Icon from '../components/Icon';

export default function Courses() {
  const { profile } = useAuth();
  const { toast, confirm } = useFeedback();
  const [params, setParams] = useSearchParams();
  const { data, loading, error, reload } = useLoader(() => api.get('/courses'), []);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('mine');
  const [busyId, setBusyId] = useState(null);

  const isStudent = profile.role === 'student';
  const canCreate = profile.role !== 'student';
  const showForm = params.get('new') === '1';

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.toLowerCase();
    return data
      .filter((c) => {
        if (tab === 'all' || profile.role === 'admin') return true;
        return isStudent ? c.is_enrolled : c.is_owner;
      })
      .filter((c) => !q || `${c.code} ${c.title} ${c.faculty?.full_name || ''}`.toLowerCase().includes(q));
  }, [data, query, tab, isStudent, profile.role]);

  const toggleEnroll = async (course) => {
    if (course.is_enrolled) {
      const ok = await confirm(`Drop ${course.code} — ${course.title}? Your submissions stay saved.`, {
        title: 'Drop course', confirmLabel: 'Drop course',
      });
      if (!ok) return;
    }
    setBusyId(course.id);
    try {
      if (course.is_enrolled) await api.del(`/courses/${course.id}/enroll`);
      else await api.post(`/courses/${course.id}/enroll`);
      toast(course.is_enrolled ? `Dropped ${course.code}` : `Enrolled in ${course.code}`);
      await reload();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (loading && !data) return <PageLoader label="Loading courses…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Courses</h1>
          <p className="muted">
            {isStudent ? 'Browse the Fall 2026 catalog and manage your enrollments.' : 'Create and manage the courses you teach.'}
          </p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setParams({ new: '1' })}>
            <Icon name="plus" size={18} /> New course
          </button>
        )}
      </div>

      <div className="toolbar">
        {profile.role !== 'admin' && (
          <div className="tabs">
            <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
              {isStudent ? 'My courses' : 'Teaching'}
            </button>
            <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
              {isStudent ? 'Course catalog' : 'All courses'}
            </button>
          </div>
        )}
        <div className="search">
          <Icon name="search" size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by code, title or instructor" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="book"
          title={tab === 'mine' && !query ? (isStudent ? 'You are not enrolled yet' : 'No courses yet') : 'No matching courses'}
          action={
            tab === 'mine' && !query && (isStudent ? (
              <button className="btn btn-primary" onClick={() => setTab('all')}>Browse catalog</button>
            ) : canCreate && (
              <button className="btn btn-primary" onClick={() => setParams({ new: '1' })}>Create your first course</button>
            ))
          }
        >
          {isStudent && tab === 'mine' && !query && 'Open the catalog to enroll in courses for this semester.'}
        </EmptyState>
      ) : (
        <div className="course-grid">
          {filtered.map((c) => (
            <article key={c.id} className="course-card">
              <Link to={`/courses/${c.id}`} className="course-cover">
                <span className="course-code">{c.code}</span>
                <span className="course-credits">{c.credit_hours} CH</span>
              </Link>
              <div className="course-body">
                <Link to={`/courses/${c.id}`}><h3>{c.title}</h3></Link>
                <p className="clamp-2 muted">{c.description || 'No description provided.'}</p>
                <div className="course-meta">
                  <span><Icon name="user" size={16} /> {c.faculty?.full_name || 'TBA'}</span>
                  <span><Icon name="users" size={16} /> {c.enrollment_count}</span>
                </div>
              </div>
              <div className="course-foot">
                {c.is_enrolled && <Badge tone="success">Enrolled</Badge>}
                {c.is_owner && <Badge tone="navy">You teach this</Badge>}
                <div className="spacer" />
                {isStudent ? (
                  <button className={`btn btn-sm ${c.is_enrolled ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => toggleEnroll(c)} disabled={busyId === c.id}>
                    {busyId === c.id ? <Spinner size={16} /> : c.is_enrolled ? 'Drop' : 'Enroll'}
                  </button>
                ) : (
                  <Link to={`/courses/${c.id}`} className="btn btn-sm btn-secondary">Open</Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && canCreate && (
        <CourseForm
          onClose={() => setParams({})}
          onSaved={() => {
            setParams({});
            setTab('mine');
            reload();
          }}
        />
      )}
    </div>
  );
}
