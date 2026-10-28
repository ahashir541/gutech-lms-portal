import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, initials } from '../lib/format';
import { Badge, Spinner, useFeedback } from '../components/ui';
import { DEPARTMENTS } from './Signup';

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useFeedback();
  const [form, setForm] = useState({
    full_name: profile.full_name || '',
    department: profile.department || '',
    roll_number: profile.roll_number || '',
    phone: profile.phone || '',
    bio: profile.bio || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put('/me', form);
      await refreshProfile();
      toast('Profile updated');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <div className="page-head"><div><h1>My profile</h1><p className="muted">Keep your details up to date.</p></div></div>
      <div className="profile-grid">
        <section className="card profile-card">
          <span className="avatar avatar-xl">{initials(profile.full_name)}</span>
          <h2>{profile.full_name}</h2>
          <p className="muted">{profile.email}</p>
          <Badge tone="gold">{profile.role}</Badge>
          <dl>
            <dt>Department</dt><dd>{profile.department || '—'}</dd>
            {profile.role === 'student' && (<><dt>Roll number</dt><dd>{profile.roll_number || '—'}</dd></>)}
            <dt>Member since</dt><dd>{formatDate(profile.created_at)}</dd>
          </dl>
        </section>
        <section className="card">
          <form className="form" onSubmit={save}>
            <label>Full name<input required value={form.full_name} onChange={set('full_name')} /></label>
            <div className="grid-2">
              <label>Department
                <select value={form.department} onChange={set('department')}>
                  <option value="">—</option>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
              {profile.role === 'student' ? (
                <label>Roll number<input value={form.roll_number} onChange={set('roll_number')} /></label>
              ) : (
                <label>Phone<input value={form.phone} onChange={set('phone')} placeholder="+92 3xx xxxxxxx" /></label>
              )}
            </div>
            {profile.role === 'student' && <label>Phone<input value={form.phone} onChange={set('phone')} placeholder="+92 3xx xxxxxxx" /></label>}
            <label>Bio<textarea rows={4} value={form.bio} onChange={set('bio')} placeholder="A few words about you" /></label>
            <div><button className="btn btn-primary" disabled={busy}>{busy ? <Spinner size={18} /> : 'Save changes'}</button></div>
          </form>
        </section>
      </div>
    </div>
  );
}
