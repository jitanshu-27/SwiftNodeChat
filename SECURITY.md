# Security Policy

## Supported Versions

SwiftNodeChat is actively developed on the `master` branch. Security fixes are applied to the latest version only.

| Version | Supported |
|---------|-----------|
| latest (`master`) | ✅ |
| older commits | ❌ |

## Reporting a Vulnerability

If you discover a security vulnerability in SwiftNodeChat, **please do not open a public GitHub issue**. Instead:

1. Report it privately via GitHub's [Security Advisories](../../security/advisories/new) feature for this repository (if enabled), or email **<your-email-here>**.
2. Include as much detail as possible:
   - A description of the vulnerability and its potential impact
   - Steps to reproduce, or a proof-of-concept
   - Affected file(s)/endpoint(s), with line numbers if applicable
   - Any suggested fix, if you have one

You should expect an initial response acknowledging the report within a reasonable timeframe. Once a fix is confirmed, we will coordinate on disclosure timing before any public write-up.

## Scope

This project consists of:
- **`apps/client`** — a Next.js frontend
- **`apps/server`** — an Express + Socket.IO backend that connects to MongoDB and Cloudinary

Reports related to the following are in scope:
- Authentication/authorization gaps (e.g. actions performed without proper room membership checks)
- Injection vulnerabilities (NoSQL injection, XSS, etc.)
- Sensitive data exposure (e.g. leaking environment variables, database contents, or Cloudinary credentials)
- Denial-of-service issues that can be triggered remotely (e.g. crashing the server process)
- Insecure handling of file uploads

## Past Security-Relevant Fixes

Documented here for transparency:

- **Room membership checks**: Socket event handlers that act on a room (e.g. sending a message) now verify the emitting socket is actually a member of that room (`room.users.has(socket.id)`) before processing the event — previously this check was missing on some handlers, allowing events to be sent to rooms without joining them.
- **Process stability**: The server no longer terminates the entire process (`process.exit`) in response to a recoverable failure (e.g. a transient database connection issue). This previously caused a full outage for all connected users, not just the feature relying on that dependency.
- **Environment variables**: `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` must never be committed to version control. Use `.env` files locally (already excluded via `.gitignore`) and platform-level environment variable settings in production (Vercel/Render).
- **File uploads**: Uploaded files are proxied through Cloudinary — validate file type/size on the server side, not just the client, to prevent abuse.

## General Recommendations for Deployers

- Rotate Cloudinary and MongoDB credentials if you suspect they were exposed.
- Restrict MongoDB network access (IP allowlisting) where possible.
- Keep dependencies up to date — run `npm audit` periodically in both `apps/server` and `apps/client`.
- Serve the client and server over HTTPS in production.

## Disclosure Policy

We ask that you give us a reasonable opportunity to investigate and address a reported vulnerability before any public disclosure.
