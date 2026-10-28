# Master Prompt — GUTECH LMS Portal

> This is the single "master prompt" used to drive AI-assisted development (vibe coding with Claude Code) of this project. Everything in the repository was generated, tested and deployed from this prompt plus short follow-up iterations.

---

**Role:** You are a senior full-stack engineer. Build and deploy a production-ready prototype of the **GUTECH LMS Portal**, the Student/Faculty portal for **GUTECH (Korangi, Karachi)**. Work autonomously, end to end, without asking questions.

**Tech stack (mandatory):**
- Frontend: **React** (Vite, React Router), responsive custom CSS (mobile-first), no heavy UI kit.
- Backend: **Node.js** (Express) REST API, deployed as Vercel serverless functions under `/api`.
- Database & Auth: **Supabase** (Postgres + Supabase Auth, Row Level Security on every table).
- Deployment: **Vercel** (single project serving the static React build plus the Node API).

**Roles:** `student`, `faculty`, `admin`. The role is stored in `profiles.role`. Sign-up lets a user pick student or faculty. Admin is seeded only.

**Database schema (public):**
- `profiles` (id → auth.users, full_name, role, department, roll_number, phone, bio, created_at). Created automatically by a trigger on `auth.users` insert.
- `courses` (id, code unique, title, description, credit_hours, semester, faculty_id → profiles, created_at)
- `enrollments` (id, course_id, student_id, enrolled_at, unique(course_id, student_id))
- `assignments` (id, course_id, title, description, due_date, total_marks, created_at)
- `submissions` (id, assignment_id, student_id, content, link, submitted_at, marks, feedback, graded_at, unique(assignment_id, student_id))
- `announcements` (id, course_id nullable = campus-wide, author_id, title, body, created_at)
- Helper SQL functions `is_admin()`, `is_faculty()`, `teaches(course_id)`, `enrolled_in(course_id)` (security definer) used by RLS policies.

**Features (all must work end to end with real CRUD against Supabase):**
1. Auth: sign up (name, email, password, role, department, roll number), log in, log out, protected routes, session persistence.
2. Role-aware dashboard: stats cards (courses, pending assignments, average grade / submissions to grade), upcoming deadlines, latest announcements.
3. Courses: faculty create / edit / delete their courses; students browse the catalog, enroll and drop; course detail page with tabs (Overview, Assignments, Announcements, People).
4. Assignments: faculty create / edit / delete per course; students submit (text + link) and update before grading.
5. Grading: faculty see all submissions for an assignment, give marks + feedback; students see a Grades page with per-course results and percentage.
6. Announcements: faculty post per course, admin posts campus-wide; everyone sees relevant ones.
7. Profile: view and edit own profile.
8. Admin: user directory with role management, overview of all courses.

**API design:** The Express API accepts the user's Supabase access token (`Authorization: Bearer`) and creates a per-request Supabase client with that token, so **RLS enforces authorization at the database layer** as well as role checks in the API. Validation and consistent JSON errors (`{ error }`). Health check at `/api/health`.

**UX:** GUTECH branding (deep navy + gold), sidebar layout collapsing to a mobile drawer, loading states, empty states, toast notifications, confirm dialogs for destructive actions, no unhandled errors.

**Deliverables:** clean folder structure, `supabase/schema.sql`, `supabase/seed` script with demo accounts and data, `.env.example`, a README (overview, architecture, schema, .env guide, local run, deployment), and a 3–5 minute walkthrough video script. Create a public GitHub repo, deploy to Vercel, connect to a live Supabase project, verify every flow on the live URL, and report the links.
