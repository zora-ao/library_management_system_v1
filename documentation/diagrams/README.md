# Pahina System Diagrams

These diagrams summarize the implementation verified in the repository. Mermaid source files are the editable originals; rendered SVG files, when present, are suitable for insertion into the technical documentation.

## Diagram descriptions

### UML domain model

`uml-domain-model.mmd` presents the eight persisted model classes, their key fields, inheritance from `BaseEntity`, database associations, multiplicities, and important constraints. It keeps `SystemSecurityState` separate because it is an independent singleton rather than a library-domain relationship.

### UML backend services

`uml-backend-services.mmd` shows dependencies among Flask blueprint controllers, service classes/modules, SQLAlchemy entities, and external adapters. It records that user routes access `User` and `Student` directly because `users_service.py` is empty, and that `admin_required()` admits both librarian and administrator roles.

### System architecture

`system-architecture.mmd` describes the logical client/API/database structure. The React application uses React Router, React Query, AuthContext, local storage, and Axios. Flask blueprints call service logic and SQLAlchemy models backed by PostgreSQL. Google Identity Services, Cloudinary, and native PostgreSQL backup utilities are external dependencies. The diagram does not claim an unverified backend or database hosting provider.

### Authentication flow

`authentication-flow.mmd` combines registration, password login, Google sign-in, JWT issuance, role-based navigation, later token validation, and logout. Registration creates a Student account but does not automatically sign the user in. JWT validation also checks account activity, the current database role, and the system authentication epoch. No refresh-token flow exists.

### Borrowing flow

`borrowing-flow.mmd` traces a request from `PENDING_BORROW` through rejection or reservation, physical pickup, and the 14-day `BORROWED` state. Inventory is decremented at approval, not at pickup. An overdue label is normally calculated when a record is serialized or displayed rather than stored by a scheduled task.

### Direct staff-recorded return flow

`direct-return-flow.mmd` documents the current interface: the borrower brings the physical copy to the desk, and a librarian or administrator confirms receipt. The service marks the record `RETURNED`, records the timestamp, and increments availability. It separately identifies the still-supported but UI-disconnected `PENDING_RETURN` path as legacy behavior.

## Verification sources

| Subject | Primary source files |
|---|---|
| Entities and associations | `backend/app/models/*.py`; `backend/migrations/versions/*.py` |
| Authentication | `backend/app/blueprints/auth/routes.py`; `backend/app/services/auth_service.py`; `backend/app/security_state.py`; `frontend/src/features/auth/**`; `frontend/src/context/AuthContext.tsx` |
| Borrowing and returns | `backend/app/blueprints/borrows/routes.py`; `backend/app/services/borrow_service.py`; `frontend/src/hooks/useBorrows.ts`; `frontend/src/pages/adminPage/AdminBorrowsPage.tsx` |
| Roles and route protection | `backend/app/middleware/auth.py`; `frontend/src/App.tsx`; `frontend/src/routes/*.tsx` |
| System structure and external services | `backend/app/__init__.py`; `backend/app/config.py`; `backend/app/utils/cloudinary.py`; `backend/app/services/postgres_tools.py`; `frontend/src/main.tsx`; `frontend/src/services/api.ts` |
| Audit cross-check | `documentation/project-audit.md`; `documentation/feature-inventory.md` |

## Accuracy notes

- UML multiplicities describe database foreign keys and ORM relationships, not assumptions about real-world library policy.
- Role values and borrow statuses are stored as strings; PostgreSQL enum/check constraints do not enforce their complete allowed sets.
- `OVERDUE` is defined as a status constant and accepted by return logic, but ordinary overdue output is computed from a `BORROWED` record and its due date.
- Cloudinary media is outside the database-only backup artifact.
