# Darwix AI Chat

Darwix AI Chat is a polished, responsive, and accessible AI-chat frontend built for the Darwix frontend assessment. It demonstrates a complete message lifecycle, resilient error handling, intelligent scrolling, multiple persistent sessions, keyboard-first interaction, and efficient large-history rendering.

> The bot response is simulated because the assessment does not specify a backend or LLM provider. The mock service is isolated so it can later be replaced with a real API.

## Screenshots

| 320px mobile with a long response | 1440px desktop with a large history |
| --- | --- |
| ![Darwix AI mobile interface](output/playwright/phase-8/mobile-320-large-history.png) | ![Darwix AI desktop interface](output/playwright/phase-8/desktop-1440-large-history.png) |

## Features

- Responsive dark SaaS interface with restrained gradients and glassmorphism
- Distinct user and assistant messages with accessible timestamps and delivery states
- Auto-growing multi-line composer with Enter to send and Shift + Enter for a newline
- Input normalization, 4,000-character limit, counter, and duplicate-submit protection
- Simulated asynchronous responses with typing, sending, sent, failed, and retrying states
- Deterministic failure commands, repeated-failure handling, cancellation, and retry without duplication
- Smart auto-scroll that follows new content only while the reader is near the bottom
- Keyboard-accessible Jump to latest control when the reader is viewing older content
- Multiple sessions with automatic titles, switching, clearing, deletion, and mobile drawer navigation
- Versioned LocalStorage history with validation, interrupted-request recovery, and storage-failure fallback
- Copy action for bot responses with non-disruptive success or failure feedback
- Progressive history loading designed for conversations containing thousands of messages
- Reduced-motion, reduced-transparency, forced-colors, safe-area, and small-screen support

## Tech stack

- React 19 and TypeScript 6
- Vite 8
- Tailwind CSS 4 plus component-focused custom CSS
- Lucide React icons
- Vitest, React Testing Library, user-event, and axe-core
- Playwright CLI for real-browser auditing
- GitHub Actions for continuous integration
- Vercel configuration for static production deployment

No state-management, animation, or virtualization library is required.

## Architecture

```text
src/
  components/   Shell, navigation, messages, composer, dialogs, and controls
  hooks/        Sessions, persistence, smart scroll, announcements, and motion
  services/     Replaceable mock assistant service
  types/        Chat, message, session, and persistence contracts
  utils/        Date, message, and versioned storage helpers
  test/         Shared browser-like test setup
```

`useChatSessions` owns session state and the asynchronous request lifecycle. UI components receive narrow props and remain focused on presentation and interaction. The mock service is behind a small promise-based contract, so a real API can replace it without changing message components.

## Message lifecycle

```text
Compose → validate → append user message as sending → show typing
        → request succeeds → mark user message sent → append bot response

        → request fails → mark the same message failed → expose Retry
        → retrying → reuse the original message ID → sent or failed
```

Each request is registered against its originating session. Switching sessions does not move an in-flight response. Clearing or deleting a session aborts only that session's requests.

## Smart scrolling

`useAutoScroll` measures the reader's distance from the bottom using a 120px threshold. New content follows automatically only when the reader is near the latest message. Otherwise, the scroll position is preserved and Jump to latest appears. Session changes intentionally reset to the newest message, and reduced-motion users receive instant scrolling.

Loading older history records the current `scrollHeight` and `scrollTop`, prepends the next bounded batch, then offsets the scroll position by the added height. This keeps the previously visible content anchored.

## Persistence

Chat data is saved to LocalStorage because the assessment is frontend-only and does not require accounts or cloud sync. The stored payload contains a schema version, active session ID, session metadata, messages, timestamps, and delivery states.

- Data is validated before restoration.
- Corrupted or incompatible payloads fall back to a fresh session.
- Messages interrupted by a reload become failed and remain retryable.
- Quota, privacy-mode, and unavailable-storage errors fall back to in-memory use.
- Writes occur only after meaningful chat changes, are debounced, and use browser idle time when available.
- Draft text, hover state, open dialogs, and other transient UI state are not persisted.

LocalStorage is not secure storage; users should not enter sensitive information.

## Error and retry strategy

The mock service supports deterministic failures (`/fail` and `/fail-always`), delays, cancellation, and malformed-response validation. A failed message retains its original content and ID. Retry is locked while active, updates that same message to `retrying`, and never appends a duplicate user message. Errors are announced with `role="alert"` without crashing the application.

## Accessibility

- Semantic header, main, navigation, form, log, list, article, button, and textarea elements
- Accessible names for icons and status indicators
- Skip links for the conversation and composer
- Keyboard-accessible timestamp details and copy/retry controls
- Targeted live regions for bot responses, typing, delivery errors, and copy feedback
- Modal dialog and mobile drawer focus traps, Escape handling, inert backgrounds, and focus restoration
- Visible `:focus-visible` indicators and logical tab order
- Statuses identified by text and icons instead of color alone
- Reduced-motion, reduced-transparency, and Windows forced-colors support

Automated axe audits report zero violations in the default, confirmation-dialog, mobile-drawer, and large-history states. Browser smoke audits also pass in Chromium, installed Microsoft Edge, and Playwright Firefox. Keyboard behavior was checked in a real browser because automated audits alone cannot validate focus usability.

## Performance strategy

- `React.memo` prevents unchanged message rows and the message list from rerendering while composing.
- Stable message IDs are used as React keys; array indexes are never used as keys.
- Only the latest 160 messages are mounted initially. Older history is added in stable 160-message batches on request.
- Appended responses extend the current window so a reader's oldest visible message is not removed.
- Persistence is debounced and scheduled during idle time where supported.
- Expensive blur is limited to major containers and reduced on mobile.
- Long unbroken content uses safe wrapping and cannot widen the document.

The project intentionally uses progressive windowing instead of variable-height virtualization. It keeps every displayed message in normal document flow, which preserves accessibility, retry controls, timestamps, and smart-scroll behavior while bounding the DOM size.

Automated tests cover 500, 1,000, 5,000, and 10,000-message datasets. A disposable real-browser benchmark at 320px restored 10,000 persisted messages in approximately 1.4 seconds on the development machine, mounted 160 message articles, produced no horizontal overflow, and safely wrapped a 4,000-character unbroken response. Timing varies by device and browser.

## Testing

```bash
npm run check
```

The combined command runs the same lint, test, and build quality gate used by CI. Individual commands remain available:

```bash
npm run test
npm run lint
npm run build
```

The suite covers composition, keyboard behavior, success and failure lifecycles, retries, timestamps, announcements, focus management, smart scrolling, persistence recovery, storage failure, session actions, copy feedback, axe accessibility, scroll anchoring, and the large-history matrix.

Real-browser checks include 320×720, 375×812, 768×1024, 1024×768, and 1440×900 Chromium viewports plus desktop smoke checks in Microsoft Edge and Firefox. They verify horizontal overflow, composer visibility, responsive navigation, keyboard focus wrapping, skip navigation, axe results, console errors, long-message wrapping, and large-history rendering.

## Local setup

Requirements: Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev
```

Vite prints the local development URL. For a production preview:

```bash
npm run build
npm run preview
```

## Assumptions and limitations

- Responses are local simulations rather than calls to a real LLM.
- History belongs to one browser profile and is not synchronized between devices.
- LocalStorage capacity varies, so extremely large histories may eventually switch to in-memory mode.
- Attachments and response settings are visible future affordances and remain disabled.
- Safari/WebKit and physical iOS/Android devices were not available in this local environment and should receive a final smoke test before public deployment.
- Repository and live deployment URLs have not been published yet; add them here before assessment submission.

## Deployment

The repository includes a schema-validated `vercel.json` configuration with the Vite build command, static output directory, Content Security Policy, clickjacking protection, MIME sniffing protection, privacy-oriented permissions, and referrer controls.

Every push or pull request to `main` runs the GitHub Actions quality workflow using Node.js 22 and a clean `npm ci` install.

After authenticating the required services, the intended publication flow is:

```bash
gh auth login -h github.com
gh repo create darwix-ai-chat --public --source=. --remote=origin --push
npx vercel --prod
```

No live URL has been published from the current environment because its saved GitHub credential is invalid and no Vercel account is configured. Replace this paragraph with the repository and deployment links after authentication.
