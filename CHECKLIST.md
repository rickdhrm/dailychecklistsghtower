# SGH Daily Facility Checklist Platform — Implementation Checklist & Roadmap

**System Name:** Antigravity  
**Database:** NeonDB (Serverless PostgreSQL 16+)  
**Framework:** Next.js 16 (App Router + Turbopack) + TypeScript + Tailwind CSS  
**Architecture:** Enterprise RBAC, Serverless Dynamic Hierarchical Forms, High-Speed Mobile Selector (No Barcode/Camera/Photos)

---

### [x] Phase 1: Project Scaffolding & Core Architecture
- [x] Initialized Next.js 16 with TypeScript (Strict mode) and ES Modules (`type: module`).
- [x] Configured Tailwind CSS with facility engineering color tokens and high-contrast dark theme.
- [x] Installed core dependencies: `pg`, `@types/pg`, `bcryptjs`, `dotenv`, `lucide-react`, `xlsx`, `jspdf`, `jspdf-autotable`, `zod`.
- [x] Established domain TypeScript contracts in `src/types/index.ts` (`User`, `Location`, `FormTemplate`, `FormSubmission`, `HousekeepingLog`).
- [x] Configured NeonDB connection pooler with global persistence in `src/lib/db.ts`.

---

### [x] Phase 2: Design System & Adaptive Shell
- [x] High-contrast facility tokens defined in `src/app/globals.css` (optimised for low-light generator and pump rooms).
- [x] Responsive layout with adaptive navigation in `src/components/layout/Navbar.tsx`:
  - Mobile bottom bar for quick field navigation (Forms, History, Admin).
  - Desktop header with role indicators (`ADMIN`, `SPV`, `TECHNICIAN`) and quick sign-out.
- [x] Root layout configured with mobile viewport constraints and theme styling in `src/app/layout.tsx`.

---

### [x] Phase 3: Auth & Technician Management (Admin / SPV)
- [x] Enterprise RBAC authentication and session cookies in `src/lib/auth.ts`.
- [x] Facility login page with one-click role selectors in `src/app/login/page.tsx`.
- [x] Technician provisioning interface at `src/app/admin/users/page.tsx`:
  - Enforced enterprise constraint: *Technicians must be registered directly by an Admin*.
  - Full name, username, employee code, email, temporary password, and role assignment.
- [x] Backend user management APIs in `src/app/api/users/route.ts` and `src/app/api/auth/`.

---

### [x] Phase 4: Dynamic Form Engine (Standard & Custom Hierarchical)
- [x] Schema-driven JSON specification supporting two form paradigms:
  - **Standard Forms**: Flat sequence of questions (Google Forms style).
  - **Custom Forms**: 4-tier tree:
    - `Heading Section` (Collapsible parent)
    - `Subheading` (Optional benchmark parent with fixed reference values)
    - `Children` (Equipment component nodes)
    - `Fields` (Numeric gauge readings with unit/min/max alerts, status toggles `NORMAL`/`ABNORMAL`, text notes)
- [x] Visual dynamic form builder and editor at `src/app/admin/forms/page.tsx`.
- [x] Pre-seeded all 8 operational checklist templates in NeonDB:
  1. `CHK-POMPA` — Checklist Pompa (Custom)
  2. `CHK-LIFT` — Checklist Operasional Lift (Custom)
  3. `CHK-MCFA` — Checklist Operasional MCFA & Annunciator (Custom)
  4. `CHK-ACCESS` — Checklist Komputer Access Card (Standard)
  5. `CHK-PAGING` — Checklist Panel Paging Evakuasi (Standard)
  6. `CHK-ITM-DAIKIN` — Checklist Panel ITM Daikin (Custom)
  7. `CHK-GAS` — Checklist Gas (Custom — Exactly Replicating Official Form FR-LO-005 Rev. 00 with 7 Sections, 61 Checkpoints, Temuan, Tindakan Koreksi, Status Options, and 4-Party Sign-Off Matrix)
  8. `CHK-PLN` — Checklist Meteran Listrik Gardu PLN (Custom)

---

### [x] Phase 5: Technician Field Experience & Dynamic Submissions
- [x] Completely eliminated barcode scanning, camera prompts, and photo upload requirements.
- [x] High-speed field selector on homepage (`src/app/page.tsx`) with category filters and real-time search.
- [x] Dynamic form runner at `src/app/checklist/[id]/page.tsx`:
  - Location selector dropdown.
  - Collapsible headings with expand/collapse states.
  - Automatic out-of-benchmark visual warning highlights.
  - Auto-flagging of submissions (`FLAGGED_ABNORMAL` vs `SUBMITTED`).
- [x] Submission history log at `src/app/history/page.tsx`:
  - View previous inspection readings.
  - Inline revision editor with mandatory *Reason for Change* tracking recorded into `form_submission_audits`.

---

### [x] Phase 6: Submissions Hub, Filtering & Export Engine
- [x] Central data monitoring console at `src/app/admin/submissions/page.tsx`:
  - Multi-criteria live filter: **Location**, **Checklist Type**, **Date/Time From & To**, **Status**.
  - Dynamic JSON inspection modal for all field readings.
- [x] Document Export Engine:
  - **Excel Export** (`/api/export/excel`): Generates `.xlsx` workbooks.
  - **PDF Export** (`/api/export/pdf`): Generates formal SGH compliance certificates with timestamp and supervisor stamp.

---

### [x] Phase 7: Data Housekeeping & End-of-Month Routine
- [x] Month-end archival console at `src/app/admin/housekeeping/page.tsx`.
- [x] Automated / manual month-end data archival pipeline in `src/app/api/housekeeping/route.ts`:
  - Archives historical submissions for the selected month to keep active query partitions lean.
  - Maintains immutable audit trail in `housekeeping_logs`.
