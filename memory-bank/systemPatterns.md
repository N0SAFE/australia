# System Patterns

## Architecture
- **Monorepo**: Turborepo managing `apps/web`, `apps/api`, and `packages/*`.
- **Communication**: ORPC for type-safe API calls between Web and API.
- **Editor**: Tiptap editor with custom extensions and UI components (Shadcn).

## Key Decisions
- **Explicit Prop Passing**: For Tiptap editor components, passing the `editor` instance explicitly is preferred over relying solely on context to ensure reliability.
- **Strict Linting**: The project enforces strict TypeScript and ESLint rules (no void returns, no any, etc.).
