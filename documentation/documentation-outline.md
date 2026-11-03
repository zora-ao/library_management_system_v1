# Proposed Academic Documentation Outline

This outline follows the requested sections but keeps proposed objectives separate from demonstrated outcomes. It is an outline, not the final paper.

## Front matter

### Title Page

- **Proposed title:** *Pahina: A Web-Based Library Management System*
- Group members: **team confirmation required**
- Course, section, instructor/adviser, department, institution, and submission date: **team confirmation required**
- Use the official institution format before submission.

## 1. Introduction

### 1.1 Project background

- Describe the operational need the group intended to address: catalog discovery, circulation tracking, and role-specific library work.
- Introduce Pahina as a browser-based client/server system.
- State only repository-supported capabilities.
- Do not claim that the existing process is slow, inaccurate, or disliked unless the group supplies observations, records, interviews, or citations.

### 1.2 System context

- Intended actors: Student, Librarian, Administrator.
- Frontend/API/database arrangement.
- External dependencies: Google Identity Services, Cloudinary, and PostgreSQL utilities.

### 1.3 Significance

- Phrase benefits as intended contributions: centralizing records, exposing book availability, supporting controlled circulation workflows, and providing administrative tools.
- Avoid measured benefit claims unless evidence is added.

## 2. Statement of the Problem

Use research questions or system problems that can be answered by the implemented scope. Suggested structure:

1. How can students inspect the catalog, request available books, and track active and historical borrow records in one system?
2. How can library staff process borrow requests, confirm pickup and return, and maintain collection records?
3. How can administrators manage accounts and database recovery operations through role-restricted functions?
4. How can the project represent library entities and circulation states consistently in PostgreSQL?

**Team evidence needed:** Explain the actual setting that motivated these questions. Do not invent a manual process, interviews, or incident history.

## 3. Objectives

### 3.1 General objective

**Proposed objective:** To design and implement a web-based library management system that supports catalog access, book circulation, collection maintenance, and role-based administration for students and library staff.

This is an intended objective, not a claim that usability, security, or operational effectiveness has been proven.

### 3.2 Specific objectives

1. Implement password and Google sign-in with role-aware access.
2. Provide catalog search, book information, availability, favorites, reviews, and borrow requests.
3. Support the request → approval/rejection → pickup → loan → return workflow.
4. Provide staff tools for books, categories, circulation, and user accounts.
5. Persist library data and relationships in PostgreSQL through SQLAlchemy and Alembic migrations.
6. Provide administrator-controlled encrypted database export and restore.
7. Verify selected components and workflows through automated frontend and backend tests.

## 4. Scope and Limitations

### 4.1 Scope

- Web browser interface and Flask JSON API.
- Student, Librarian, and Administrator roles.
- Catalog, book details, favorites, reviews, circulation, user/profile settings, staff dashboard, collection management, user administration, and database backup/restore.
- PostgreSQL data storage; Cloudinary for uploaded images.
- JWT and Google sign-in.

### 4.2 Limitations verified from the repository

- No refresh-token workflow.
- No email/SMS/push notification service; notifications are browser-derived.
- No fines, reservations queue, barcode/RFID integration, acquisition, inventory scanning, reports export, or inter-library loan.
- Uploaded Cloudinary files are outside database backups.
- Backup/restore requires compatible `pg_dump` and `pg_restore` tools.
- No measured performance, usability, accessibility, reliability, or security evaluation.
- No browser-level end-to-end test suite.
- Destructive PostgreSQL restore integration test was not run in this audit.
- Current role mismatches and partial features must be disclosed or corrected before the final paper.

## 5. System Features

Organize by role and include a traceability table.

### 5.1 Shared authenticated features

- Catalog and book details
- Favorites and reviews
- Borrow request and personal history
- Profile/password/theme settings
- Borrow-derived notifications

### 5.2 Student workflow

- Register/sign in
- Find a book
- Submit a request
- Monitor approval and pickup state
- View due date and history
- Bring a book to the desk for staff-recorded return

### 5.3 Librarian workflow

- Review/reject requests
- Reserve copies and confirm pickup
- Monitor active/overdue loans and record returns
- Maintain books
- View/manage non-administrator account states and roles within backend rules

### 5.4 Administrator workflow

- All staff workflows
- Administrator role management
- Category mutations
- Encrypted database backup and restore

Use `feature-inventory.md` to avoid overstating role access.

## 6. System Architecture and Technologies

Recommended subsections:

1. Client/server architecture
2. Frontend feature organization and React Query data flow
3. Flask blueprint/service/model organization
4. PostgreSQL persistence and Alembic migrations
5. Authentication and role checks
6. External services and deployment configuration

Add a deployment diagram only after the group confirms hosting for the API and PostgreSQL database. Vercel configuration proves frontend intent, not the complete deployed environment.

## 7. UML Class Diagram

### 7.1 Entity classes

Include User, Student, Book, Category, Borrow, Favorite, Review, and SystemSecurityState. Use exact fields and multiplicities from `project-audit.md`.

### 7.2 Service dependencies

Optionally add a second diagram for AuthService, BookService, BorrowService, CategoryService, BackupService, and route blueprints. Do not mix service dependencies with database cardinalities.

### 7.3 Diagram review checklist

- Show UUID primary keys, except the singleton security-state ID.
- Show nullable Book→Category.
- Show Favorite's unique User+Book association.
- Do not add a one-review-per-user constraint that the database does not have.
- Note that overdue is calculated rather than reliably persisted.

## 8. Flowchart

At minimum, provide the circulation flow:

```text
Sign in
  → Search/select book
  → Check availability
  → Submit borrow request
  → Staff review
      ├─ Reject + reason → Rejected history
      └─ Approve → Reserve copy → Ready for pickup
           → Staff confirms pickup
           → 14-day active loan
           → Student brings book to desk
           → Staff records return
           → Copy becomes available + history updated
```

Recommended additional flowcharts:

- Password/Google authentication and role routing.
- Book create/edit/archive/restore.
- Administrator backup export → inspection → restore.

## 9. Screenshots of the Application

Capture screenshots from a seeded, non-sensitive test database. Recommended set:

| Screenshot | Role/data precondition | What it demonstrates |
|---|---|---|
| Login and registration | Logged out | Authentication options and validation |
| Catalog | Authenticated account; several categories/books | Search, genre, availability, ratings |
| Book details | Book with cover/reviews | Metadata, favorite, review, borrow action |
| My Borrows | Student with pending, ready, active, returned, and rejected examples | Circulation states and history |
| Staff dashboard | Librarian or administrator; populated circulation data | Metrics, attention list, chart |
| Borrow Requests — Pending/For Pickup/Rejected | Staff; sample records | Approval, rejection, and pickup workflow |
| Loans & Returns | Staff; active, overdue, returned examples | Direct physical return workflow |
| Books List — Active/Archived | Staff | Collection maintenance and archive/restore |
| Categories | Administrator | Category management |
| Users | Administrator | Role and active-state management |
| Data Backups | Administrator with working PostgreSQL tools | Export/restore controls and capability state |
| Settings | Any role | Display name, avatar, theme, password |

Remove or replace informal developer-role text before capturing the About page.

## 10. Testing Results

### 10.1 Test environment

Record operating system, browser, Node version, Python version, PostgreSQL version, and date at final execution.

### 10.2 Current reproduced automated results

| Suite | Command | Result reproduced November 3, 2026 |
|---|---|---|
| Frontend | `npm.cmd test -- --maxWorkers=2` in `frontend` | 32 files, 146 tests passed |
| Backend | `.\.venv\Scripts\python.exe -m unittest discover -s tests -v` in `backend` | 98 passed, 1 destructive integration test skipped |
| Migration topology | `.\.venv\Scripts\python.exe -m flask --app run.py db heads` | One head: `f6d7e8a9b0c1` |

### 10.3 Required qualification

- These results demonstrate that the tested cases pass in the audit environment.
- They do not establish complete correctness, production reliability, security, usability, or performance.
- Do not calculate a success percentage by treating the skipped integration test as passed.

### 10.4 Additional evidence recommended

- Disposable PostgreSQL backup/restore test.
- Manual role-by-role acceptance test with signed checklist.
- Browser/device compatibility matrix.
- Accessibility evaluation.
- Load/performance measurements with method, hardware, data size, and raw results.
- Security review with defined scope and authorization.

## 11. Conclusion

The conclusion should summarize what was implemented and what the reproduced tests demonstrate. It should separately state unresolved limitations. Avoid statements such as “the system is secure,” “highly reliable,” or “improved efficiency” unless the paper adds evidence for those claims.

## 12. References (APA 7th edition)

Use primary official documentation for technology descriptions. The following source candidates were verified as real official documentation on November 3, 2026; the group should check capitalization, dates, and institutional retrieval-date rules before final submission.

- Alembic. (n.d.). *Alembic documentation*. https://alembic.sqlalchemy.org/en/latest/
- Cloudinary. (n.d.). *Programmatically uploading images, videos, and other files*. https://cloudinary.com/documentation/upload_images
- Flask-JWT-Extended. (n.d.). *Flask-JWT-Extended documentation*. https://flask-jwt-extended.readthedocs.io/en/stable/
- Google. (n.d.). *Set up Sign in with Google*. Google for Developers. https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
- Pallets. (n.d.). *Flask documentation (3.1.x)*. https://flask.palletsprojects.com/en/stable/
- PostgreSQL Global Development Group. (n.d.). *PostgreSQL documentation*. https://www.postgresql.org/docs/
- React. (n.d.). *React documentation*. https://react.dev/
- SQLAlchemy. (n.d.). *SQLAlchemy documentation*. https://docs.sqlalchemy.org/
- Tailwind Labs. (n.d.). *Tailwind CSS documentation*. https://tailwindcss.com/docs/
- TanStack. (n.d.). *TanStack Query documentation*. https://tanstack.com/query/latest/docs/framework/react/
- Vite. (n.d.). *Vite guide*. https://vite.dev/guide/

Do not cite package listing pages when an official manual directly supports the statement. Add sources for research context only after the group selects real literature relevant to library systems, information management, or the chosen development method.
