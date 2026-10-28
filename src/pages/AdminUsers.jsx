import { useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, initials } from '../lib/format';
import { ErrorState, PageLoader, StatCard, useFeedback, useLoader } from '../components/ui';
import Icon from '../components/Icon';

export default function AdminUsers() {
  const { profile } = useAuth();
  const { toast, confirm } = useFeedback();
  const { data, loading, error, reload } = useLoader(() => api.get('/users'), []);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('all');

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.toLowerCase();
    return data
      .filter((u) => role === 'all' || u.role === role)
      .filter((u) => !q || `${u.full_name} ${u.email} ${u.department || ''}`.toLowerCase().includes(q));
  }, [data, query, role]);

  if (loading && !data) return <PageLoader label="Loading users…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const count = (r) => data.filter((u) => u.role === r).length;

  const changeRole = async (user, next) => {
    if (!(await confirm(`Change ${user.full_name}'s role from ${user.role} to ${next}?`, { title: 'Change role', confirmLabel: 'Change role', tone: 'primary' }))) return;
    try {
      await api.put(`/users/${user.id}/role`, { role: next });
      toast(`${user.full_name} is now ${next}`);
      reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="stack">
      <div className="page-head"><div><h1>User management</h1><p className="muted">Everyone registered on the GUTECH portal.</p></div></div>

      <section className="stats">
        <StatCard icon="users" label="Total users" value={data.length} />
        <StatCard icon="book" label="Students" value={count('student')} tone="green" />
        <StatCard icon="clipboard" label="Faculty" value={count('faculty')} tone="purple" />
        <StatCard icon="shield" label="Admins" value={count('admin')} tone="gold" />
      </section>

      <div className="toolbar">
        <div className="tabs">
          {['all', 'student', 'faculty', 'admin'].map((r) => (
            <button key={r} className={role === r ? 'active' : ''} onClick={() => setRole(r)}>{r === 'all' ? 'All' : `${r[0].toUpperCase()}${r.slice(1)}`}</button>
          ))}
        </div>
        <div className="search">
          <Icon name="search" size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users" />
        </div>
      </div>

      <div className="card table-card">
        <table className="table">
          <thead><tr><th>User</th><th>Department</th><th>Joined</th><th>Role</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td data-label="User">
                  <div className="person compact">
                    <span className="avatar">{initials(u.full_name)}</span>
                    <div><strong>{u.full_name}</strong><span className="muted small">{u.email}</span></div>
                  </div>
                </td>
                <td data-label="Department">{u.department || '—'}{u.roll_number && <span className="muted small"> · {u.roll_number}</span>}</td>
                <td data-label="Joined">{formatDate(u.created_at)}</td>
                <td data-label="Role">
                  <select className="select-sm" value={u.role} disabled={u.id === profile.id}
                    onChange={(e) => changeRole(u, e.target.value)}>
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
