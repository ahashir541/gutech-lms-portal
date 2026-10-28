# GUTECH LMS Portal

A full-stack **Student / Faculty Learning Management System** prototype for **GUTECH (Korangi, Karachi)**, built with AI-assisted development ("vibe coding" with Claude Code).

| | |
|---|---|
| **Live app** | _LIVE_URL_ |
| **Stack** | React 18 (Vite) · Node.js (Express) · Supabase (Postgres + Auth + RLS) · Vercel |
| **Demo password** | `Gutech@123` for every demo account below |

| Role | Email |
|---|---|
| Student | `student@gutech.edu.pk` (also `student2@…`, `student3@…`) |
| Faculty | `faculty@gutech.edu.pk` (also `faculty2@…`) |
| Admin | `admin@gutech.edu.pk` |

The login page has one-click buttons that fill in these accounts.

---

## Features

| Area | Student | Faculty | Admin |
|---|---|---|---|
| **Auth** | Sign up, log in and log out, with a persistent session | same | same |
| **Dashboard** | Enrolled courses, pending work, average score, deadlines | Courses, students, items to grade | Campus-wide overview |
| **Courses** | Browse the catalog, search, enroll and drop | Create, edit and delete own courses | Manage all courses |
| **Assignments** | Submit an answer or link, edit or withdraw before grading | Create, edit and delete; view submissions | All |
| **Grading** | Gradebook with percentage, letter grade and feedback | Grade or regrade with marks and feedback | All |
| **Announcements** | Read campus and course notices | Post and delete course notices | Post campus-wide notices |
| **Profile** | Edit name, department, roll number, phone, bio | same | same |
| **Users** | – | – | User directory, change roles |

UX details: responsive sidebar that becomes a mobile drawer, tables that turn into cards on phones, loading and empty states, toast notifications, confirm dialogs before destructive actions, and friendly error messages.

---

## Architecture

```
Browser (React SPA)
   │  supabase-js → Supabase Auth (sign up / sign in, JWT session)
   │  fetch /api/*  with  Authorization: Bearer <access_token>
   ▼
Node.js API (Express) — Vercel Serverless Function  (api/index.js → server/app.js)
   │  verifies the JWT, loads the profile, checks the role,
   │  then queries Supabase *as that user* (per-request client)
   ▼
Supabase Postgres — Row Level Security on every table
```

Authorization is enforced at **two layers**: role checks in the Express routes, and **Postgres RLS policies**. Because the API forwards the user's JWT and never uses the service-role key, the database will reject anything a user is not allowed to do, even if the API has a bug.

### Project structure

```
├── api/index.js              # Vercel serverless entry (exports the Express app)
├── server/
│   ├── app.js                # Express app, routing, error handler
│   ├── index.js              # Local dev server (port 3001)
│   ├── middleware.js         # Auth (JWT → user + profile), role guard, validation
│   ├── supabase.js           # Per-request Supabase client
│   └── routes/               # profile, dashboard, courses, assignments, submissions, announcements
├── src/
│   ├── App.jsx               # Routes + protected routes
│   ├── lib/                  # supabase client, api wrapper, auth context, formatters
│   ├── components/           # Layout, icons, modals/toasts, shared forms
│   └── pages/                # Dashboard, Courses, CourseDetail, Assignments, AssignmentDetail,
│                             # Grades, Announcements, Profile, AdminUsers, Login, Signup
├── supabase/
│   ├── schema.sql            # Tables, helper functions, triggers, RLS policies
│   └── seed.sql              # Demo users + courses, assignments, submissions, announcements
├── docs/VIDEO_SCRIPT.md      # 3–5 min walkthrough script
├── MASTER_PROMPT.md          # The master prompt used to generate the project
└── vercel.json               # Build + rewrites (/api/* → function, SPA fallback)
```

### Database schema

```
auth.users 1─1 profiles (role: student | faculty | admin)
profiles   1─* courses        (faculty_id)
courses    *─* profiles        via enrollments (course_id, student_id)  unique pair
courses    1─* assignments
assignments 1─* submissions   (assignment_id, student_id) unique pair · marks · feedback
courses    1─* announcements  (course_id NULL = campus-wide)
```

Database logic:
- `handle_new_user` trigger creates a profile row on sign-up. Only *student* or *faculty* can be self-selected.
- `protect_profile_role` trigger: only admins can change roles.
- `protect_submission` trigger: students can't set their own marks, graders can't alter a student's answer, and graded work is locked.
- `check_submission_marks` trigger: marks can't exceed the assignment total.
- Security-definer helpers (`is_admin`, `is_faculty`, `teaches`, `enrolled_in`) keep RLS policies short and free of recursion.

### REST API

| Method | Endpoint | Who |
|---|---|---|
| GET | `/api/health` | public |
| GET/PUT | `/api/me` | any user |
| GET | `/api/dashboard` | any user |
| GET/POST | `/api/courses` | list: any user · create: faculty/admin |
| GET/PUT/DELETE | `/api/courses/:id` | owner/admin for writes |
| POST/DELETE | `/api/courses/:id/enroll` | student |
| POST | `/api/courses/:id/assignments` | course faculty/admin |
| GET | `/api/assignments` · `/api/assignments/:id` | any user (RLS-filtered) |
| PUT/DELETE | `/api/assignments/:id` | course faculty/admin |
| POST | `/api/assignments/:id/submit` | enrolled student |
| PUT | `/api/submissions/:id/grade` | course faculty/admin |
| DELETE | `/api/submissions/:id` | student (ungraded only) |
| GET | `/api/submissions/grades` | student |
| GET/POST/DELETE | `/api/announcements` | read: any user · write: faculty/admin |
| GET | `/api/users` · PUT `/api/users/:id/role` | admin |

---

## Local setup

**Prerequisites:** Node.js 20+ and a free [Supabase](https://supabase.com) project.

### 1. Clone and install

```bash
git clone https://github.com/ahashir541/gutech-lms-portal.git
cd gutech-lms-portal
npm install
```

### 2. Create the database

In the Supabase dashboard, open **SQL Editor** and run `supabase/schema.sql`, then `supabase/seed.sql` for the demo data. With the Supabase CLI you can run instead:

```bash
supabase link --project-ref <your-ref>
supabase db query --linked -f supabase/schema.sql
supabase db query --linked -f supabase/seed.sql
```

For instant sign-ups in a demo, turn off **Authentication → Providers → Email → Confirm email**.

### 3. Environment variables (`.env` guide)

Copy the template and fill it in from **Project Settings → API**:

```bash
cp .env.example .env
```

| Variable | Used by | Value |
|---|---|---|
| `VITE_SUPABASE_URL` | React app | Project URL, e.g. `https://abcd.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | React app | `anon` public key (safe in the browser because RLS protects data) |
| `SUPABASE_URL` | Node API | Same project URL |
| `SUPABASE_ANON_KEY` | Node API | Same `anon` key (the API acts as the signed-in user) |
| `PORT` | Node API (local) | Optional, default `3001` |

The service-role key is **not** needed anywhere. Never commit `.env`.

### 4. Run

```bash
npm run dev
```

This starts the API on <http://localhost:3001> and the React app on <http://localhost:5173>. Vite proxies `/api` to the API.

Other scripts: `npm run build` (production build to `dist/`) and `npm run preview`.

---

## Deployment (Vercel)

1. Push the repo to GitHub and import it in Vercel, or run `vercel --prod` from the CLI.
2. Add the four environment variables above in **Project → Settings → Environment Variables**.
3. Vercel reads `vercel.json`. It builds the Vite app to `dist/`, deploys `api/index.js` as a Node.js serverless function, and rewrites `/api/*` to the function and every other path to `index.html`.
4. In Supabase, go to **Authentication → URL Configuration** and set the Site URL to your Vercel domain.

---

## AI-assisted workflow

The project was generated end to end with **Claude Code** from a single master prompt ([`MASTER_PROMPT.md`](MASTER_PROMPT.md)):

1. **Prompt → plan:** the master prompt fixes the stack, roles, schema, features and deliverables up front, which keeps the AI focused.
2. **Schema first:** the AI wrote `schema.sql` with RLS and triggers before any UI, so every later feature had a secure data layer underneath.
3. **API + UI generation:** Express routes and React pages were generated feature by feature, then checked with production builds.
4. **Verify and iterate:** each flow (sign-up, enroll, submit, grade, announce, change role) was tested against the live Supabase instance and on the deployed Vercel URL, and fixes were prompted back in short iterations.
5. **Docs:** this README and the video script were generated from the same context.
