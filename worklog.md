# Worklog

---
Task ID: 1
Agent: Super Z (main agent)
Task: Clone ophanim-angel/boti-alterna repo, analyze Boti School reference, and build a full school-management CRM/ERP alternative (EduTrack)

Work Log:
- Cloned https://github.com/ophanim-angel/boti-alterna.git with provided PAT (repo contains RAR snapshots of boti.education)
- Extracted alternatives.rar (477 files) via python rarfile; parsed 3 saved HTML pages of Boti School
- Identified reference modules: Admin & vie scolaire, gestion pédagogique, encaissements, communication, transport, RH, paramétrage
- Initialized fullstack Next.js 16 environment; designed Prisma schema with 15 models (User, Student, Class, Level, Subject, Period, Registration, Payment, Homework, Evaluation, Grade, Announcement, Complaint, ComplaintMessage, Attendance, TimetableSession, GuardianRelation, TeachingAssignment)
- Seeded realistic Moroccan school data: 13 users (1 admin, 6 teachers, 6 parents), 26 students, 11 classes, 156 payments, 13 evaluations, 43 grades, announcements, complaints with discussion threads, attendance, timetable
- Built custom auth (scrypt password hashing + HMAC-signed httpOnly session cookie) in src/lib/auth.ts
- Built 15 API route groups: auth, dashboard (role-aware), students (+detail with progression calc), registrations, payments (+markPaid), homeworks, evaluations (+bulk grade save), announcements, complaints (+threads), attendance, timetable, lookups, settings entities, users
- Built full French SPA UI (only / route): login, role-based sidebar shell, 11 module views (dashboard, students + fiche élève, registrations, payments, homeworks, grades/saisie, attendance, timetable, announcements, complaints, settings)
- Fixed 2 runtime issues found in browser verification: Prisma orderBy createdAt->enrolledAt, module-scope `void lookups` ReferenceError
- Browser-verified all 3 roles end-to-end with agent-browser: admin (stats, mark-paid with receipt generation, grade entry/save, complaint replies), teacher (homework publishing), parent (scoped children/payments, complaint creation), mobile nav, sticky footer
- Restored boti-alterna repo folder and excluded it from ESLint; final lint clean

Stage Summary:
- Deliverable: runnable Next.js school management platform ("EduTrack — École Al Manar") at /home/z/my-project
- Reference repo preserved at /home/z/my-project/boti-alterna
- Demo accounts (password demo1234): direction@almanar.ma (ADMIN), s.benali@almanar.ma (TEACHER), f.bahatem@gmail.com (PARENT)
- Seed script: scripts/seed.ts (bun scripts/seed.ts)
- All modules from user requirements covered: scholarship progression, homeworks, info & notes, registrations & monthly subscriptions, complaints & discussions with teachers/administration

---
Task ID: 2
Agent: Super Z (main agent)
Task: Improve the EduTrack app, regenerate rich test data, and push all modifications to GitHub (ophanim-angel/boti-alterna)

Work Log:
- Found seed.ts corrupted (classesw.klass].id syntax errors) -> rewrote scripts/seed.ts completely and re-ran
- New demo dataset: 19 users (1 admin, 6 teachers, 12 parents), 70 students across 11 classes, 70 registrations, 490 payments (Sep 2025 -> Mar 2026 incl. upcoming March), 20 homeworks, 28 evaluations, 186 grades, 9 announcements (incl. class-scoped), 6 complaint threads (16 messages, all statuses), 136 attendances (Nov-Feb), 220 timetable slots (all classes)
- New features: /api/search (role-scoped global student search), /api/notifications (role-aware bell feed, 60s polling), /api/auth/password (change password), account-view.tsx (Mon compte), CSV export buttons (students + payments, BOM/fr-locale), printable payment receipts (branded print window)
- Fixes: dashboard expected revenue was hardcoded (26*650*6) -> dynamic; removed invalid homeworks:undefined include; attendance route typed array; settings level _count; verified tsc + eslint clean
- Browser-verified (agent-browser): admin login, global search dropdown -> student fiche, notifications dropdown (11 items), payments view (Export CSV + Reçu buttons), account view, parent scoping (search only own children), teacher dashboard
- Git: untracked .env, db/custom.db, boti-alterna gitlink; .gitignore additions; 2 commits (feat + merge --allow-unrelated-histories with origin/main); reference alternatives.rar moved to reference/; pushed ophanim-angel/boti-alterna main 1cb2e85..ef49897
- Commits authored as ophanim-angel <ophanim-angel@users.noreply.github.com>

Stage Summary:
- GitHub repo up to date: https://github.com/ophanim-angel/boti-alterna (main = ef49897)
- App running at :3000, demo accounts unchanged (password demo1234): direction@almanar.ma / s.benali@almanar.ma / f.bahatem@gmail.com
- Seed: bun scripts/seed.ts (regenerates all demo data)

---
Task ID: 3
Agent: Super Z (main agent)
Task: Confirm prototype test data + implement detailed CRM/ERP management (add/remove students & parents, class/level assignment) per researched standards, then push to GitHub

Work Log:
- Re-seeded the empty database (bun scripts/seed.ts) — confirmed prototype shows demo data (was 0 rows after environment reset)
- Researched school ERP standards (Gibbon, RosarioSIS, Fedena patterns): student lifecycle, guardian many-to-many with relation+primary flags, bulk class assignment, capacity control, audit trail, archive-over-delete principle
- Prisma: Student += exitDate/exitReason (lifecycle); new StudentEvent audit model (CREATED/UPDATED/CLASS_TRANSFER/STATUS_CHANGE/GUARDIAN_ADDED/GUARDIAN_REMOVED/BULK_ASSIGN with actor) + db push + generate
- New APIs: /api/users/[id] GET/PATCH/DELETE (edit account, reset password, activate/deactivate, synchronize children links, guarded deletion rules), /api/students/[id]/guardians POST/DELETE (link/unlink parent with relation PERE|MERE|TUTEUR + isPrimary), /api/students/bulk PATCH (bulk class assignment with server-side capacity enforcement + bulk status change), PATCH /api/settings/[entity] (edit classes/levels/subjects/periods)
- Upgraded /api/students + /api/students/[id]: classId=none filter (unassigned), audit events on create/update/transfer/status change, exit stamping, protected DELETE with French guidance error
- UI: new student-fiche.tsx (Modifier dialog incl. class transfer + status + exit reason, Retirer des effectifs workflow, Réactiver, Supprimer with double warning, Famille tab with Associer/retirer tuteur, Historique audit timeline tab)
- Rewrote students-view.tsx: bulk selection checkboxes + bulk bar (Affecter à une classe / Changer le statut), "Non affectés" filter, LEFT/GRADUATED status filters, fiche delegation to new component
- Upgraded settings-view.tsx: UsersTab with Modifier dialog (name/phone/active switch/password reset/children multi-select with per-child relation), delete with confirm; Classes tab with edit dialog (rename/level/teacher/room/capacity), capacity badge X/cap with full=red; Niveaux editable
- New help-view.tsx "Guide d'utilisation" (nav item for all roles): 8 step-by-step admin procedures (add student, assign/transfer incl. bulk, withdraw vs delete, create parent + link children, edit/deactivate/delete accounts, classes/levels, traceability, demo accounts) + role-specific parent/teacher guides
- Fixed: users GET missing student.id (broke children linking + would wipe links on save), guardians route TS inference, stale Prisma client after schema change (dev server restart required)
- Seed enriched: 74 students (2 LEFT with reasons, 1 GRADUATED, 1 unassigned "Nada Harrak"), StudentEvent demo trail (CREATED + transfers + status changes)
- Browser-verified end-to-end (agent-browser): admin login, bulk select 2 students -> assign CP-A (server enforced), fiche Historique shows transfer + status events, edit dialog class transfer, guardian add (Fatima->Elene) + remove via × with confirm, parent edit dialog children list correct + add child Omar Alaoui saved to DB, Guide view renders, "Non affectés" filter shows exactly 1, delete throwaway student (M-1075) UI->DB gone
- Final: tsc clean, eslint clean, 0 API errors; test mutations reverted, temp scripts removed

Stage Summary:
- Full CRM/ERP management confirmed: add/remove/transfer students & parents, class+level assignment (single, bulk, at creation), capacity control, audit trail, in-app user guide
- App running at :3000 with rich test data (74 students / 19 users / 518 payments / audit events)
- Demo accounts unchanged (demo1234): direction@almanar.ma (ADMIN), s.benali@almanar.ma (TEACHER), f.bahatem@gmail.com (PARENT)
- Seed: bun scripts/seed.ts

---
Task ID: 4
Agent: Super Z (main agent)
Task: Diagnose and fix the user's "Non autorisé" error after logging in with the admin account

Work Log:
- Diagnosed via dev.log timeline: POST /api/auth/login returned 200 (4x user logins) but immediately-after requests (/api/dashboard, /api/students, POST /api/students) arrived with NO valid session cookie -> 401 "Non autorisé"; alternating 200/401 on /api/notifications = one tab with valid cookie + one without
- Root cause: app displayed in cross-site iframe (platform preview) -> browsers block third-party cookies -> Set-Cookie never stored -> zombie session (UI logged-in, all APIs 401)
- Also confirmed GitHub state: token valid (GET /user = ophanim-angel), repo now PUBLIC, token permissions admin/maintain/push, push up to date
- Fix: cookieless auth fallback — auth.ts getSessionUserFromRequest() (Authorization: Bearer first, cookie fallback); requireAuth(req, roles?) updated across all 23 API routes / 47 call sites via scripts/fix_auth_callsites.py; /api/auth/login returns signed token; /api/auth/me accepts Bearer
- Frontend: utils.ts token in sessionStorage + api() sends Authorization header + dispatches UNAUTHORIZED_EVENT on 401; login-view stores token; school-app auto-logout to login screen on 401 event (no more zombie sessions), clears token on logout
- Verified: tsc 0 src errors, eslint clean; curl: Bearer-only -> 200 on all protected endpoints, no-auth -> 401, cookie-only -> 200; browser-tested via Caddy :81: login -> cookies cleared -> Base d'élèves loads -> session survives reload with zero cookies -> screenshot download/edutrack-bearer-test.png
- Committed 60179b9 and pushed to origin/main (85a7abe..60179b9)

Stage Summary:
- Login now works everywhere (iframe preview, direct tab, mobile): token via sessionStorage + Authorization header, cookie kept as fallback
- 401s auto-kick to login screen with no stale UI state
- Demo accounts unchanged (demo1234): direction@almanar.ma / s.benali@almanar.ma / f.bahatem@gmail.com
