-- =====================================================================
-- GUTECH LMS Portal — demo seed data (safe to re-run)
-- Creates demo accounts (password for all: Gutech@123) plus courses,
-- enrollments, assignments, submissions and announcements.
-- =====================================================================

-- Clean previous demo data
delete from public.courses where code in ('CS-301', 'CS-205', 'AI-310', 'SE-220', 'MT-201');
delete from auth.users where email in (
  'admin@gutech.edu.pk', 'faculty@gutech.edu.pk', 'faculty2@gutech.edu.pk',
  'student@gutech.edu.pk', 'student2@gutech.edu.pk', 'student3@gutech.edu.pk'
);

-- Demo users (the on_auth_user_created trigger creates their profiles)
with demo(id, email, full_name, role, department, roll_number) as (
  values
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'admin@gutech.edu.pk',    'Portal Administrator', 'faculty', 'Registrar Office',        null),
    ('f0000000-0000-4000-8000-000000000001'::uuid, 'faculty@gutech.edu.pk',  'Dr. Sana Rehman',      'faculty', 'Computer Science',        null),
    ('f0000000-0000-4000-8000-000000000002'::uuid, 'faculty2@gutech.edu.pk', 'Prof. Imran Siddiqui', 'faculty', 'Artificial Intelligence', null),
    ('50000000-0000-4000-8000-000000000001'::uuid, 'student@gutech.edu.pk',  'Ali Raza',             'student', 'Computer Science',        'GU-2024-CS-014'),
    ('50000000-0000-4000-8000-000000000002'::uuid, 'student2@gutech.edu.pk', 'Fatima Noor',          'student', 'Software Engineering',    'GU-2024-SE-007'),
    ('50000000-0000-4000-8000-000000000003'::uuid, 'student3@gutech.edu.pk', 'Usman Tariq',          'student', 'Artificial Intelligence', 'GU-2024-AI-021')
),
ins as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  select
    '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
    extensions.crypt('Gutech@123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', full_name, 'role', role, 'department', department, 'roll_number', roll_number),
    now() - interval '30 days', now(), '', '', '', ''
  from demo
  returning id, email
)
insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), ins.id::text, ins.id,
       jsonb_build_object('sub', ins.id::text, 'email', ins.email, 'email_verified', true),
       'email', now(), now(), now()
from ins;

update public.profiles set role = 'admin' where id = 'a0000000-0000-4000-8000-000000000001';
update public.profiles set phone = '+92 300 1234567', bio = 'Teaches web engineering and databases. Office: CS Block, Room 204.'
 where id = 'f0000000-0000-4000-8000-000000000001';

-- Courses
insert into public.courses (id, code, title, description, credit_hours, semester, faculty_id) values
  ('c0000000-0000-4000-8000-000000000001', 'CS-301', 'Web Technologies',
   'Modern full-stack web development: HTML/CSS, JavaScript, React, Node.js, REST APIs, authentication and cloud deployment.',
   3, 'Fall 2026', 'f0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000002', 'CS-205', 'Database Systems',
   'Relational modelling, SQL, normalization, transactions, indexing and Postgres row level security.',
   3, 'Fall 2026', 'f0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000003', 'AI-310', 'Machine Learning',
   'Supervised and unsupervised learning, model evaluation, neural networks and practical ML with Python.',
   3, 'Fall 2026', 'f0000000-0000-4000-8000-000000000002'),
  ('c0000000-0000-4000-8000-000000000004', 'SE-220', 'Software Engineering',
   'Requirements, agile process, design patterns, testing and teamwork on a semester-long project.',
   3, 'Fall 2026', 'f0000000-0000-4000-8000-000000000002'),
  ('c0000000-0000-4000-8000-000000000005', 'MT-201', 'Linear Algebra',
   'Vectors, matrices, linear transformations, eigenvalues and applications in computing.',
   3, 'Fall 2026', 'f0000000-0000-4000-8000-000000000002');

-- Enrollments
insert into public.enrollments (course_id, student_id) values
  ('c0000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002'),
  ('c0000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000002'),
  ('c0000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000003'),
  ('c0000000-0000-4000-8000-000000000005', '50000000-0000-4000-8000-000000000003'),
  ('c0000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003');

-- Assignments (due dates relative to today so the demo always looks fresh)
insert into public.assignments (id, course_id, title, description, due_date, total_marks) values
  ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Lab 1: Responsive Landing Page',
   E'Build a responsive landing page for a GUTECH society using semantic HTML and CSS Flexbox/Grid.\n\nSubmit a GitHub link and a deployed URL.', now() - interval '12 days', 20),
  ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'Lab 2: React Components & State',
   'Create a React to-do app with components, props, state and local persistence.', now() - interval '3 days', 25),
  ('e0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'Bonus: Full-Stack LMS Portal',
   E'Design, build and deploy a full-stack LMS prototype using React, Node.js and Supabase.\n\nDeliverables: GitHub repo, live Vercel URL and a 3–5 minute walkthrough video.', now() + interval '4 days', 100),
  ('e0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', 'ER Diagram: University Database',
   'Model students, courses, faculty and enrollments as an ER diagram and convert it to a relational schema.', now() - interval '6 days', 30),
  ('e0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000002', 'SQL Joins Worksheet',
   'Solve the 15 join and aggregation queries in the attached worksheet.', now() + interval '2 days', 20),
  ('e0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000003', 'Assignment 1: Linear Regression',
   'Implement linear regression from scratch with NumPy and compare it with scikit-learn.', now() - interval '8 days', 50),
  ('e0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000003', 'Mini Project Proposal',
   'One-page proposal for your ML mini project: dataset, problem statement and evaluation metric.', now() + interval '9 days', 10),
  ('e0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000004', 'SRS Document',
   'Write the Software Requirements Specification for your semester project.', now() + interval '6 days', 40);

-- Submissions (some graded)
insert into public.submissions (assignment_id, student_id, content, link, submitted_at, marks, feedback, graded_at) values
  ('e0000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', 'Landing page for the GUTECH Coding Society.',
   'https://github.com/demo/landing-page', now() - interval '13 days', 18, 'Clean layout and great mobile view. Improve colour contrast on buttons.', now() - interval '10 days'),
  ('e0000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', 'Responsive page using CSS Grid.',
   'https://github.com/demo/fatima-lab1', now() - interval '12 days', 19.5, 'Excellent work!', now() - interval '10 days'),
  ('e0000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003', 'Flexbox-based layout.',
   null, now() - interval '12 days', 15, 'Good effort — add a deployed link next time.', now() - interval '10 days'),
  ('e0000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', 'To-do app with filters and localStorage.',
   'https://github.com/demo/react-todo', now() - interval '4 days', null, null, null),
  ('e0000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000002', 'React to-do app with dark mode.',
   'https://github.com/demo/fatima-todo', now() - interval '3 days 2 hours', null, null, null),
  ('e0000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000001', 'ER diagram attached as a Drive link.',
   'https://drive.google.com/demo-er', now() - interval '7 days', 26, 'Correct cardinalities. Missing weak entity for sections.', now() - interval '5 days'),
  ('e0000000-0000-4000-8000-000000000006', '50000000-0000-4000-8000-000000000001', 'Notebook with gradient descent implementation.',
   'https://github.com/demo/linreg', now() - interval '9 days', 44, 'Well explained plots. Vectorize the loss function.', now() - interval '6 days'),
  ('e0000000-0000-4000-8000-000000000006', '50000000-0000-4000-8000-000000000003', 'Linear regression with normal equation and GD.',
   'https://github.com/demo/usman-linreg', now() - interval '8 days 3 hours', null, null, null);

-- Announcements
insert into public.announcements (course_id, author_id, title, body, created_at) values
  (null, 'a0000000-0000-4000-8000-000000000001', 'Welcome to the Fall 2026 semester',
   E'The GUTECH LMS portal is now live for all students and faculty.\nEnroll in your courses from the Courses page and check deadlines on your dashboard.', now() - interval '20 days'),
  (null, 'a0000000-0000-4000-8000-000000000001', 'Mid-term examinations schedule',
   'Mid-term exams begin next Monday. Seating plans will be posted outside the examination office in the main block.', now() - interval '2 days'),
  ('c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'Bonus assignment released',
   'The full-stack LMS bonus assignment is live. Use AI-assisted tools, deploy on Vercel and record a short walkthrough video.', now() - interval '1 day'),
  ('c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'Lab 1 grades published',
   'Grades and feedback for Lab 1 are now available in your gradebook.', now() - interval '10 days'),
  ('c0000000-0000-4000-8000-000000000003', 'f0000000-0000-4000-8000-000000000002', 'Office hours moved',
   'This week office hours are on Wednesday 2–4 PM in the AI Lab.', now() - interval '3 days');
