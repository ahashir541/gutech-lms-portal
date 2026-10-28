import { Brand } from '../components/Layout';

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth">
      <section className="auth-hero">
        <Brand light />
        <div className="auth-hero-copy">
          <h1>Learning, teaching and grading — in one place.</h1>
          <p>
            The GUTECH Learning Management System for students and faculty at our Korangi, Karachi campus. Enroll in
            courses, submit assignments, track grades and stay on top of announcements.
          </p>
          <ul>
            <li>Course enrollment &amp; catalog</li>
            <li>Assignment submission &amp; grading</li>
            <li>Gradebook with live percentages</li>
            <li>Campus &amp; course announcements</li>
          </ul>
        </div>
        <small>© 2026 GUTECH · Student / Faculty Portal</small>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <h2>{title}</h2>
          <p className="muted">{subtitle}</p>
          {children}
        </div>
      </section>
    </div>
  );
}
