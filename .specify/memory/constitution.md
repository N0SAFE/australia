# Australia Capsule App Constitution
<!-- Weekly surprise web application for friend's year-long Australia journey -->

<!--
  SYNC IMPACT REPORT:
  Version change: Initial → 1.0.0
  Creation: Initial constitution establishment
  Modified principles: N/A (initial creation)
  Added sections: All sections
  Removed sections: N/A
  Templates requiring updates:
    ✅ plan-template.md - Constitution Check section reviewed and aligned
    ✅ spec-template.md - Requirements sections reviewed and aligned
    ✅ tasks-template.md - Task categorization reviewed and aligned
  Follow-up TODOs: None
-->

## Core Principles

### I. Figma Design Fidelity (NON-NEGOTIABLE)
The application MUST strictly adhere to the provided Figma design for all user-facing interfaces.

**Rules:**
- NO UI changes to main app (unlock, login, home, calendar, capsule list pages) without explicit Figma design reference or developer approval
- Backend/admin interfaces use standard Tailwind CSS + Shadcn UI components (no Figma constraint)
- Any proposed UI deviation MUST be flagged and approved before implementation
- Design consistency is paramount for user experience

**Rationale:** This app is built for a specific friend with a carefully crafted visual experience. Maintaining design fidelity preserves the personal, thoughtful nature of the gift.

### II. Role-Based Access Control
The system MUST implement two distinct user roles with clear separation of concerns.

**Roles:**
- **Sarah**: Friend user with access to unlock page, main app (home, calendar, capsule list), and capsule viewing
- **Admin**: Full access including a visible backend/admin toggle button, main app access, and backend configuration interface

**Rules:**
- Authentication MUST deterministically identify users (no self-registration)
- Login page MUST redirect based on role (Sarah → main app, Admin → backend or main app with admin toggle)
- Admin toggle button MUST only be visible to admin role
- Role checks MUST be enforced on both frontend routing and backend API endpoints

**Rationale:** Clear role separation maintains the surprise element for Sarah while providing admins control over content and timing.

### III. Backend-Driven Content Configuration
All user-facing content and error messages MUST be configurable through the backend interface.

**Configurable Elements:**
- Capsule content (images, text, videos, etc.)
- Capsule unlock timing and triggers
- Error messages for 404, 500, and other error states with random selection from predefined message pools
- Customizable error message themes (e.g., Harry Potter references, Australia-specific humor)

**Rules:**
- Error messages MUST support multiple variants per error type
- System MUST randomly select from available message pool for each error occurrence
- All capsule content MUST be pre-loadable in the backend
- Manual capsule triggers MUST be available alongside automated weekly timers

**Rationale:** Flexibility in content and messaging allows admins to maintain surprise, personalization, and humor throughout Sarah's year-long journey.

### IV. Weekly Capsule Unlock System
Capsules MUST be unlockable through both time-based and manual trigger mechanisms.

**Unlock Mechanisms:**
- **Automated Weekly Timer**: Capsules unlock automatically on a weekly schedule
- **Manual Backend Trigger**: Admins can trigger capsule unlocks at any time regardless of schedule
- Both mechanisms MUST coexist and be configurable per capsule

**Rules:**
- Timer-based unlocks MUST respect timezone configuration
- Manual triggers MUST override timer restrictions
- Unlock status MUST be persistently stored
- Unlock events MUST be auditable (logged with timestamp and trigger type)

**Rationale:** Balances automated scheduling with flexibility for special occasions, allowing admins to surprise Sarah with unexpected capsules at meaningful moments.

### V. Progressive Enhancement & Mobile-First
The application MUST prioritize mobile user experience with progressive enhancement.

**Requirements:**
- Mobile-first responsive design (Figma designs assume mobile primary)
- Touch-friendly interactions (especially for unlock page "iPhone experience")
- Offline capability for viewing previously unlocked capsules (optional enhancement)
- Performance optimization for media-heavy capsules (images, videos)

**Rationale:** Sarah will primarily access the app on mobile while traveling in Australia. The experience must be seamless, fast, and delightful on mobile devices.

### VI. Data Privacy & Security
User data and capsule content MUST be protected with appropriate security measures.

**Requirements:**
- Secure authentication (JWT or session-based via Better Auth)
- HTTPS for all production traffic
- Content stored securely with appropriate access controls
- No public exposure of capsule content before unlock
- Admin actions logged for audit trail

**Rationale:** Protects the surprise element and ensures capsule content remains secure until intended unlock time.

## Application Structure Requirements

### Page Architecture
The application MUST implement these specific pages:

**User-Facing (Sarah + Admin):**
1. **Unlock Page**: iPhone-like lock screen experience
2. **Login Page**: Role-aware redirect to backend or main app
3. **Home Page**: Dashboard/landing for main app
4. **Calendar Page**: Visual timeline of capsules
5. **Capsule List Page**: Browse available/unlocked capsules

**Admin-Only:**
6. **Backend Interface**: Content management, capsule creation, trigger controls, error message configuration

### Navigation Rules
- Unlock page → Login page → Role-based redirect
- Admin users see persistent admin toggle button in main app
- Admin toggle switches between main app and backend interface
- All pages must enforce role-based access via middleware

## Technology Stack Constraints

### Required Technologies (Inherited from Template)
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS 4, Shadcn UI
- **Backend**: NestJS 10, Better Auth, ORPC for type-safe contracts
- **Database**: PostgreSQL with Drizzle ORM
- **Monorepo**: Turborepo structure
- **Development**: Docker-first workflow with Bun package manager

### Design System Constraints
- **Main App UI**: Strictly follow Figma designs (Shadcn components may be used if they match Figma)
- **Backend UI**: Standard Shadcn UI components with Tailwind styling (no Figma constraint)
- **Consistency**: Maintain consistent spacing, typography, and color schemes per environment

## Development Workflow Requirements

### Figma Design Review Process
1. Before ANY UI implementation for main app: Review Figma design
2. If Figma design unclear or missing: Request developer approval
3. Document design decisions in feature specification
4. No assumptions about UI layout or styling without confirmation

### Content Management
- Capsules must support multiple content types (images, text, video, mixed media)
- Content upload must validate file types and sizes
- Preview capability in backend before scheduling

### Testing Requirements
- Role-based access must be tested (both frontend routes and backend endpoints)
- Capsule unlock mechanisms must be tested (timer and manual)
- Error message randomization must be tested
- Mobile responsiveness must be validated

## Governance

### Constitution Authority
This constitution supersedes all other development practices and decisions. When conflicts arise, constitution principles take precedence.

### Amendment Process
1. Proposed changes must be documented with rationale
2. Developer approval required for amendments
3. Version number must be incremented according to semantic versioning
4. All dependent documentation must be updated to reflect changes

### Semantic Versioning
- **MAJOR**: Removal or redefinition of core principles (e.g., removing Figma fidelity requirement)
- **MINOR**: New principles added or material expansion (e.g., adding offline-first principle)
- **PATCH**: Clarifications, wording improvements, non-semantic refinements

### Compliance Review
- All feature specifications must reference relevant constitution principles
- All implementation plans must include "Constitution Check" section
- Code reviews must verify adherence to stated principles
- Violations must be justified and documented in plan's "Complexity Tracking" section

### Runtime Guidance
For day-to-day development guidance beyond these principles, refer to:
- `.github/copilot-instructions.md` for AI development guidelines
- `.docs/` directory for technical architecture and workflow documentation
- AGENTS.md files in each package for specific development patterns

**Version**: 1.0.0 | **Ratified**: 2025-10-18 | **Last Amended**: 2025-10-18
