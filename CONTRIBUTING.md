# Contributing to SwiftNodeChat

Thanks for your interest in contributing! This document explains how to set up the project, the conventions used, and how to submit changes.

## Getting Started

1. Fork the repository and clone your fork:
   ```bash
   git clone https://github.com/<your-username>/swiftnodechat.git
   cd swiftnodechat
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables as described in [README.md](./README.md#2-configure-environment-variables).
4. Run the project locally:
   ```bash
   npm run dev
   ```

## Project Structure

This is a Turborepo monorepo with two workspaces:

- `apps/client` — Next.js frontend (App Router, TypeScript, Tailwind CSS, shadcn/ui)
- `apps/server` — Express + Socket.IO backend (TypeScript, Mongoose, Cloudinary)

Keep changes scoped to the relevant app where possible.

## Branching

- Create a feature branch off `master`:
  ```bash
  git checkout -b feat/short-description
  ```
- Use a prefix that describes the type of change: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short summary>

[optional body explaining the "why"]
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

Examples:
```
fix: prevent MongoDB connection failure from crashing server
feat: add dark/light theme toggle
docs: update setup instructions in README
```

Keep commits focused — one logical change per commit rather than bundling unrelated fixes/features together.

## Code Style

- **TypeScript** is used across both apps — avoid introducing `any` where a proper type is feasible.
- Run type checking before committing:
  ```bash
  cd apps/server && npx tsc --noEmit
  cd apps/client && npx tsc --noEmit
  ```
- Run the linter for the client:
  ```bash
  cd apps/client && npm run lint
  ```
- Match existing formatting/indentation in the file you're editing.

## Testing Your Changes

Before opening a pull request, manually verify:

1. Server starts cleanly and connects to MongoDB (`cd apps/server && npm run dev`)
2. Client starts cleanly (`cd apps/client && npm run dev`)
3. Creating a room works and doesn't hang on the connecting screen
4. A second user can join the same room via its code
5. Messages sent from one user appear in real time for the other
6. Typing indicator shows and clears correctly
7. Image upload works and opens in a zoom modal
8. Non-image file upload works and opens/downloads correctly
9. Refreshing the page doesn't cause an immediate "user left" flicker for other participants
10. Clicking "Leave" removes the user from the room immediately for others
11. Theme toggle switches between dark and light mode
12. Server stays up if MongoDB is temporarily unreachable (doesn't crash the whole process)

There is currently no automated test suite — manual verification of the above is expected for any change touching `apps/server/index.ts`, `apps/client/hooks/useSocket.ts`, or the chat/lobby views.

## Pull Requests

1. Ensure your branch is up to date with `master`.
2. Push your branch and open a PR against `master`.
3. In the PR description, include:
   - What the change does and why
   - How you tested it
   - Any related issue numbers
4. Keep PRs focused on a single change where possible — smaller PRs are easier to review.
5. Be responsive to review feedback; a maintainer will merge once approved.

## Reporting Bugs

Open an issue with:
- Steps to reproduce
- Expected vs. actual behavior
- Relevant logs/console output
- Environment details (OS, Node version, browser)

## Reporting Security Issues

Do **not** open a public issue for security vulnerabilities. See [SECURITY.md](./SECURITY.md) for the disclosure process.

## Code of Conduct

Be respectful and constructive in all discussions, issues, and reviews. Disagreements about code should stay focused on the code, not the person.
