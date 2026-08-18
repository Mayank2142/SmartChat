# Darwix AI Chat — Implementation Notes

## Implementation approach

Darwix AI Chat is a responsive single-page application built with React, TypeScript, Vite, and Tailwind CSS. The interface is divided into reusable components for the application header, session navigation, message list, message rows, composer, settings, dialogs, timestamps, typing feedback, and retry controls. State and asynchronous behavior are separated into custom hooks so the UI components remain focused on presentation and interaction.

The browser sends chat requests to the same-origin `/api/chat` endpoint. A Vercel serverless function validates each request, reads the AI credential from the secure server environment, builds the conversation and attachment payload, and calls the configured Google AI model. The credential is never included in client-side JavaScript. Only one request can be active at a time, which prevents duplicate submissions while preserving any draft typed during generation.

Messages use stable identifiers and explicit `sending`, `sent`, `failed`, and `retrying` states. Failed messages keep their original content and expose a Retry action that reuses the same identifier instead of adding a duplicate. Assistant responses are rendered as semantic Markdown, and the typing indicator is replaced when the response finishes.

Saved conversations use versioned LocalStorage data to simulate session persistence without requiring accounts or a database. Invalid or incompatible saved data falls back safely to a new session. Temporary chats are clearly identified and are never written to saved history.

The message list follows new content only while the reader is near the bottom. If the user scrolls upward, their position is preserved and a keyboard-accessible “Jump to latest” control appears. Large histories use progressive windowing: the newest messages mount first, and older messages load in bounded batches while maintaining the reader’s visual position.

Accessibility is implemented with semantic landmarks, an accessible conversation log, ARIA names and statuses, targeted live regions, visible focus indicators, keyboard-operable controls, focus traps and restoration for dialogs, reduced-motion support, and status information that does not depend on color alone. Responsive layouts support desktop, tablet, and narrow mobile viewports.

## Assumptions

- Chat history belongs to the current browser profile because authentication and cloud synchronization were outside the assessment scope.
- A valid `GEMINI_API_KEY` is configured only in the server or Vercel environment.
- One AI request at a time provides the clearest experience and prevents accidental duplicate API calls.
- Temporary conversations must not persist after the browser session.
- Attachments are limited to three files and 3 MB combined to remain within practical serverless request limits.
- Progressive windowing is preferable to full variable-height virtualization here because it bounds DOM size while preserving native document flow, accessibility, timestamps, retries, and scroll anchoring.
- The application may display provider-neutral failure messages to users while keeping detailed provider errors on the server.
- Automated responsive checks cover common desktop, tablet, and mobile viewport sizes; a final physical-device smoke test is recommended for Safari, iOS, and Android before a wider production release.

## Verification

The project’s `npm run check` command runs linting, 49 automated tests, and a production build. Tests cover message submission, request locking, retries, attachments, Markdown rendering, session persistence, accessibility, focus behavior, responsive states, smart scrolling, and histories containing up to 10,000 messages.

Production application: [smart-chat-green.vercel.app](https://smart-chat-green.vercel.app/)

Source repository: [github.com/Mayank2142/SmartChat](https://github.com/Mayank2142/SmartChat)
