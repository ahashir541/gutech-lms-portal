import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Spinner } from '../components/ui';
import AuthShell from './AuthShell';

const DEMO = [
  { label: 'Student', email: 'student@gutech.edu.pk' },
  { label: 'Faculty', email: 'faculty@gutech.edu.pk' },
  { label: 'Admin', email: 'admin@gutech.edu.pk' },
];
const DEMO_PASSWORD = 'Gutech@123';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(form.email.trim(), form.password);
      navigate('/');
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'Incorrect email or password.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Sign in" subtitle="Use your GUTECH portal account.">
      <form onSubmit={submit} className="form">
        {error && <div className="alert alert-error">{error}</div>}
        <label>
          Email
          <input type="email" required autoComplete="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@gutech.edu.pk" />
        </label>
        <label>
          Password
          <input type="password" required autoComplete="current-password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
        </label>
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <Spinner size={18} /> : 'Sign in'}
        </button>
      </form>

      <div className="demo-box">
        <p>Demo accounts (password <code>{DEMO_PASSWORD}</code>)</p>
        <div className="demo-buttons">
          {DEMO.map((d) => (
            <button key={d.label} type="button" className="btn btn-ghost btn-sm"
              onClick={() => setForm({ email: d.email, password: DEMO_PASSWORD })}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <p className="auth-switch">
        New to the portal? <Link to="/signup">Create an account</Link>
      </p>
    </AuthShell>
  );
}
