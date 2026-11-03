# Missing Evidence and Team Questions

This file separates repository facts from evidence the group must supply before drafting the final paper.

## 1. Title-page and project identity

- [ ] Official project title and capitalization.
- [ ] Full names of all group members in the required order.
- [ ] Course code/title, section, instructor or adviser, department, institution, campus, and submission date.
- [ ] Required title-page template or formatting guide.
- [ ] Approved academic description of each member's contribution. The current About page contains informal placeholder roles that should not be used in the paper.

## 2. Problem context

- [ ] What real library or classroom setting motivated the project?
- [ ] What process was used before Pahina, if any?
- [ ] Which problems were actually observed, by whom, and when?
- [ ] Are there records, forms, screenshots, interviews, or observations that support the problem statement?
- [ ] Was this built for a specific institution or as a general academic prototype?

Without this evidence, write the problem as a design objective, not as a measured institutional problem.

## 3. Role and policy decisions

- [ ] Should librarians be able to create, rename, and delete categories, or should the frontend hide those controls?
- [ ] Should librarians and administrators be allowed to borrow, favorite, and review books?
- [ ] Should the raw catalog API be public when the catalog page requires authentication?
- [ ] Can librarians activate/deactivate accounts and promote students to librarians?
- [ ] Should one user be limited to one review per book?
- [ ] Should Student profile fields be editable in Settings?
- [ ] Should email and phone updates be available to users or only administrators?
- [ ] Should the legacy return-request endpoint/hook be removed, or is a return-request interface planned?

## 4. Workflow confirmation

- [ ] Confirm the official return policy: student brings the book to the desk and staff records the return directly.
- [ ] Confirm whether approved books can remain ready for pickup indefinitely; no expiry/cancellation workflow was found.
- [ ] Confirm overdue policy, reminder policy, and whether fines are out of scope.
- [ ] Confirm whether rejected requests should retain their reason indefinitely.
- [ ] Confirm whether archived books and their old circulation/review records must remain reportable.
- [ ] Confirm category deletion behavior when only archived books use the category.

## 5. Deployment and configuration evidence

- [ ] Actual frontend hosting provider and deployed URL.
- [ ] Actual API hosting provider and process manager.
- [ ] Actual PostgreSQL provider/version and whether SSL is required.
- [ ] Cloudinary account/environment used for covers and avatars.
- [ ] Configured CORS origins for the final deployment.
- [ ] Reverse-proxy upload limit and timeout for backup restore.
- [ ] Secret-management process; do not include secret values in the paper.
- [ ] Add a frontend `.env.example` documenting `VITE_API_BASE_URL` and `VITE_GOOGLE_CLIENT_ID`.
- [ ] Confirm whether `GOOGLE_CLIENT_SECRET` is needed; inspected code does not use it.

## 6. Screenshots still required

No repository folder containing final application screenshots was found. `frontend/public/Design System - Library.png` is a design reference, not evidence of the running application.

Capture at minimum:

- [ ] Login page.
- [ ] Registration page with validation example.
- [ ] Catalog with realistic seeded books/categories.
- [ ] Book detail with favorite, reviews, and availability.
- [ ] Student active borrows and history.
- [ ] Staff dashboard with non-empty chart and attention list.
- [ ] Pending request details and approval/rejection controls.
- [ ] For Pickup confirmation.
- [ ] Rejected request tab.
- [ ] Active loans, overdue filter, direct return confirmation, and return history.
- [ ] Active and archived book management.
- [ ] Administrator category management.
- [ ] User directory and role/status dialog.
- [ ] Working backup page showing available capabilities.
- [ ] Settings/profile page.

Screenshot rules:

- Use fictional/test names, emails, student numbers, and books unless permission exists.
- Do not expose JWTs, database URLs, Google IDs, Cloudinary credentials, backup tokens, passphrases, or `.env` values.
- Keep a consistent browser size and theme.
- Record the role and data setup for each screenshot.
- Crop only after preserving enough context to identify the feature.

## 7. Test evidence still required

### Reproduced in this audit

- Frontend: 32 files and 146 tests passed.
- Backend: 98 tests passed; 1 destructive integration test skipped.
- Migration graph: one Alembic head, `f6d7e8a9b0c1`.

### Not run or not available

- [ ] Destructive backup/restore integration test using `TEST_DATABASE_URL` and a disposable PostgreSQL database.
- [ ] `flask db upgrade` against a clean disposable PostgreSQL database.
- [ ] Migration status of the group's actual deployed database.
- [ ] Live Google sign-in test.
- [ ] Live Cloudinary cover upload, avatar upload, avatar deletion, and failure behavior.
- [ ] End-to-end browser tests with all services running.
- [ ] Role-by-role manual acceptance tests.
- [ ] Cross-browser and responsive-device tests.
- [ ] Accessibility audit (keyboard, screen reader, color contrast, zoom).
- [ ] Load/performance test with defined dataset and environment.
- [ ] Authorized security assessment.
- [ ] Backup recovery-time and data-integrity evidence from a real disposable restore.

The backend test run emitted SQLite connection `ResourceWarning`s and a weak test JWT-key warning. The group should decide whether to clean these warnings before presenting test logs.

## 8. Test coverage gaps to consider

- Authentication register/login routes and full Google account creation/linking flow.
- User role/status administration routes across all role combinations.
- Book create/update and Cloudinary cover handling.
- Review creation, duplicate-review policy, and invalid/missing books.
- Category service behavior beyond current route tests.
- Public-versus-authenticated catalog access policy.
- No refresh-token/session-renewal behavior because none is implemented.
- Actual PostgreSQL constraints and concurrency under multi-user requests.

Do not invent a coverage percentage. No coverage report was generated.

## 9. References and literature

Official documentation candidates are listed in `documentation-outline.md` and were checked against their official websites. The final paper still needs:

- [ ] The institution's required APA 7 formatting rules, especially retrieval dates for changing web documentation.
- [ ] Real academic or professional literature supporting the project background, not merely technology manuals.
- [ ] Sources about library circulation/information systems relevant to the actual problem context.
- [ ] A source for the chosen software development methodology, if the paper discusses one.
- [ ] Verification of every author, publication date, page title, and URL before submission.

Do not cite a source for a claim it does not support. Repository facts should normally be described as system design/implementation findings, while external sources should support definitions, methods, or broader context.

## 10. Claims requiring separate evidence

The following statements must not appear as conclusions without a defined method and results:

- “Pahina is secure.”
- “Pahina is reliable” or “always available.”
- “Pahina improves student satisfaction.”
- “Pahina reduces processing time/errors.”
- “Pahina is easy to use” or “user-friendly.”
- “Pahina can support a particular number of concurrent users.”
- “The backup guarantees recovery.”
- “The system is accessible to users with disabilities.”

For each desired claim, specify the evaluation method, participants or environment, raw results, limitations, and approval/ethics requirements where applicable.
