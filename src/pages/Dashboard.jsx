import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDateTime, timeLeft } from '../lib/format';
import { Badge, EmptyState, ErrorState, PageLoader, StatCard, useLoader } from '../components/ui';
import Icon from '../components/Icon';

export default function Dashboard() {
  const { profile } = useAuth();
  const { data, loading, error, reload } = useLoader(() => api.get('/dashboard'), []);

  if (loading) return <PageLoader label="Loading dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const { stats, upcoming, announcements } = data;
  const isStudent = profile.role === 'student';

  return (
    <div className="stack">
      <section className="hero-card">
        <div>
          <span className="eyebrow">{profile.role} dashboard · Fall 2026</span>
          <h1>Assalam-o-Alaikum, {profile.full_name}</h1>
          <p>
            {isStudent
              ? 'Here is what is happening across your courses this week.'
              : 'Here is an overview of your courses, students and pending grading.'}
          </p>
        </div>
        <div className="hero-actions">
          {isStudent ? (
            <Link to="/courses" className="btn btn-gold"><Icon name="search" size={18} /> Browse courses</Link>
          ) : (
            <Link to="/courses?new=1" className="btn btn-gold"><Icon name="plus" size={18} /> New course</Link>
          )}
        </div>
      </section>

      <section className="stats">
        {isStudent ? (
          <>
            <StatCard icon="book" label="Enrolled courses" value={stats.courses} />
            <StatCard icon="clock" label="Pending assignments" value={stats.pending} tone="gold" />
            <StatCard icon="check" label="Submitted" value={stats.submitted} tone="green" />
            <StatCard icon="award" label="Average score" value={stats.average === null ? '—' : `${stats.average}%`} tone="purple" />
          </>
        ) : (
          <>
            <StatCard icon="book" label={profile.role === 'admin' ? 'All courses' : 'My courses'} value={stats.courses} />
            <StatCard icon="users" label="Students" value={stats.students} tone="green" />
            <StatCard icon="clipboard" label="Assignments" value={stats.assignments} tone="purple" />
            <StatCard icon="clock" label="Waiting to grade" value={stats.to_grade} tone="gold" />
          </>
        )}
      </section>

      <div className="grid-2 align-start">
        <section className="card">
          <div className="card-head">
            <h2>Upcoming deadlines</h2>
            <Link to="/assignments" className="link">View all</Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState icon="check" title="All caught up">No upcoming deadlines right now.</EmptyState>
          ) : (
            <ul className="list">
              {upcoming.map((a) => {
                const t = timeLeft(a.due_date);
                return (
                  <li key={a.id}>
                    <Link to={`/assignments/${a.id}`} className="list-item">
                      <div>
                        <strong>{a.title}</strong>
                        <span className="muted small">{a.course?.code} · due {formatDateTime(a.due_date)}</span>
                      </div>
                      <Badge tone={t.tone}>{t.label}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>Latest announcements</h2>
            <Link to="/announcements" className="link">View all</Link>
          </div>
          {announcements.length === 0 ? (
            <EmptyState icon="megaphone" title="No announcements yet" />
          ) : (
            <ul className="list">
              {announcements.map((n) => (
                <li key={n.id} className="announcement-mini">
                  <div className="row-between">
                    <strong>{n.title}</strong>
                    <Badge tone={n.course ? 'navy' : 'gold'}>{n.course?.code || 'Campus'}</Badge>
                  </div>
                  <p className="clamp-2">{n.body}</p>
                  <span className="muted small">{n.author?.full_name} · {formatDateTime(n.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
