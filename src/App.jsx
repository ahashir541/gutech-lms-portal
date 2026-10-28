import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { supabaseConfigured } from './lib/supabase';
import { FeedbackProvider, PageLoader } from './components/ui';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Assignments from './pages/Assignments';
import AssignmentDetail from './pages/AssignmentDetail';
import Grades from './pages/Grades';
import Announcements from './pages/Announcements';
import Profile from './pages/Profile';
import AdminUsers from './pages/AdminUsers';
import NotFound from './pages/NotFound';

function Protected({ children, roles }) {
  const { session, profile, loading, profileError, refreshProfile, signOut } = useAuth();
  if (loading) return <PageLoader label="Opening your portal…" />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile && profileError) {
    return (
      <div className="setup-missing">
        <h1>Could not load your profile</h1>
        <p>{profileError}</p>
        <div className="row-gap">
          <button className="btn btn-primary" onClick={refreshProfile}>Try again</button>
          <button className="btn btn-secondary" onClick={signOut}>Log out</button>
        </div>
      </div>
    );
  }
  if (!profile) return <PageLoader label="Loading your profile…" />;
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (session && profile) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  if (!supabaseConfigured) {
    return (
      <div className="setup-missing">
        <h1>GUTECH LMS Portal</h1>
        <p>Supabase is not configured. Copy <code>.env.example</code> to <code>.env</code> and set your project URL and anon key.</p>
      </div>
    );
  }

  return (
    <FeedbackProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
          <Route element={<Protected><Layout /></Protected>}>
            <Route index element={<Dashboard />} />
            <Route path="courses" element={<Courses />} />
            <Route path="courses/:id" element={<CourseDetail />} />
            <Route path="assignments" element={<Assignments />} />
            <Route path="assignments/:id" element={<AssignmentDetail />} />
            <Route path="grades" element={<Protected roles={['student']}><Grades /></Protected>} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="profile" element={<Profile />} />
            <Route path="admin" element={<Protected roles={['admin']}><AdminUsers /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </FeedbackProvider>
  );
}
