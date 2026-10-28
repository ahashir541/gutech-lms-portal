import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Spinner } from '../components/ui';
import AuthShell from './AuthShell';

export const DEPARTMENTS = [
  'Computer Science',
  'Software Engineering',
  'Artificial Intelligence',
  'Electrical Engineering',
  'Business Administration',
  'Mathematics',
];

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', role: 'student', department: DEPARTMENTS[0], roll_number: '',
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Password must be at least 6 characters.');
    setBusy(true);
    try {
      const data = await signUp({ ...form, email: form.email.trim(), full_name: form.full_name.trim() });
      if (data.session) navigate('/');
      else setNotice('Account created! Check your email to confirm, then sign in.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Join the GUTECH LMS as a student or faculty member.">
      {notice ? (
        <div className="alert alert-success">{notice} <Link to="/login">Go to sign in</Link></div>
      ) : (
        <form onSubmit={submit} className="form">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="role-toggle" role="radiogroup" aria-label="Account type">
            {['student', 'faculty'].map((r) => (
              <button type="button" key={r} role="radio" aria-checked={form.role === r}
                className={form.role === r ? 'active' : ''} onClick={() => setForm({ ...form, role: r })}>
                {r === 'student' ? 'I am a Student' : 'I am Faculty'}
              </button>
            ))}
          </div>
          <label>
            Full name
            <input required value={form.full_name} onChange={set('full_name')} placeholder="e.g. Ayesha Khan" />
          </label>
          <label>
            Email
            <input type="email" required value={form.email} onChange={set('email')} placeholder="you@gutech.edu.pk" />
          </label>
          <div className="grid-2">
            <label>
              Department
              <select value={form.department} onChange={set('department')}>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            {form.role === 'student' && (
              <label>
                Roll number
                <input value={form.roll_number} onChange={set('roll_number')} placeholder="GU-2026-CS-001" />
              </label>
            )}
          </div>
          <label>
            Password
            <input type="password" required minLength={6} value={form.password} onChange={set('password')}
              autoComplete="new-password" placeholder="At least 6 characters" />
          </label>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <Spinner size={18} /> : 'Create account'}
          </button>
        </form>
      )}
      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}
