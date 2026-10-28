# Walkthrough video script (≈4 minutes)

Record the screen with Loom or OBS. Keep the live site open in one tab, and the GitHub repo and `MASTER_PROMPT.md` in another.

---

**0:00 – 0:20 · Intro**
> "Assalam-o-Alaikum, this is the GUTECH LMS Portal, a full-stack Student and Faculty portal I built for our Web Technologies lab. It uses React on the frontend, a Node.js Express API, Supabase for the database and authentication, and it's deployed live on Vercel."

**0:20 – 0:50 · Sign up and log in**
- Open the live URL. Point out the login page and the demo buttons.
- Click **Create an account**, choose "I am a Student", fill in the form and create the account. You land on the dashboard right away, which shows Supabase Auth is working.
- Log out, then click the **Student** demo button and sign in as Ali Raza.

**0:50 – 1:50 · Student flow**
- **Dashboard:** stat cards (enrolled courses, pending, average score), upcoming deadlines, announcements.
- **Courses → Course catalog:** search "Software", **Enroll** in SE-220 (toast appears), then **Drop** it again (confirm dialog).
- Open **CS-301 Web Technologies** and show the tabs: Assignments, Announcements, People.
- Open **Bonus: Full-Stack LMS Portal**, write an answer, paste a GitHub link and click **Submit**. Then show **Edit submission**.
- **Grades:** per-course percentage, letter grade and faculty feedback.

**1:50 – 2:50 · Faculty flow**
- Log out and sign in as **Faculty** (Dr. Sana Rehman).
- Dashboard shows courses, students and items waiting to grade.
- **Courses → New course:** create "CS-410 Cloud Computing", then edit it.
- Inside CS-301, add an **Assignment** and post an **Announcement**.
- Open **Lab 2** and click **Grade** on Ali's submission. Enter marks and feedback and save. Mention the database won't accept marks above the total.

**2:50 – 3:20 · Admin flow**
- Sign in as **Admin**. Open **Users**, filter by role and promote a student to faculty (confirm dialog).
- Post a **campus-wide announcement**.
- Shrink the browser to phone width to show the responsive drawer and the card-style tables.

**3:20 – 4:10 · Architecture and AI workflow**
- Show the GitHub repo structure: `src/` (React), `server/` (Express routes), `api/index.js` (Vercel function), `supabase/schema.sql`.
- Show `schema.sql`: tables, triggers and **Row Level Security** policies. The API forwards the user's JWT, so Postgres itself enforces permissions.
- Open `MASTER_PROMPT.md`:
  > "I used Claude Code for AI-assisted development. I wrote one master prompt describing the stack, roles, schema and features. The AI generated the schema first, then the API and React pages. It ran production builds, deployed to Vercel and tested every flow on the live site. Then I iterated with short follow-up prompts."

**4:10 – 4:20 · Outro**
> "That's the GUTECH LMS Portal: live on Vercel, connected to Supabase with working auth and CRUD. Links to the repo and live site are in the description. Thank you!"
