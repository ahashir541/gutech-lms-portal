import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDateTime, initials } from '../lib/format';
import { Badge, EmptyState, ErrorState, PageLoader, useFeedback, useLoader } from '../components/ui';
import { AnnouncementForm } from '../components/forms';
import Icon from '../components/Icon';

export default function Announcements() {
  const { profile } = useAuth();
  const { toast, confirm } = useFeedback();
  const canPost = profile.role !== 'student';
  const { data, loading, error, reload } = useLoader(async () => {
    const [announcements, courses] = await Promise.all([
      api.get('/announcements'),
      canPost ? api.get('/courses') : Promise.resolve([]),
    ]);
    return { announcements, courses: courses.filter((c) => c.is_owner || profile.role === 'admin') };
  }, []);
  const [open, setOpen] = useState(false);

  if (loading && !data) return <PageLoader label="Loading announcements…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const remove = async (n) => {
    if (!(await confirm(`Delete "${n.title}"?`, { title: 'Delete announcement' }))) return;
    try {
      await api.del(`/announcements/${n.id}`);
      toast('Announcement deleted');
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Announcements</h1>
          <p className="muted">Campus-wide notices and updates from your courses.</p>
        </div>
        {canPost && (
          <button className="btn btn-primary" onClick={() => setOpen(true)} disabled={!data.courses.length && profile.role !== 'admin'}>
            <Icon name="plus" size={18} /> New announcement
          </button>
        )}
      </div>

      {data.announcements.length === 0 ? (
        <EmptyState icon="megaphone" title="No announcements yet">
          {profile.role === 'student' ? 'Enroll in courses to receive their announcements.' : 'Post the first update for your students.'}
        </EmptyState>
      ) : (
        <div className="stack-sm">
          {data.announcements.map((n) => (
            <article key={n.id} className="card announcement">
              <div className="row-between">
                <div className="person compact">
                  <span className={`avatar ${n.course ? '' : 'avatar-gold'}`}>{initials(n.author?.full_name)}</span>
                  <div>
                    <strong>{n.author?.full_name || 'GUTECH'}</strong>
                    <span className="muted small">{n.author?.role} · {formatDateTime(n.created_at)}</span>
                  </div>
                </div>
                <div className="row-gap">
                  {n.course ? (
                    <Link to={`/courses/${n.course.id}`}><Badge tone="navy">{n.course.code}</Badge></Link>
                  ) : (
                    <Badge tone="gold">Campus-wide</Badge>
                  )}
                  {(n.author_id === profile.id || profile.role === 'admin') && (
                    <button className="icon-btn danger" title="Delete" onClick={() => remove(n)}><Icon name="trash" size={18} /></button>
                  )}
                </div>
              </div>
              <h3>{n.title}</h3>
              <p className="pre">{n.body}</p>
            </article>
          ))}
        </div>
      )}

      {open && (
        <AnnouncementForm
          courses={data.courses}
          allowCampus={profile.role === 'admin'}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); reload(); }}
        />
      )}
    </div>
  );
}
