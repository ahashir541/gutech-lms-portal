import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, formatDateTime, initials, timeLeft } from '../lib/format';
import { Badge, EmptyState, ErrorState, PageLoader, useFeedback, useLoader } from '../components/ui';
import { AnnouncementForm, AssignmentForm, CourseForm } from '../components/forms';
import Icon from '../components/Icon';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast, confirm } = useFeedback();
  const { data: course, loading, error, reload } = useLoader(() => api.get(`/courses/${id}`), [id]);
  const [tab, setTab] = useState('assignments');
  const [modal, setModal] = useState(null); // 'course' | 'assignment' | 'announcement' | {assignment}

  if (loading && !course) return <PageLoader label="Loading course…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const canManage = course.is_owner || profile.role === 'admin';
  const isStudent = profile.role === 'student';

  const run = async (fn, message) => {
    try {
      await fn();
      toast(message);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const deleteCourse = async () => {
    const ok = await confirm(`Delete ${course.code}? All assignments, submissions and announcements in it will be removed.`, {
      title: 'Delete course', confirmLabel: 'Delete course',
    });
    if (!ok) return;
    try {
      await api.del(`/courses/${course.id}`);
      toast('Course deleted');
      navigate('/courses');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const deleteAssignment = async (a) => {
    if (await confirm(`Delete "${a.title}" and all its submissions?`, { title: 'Delete assignment' })) {
      run(() => api.del(`/assignments/${a.id}`), 'Assignment deleted');
    }
  };

  const deleteAnnouncement = async (n) => {
    if (await confirm(`Delete the announcement "${n.title}"?`, { title: 'Delete announcement' })) {
      run(() => api.del(`/announcements/${n.id}`), 'Announcement deleted');
    }
  };

  const closeAndReload = () => {
    setModal(null);
    reload();
  };

  const tabs = [
    ['assignments', `Assignments (${course.assignments.length})`],
    ['announcements', `Announcements (${course.announcements.length})`],
    ['people', `People (${course.students.length})`],
  ];

  return (
    <div className="stack">
      <Link to="/courses" className="back-link"><Icon name="arrowLeft" size={18} /> All courses</Link>

      <section className="course-hero">
        <div>
          <div className="row-gap">
            <Badge tone="gold">{course.code}</Badge>
            <Badge tone="light">{course.credit_hours} credit hours</Badge>
            <Badge tone="light">{course.semester}</Badge>
          </div>
          <h1>{course.title}</h1>
          <p>{course.description || 'No description provided.'}</p>
          <span className="small">Instructor: <strong>{course.faculty?.full_name || 'TBA'}</strong> · {course.faculty?.department}</span>
        </div>
        <div className="hero-actions">
          {isStudent && (
            <button
              className={`btn ${course.is_enrolled ? 'btn-light' : 'btn-gold'}`}
              onClick={async () => {
                if (course.is_enrolled && !(await confirm(`Drop ${course.code}?`, { title: 'Drop course', confirmLabel: 'Drop' }))) return;
                run(
                  () => (course.is_enrolled ? api.del(`/courses/${id}/enroll`) : api.post(`/courses/${id}/enroll`)),
                  course.is_enrolled ? 'Course dropped' : 'Enrolled successfully',
                );
              }}
            >
              {course.is_enrolled ? 'Drop course' : 'Enroll now'}
            </button>
          )}
          {canManage && (
            <>
              <button className="btn btn-light" onClick={() => setModal('course')}><Icon name="edit" size={18} /> Edit</button>
              <button className="btn btn-danger-ghost" onClick={deleteCourse}><Icon name="trash" size={18} /> Delete</button>
            </>
          )}
        </div>
      </section>

      {!course.can_see_content ? (
        <EmptyState icon="shield" title="Enroll to see course content">
          Assignments and announcements are visible to enrolled students only.
        </EmptyState>
      ) : (
        <>
          <div className="toolbar">
            <div className="tabs">
              {tabs.map(([key, label]) => (
                <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
              ))}
            </div>
            {canManage && tab === 'assignments' && (
              <button className="btn btn-primary btn-sm" onClick={() => setModal('assignment')}><Icon name="plus" size={16} /> Assignment</button>
            )}
            {canManage && tab === 'announcements' && (
              <button className="btn btn-primary btn-sm" onClick={() => setModal('announcement')}><Icon name="plus" size={16} /> Announcement</button>
            )}
          </div>

          {tab === 'assignments' && (
            course.assignments.length === 0 ? (
              <EmptyState icon="clipboard" title="No assignments yet">
                {canManage ? 'Publish the first assignment for this course.' : 'Your instructor has not posted any assignments yet.'}
              </EmptyState>
            ) : (
              <div className="card table-card">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Assignment</th>
                      <th>Due</th>
                      <th>Marks</th>
                      <th>{canManage ? 'Submissions' : 'Status'}</th>
                      {canManage && <th aria-label="Actions" />}
                    </tr>
                  </thead>
                  <tbody>
                    {course.assignments.map((a) => {
                      const t = timeLeft(a.due_date);
                      const mine = a.my_submission;
                      return (
                        <tr key={a.id}>
                          <td data-label="Assignment"><Link to={`/assignments/${a.id}`} className="strong-link">{a.title}</Link></td>
                          <td data-label="Due">{formatDateTime(a.due_date)} <Badge tone={t.tone}>{t.label}</Badge></td>
                          <td data-label="Marks">{a.total_marks}</td>
                          <td data-label={canManage ? 'Submissions' : 'Status'}>
                            {canManage ? (
                              <span>{a.submission_count} submitted · {a.graded_count} graded</span>
                            ) : mine ? (
                              mine.marks !== null ? <Badge tone="success">Graded {mine.marks}/{a.total_marks}</Badge> : <Badge tone="navy">Submitted</Badge>
                            ) : (
                              <Badge tone={t.tone === 'muted' ? 'danger' : 'warning'}>{t.tone === 'muted' ? 'Missed' : 'Not submitted'}</Badge>
                            )}
                          </td>
                          {canManage && (
                            <td className="actions">
                              <button className="icon-btn" title="Edit" onClick={() => setModal({ assignment: a })}><Icon name="edit" size={18} /></button>
                              <button className="icon-btn danger" title="Delete" onClick={() => deleteAssignment(a)}><Icon name="trash" size={18} /></button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {tab === 'announcements' && (
            course.announcements.length === 0 ? (
              <EmptyState icon="megaphone" title="No announcements yet" />
            ) : (
              <div className="stack-sm">
                {course.announcements.map((n) => (
                  <article key={n.id} className="card announcement">
                    <div className="row-between">
                      <h3>{n.title}</h3>
                      {(n.author_id === profile.id || profile.role === 'admin') && (
                        <button className="icon-btn danger" title="Delete" onClick={() => deleteAnnouncement(n)}><Icon name="trash" size={18} /></button>
                      )}
                    </div>
                    <p className="pre">{n.body}</p>
                    <span className="muted small">{n.author?.full_name} · {formatDateTime(n.created_at)}</span>
                  </article>
                ))}
              </div>
            )
          )}

          {tab === 'people' && (
            <div className="card">
              <div className="person instructor">
                <span className="avatar avatar-gold">{initials(course.faculty?.full_name)}</span>
                <div>
                  <strong>{course.faculty?.full_name || 'TBA'}</strong>
                  <span className="muted small">Instructor · {course.faculty?.email}</span>
                </div>
              </div>
              {course.students.length === 0 ? (
                <p className="muted pad">No students enrolled yet.</p>
              ) : (
                <ul className="people">
                  {course.students.map((s) => (
                    <li key={s.id} className="person">
                      <span className="avatar">{initials(s.full_name)}</span>
                      <div>
                        <strong>{s.full_name}</strong>
                        <span className="muted small">{s.roll_number || s.email} · enrolled {formatDate(s.enrolled_at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {modal === 'course' && <CourseForm course={course} onClose={() => setModal(null)} onSaved={closeAndReload} />}
      {modal === 'assignment' && <AssignmentForm courseId={course.id} onClose={() => setModal(null)} onSaved={closeAndReload} />}
      {modal?.assignment && (
        <AssignmentForm courseId={course.id} assignment={modal.assignment} onClose={() => setModal(null)} onSaved={closeAndReload} />
      )}
      {modal === 'announcement' && (
        <AnnouncementForm courses={[course]} defaultCourseId={course.id} onClose={() => setModal(null)} onSaved={closeAndReload} />
      )}
    </div>
  );
}
