# Rafli — User Stories

A complete, tech-stack-agnostic specification of the Rafli sweepstakes/raffle
platform, expressed as user stories. This document describes **what** the system
does and **why** — its functionality, behavior, and rules — independent of any
framework, language, or architecture. It is intended to be sufficient to
re-implement the entire web application on a different tech stack while
preserving all functionality.

Each story is written from a user's point of view and/or with the system as an
actor. Stories include observable acceptance criteria and the system behavior
behind them (validation rules, state transitions, error handling, edge cases).

## Roles

- **Guest** — an unauthenticated visitor.
- **User / Participant** — a signed-in account holder who enters sweepstakes.
- **Host** — a verified user who creates and runs sweepstakes.
- **Winner** — a user whose entry was drawn for a prize.
- **Admin / Reviewer** — a staff user with the KYC review permission.
- **System** — the platform itself, acting autonomously (validation, draws,
  billing, notifications, scheduled jobs).

## Glossary

- **Sweepstakes / Raffle** — a prize draw users enter; the terms are used
  interchangeably ("Sweepstakes" is the user-facing term).
- **Entry / Ticket** — one chance in a draw; entries have unique entry codes.
- **AMOE** — Alternative Method of Entry; the legally required no-purchase
  free-entry path (a public share on X).
- **Credits** — platform currency, denominated in USD, spendable on entries.
- **Provably fair** — winner selection committed on-chain and verifiable by
  anyone using a Merkle manifest and a verifiable random function (VRF).
- **Verification / KYC** — identity/business checks required to host or claim
  prizes.

## Contents

1. [Authentication & Onboarding](#authentication--onboarding)
2. [Marketing, Landing & Informational Pages](#marketing-landing--informational-pages)
3. [Browse & Raffle Participation](#browse--raffle-participation)
4. [Subscriptions & Plans](#subscriptions--plans)
5. [Host Raffle Management](#host-raffle-management)
6. [Profile, Account & Messaging](#profile-account--messaging)
7. [Verification & Administration](#verification--administration)

---

## Authentication & Onboarding

### Sign In (Magic Link)
**As a** returning visitor **I want to** sign in by receiving a one-time link in my email **so that** I can access my account without typing a password.

**Acceptance criteria:**
- The sign-in screen opens with the magic-link email step as the default, primary method.
- I enter my email address; the field is required and validated as a well-formed email ("Invalid email address" shown otherwise).
- I must complete a human-verification challenge before the "Sign In" button becomes enabled.
- After submitting, I see a "Check your email" confirmation showing the exact address the link was sent to, with the message that I may close the tab.
- From the confirmation step I can resend the link to the same address; the button shows progress ("Sending..."), then "Link resent!" or "Failed to resend. Try again".
- From the confirmation step I can choose "Use a different email" to return to the email entry step.
- I can switch to the password sign-in method via "Login with a password".
- A link lets me jump to "Sign Up" and to "Resend verification".

**System behavior:**
- The system validates the email and a non-empty human-verification token before any network call.
- The system requests a passwordless sign-in email from the auth backend, passing a callback URL pointing back to the OAuth-callback handler and preserving any safe `returnTo` path.
- The human-verification token is single-use; the system burns it on every backend response (success or failure) and forces issuing a fresh token before the next attempt — a resend always requires a new challenge.
- Resending requires a fresh verification token; without one, the resend immediately reports an error.
- The verification token is short-lived (~5 minutes) and the system clears it when it expires or errors, re-disabling the submit button.
- Account-existence is never revealed: the magic-link endpoint auto-creates accounts for unknown emails, so it is treated as a sign-up vector and gated by human verification.
- On error the system shows a tech-neutral message (verification failed/unavailable, too many attempts, network error, timeout, server error).

### Sign In (Email & Password)
**As a** returning user with a password **I want to** sign in with my email and password **so that** I can access my account directly.

**Acceptance criteria:**
- I enter email and password; both fields are required.
- The password field must be at least 12 characters (and at most 128); shorter input shows "Password must be at least 12 characters".
- A "Forgot your password?" link is shown next to the password field.
- I must complete the human-verification challenge before "Sign In" is enabled.
- The button shows "Signing in..." while the request is in progress.
- On success I am redirected to my originally intended destination, or to the browse page by default.
- On failure I see "Invalid email or password." for bad credentials, plus a hint: "Just signed up? Check your inbox for the verification email." with a "Resend it" link.
- I can switch back to the magic-link method via "Login with a magic link".

**System behavior:**
- The system validates email format, password length, and a verification token before calling the backend.
- On successful authentication the backend returns a session credential and a user record; the system requires both to be present.
- The system creates an authenticated session by storing the session credential and a separate client-readable user record (id, email, name, avatar only — verification status and permissions are deliberately excluded from the client-readable record).
- Before persisting the session, the system re-confirms the credential is accepted by the backend identity endpoint; a credential the backend has not positively acknowledged is never persisted.
- The human-verification token is single-use and is reset after any backend response, including credential rejections.
- The system records sign-in success/failure analytics without blocking the user.
- Error states are mapped to neutral copy: invalid credentials, session expired, rate-limit exceeded, network error, timeout, server error.

### Sign In with Google (Social Login)
**As a** visitor **I want to** sign in or sign up using my Google account **so that** I can authenticate without creating a separate password.

**Acceptance criteria:**
- A Google button is available on both the sign-in and sign-up screens.
- Clicking it shows a loading spinner and disables the button while the flow starts.
- I am redirected to Google's consent screen, and after consent returned to the application.
- While the application completes the sign-in I see a "Completing sign in..." spinner.
- If I cancel or the flow fails, I see "Google sign in was cancelled or failed. Please try again." with a "Back to Sign In" link.
- On success I land on my intended destination, or the browse page by default.

**System behavior:**
- The system requests an OAuth redirect URL from the backend for the chosen provider (currently only Google is supported) and navigates the browser to it.
- The callback URL preserves any safe `returnTo` path.
- When the provider redirects back, the system exchanges the provider's cross-origin session for the application's own session credential; this exchange must run in the browser because the provider session is bound to the backend origin.
- If the callback URL carries an error parameter, the system reports a cancelled/failed sign-in and does not attempt the exchange.
- The exchanged credential is structurally validated (correct segment structure, non-empty signature, not expired, expiry not implausibly far in the future, required identity claims present) before being persisted.
- The system sets the session and redirects; if persisting the session fails, it shows a generic failure with a retry link.
- The OAuth exchange runs exactly once per page load, guarded against re-fire loops.

### Sign Up
**As a** new visitor **I want to** create an account with my name, email, and password **so that** I can start using the platform.

**Acceptance criteria:**
- I enter name, email, and password; all three fields are required.
- Name must be 3–50 characters ("Name must be at least 3 characters" otherwise).
- Email must be a well-formed address.
- Password must be 12–128 characters ("Password must be at least 12 characters" otherwise).
- I must complete the human-verification challenge before "Sign Up" is enabled.
- The button shows "Creating account..." while submitting.
- On success I see a confirmation message: "Account created! Check your email to verify before signing in." and am taken to the sign-in screen (with my intended destination preserved).
- Alternative sign-up options are offered: Google and a magic-link entry point, plus an "Already have an account? Sign in" link.
- If the chosen password has appeared in known data breaches, I see "This password has appeared in data breaches. Please choose a different one."

**System behavior:**
- The system validates name, email, password, and verification token before calling the backend.
- The system creates the account via the backend; the new account starts unverified and the user must sign in separately after verifying their email.
- Sign-up does not create a session — no session credential is issued on registration.
- To prevent account enumeration, "user already exists" and a generic "signup failed" produce the identical message: "Unable to create account. Please try again or sign in."
- The verification token is single-use and reset after any backend response.
- The system records sign-up success/failure analytics without blocking the user.
- Errors map to neutral copy: password compromised, verification failure/unavailable, rate-limit, network, timeout, server error.

### Email Verification
**As a** newly registered user **I want to** confirm my email address by following the link sent to me **so that** my account becomes verified and usable.

**Acceptance criteria:**
- Opening the verification link with a valid token shows a "Verifying your email..." spinner.
- If the link has no token, I immediately see "Invalid verification link. No token provided." with links to resend the verification email and to sign in.
- On successful verification I am signed in automatically and taken to the browse page.
- If verification succeeds but no session is granted, I am taken to the sign-in screen instead.
- On failure I see "This verification link is invalid or has expired. Please request a new one." with a "Resend Verification Email" link and a "Go to Sign In" link.

**System behavior:**
- The system rejects an empty token locally without a backend call (avoids a timing side-channel between "empty" and "malformed").
- The system submits the token to the backend; an invalid/expired token (or a backend "success: false") is treated as an invalid-link failure.
- If the backend returns a session credential along with verification, the system persists the session and signs the user in; otherwise it routes the user to sign in.
- Verification runs exactly once per page load, guarded against re-fire loops.
- The system records an "email verified" analytics event when a user id is available, without blocking the redirect.

### Resend Verification Email
**As a** user whose email is not yet verified **I want to** request a fresh verification email **so that** I can complete verification if the original link expired or was lost.

**Acceptance criteria:**
- I enter my email address; the field is required and validated as a well-formed email.
- I must complete the human-verification challenge before "Send Verification Email" is enabled.
- The button shows "Sending..." while submitting.
- After submitting I see a generic confirmation: "If an account exists with that email and it hasn't been verified yet, we've sent a new verification link." — shown regardless of whether the account exists.
- An "Already verified? Sign in" link is available.
- This page is reachable from sign-in screens, verification reminder emails, and expired-token error states.

**System behavior:**
- The system validates email and verification token before calling the backend; malformed input silently returns success without a backend call (preserves enumeration-safety).
- The backend always responds successfully regardless of account existence, and silently drops requests for unknown addresses.
- Only infrastructure and verification-challenge errors surface to the user (network, timeout, rate-limit, server error, verification invalid/missing/unavailable); account-related errors are swallowed to prevent enumeration.
- The human-verification challenge is mandatory specifically to prevent mailbombing: the endpoint accepts arbitrary addresses, so each resend must pass a human-challenge cost.
- The verification token is single-use and reset after each failure.

### Forgot Password (Request Reset)
**As a** user who forgot their password **I want to** request a password reset email **so that** I can regain access to my account.

**Acceptance criteria:**
- I enter my email address; the field is required and validated as a well-formed email.
- I must complete the human-verification challenge before "Send Reset Link" is enabled.
- The button shows "Sending..." while submitting.
- After submitting I see a generic confirmation: "If an account exists with that email, we've sent password reset instructions." — shown regardless of whether the account exists.
- A "Remember your password? Sign in" link and a "Back to Sign In" button are available.

**System behavior:**
- The system validates email and verification token; malformed input silently returns success without a backend call (preserves enumeration-safety).
- The system tells the backend which page the reset link should point to (the reset-password page on the current origin).
- The backend always returns success regardless of account existence; only infrastructure and verification-challenge errors surface (network, timeout, rate-limit, server error, verification invalid/missing/unavailable).
- Account-existence signals are swallowed so an attacker cannot discover registered emails.
- The system records a "password reset requested" analytics event without blocking the user.

### Reset Password (Complete Reset)
**As a** user who received a password reset link **I want to** set a new password **so that** I can sign in again.

**Acceptance criteria:**
- The page reads a reset token from the link.
- If the link has no token, I see "Invalid reset link — This password reset link is invalid or has expired." with a "Request new link" button.
- I enter a new password and a confirmation; both fields are required.
- New password must be 12–128 characters.
- The two password fields must match, otherwise I see "Passwords do not match".
- The button shows "Resetting..." while submitting.
- On success I see a "Password reset successfully!" confirmation and am taken to the sign-in screen.
- On failure with an invalid/expired token I see "This reset link is invalid or has expired. Please request a new one."
- If the new password has appeared in known data breaches, I see "This password has appeared in data breaches. Please choose a different one."
- A "Remember your password? Sign in" link is available.

**System behavior:**
- The token is not validated on page load — validation happens at submission time to avoid leaking timing information.
- The system rejects an empty token and enforces the 12-character minimum before calling the backend; unknown extra fields in the request are stripped.
- The system submits the token and new password to the backend; an invalid or expired token produces a token-error result.
- The system records a "password reset completed" analytics event without blocking the redirect.
- Errors map to neutral copy: invalid/expired token, password compromised, rate-limit, network, timeout, server error.

### Session Establishment & Persistence (System)
**As the** system **I want to** issue and persist a session only after the backend confirms the credential **so that** forged or stale credentials never grant access.

**Acceptance criteria:**
- A session is considered established only when both a session credential and a confirmed user identity exist.
- The session credential is stored in a credential store not readable by client-side scripts.
- A separate client-readable user record holds only display-safe fields (id, email, name, avatar); verification status and permissions are never client-readable.
- Sessions persist for up to 30 days.

**System behavior:**
- Before persisting any credential, the system calls the backend identity endpoint; only a positive acknowledgement allows the session to be written.
- Any credential persisted is structurally checked: three-part structure, non-empty signature, not expired, expiry not more than ~31 days out, required identity claims present.
- Expiry checks allow a 60-second clock-skew tolerance.
- When a stored credential is expired, the system clears all session-related stored data so it does not repeatedly cycle through redirect checks.
- When the backend explicitly rejects a credential, the system clears all session data; when the backend is merely unreachable or returns a transient error, the system keeps the stored credential and degrades to "unauthenticated for this request" so a later retry can restore the session without a fresh sign-in.
- Identity is always taken from the backend, never trusted from locally decoded credential claims (prevents privilege escalation).

### Route Access Guard (System)
**As the** system **I want to** redirect users based on their authentication state **so that** unauthenticated users cannot view protected pages and authenticated users skip the auth pages.

**Acceptance criteria:**
- An unauthenticated user visiting a protected area (my-raffles, profile, admin, verification) is redirected to the sign-in screen.
- An authenticated user visiting any auth/onboarding page (sign-in, sign-up, forgot-password, reset-password, verify-email, OAuth callback, resend-verification) is redirected to the browse page.
- An already-authenticated user who lands on the sign-in screen is bounced to their `returnTo` destination if present, otherwise the browse page.

**System behavior:**
- The guard is a UX-only redirect layer; real authorization is enforced by the backend on every API call.
- Auth state for the guard is determined by presence of a non-expired credential.
- The guard never performs authentication logic itself — it only redirects.

### Safe Redirect Handling (System)
**As the** system **I want to** validate any `returnTo` redirect target **so that** attackers cannot use it to redirect users to malicious external sites.

**Acceptance criteria:**
- A missing or empty `returnTo` defaults to the browse page.
- Only relative paths beginning with a single "/" are accepted.
- Protocol-relative paths ("//"), backslashes, absolute URLs ("://"), `javascript:` and `data:` schemes are all rejected and fall back to the default.
- The value is also checked after one round of decoding to catch encoded attacks; invalid encoding falls back to the default.

**System behavior:**
- The validated `returnTo` is carried through sign-in, sign-up, and OAuth callback flows so a user lands back where they started after authenticating.
- If multiple values exist, only the first is considered.

### Human Verification Challenge (System)
**As the** system **I want to** require a human-verification challenge on all unauthenticated auth forms **so that** automated abuse, credential stuffing, and mailbombing are blocked.

**Acceptance criteria:**
- Sign-in (password and magic link), sign-up, forgot-password, and resend-verification forms all present a verification challenge.
- The submit button stays disabled until the challenge issues a token.
- Each form carries a distinct action label (sign-in, sign-up, forget-password, magic-link, send-verification) so a token issued for one form cannot be replayed against another.
- Client-side challenge failures show inline messages tailored to the failure family (refresh the page / configuration error / security check failed).
- An interactive challenge timeout shows "Verification timed out. Please complete the check above."
- An unsupported browser shows a message to update or switch browsers.

**System behavior:**
- The verification token is single-use and short-lived (~5 minutes / ~300-second dedup window).
- The system burns and re-issues the token on every backend response and on expiry/error.
- The token is sent to the backend in a dedicated request header so it is verified before any auth handler runs.
- The backend asserts the per-form action label matches the challenge to defeat cross-endpoint token replay.

### Auth Page Error Boundary (System)
**As the** system **I want to** catch unexpected rendering errors in the auth section **so that** a failed auth page degrades gracefully instead of showing a blank screen.

**Acceptance criteria:**
- A rendering error within any auth/onboarding page surfaces a recoverable error screen with a retry affordance.

**System behavior:**
- The error boundary is scoped to the auth route group and provides a reset action to re-attempt rendering.

---

## Marketing, Landing & Informational Pages

### Home / Landing Page
**As a** prospective visitor (guest or returning user) **I want to** see a live, marketing-focused overview of the platform **so that** I can quickly understand what it offers and decide whether to sign up or browse.

**Acceptance criteria:**
- A sticky top navigation bar shows the brand logo plus in-page anchor links ("Active sweepstakes", "How it works", "Questions") and two call-to-action buttons ("Help us improve" feedback link, "Explore sweepstakes").
- On small screens the anchor links and CTAs collapse into a hamburger-triggered full-screen mobile menu that closes when any item is tapped.
- A scrolling marquee banner reads "Share any sweepstakes on X and earn bonus entries!".
- The hero shows the tagline "Real prizes. Verified draws. Enter in seconds.", the headline "Win real prizes. Every draw verified.", supporting copy about on-chain transparency, and three live stat chips: count of active sweepstakes, total prize value live now (currency-formatted), and a fixed "50M+ Reward Assets Distributed" figure.
- The hero shows two primary actions: "Sign up free" (to registration) and "Browse sweepstakes" (to the browse catalog).
- If featured sweepstakes exist, a two-up featured band displays the first two (styled blue and green); if none exist, the band is omitted entirely.
- If live sweepstakes exist, a "See what's up for grabs right now!" grid displays up to 8 of them (1/2/3/4 columns responsive) plus a "Browse all sweepstakes" link; if none exist, the section is omitted.
- A "How would you like to participate?" section shows two parallel cards: a host card (for businesses) with three steps and an "Apply to host" link to an external application form, and a participant card with three steps and an "Explore sweepstakes" link.
- A recent-winners carousel ("Most recent winners!") auto-advances every 4 seconds, loops, pauses on hover, links to "View all past winners", and is hidden entirely when there are no winners.
- A past-draws carousel ("Past Draws", "See who won — results verified on-chain.") auto-advances every 6 seconds, loops, shows dot pagination when there is more than one page, and is hidden when there are no completed sweepstakes.
- A "Trusted by community" section shows a Trustpilot-styled trust panel (4.6 rating, 449 reviews, "Rated Excellent", deep-link to the public Trustpilot profile) and a 6-item FAQ accordion.
- A final yellow CTA section ("Ready to enter?") drives sign-ups via an "Open the app" button.
- A footer shows the logo, links to Support / Terms of Service / Privacy Policy / Free Entry, and a copyright line.

**System behavior:**
- Fetches the live sweepstakes list (newest-first, limited to 8) and the featured sweepstakes list in parallel before first paint; recent winners and past draws (completed sweepstakes, newest-first, limited to 12) are fetched separately and streamed in below the fold so they cannot delay the hero.
- Computes the hero's "total prize value live now" by summing the declared prize values of the fetched live sweepstakes.
- If any data fetch fails, the affected section degrades gracefully: an empty live/featured list collapses the section, and failed winners/past-draws return nothing rather than erroring the page.
- Carousels respect the user's reduced-motion preference: auto-advance is stopped when the OS prefers reduced motion.
- The page enforces a 30-second total render budget so a stalled backend produces a degraded page instead of hanging.
- The navigation is intentionally guest-targeted: it never shows authenticated controls (notification bell, mode toggle, account chrome); both CTAs deep-link into the app, which accepts guest and signed-in sessions alike.

### Press Release / "Introducing the Platform" Article
**As a** journalist, partner, or curious visitor **I want to** read a long-form article explaining the platform's mission and how it works **so that** I understand its value proposition and trust model.

**Acceptance criteria:**
- The page renders as a blog-style article with a dedicated navigation bar, a hero, an article body, and the shared footer.
- The hero shows an "Introducing Rafli" eyebrow, the headline "Sweepstakes. Done right.", and an elevator-pitch paragraph.
- The body presents narrative sections in order: Overview, The Problem (trust crisis in traditional sweepstakes), The Solution (four pillars: Host Verification, Transparent Rules, On-Chain Selection, End-to-End Tracking), a five-step "Sign-Up to Winner" walkthrough, For Participants, For Hosts, a "Looking Ahead" manifesto, and a Press Contact card.
- The article includes pull quotes attributed to the founding team and illustrative banner/listing/detail images.
- Section content animates into view on scroll, with staggered reveals for grouped items.

**System behavior:**
- All content is static; no data is fetched.
- The page publishes article-type structured data (headline, author, publisher, publish date) and SEO metadata (title, description, keywords, canonical URL, social-share cards) so search engines and social platforms render rich snippets.
- The Press Contact card contains placeholder website / email / social handle fields awaiting final values.

### How It Works (Provably Fair Verification)
**As a** participant or skeptic **I want to** understand exactly how winners are selected and verified **so that** I can trust draw outcomes without trusting the operator.

**Acceptance criteria:**
- The page headline reads "Every Winner Is Verifiable" with the subline "You don't have to trust us. The proof is public."
- A "How a winner is picked" section presents three numbered steps, each with a plain-language analogy: entries are sealed (uploaded to decentralized storage and fingerprinted on-chain), randomness arrives (delivered by a verifiable random function with cryptographic proof), and math picks the winner (a public formula `(random % totalEntries) + 1`).
- A "Public proof, private identity" section visually splits data that is never published (name, email, payment info, account ID) from data that is publicly committed (entry number, entry code, one-way identity-commitment hash, timestamp), and explains the sweepstakes-scoped one-way hash.
- A "Verify your entry" section shows three preview chips ("Found", "Proved", "Computed") describing what the user will see, followed by an interactive ticket-verification walkthrough.
- A collapsible "Protocol details" section reveals a step-by-step developer reconstruction recipe, code snippets (commit-reveal protocol and winner-selection formula), and links to the verification tools page and a blockchain explorer.
- A closing CTA ("Browse Sweepstakes") links to the catalog.
- External educational links (decentralized storage docs, verifiable-randomness docs) open in new tabs.

**System behavior:**
- Page content is static; the only interactive element is the embedded ticket-verification walkthrough.
- The layout reads the visitor's session to render the public navigation in an auth-aware way (signed-in vs guest), without gating access — the page is fully public.
- The page publishes how-to and FAQ structured data and full SEO metadata (title, description, keywords, canonical URL, social-share cards) describing the provably-fair verification process.
- The protocol-details code snippets only load their interactive rendering when the collapsible section is expanded.

### Pricing / Subscription Plans
**As a** visitor considering a subscription **I want to** compare available plans and their benefits **so that** I can choose and purchase the right subscription.

**Acceptance criteria:**
- The page shows a back link to the browse catalog and a hero ("Subscribe Today. Save. Win.") with marketing copy and two static stat pills ("$1,000,000+ in prizes distributed", "+100,000 active participants").
- Subscription plans are displayed as cards in a value-tier grid; a smaller "Basic" tier is tucked behind a "Want to start smaller?" collapsible below the main grid.
- Each plan card shows pricing, benefits, and a discount sticker where applicable, and offers a subscribe action.
- If the viewer is already subscribed to a plan, that plan's card is marked as the current plan; cards for other plans deflect the viewer to the profile/subscription management surface instead of starting a new checkout.
- If the viewer is already on the Basic plan, the Basic collapsible opens by default.
- A "No purchase necessary — free entry available — void where prohibited" footnote appears adjacent to the prices, linking to the Free Entry page.
- A perpetual launch-pricing countdown banner shows an HH:MM:SS ticker, urgency copy, and a CTA that scrolls back to the plan cards.
- A "Have a question?" FAQ accordion answers questions about credit subscriptions, auto-renewal, discounts, and weekly free pool entries, with all items expanded by default.
- A top marquee banner reads "Share selected sweepstakes on X and get free entries!".

**System behavior:**
- Resolves the viewer's session locally first; only fetches the viewer's current subscription when they are signed in, fetching plans and current subscription in parallel.
- Plans are the critical data — if the plans fetch fails, the page renders a centered error card ("Unable to load pricing") with a "Back to Browse" CTA; a failed current-subscription fetch degrades silently to the non-subscriber experience.
- Plans are sorted by an operations-controlled display order; the Basic tier is identified by plan name and split off the main grid; if no Basic plan is returned, the collapsible is omitted.
- After returning from hosted checkout, a successful payment opens a success dialog and a cancelled payment fires a toast, keyed off URL query parameters.
- If the viewer arrives via a deep link carrying a plan id (e.g. after a sign-in round-trip), the checkout handoff for that plan auto-resumes; a stale/deactivated plan id is detected, toasted, and scrubbed from the URL rather than dispatched to the backend.
- The launch-pricing deadline is anchored to a fixed epoch with a rolling 2-day window so every client sees the same countdown; when it reaches zero it rolls forward and keeps ticking — it never shows an "expired" state.
- The countdown ticker is hydration-safe (placeholder digits until the browser clock takes over) and respects machine-readable timestamps for assistive tech.
- The layout reads the session to render the public navigation in an auth-aware way without gating access.

### Privacy Policy
**As a** user or regulator **I want to** read the platform's privacy policy **so that** I understand what data is collected, how it is used, and what rights I have.

**Acceptance criteria:**
- The page shows the "Privacy Policy" heading and a "Last updated" date.
- It presents numbered sections covering: who the data controller is and contact email; categories of data collected (account, checkout, winner KYC, on-chain identity commitment, device/usage); lawful bases for processing; data-subject rights (access, correction, deletion, restriction, portability, consent withdrawal, complaint), with a stated 30-day response time; cookies and analytics (essential vs. consent-based); data sharing with processors, hosts, and authorities, and a "we do not sell data" statement; retention periods (7 years for entry/draw/KYC/tax records, 30 days post-deletion for profile data); international transfer mechanisms; a no-under-18 children's policy; and a change-notification policy (14-day in-app notice).
- Contact email links open a mail client; a cross-link points to the Terms page.

**System behavior:**
- All content is static legal copy; no data is fetched and there is no interactivity.
- The page carries SEO metadata (title and description).

### Terms of Service
**As a** user or regulator **I want to** read the platform's terms of service **so that** I understand the rules governing entries, prizes, refunds, and disputes.

**Acceptance criteria:**
- The page shows the "Terms of Service" heading and a "Last updated" date.
- It presents numbered sections covering: agreement and acceptance; what a paid checkout buys (a quantity of entries with no guaranteed outcome); the "No Purchase Necessary" free Alternative Method of Entry with identical odds (cross-linked to the Free Entry page); eligibility (18+ / 21+ where required, residency restrictions, employee exclusions, void where prohibited); refund and cancellation policy (pre-draw paid refunds within 7 days, no post-draw refunds, cancel-anytime subscriptions, full refund for cancelled/voided sweepstakes); winner selection via verifiable on-chain randomness against a sealed manifest with a 30-day claim window; prize fulfillment within 30 days and alternate-winner rules; 7-year records retention; winner tax responsibilities and required tax forms; dispute resolution (contact email, 30-day good-faith window, binding arbitration with a 30-day opt-out); acceptable use rules; a change-notification policy (14-day in-app notice); and a contact section.
- Contact email links open a mail client; cross-links point to the Free Entry and How It Works pages.

**System behavior:**
- All content is static legal copy; no data is fetched and there is no interactivity.
- The page carries SEO metadata (title and description).

### Past Winners Archive
**As a** visitor **I want to** browse a list of recent winners **so that** I can see real outcomes and gain confidence the platform delivers prizes.

**Acceptance criteria:**
- The page shows a "Past winners" heading and the subline "Every draw verified on-chain. Names masked for privacy."
- An initial page of past winners is displayed immediately on load.
- As the visitor scrolls to the bottom of the list, additional pages of winners load automatically (infinite scroll).
- Winner display names are masked (e.g. "First L." or "Deleted User"); no raw user identity is shown.
- If the initial winners fetch fails, an error state ("Error loading past winners") is shown with a "Back to Browse" CTA.

**System behavior:**
- The first page of winners is fetched server-side for fast first paint and search-engine indexing; subsequent pages are fetched client-side as the bottom of the list enters view.
- Server and client share the same page size so no redundant refetch occurs on load.
- All winner records arrive pre-masked from the backend — no user identifier is ever sent to the browser; grouping keys only on the public sweepstakes identifier.
- The layout reads the session to render the public navigation in an auth-aware way without gating access.
- The page carries SEO metadata (title, description, canonical URL, social-share cards).

### Free Entry (No Purchase Necessary / AMOE)
**As a** visitor or regulator **I want to** understand how to enter sweepstakes for free **so that** I know participation never requires a purchase and the odds are equal.

**Acceptance criteria:**
- The page shows a "Free Entry" heading and the subline "No purchase necessary. Equal odds. Open to everyone eligible."
- A highlighted callout states that every paid-entry sweepstakes also accepts a free Alternative Method of Entry via a public share on X, with identical odds of winning.
- A step-by-step section explains how to claim a free entry: locate the "AMOE - Free Entries" button on a sweepstakes detail page, answer any required check-in question, post the pre-filled public share, then return and confirm the share to be credited a bonus entry, with on-screen confirmation and an email receipt.
- An "Entry allowance" section states one free entry per person per sweepstakes, that the free path is equivalent to the lowest paid tier, and that automated/duplicate/deleted/restricted-account shares are rejected.
- A "Processing" section explains that verification is typically instant, that unverifiable shares (private account, deleted post, altered link) grant no entry but can be retried, and that shares must be posted before the sweepstakes ends.
- An "Eligibility" section lists requirements (18+/21+ where required, residency restrictions, employee exclusions, a public X account in good standing).
- "Privacy" and "Questions" sections explain what share metadata is read and provide a support email plus links to external terms/privacy policies.

**System behavior:**
- All content is static informational copy; no data is fetched and there is no interactivity.
- The page carries SEO metadata (title and description).
- External terms/privacy links and the support email open appropriately (new tab / mail client).

### 404 / Page Not Found
**As a** visitor who reaches an unknown or moved URL **I want to** see a clear, branded "not found" page **so that** I can navigate back into the working app.

**Acceptance criteria:**
- Any unmatched URL renders a branded 404 page with the platform logo in a top bar, a large "404" heading, the message "This page doesn't exist or has been moved.", and a "Back to Browse" button.
- Decorative branded background shapes are displayed.

**System behavior:**
- A catch-all route intercepts every unmatched path and converts it into a normal page request that triggers the closest not-found boundary, ensuring the 404 page renders reliably.
- The root 404 stays minimal so unknown URLs get branded chrome without loading authenticated providers or stacking navigation bars.

---

## Browse & Raffle Participation

### Browse Raffles (Listing Page)
**As a** visitor (guest or signed-in user) **I want to** browse a curated landing page of available sweepstakes **so that** I can discover opportunities to win prizes.

**Acceptance criteria:**
- The page shows a hero section with the current live raffles and a combined total prize value (sum of declared prize values across listed raffles).
- A featured-raffles band displays up to two admin-curated featured raffles, styled distinctly (first highlighted blue, second green); the band is hidden entirely when there are no featured raffles.
- A primary grid lists live raffles, 12 per page, in a responsive 1-to-4 column layout.
- When no raffles match the active filters, an empty state appears reading "No sweepstakes found" with encouragement to check back later.
- A "Recent Winners" band appears below the hero when recent winner data exists; it is silently omitted when empty or when the data fails to load.
- A "Past Draws" band appears at the bottom listing up to 12 completed raffles sorted newest-first; omitted when empty or on fetch failure.
- A promotional marquee banner at the top reads "Share any sweepstakes on X and earn bonus entries!".
- A subscription-promo card is shown in the hero rail only to guests and non-subscribers; subscribers do not see it.
- Each raffle card shows cover image (or a "No image" placeholder), title (max two lines), host name, a "Verified host" badge, the ticket price, time remaining, and a participant-fill progress bar (hidden for unlimited-capacity raffles), plus a "Details" link to the raffle.
- Time remaining is shown as "Ended", "1 day left", "N days left", or "N months left" depending on the gap to the raffle end date.

**System behavior:**
- The system fetches, in parallel, the live raffles page, the featured raffles, the category list, and the current session.
- Listing is filtered to LIVE status only; results are paginated (page from URL, 12 per page), filtered by an optional category, and sorted by the selected sort option.
- Invalid sort or page values in the URL are ignored and fall back to defaults (page 1, default sort).
- Only active categories are used for filtering controls.
- If the main raffles fetch fails, a dedicated browse error page is shown instead of the grid.
- Failures of secondary sections (recent winners, past draws, featured) degrade gracefully without error UI.
- Raffle list data is cached with a short staleness window (stale 30s, revalidate 60s, expire 120s); the detail page is authoritative for purchase-time accuracy.
- A subscriber check is performed only for signed-in users to decide whether to show the upsell; the upsell defaults to visible if the check fails.

### Filter, Sort & Paginate Raffles
**As a** visitor **I want to** filter and sort the raffle list **so that** I can narrow results to what interests me.

**Acceptance criteria:**
- A category dropdown lets the user pick "All Categories" or any specific active category.
- A sort dropdown offers "Newest", "Ending Soon", and "Lowest Price".
- Changing a filter or sort updates the listing immediately and resets the page back to page 1.
- The selected filter and sort values persist in the page URL so they survive sharing and reload.
- Pagination navigates between pages of 12 raffles each.

**System behavior:**
- Filter and sort selections are written to URL search parameters; the page re-fetches the raffle list with the new parameters.
- Each filter/sort combination is cached independently.
- Changing any filter clears the page parameter, returning the user to the first page.
- The system records an analytics event whenever a category or sort filter is applied.

### View Raffle Detail
**As a** visitor **I want to** view the full details of a single raffle **so that** I can decide whether to enter.

**Acceptance criteria:**
- The detail page shows a media gallery (cover image plus gallery images), the raffle title, a copy-link button, the host's name/avatar with their total raffle count (linking to the host profile in a new tab), a collapsible description, and the raffle category.
- A "Sweepstakes Details" info card shows participant progress, fill percentage (or "Unlimited"), total entries sold, the active period (start–end dates), the declared prize value, minimum participants, and number of winners.
- When the entries sold are below the minimum participants, an informational tooltip explains winners would instead receive a cash/credit share of revenue.
- A FAQ accordion covers how it works, rules & eligibility (18+, all sales final and non-refundable), and what happens if a raffle misses its minimums (partial participation).
- A raffle updates section lists host-posted updates; the host (or anyone permitted) sees a "Post update" action when status allows.
- A comments section is shown for raffles in live/ended/fulfilling/completed status.
- The page is reachable by a public slug or short code.
- If the raffle does not exist, a 404 page is shown; on other fetch errors a dedicated detail error page with a "Back to Browse" link is shown.

**System behavior:**
- The system resolves the viewer first (decoding the session once), then fetches the raffle and categories in parallel.
- Guests receive a cached public version of the raffle; signed-in users receive a session-enriched version that additionally includes their X-share claim state.
- The system derives a view-state from raffle status: whether it is concluded, cancelled, has winners, whether the viewer is the owner, whether the active purchase card or cancelled card or draw-in-progress card should show, whether updates/comments/promo management are allowed, available tickets, and ticket price.
- Available tickets are computed as max participants minus current participants (never negative).
- An unknown or deleted category resolves to the display name "Other".
- The system records a "raffle viewed" analytics event with raffle, host, pricing, status, participant, and authentication metadata.
- A countdown auto-refresh poller keeps the raffle data current while status is transitional; while a draw is in progress a separate poller drives the draw surface (and the generic poller is suppressed to avoid double-polling).

### Conditional Raffle Detail States
**As a** visitor **I want to** see content appropriate to the raffle's lifecycle stage **so that** I always see relevant, accurate information.

**Acceptance criteria:**
- An active (not concluded, not cancelled) raffle shows the live purchase card, a countdown, a fire-icon "The sweepstakes is active!" panel, and a mobile sticky "Buy Tickets" bar.
- A raffle whose draw is running shows a "draw in progress" card.
- A concluded raffle with winners shows a winners list.
- A cancelled raffle shows a cancellation card with the reason (admin rejected, host cancelled, insufficient participants, no tickets, or partial participation) and stats.
- The host viewing their own draft raffle sees an edit affordance and cannot purchase entries.
- The host viewing their own live raffle cannot enter it ("You cannot enter your own sweepstakes").
- A signed-in non-host viewer who is not subscribed sees a subscribe upsell card on an active raffle.
- A signed-in viewer who has tickets sees a "Participant" badge next to the title and a "Report" action; the host sees neither on their own raffle.
- A "you'll only need KYC if you win" notice appears for active raffles.
- A share-on-X marquee banner appears for active raffles that do not yet have winners.

**System behavior:**
- For signed-in viewers the system fetches, in parallel, the viewer's ticket codes for this raffle, their winnings, their profile, their credit balance, their subscriber status, and (only for concluded raffles) their winner KYC status.
- Terminal states (winner / host-fulfillment / cancelled / not-won) are mutually exclusive and resolved by priority.
- A concluded non-winning non-host viewer sees a "not won" card.

### Purchase Raffle Tickets (Entries)
**As a** signed-in participant **I want to** buy entries into a raffle **so that** I improve my chance of winning the prize.

**Acceptance criteria:**
- The purchase card lets the user select a quantity of entries up to the available-tickets cap.
- The card shows a price breakdown: subtotal, any discounts, and total.
- A subscriber sees their per-entry price discounted by their plan's discount percentage, with the original price struck through and the savings shown.
- A user can apply a promo code; a valid code adjusts the price (percentage/amount discount or free entries).
- A "closing soon" warning appears when the raffle is near its end time.
- Clicking the purchase trigger requires the user to acknowledge the legal/consent ("Access Pass") checkbox first; clicking without it scrolls to and highlights the checkbox.
- A payment-method picker offers Credits, Card, and Crypto tenders; unavailable tenders are shown as disabled with an explanatory label.
- If the user has a credit balance, Credits leads the list as the promoted option; otherwise Card leads.
- Crypto is only offered when the raffle accepts crypto and a supported chain is selectable; tapping Crypto reveals the accepted chains/tokens.
- After a successful credit purchase, an "entries confirmed" celebration replaces the picker.
- After returning from a card payment, a payment-status modal is shown.
- Guests see a "Sign in to buy" call to action instead of the purchase trigger.
- The host cannot purchase entries on their own raffle (trigger disabled).
- If the raffle requires a qualifying question, the user must answer it correctly before checkout proceeds.

**System behavior:**
- The system atomically creates or reuses a checkout order for the raffle, ticket quantity, and optional promo code in a single backend transaction; the backend validates promo and order reuse.
- An order whose total is reduced to zero by a promo is treated as fully discounted and auto-completed.
- Card payments go through a hosted checkout session; the system passes the expected total as a guard.
- After a card redirect, the system captures the returning session identifier into state and then strips it from the address bar to prevent leaking it via the URL or referrer.
- Credit payments settle synchronously within the modal.
- Crypto payments connect a wallet and run their own confirmation flow; wallet connection state persists across navigation within the raffle detail route.
- The system records analytics events for order creation and order failure.
- Order/checkout errors span order, raffle, and promo error domains; promo-specific errors clear the applied promo code.
- The same purchase surface is presented on mobile inside the page and via a sticky bottom bar; both share a single quantity/promo state.

### Claim Free Entries (No-Purchase-Necessary / AMOE)
**As a** participant **I want to** enter a raffle without paying **so that** I can participate via the legally required free-entry method.

**Acceptance criteria:**
- Active raffle pages link to a no-purchase-necessary free-entry method.
- When a free-tickets promo is applied, the purchase trigger label changes to "AMOE - Free Entries" and bypasses the payment picker.
- A signed-in viewer who is not the host and is not blocked from purchasing sees a "Share on X" button to earn a bonus entry.
- Each user can earn at most one bonus entry per raffle for life; once verified the share button shows the claim as used.
- If the user shared but did not verify in a prior session, the verify step resumes on return.

**System behavior:**
- A free-tickets promo posts a zero-cost order directly and opens the entries-confirmed modal.
- The X-share flow creates a share intent (plain or tokenized), then verifies it to grant the bonus entry; verification grants the entry on the first call regardless of whether the tweet is indexed.
- Any share-claim token is stripped from the URL after the page loads.
- After a successful verify, the system polls the ticket-codes endpoint until the new entry is reflected, then refreshes the page so "My Tickets" shows the bonus entry.
- A pending claim past its expiry is rejected; re-sharing refreshes the claim.
- If the raffle has a qualifying question, the user must answer it correctly before sharing, the same gate used for purchases.

### View My Entries / Ticket IDs
**As a** signed-in participant **I want to** view all my entries (ticket codes) for a raffle **so that** I can track and verify my participation.

**Acceptance criteria:**
- The page lists the user's entry codes for the raffle in a table with row number, entry code, source, and date.
- Source is shown with friendly labels: "Purchased", "Promo code", "Shared on X", "Crypto payment", "Partner reward", or "Bonus".
- Sources with a receipt (card receipt or block-explorer transaction) link out to that receipt in a new tab.
- Results are paginated at 20 rows per page with Previous/Next controls and a "Page X of Y" indicator.
- When the raffle status is fulfilling or completed, each row gains a "Verify" link that opens the verification page pre-filled with the raffle slug and entry code.
- When the user has no entries, an empty message is shown.

**System behavior:**
- The page requires authentication; guests receive a 404.
- The system fetches the session, then the raffle, then the user's ticket codes for that raffle in sequence.
- A non-existent raffle yields a 404.
- The "Verify" column is shown only for statuses with a published verification manifest (fulfilling, completed); "ended" is excluded because the draw randomness is still in flight.

### Host Fulfillment Management
**As a** raffle host **I want to** manage prize fulfillment for all winners of my concluded raffle **so that** I can deliver prizes and track delivery.

**Acceptance criteria:**
- The page shows the raffle title and a table of all winners with fulfillment controls.
- Only the raffle's host can access the page.
- The page is reachable only after the raffle has concluded (ended/fulfilling/completed).

**System behavior:**
- The system fetches the session and the raffle in parallel, then the winners list (up to 100).
- A guard chain runs in order: unauthenticated users are redirected to sign-in; if the raffle does not exist, the viewer is sent back to the raffle detail page; non-host viewers are redirected to the raffle detail page; non-concluded raffles redirect to the raffle detail page.

### View Public Host Profile
**As a** visitor **I want to** view a host's public profile and their raffles **so that** I can assess their reputation before entering.

**Acceptance criteria:**
- The profile shows the host's avatar (or initial), display name, bio, average star rating, and review count ("No reviews yet" when none).
- The profile lists the host's raffles in a grid (12 per page).
- A status tab switches between "active" raffles (live) and "ended" raffles (ended, fulfilling, completed, cancelled).
- When the host has no raffles for the selected tab, a contextual empty message is shown ("No active sweepstakes" / "No ended sweepstakes").
- The profile is reachable by either the host's username or their user ID.
- An unknown host yields a 404; other errors show an inline error screen with a "Back to Browse" link.

**System behavior:**
- The route segment is validated against accepted identifier shapes (a UUID, or a username of 3–30 alphanumeric/underscore characters) before any backend call; segments that can never identify a host are treated as 404 — identical to a valid-format-but-unknown username, so the response cannot be used to enumerate username format.
- The system detects whether the identifier is a UUID or username and queries the host raffles with the matching key.
- The status filter is read from the URL; "ended" maps to the concluded/cancelled status set, otherwise "active" maps to live.
- Host profile and host raffles are fetched in parallel.
- A confirmed not-found from the backend triggers the 404 page; all other failures (network, timeout, server error, contract drift) render an inline error so the user can distinguish "no such host" from "service unreachable".

### Comment on a Raffle
**As a** signed-in participant **I want to** read and post comments on a raffle **so that** I can ask questions and discuss with others.

**Acceptance criteria:**
- The comment section shows a total comment count, sortable by "Top", "Newest", or "Oldest".
- Comments load in pages with a "Load more comments" button.
- Signed-in users can post a comment; guests see a "Sign in to leave a comment" prompt.
- An empty section shows a "No comments yet" / "Be the first to share your thoughts" message.
- Comments are available only for raffles in live/ended/fulfilling/completed status.

**System behavior:**
- The selected comment sort is stored in the URL ("Top" is the default and is omitted from the URL).
- The viewer's identity (authenticated, owner, user id) is passed to the comment widget to gate posting and deletion permissions.

### Verification Hub — Verify Any Result
**As a** visitor **I want to** verify any entry or winner of a concluded raffle **so that** I can independently confirm results were not manipulated.

**Acceptance criteria:**
- The verification hub offers two tools: "Verify Your Entry" and "Verify a Winner".
- Entry verification takes a raffle ID/slug and an entry code; winner verification takes a raffle ID and a 1-indexed winner position.
- Both forms disable submission until required fields are filled and show a loading state while checking.
- The verify page can be opened pre-filled from a ticket-codes table link (raffle and code passed via the URL); changing those URL values re-seeds the form.
- A "Learn More" link points to the how-it-works page.

**System behavior:**
- The page explains that every raffle uses entry data locked before the draw and random numbers from an external verifiable source.

### Verify an Entry
**As a** visitor **I want to** check a single entry against the cryptographic manifest **so that** I can confirm the entry was genuinely included in the draw.

**Acceptance criteria:**
- A successful check shows: entry ID, entry code, a "Merkle Verified" yes/no indicator, status (Valid or Voided), and — if the entry won — the winner position (1-indexed for display).
- When available, the entry's Merkle inclusion proof is displayed.
- The result offers "Verify Another" and a link to the raffle's full verification details.
- Error messages are specific: entry not found, raffle not drawn yet, proof not available, invalid server response, or network error.

**System behavior:**
- The system verifies the entry code against the raffle's Merkle manifest, returning whether it is Merkle-verified, voided, a winner, and its winner position.
- After a successful entry verification, the system additionally fetches the Merkle inclusion proof; a failed proof fetch does not fail the verification (proof simply omitted).
- The backend may report "not drawn yet" either because the draw randomness is still pending or because the raffle is not completed; both surface the same user message.

### Verify a Winner
**As a** visitor **I want to** verify how a specific winner was selected **so that** I can confirm the winner selection is provably fair.

**Acceptance criteria:**
- A successful lookup shows: winner position (1-indexed), winning entry ID, winning entry code, a "Merkle Verified" yes/no indicator, and a "Computed vs Actual" match/mismatch comparing the recomputed winning entry against the recorded one.
- The result displays the random number used and the selection formula, with a copy control for the random number.
- The result links out to the external randomness oracle (Chainlink VRF Coordinator) and the platform's VRF handler contract.
- The result offers "Verify Another" and a link to the raffle's full verification details.
- Error messages are specific: winner not found, raffle not drawn yet, invalid server response, or network error.

**System behavior:**
- The user enters a 1-indexed position; the system converts it to the backend's 0-indexed convention before lookup.
- The system retrieves the VRF random number, the selection formula, the recomputed entry ID, and the actual winning entry ID, and verifies the Merkle inclusion.
- A raw network rejection is caught defensively and surfaced as a network error rather than leaving the form stuck in a loading state.

### Raffle Verification Deep Dive
**As a** visitor **I want to** see the complete verification record for a concluded raffle **so that** I can audit on-chain anchors and every winner's proof.

**Acceptance criteria:**
- The deep-dive page shows complete technical verification data for a specific raffle: title, total entries, the manifest hash, the commit transaction hash, the VRF request ID, the VRF fulfillment transaction hash, and per-winner verification proofs.
- While loading, a spinner is shown; on error, a "Verification data not available" message with a link back to the verification hub.
- The page has its own SEO metadata (indexable, canonical URL) keyed to the raffle.

**System behavior:**
- The page resolves the raffle ID from the route and fetches the full verification payload client-side (with loading and error states).
- The verification record ties the raffle to its on-chain anchors (commit transaction, VRF request and fulfillment transactions) and the Merkle manifest hash.

### Winners List & Provably-Fair Disclosure
**As a** visitor **I want to** see the winners of a concluded raffle alongside verification anchors **so that** I can trust the outcome.

**Acceptance criteria:**
- A concluded raffle with winners shows each winner's card including position and winning entry code.
- The currently-signed-in viewer's own winning entry is highlighted within the list.
- Winner cards expose the verification anchors (total entries at draw, manifest hash, commit transaction hash) for cross-checking.

**System behavior:**
- The winners list is populated only after a raffle concludes and has winners.
- The system identifies the viewer's own winning position by matching their winnings record to the raffle.

### Winner & Host Post-Draw Experience
**As a** raffle winner or host **I want to** see my outcome and next steps after the draw **so that** I can claim a prize or fulfill prizes.

**Acceptance criteria:**
- A winner sees a congratulations card with their name, avatar, and winning entry code, followed by a prize breakdown and a fulfillment timeline.
- The fulfillment timeline gates the claim step on the winner's KYC status — a winner without KYC cannot progress past claiming.
- A host of a concluded raffle with winners sees a fulfillment call-to-action, a revenue breakdown, and the raffle info card.
- For partial-participation raffles, winners, hosts, and other viewers see a credit-payout breakdown instead of the prize/revenue breakdown.

**System behavior:**
- For partial-participation raffles the platform keeps a 1% fee and divides the remaining 99% of revenue equally among winners as platform credits, with no host involvement.
- The system selects the credit-payout card whenever the raffle concluded under partial participation, ensuring displayed figures match the credits actually granted rather than the declared prize.
- Winners are still selected via the same provably-fair (VRF) process even under partial participation.

---

## Subscriptions & Plans

### Subscription plan tiers (Basic, Starter, Pro)
**As a** prospective member **I want to** choose from three distinct paid subscription tiers **so that** I can pick the level of credits and benefits that matches how much I want to spend.

**Acceptance criteria:**
- Three tiers are offered, each on its own dedicated marketing landing page: Basic, Starter, and Pro.
- Basic: charge $10/month, awards $11 in credits each cycle, "10% OFF" badge, 10% discount on every entry, funds 10 tickets per cycle.
- Starter: charge $25/month, awards $30 in credits each cycle, "15% OFF" badge, 15% discount on every entry, funds 25 tickets per cycle, plus 5 free weekly sweepstakes entries.
- Pro: charge $100/month, awards $125 in credits each cycle, "20% OFF" badge, 20% discount on every entry, funds 100 tickets per cycle, plus 25 free weekly sweepstakes entries and priority access to limited-capacity sweepstakes.
- Each landing page is bound to exactly one tier; its hero, benefits, urgency caption, prize caption, and call-to-action all reflect that tier's numbers.
- Ticket count equals the charge amount because each ticket costs $1; credit payout always exceeds the charge (the "pay $N, get $M back" promise).

**System behavior:**
- Each tier maps to a backend plan identified by a stable slug (`basic_access_pass`, `starter_access_pass`, `pro_access_pass`); the slug is the only thing that varies between the three otherwise-identical landing pages.
- The selected tier's slug is the value submitted to the payment/checkout service; the backend re-validates the slug against its catalog and rejects unknown slugs as "plan not found."
- Plan pricing, payout, discount, ticket count, and benefit copy are configured client-side but mirror the authoritative backend plan records; a price change upstream requires a matching config update to keep displayed copy honest.
- Benefit bullet text and highlight tags (NEW / LIMITED OFFER / Only PROs) mirror the backend plan feature list verbatim, so the catalog could later be fetched dynamically without copy changes.

### Subscribe landing page (marketing + enrollment)
**As a** visitor **I want to** see a focused marketing page for a plan with its value proposition, benefits, live prizes, and a single enrollment action **so that** I can understand the offer and sign up without distraction.

**Acceptance criteria:**
- The page shows: a minimal navbar (brand mark only), a scrolling trust-message banner ("Real prizes. Verified draws. Enter in seconds."), a hero, a limited-offer countdown, a benefits section, a live-prize showcase, a final call-to-action, and a footer.
- The hero states the offer as "Pay $<charge>. Get $<payout> back." with the payout highlighted, plus a savings line ("Save N% on every deal."), trust stats ($1,000,000+ in prizes distributed, +100,000 active participants), and the enrollment card.
- The benefits section ("Early Member Perks") shows four cards: Content Portal, Boosted Earnings, Free Phone Plan, and Sweepstakes Access; bullet copy varies by tier while card illustrations stay constant.
- The "Free Phone Plan" benefit is identical across all tiers (a general membership perk, not a tier-specific feature).
- The prize showcase displays up to four currently-live raffles with a caption tying them to the tier's ticket count ("Your N tickets work on any of these live raffles").
- The final call-to-action repeats the payout figure and, when clicked, smoothly scrolls back up to the enrollment card rather than navigating away.
- The navbar is deliberately stripped of secondary links (no browse link, mode toggle, or sign-in CTA) to keep the page conversion-focused.

**System behavior:**
- The page fetches up to four live raffles sorted by "trending" for the prize showcase.
- Fetched raffles are re-ordered so a fixed marketing priority list of prize titles appears first, with all others following in trending order.
- If the live-raffle fetch fails or returns nothing, the entire prize section is hidden rather than showing an empty state or failing the whole page.
- The page renders identically for anonymous and returning visitors; no session is read because the enrollment flow is the same for everyone.

### Limited-offer urgency countdown
**As a** visitor **I want to** see a countdown timer creating urgency around the offer **so that** I feel encouraged to act now.

**Acceptance criteria:**
- A "Limited Offer" banner shows an HH:MM:SS countdown with a caption "to claim your $<payout> in raffle credits".
- The countdown starts from a 15-minute window when the page loads in the browser.
- When the timer reaches zero it freezes at 00:00:00 rather than resetting or looping.

**System behavior:**
- The countdown is a purely client-side marketing pressure cue anchored to the visitor's own clock at page load; it is not a backend-enforced deadline and has no functional effect on pricing or availability.
- Before the timer arms, a placeholder ("--:--:--") is displayed to avoid visual jumps.

### Enrollment / credit-purchase action
**As a** visitor **I want to** enter my email and start checkout for a plan **so that** I can subscribe and receive my credits.

**Acceptance criteria:**
- The enrollment card asks "Who is receiving your $<charge> in credits?" and collects a single email address.
- The submit button reads "Claim My $<payout> Credits" and the offer footer discloses the subscription terms: "$<charge>/month, billed monthly until cancelled. $<payout> in credit value applied each cycle. Cancel anytime from your account."
- Email format is validated; an invalid address shows an inline error, validated only after the field is first left and re-checked on every change thereafter.
- A disclosure tells new users an account will be created after checkout via a magic link, and tells existing users to sign in first (with a link to the sign-in page).
- The submit button stays disabled until an anti-bot verification token is obtained; while submitting it shows a spinner and reads "Redirecting…".
- On success the visitor is sent (full-page navigation) to the external hosted payment page where card details are collected.
- On failure a human-readable error message appears (e.g. payment partner unreachable, too many attempts, temporarily unavailable, network trouble) without exposing internal error codes.

**System behavior:**
- The enrollment action submits the email, the tier's plan slug, and an anti-bot challenge token to a backend checkout broker; the broker returns a hosted-payment-page URL.
- Card details are never handled by the application — they are collected entirely on the external payment provider's hosted page (PCI scope stays with the provider).
- The email entered here is forwarded as payment-session metadata so the post-payment magic link and subscription enrollment are locked to that address, not whatever the buyer might retype downstream.
- The anti-bot token is single-use; on a failed attempt the challenge is reset and a fresh token must be obtained before retrying.
- Existing-account emails are silently rejected by the backend with a generic "checkout failed" error (an enumeration shield); the pre-submit disclosure exists so returning users sign in instead of hitting an opaque error.
- Distinct failure causes are mapped to distinct user-facing messages: payment partner unreachable, rate-limited / too many attempts, plan or provider misconfigured ("temporarily unavailable"), generic fetch failure, network/timeout, and a fallback unknown error. Misconfiguration and unexpected failures are reported to error monitoring for operations to investigate.
- Input shapes (email, plan slug, token) are validated before the backend call; tampered or malformed values fail fast as a generic fetch failure.
- The checkout endpoint is intentionally unauthenticated because the buyer has not yet created an account at this point.
- After payment, the provider redirects the buyer to the tier-specific pending page; a backend webhook drives subscription enrollment.

### Post-payment pending page ("Check your email")
**As a** buyer who just paid **I want to** see a confirmation that my payment was received and learn what to do next **so that** I know the purchase succeeded and how to claim my credits.

**Acceptance criteria:**
- Immediately after the payment provider captures the first charge, the buyer lands on a tier-specific pending page showing "Check your email" and "Payment received."
- The page tells the buyer a one-click sign-in link was emailed and instructs them to click it to claim their $<payout> in credits (payout amount reflects the tier).
- If the buyer's email can be confidently parsed from the page address, it is shown so they can verify the inbox and spot typos; otherwise the copy degrades to a generic "the email you entered at checkout".
- The page warns the link can take a minute to arrive and to check the spam folder.

**System behavior:**
- This page is shown before the fulfillment webhook completes and before the magic-link email arrives.
- The email is read from the page address, trimmed, and accepted only if it looks like a valid address and fits within standard length limits; otherwise generic copy is used so a tampered or malformed value never renders.
- The page is excluded from search-engine indexing (it has no SEO value outside the funnel).
- Each tier has its own pending page so the correct credit value is shown and the downstream success page targets the right tier.

### Subscription success page (magic-link claim confirmation)
**As a** buyer who clicked the emailed sign-in link **I want to** see that my credits are claimed and be guided to where I can spend them **so that** I can start entering raffles immediately.

**Acceptance criteria:**
- When the buyer arrives with a valid signed-in session, a "Credits claimed!" card confirms their $<payout> in credits are live on their account and that credits apply automatically at raffle checkout.
- The success card's primary action takes the buyer to browse live raffles.
- If the buyer arrives without a valid session (link expired or already used), a "Magic link expired" card is shown instead, explaining the link timed out or was already used and offering to restart the flow.
- The expired-link card's action returns the buyer to the subscribe landing page for the same tier they originally chose, not a generic sign-in page or the entry-level tier.
- Expired-link copy avoids blaming the user (frames expiry as a product constraint).

**System behavior:**
- This page is the magic-link callback; arriving with a session indicates the sign-in succeeded and the fulfillment webhook granted the credits.
- The page checks for an active session and renders one of two states (claimed vs. expired) accordingly.
- When a valid session resolves, a "public credit claimed" analytics event is recorded against the user, fired non-blocking so it never delays the page; the event is deliberately suppressed for the no-session/expired branch so it stays attributed to a known user.
- Each tier has its own success page so the correct credit value is shown and the expired-link fallback routes back to the matching tier's landing page.
- The page is excluded from search-engine indexing.

### Subscription fulfillment and recurring billing (System)
**As the** system **I want to** fulfill a paid subscription after payment and renew it monthly **so that** subscribers receive their credits on a recurring cycle.

**Acceptance criteria:**
- After the first charge is captured, the system either enrolls an existing user directly or buffers a pending subscription grant and sends a magic-link email to a new buyer.
- Clicking the magic link signs the buyer in, finalizes the subscription record, and grants the first cycle's credits.
- Subsequent monthly charges renew the subscription automatically and replenish credits on the same cadence.
- Subscriptions can be cancelled by the member from their account at any time.

**System behavior:**
- A backend webhook from the payment provider drives enrollment after the charge is captured.
- The magic-link verification step drains the buffered pending-subscription grant, creates the active subscription record, and issues the cycle's credits.
- Recurring monthly charges are handled by the payment provider; each successful renewal replenishes the credit balance.
- Credits awarded by a subscription are spendable on any live raffle and apply automatically at entry checkout; per the benefit copy, expired credits convert into entries for a monthly sweepstakes pool.

### Tier-specific entitlements unlocked
**As a** subscriber **I want to** receive the perks of my chosen tier **so that** I get ongoing value from the subscription beyond the initial credits.

**Acceptance criteria:**
- All tiers unlock: a monthly credit payout exceeding the charge, a per-entry discount (10/15/20% by tier), access to an exclusive 10,000+ item content library and partner offers, a free phone plan perk, and conversion of expired credits into monthly-pool sweepstakes entries.
- Starter additionally unlocks 5 free weekly sweepstakes entries and access to subscriber-only sweepstakes.
- Pro additionally unlocks 25 free weekly sweepstakes entries, access to subscriber-only weekly AND monthly sweepstakes, and priority entry to limited-capacity sweepstakes.
- Basic does not include free weekly sweepstakes entries or subscriber-only sweepstakes access.

**System behavior:**
- Entitlements escalate strictly by tier (Basic ⊂ Starter ⊂ Pro in scope of perks), with higher tiers adding free weekly entries, broader subscriber-only sweepstakes access, and (Pro only) priority entry.
- The per-entry discount percentage is applied to every raffle/sweepstakes entry the subscriber makes.

---

## Host Raffle Management

### Host raffle dashboard (My Raffles list)
**As a** raffle host **I want to** see all the raffles I have created, grouped by lifecycle stage **so that** I can monitor and act on each of them from one place.

**Acceptance criteria:**
- The dashboard shows raffle cards for raffles I created (host mode), distinct from the participant view that shows raffles I entered.
- Three status tabs are available: "Scheduled" (host-only), "Live", and "Ended". The "Live" tab is selected by default.
- The "Scheduled" tab shows raffles in draft or queued state. The "Live" tab shows live raffles. The "Ended" tab shows cancelled, completed, ended, and fulfilling raffles.
- A "Create new Sweepstakes" button appears only in host mode and only when the user is allowed to switch to host mode.
- Results are paginated (10 raffles per page); changing tabs resets to page 1.
- Each raffle card shows: cover image carousel, title, entry price, prize (declared) value, participant count, fill progress bar, and a status-appropriate action row.
- Cancelled raffles show a badge: "Auto-Cancelled" (orange) when the system cancelled them for failing a threshold, or "Cancelled" (red) when the host withdrew them deliberately.
- Uncapped raffles (max participants = 0) display "Unlimited" instead of a fill percentage, and the progress bar stays empty.
- Draft cards expose: Edit, Preview, and a Publish/Schedule split control. Queued cards expose: Edit (revert to draft), Preview, and "Go Live Now". All other cards expose a "Details" link to the public page.
- Each card offers share buttons linking to the public raffle page.
- An empty state with a contextual title/description appears when a tab has no raffles (e.g. "No scheduled sweepstakes", "No active sweepstakes — Create your first sweepstakes to get started!", "No ended sweepstakes").
- If the raffle list fails to load, an error screen appears with a link back to the public raffles page.

**System behavior:**
- The system filters draft and queued statuses out of the participant view — those statuses are host-only; an empty or fully-filtered status falls back to "live".
- Fill progress is computed as current participants ÷ max participants, clamped to 100%.
- The "Auto-Cancelled" vs "Cancelled" distinction is derived from the raffle's cancellation reason (`admin_rejected`, `host_cancelled`, `insufficient_participants`, `no_tickets`, `partial_participation`).
- The dashboard list is cached for 60 seconds and refreshed when a raffle is created, published, activated, or deleted.

### Create a raffle (multi-step wizard)
**As a** raffle host **I want to** create a new raffle through a guided multi-step form **so that** I can list a prize and collect entries.

**Acceptance criteria:**
- The create page is only accessible to users with raffle-creation permission; users without it are redirected to the dashboard.
- The wizard has three steps: Basic Info, Entries & Schedule, and Review.
- A sidebar shows the user's name, total raffle count, and helpful links (Legal Stuff, How to host a Sweepstakes, Minimum Target, Promo tips, Entry Bundles).
- **Basic Info step** collects: cover/gallery images (up to 4 image files), title, description (rich text), declared value (in USD), and category.
- **Entries & Schedule step** collects: start date + start time, end date + end time, price per entry (USD), number of winners, minimum participants, maximum participants, crypto payment configuration, pending promo codes, and a participant check-in question.
- **Review step** shows a read-only preview of all entered data (cover/gallery preview, host identity, all fields, promo-code count) with inline "Edit" buttons jumping back to a prior step, and a "Create" button.
- A "Continue" button advances the step only after the current step's fields pass validation; on failure, errors render inline and the page scrolls to the first error.
- Each step has a "Clear all" button that resets that step's fields (enabled only when at least one field has content).
- If the start date/time is now or in the past, the review step shows a "The sweepstakes will start now" notice.
- A draft of in-progress work is saved (locally) and the user can restore it on return via a restore-draft prompt, or start fresh.
- Navigating away with unsaved changes prompts the user to stay, save a draft, or leave without saving.
- On successful creation, a success modal is shown, the form and draft are cleared, and the wizard resets.

**System behavior:**
- Validation rules (enforced both client-side and server-side):
  - Title: 3–200 characters.
  - Description: 10–5,000 characters (measured as plain text after stripping markdown).
  - Declared value: at least 0.50.
  - Price per entry: at least 0.50.
  - Number of winners: integer, 1–100.
  - Min participants: integer ≥ 0 (0 disables the minimum).
  - Max participants: integer 0–1,000,000 (0 means unlimited).
  - Start date/time must be now or later; end date/time must be in the future.
  - End must be at least 24 hours after start.
  - Min participants must not exceed max participants (when both non-zero).
  - When min participants is non-zero it must be strictly greater than the number of winners.
  - Category and check-in question are required selections.
- Declared value and ticket price are stored as USD; the host's timezone is captured automatically from the browser.
- Crypto payment config: an "accepts crypto" toggle, a set of allowed EVM chains and tokens (empty selection means "all allowed"), and per-ticket pricing required for each non-stablecoin token. Crypto config is ignored when "accepts crypto" is off.
- The check-in question is chosen from a list of active platform questions; selecting one previews its answer options ordered by sort order.
- The "What happens when the sweepstakes ends?" breakdown explains three outcomes: a Full draw (min participants reached → winners get the declared prize), a Partial draw (between winners count and min−1 participants → winners split revenue as cash), and Auto-cancel (fewer participants than winners → raffle cancelled, all entries refunded).
- Creation pipeline runs in phases, each failing independently without aborting the rest: create the raffle record → upload cover and gallery images → persist any pending promo-code batches sequentially → auto-publish if the start time is already past and a cover was uploaded.
- A new raffle is created in "draft" status. Auto-publish is skipped (raffle stays draft) if no cover was uploaded; the host is told to publish manually.
- Pending promo codes are queued locally during creation and only persisted to the server after the raffle exists; the queue is capped at 20 total codes across batches.
- Server-rejected field errors are surfaced as a toast and as an inline error, navigating the user to the offending step.
- The system records analytics events for wizard entry, each step completion, and successful/failed creation.

### Edit a raffle (pre-launch changes)
**As a** raffle host **I want to** edit a raffle's core details before it goes live **so that** I can correct or improve the listing.

**Acceptance criteria:**
- The edit page is only accessible by the raffle's owner; non-owners are redirected to the dashboard; a missing raffle returns a not-found page.
- Editing is only allowed while the raffle is in draft status; any other status redirects to the dashboard.
- The form is pre-filled with the raffle's existing values, including existing cover/gallery image URLs, dates split into date + time, category, check-in question, and crypto configuration.
- The edit form uses the same multi-step layout, fields, and validation as create (except the start-date "cannot be in the past" rule is relaxed).
- A queued raffle can be edited: choosing "Edit" on a queued card first reverts it to draft, then opens the edit page.
- When the raffle is already live, the start date is locked and a "Sweepstakes is live — start date cannot be changed" banner is shown.
- When entries have been sold (participant count > 0), the price-per-entry field is locked and a "Price is locked because entries have been sold" banner is shown.
- The submit button saves only when something actually changed.

**System behavior:**
- Field-lock restrictions are derived from raffle state: start date is locked if the raffle is live OR has any participants; price is locked if any participants exist.
- The save pipeline: short-circuits if nothing changed → validates required category/question selections → sends only the changed fields (a computed diff) → uploads any newly attached media (best-effort) → auto-publishes if the raffle is still draft and the saved start time is now/past → resets the form and returns to the dashboard.
- A zero-field diff is treated as a no-op.
- Auto-publish on save is skipped for non-draft raffles (publishing one would be rejected); failure is surfaced as a warning telling the host to publish manually.
- Raffle detail is cached for 300 seconds; the host always sees their own latest unpublished state, not a cached public snapshot.

### Publish / schedule a raffle
**As a** raffle host **I want to** publish a draft raffle immediately or schedule it for a future start **so that** participants can begin entering at the right time.

**Acceptance criteria:**
- A split control offers two modes: "Go Live Now" and "Schedule for Later"; the chevron switches the active mode.
- "Go Live Now" publishes the raffle immediately; "Schedule for Later" publishes it to begin at the configured start time.
- The control is available on draft raffle cards and on the edit page.
- On success, the host sees a confirmation message ("going live, may take 1-2 minutes" for now, or "scheduled" for later) and is returned to the dashboard.
- Failures surface a specific message: not in draft status, no permission, missing required fields, or incomplete crypto config.

**System behavior:**
- For "Go Live Now", if the raffle's start date is still in the future, the start time is first updated to the current moment so the backend transitions it to live; this is skipped if the start date is already today or earlier.
- Publishing requires the raffle to be in draft status; publishing a non-draft raffle fails with a "not draft" error.
- Publishing fails if required fields are missing or the crypto config is incomplete (tokens missing pricing).

### Activate a queued raffle
**As a** raffle host **I want to** instantly take a scheduled (queued) raffle live **so that** I can launch ahead of its scheduled start.

**Acceptance criteria:**
- Queued raffle cards show a "Go Live Now" button and an "Edit" button.
- Activating shows in-flight feedback ("Activating..."), then a success message ("Sweepstakes is now live!") and refreshes the dashboard.
- "Edit" on a queued raffle reverts it to draft ("Reverting...") then navigates to the edit page.
- Both buttons are disabled while either action is in progress.
- Failures show an error toast and leave the raffle unchanged.

**System behavior:**
- The system requires a raffle to be reverted to draft before edits can be accepted; the Edit action performs the unpublish-then-navigate sequence automatically.

### Post a raffle update / announcement
**As a** raffle host **I want to** post a text-and-image update about my raffle **so that** I can keep participants informed.

**Acceptance criteria:**
- The update page is only accessible by the raffle's owner; non-owners are redirected; a missing raffle returns not-found.
- Updates can only be posted while the raffle is live, fulfilling, or completed.
- The form ("New post") collects update text (rich text) and up to 5 images (PNG/JPEG/WebP).
- The post button is disabled until the form is valid; a "Clear all" button resets text and images (enabled only when there is content).
- Images can be previewed in a lightbox and removed individually.
- On success the host sees a confirmation and is returned to the public raffle page.

**System behavior:**
- Update text is required, 1–5,000 characters.
- Two-phase submit: the update record (text only) is created first, then images are uploaded to it.
- If image upload fails after the record is created, the host is still redirected with a warning that images can be retried later (the update itself succeeded).
- Posting an update revalidates the raffle detail cache.
- "Ended" raffles are intentionally excluded from update posting (winners still being finalized).

### Manage promo codes
**As a** raffle host **I want to** create, view, share, deactivate, and export promo codes for my raffle **so that** I can run promotions and attract participants.

**Acceptance criteria:**
- The promo codes page is only accessible by the raffle's owner; non-owners are redirected; a missing raffle returns not-found.
- Promo codes can be created or deactivated only while the raffle is in draft, queued, or live status; for ended/completed/cancelled raffles the page is read-only with a "this sweepstakes has ended — promo codes are view-only" notice.
- The page lists existing promo codes in a table showing: code, type, value, usage count, per-user redemption limit, status, expiration, and per-row actions; it also shows a total count and a refresh control.
- A "Create Code" button opens a creation modal (hidden when read-only). An "Export" button appears only when at least one code exists.
- The promo code creation modal collects: count (1–100 codes per batch), type, value, usage limits (max uses, with an "unlimited" option), per-user redemption limit (with an "unlimited" option), and expiration date (with a "no expiration" option).
- Three raffle-scoped promo types are offered: Bonus Entries (free tickets), Fixed Discount, and Percentage Discount. The "Bonus Entries" type is only available when the raffle has a check-in question configured.
- After creation, the modal shows the generated code strings and a way to export that batch.
- Each code row offers "Copy" of the code, a "Copy share link" action (a public raffle URL pre-loaded with the code), and a dropdown with "Copy Batch ID" (for codes created in a batch) and "Deactivate".
- Only active codes can be deactivated; used, expired, or already-inactive codes show no deactivate action.
- The export modal lets the host filter by batch ID, redemption state (all / redeemed / unredeemed), status (all / active / inactive), and type, then download a CSV.
- The table is paginated.

**System behavior:**
- Promo code creation validation: count is an integer 1–100; value must be positive; for percentage discounts the value must be 1–100; for bonus entries the value must be a whole number; max uses 0–10,000 and per-user limit 0–10,000 where 0 means unlimited; an expiration date is required unless "no expiration" is checked.
- The expiration date is converted to an end-of-day timestamp in the host's local time.
- A "free tickets" promo type is gated on the raffle having a participant check-in question.
- Promo code statuses are: active, inactive, expired, and exhausted.
- Creation produces a batch with a batch ID; the success toast reports how many codes were created.
- Manageable statuses for promo codes are draft, queued, and live; concluded and cancelled raffles cannot have promos modified.
- The page bypasses the public cache so the host sees their latest promo-code changes immediately.
- Bulk-export filters: invalid batch-ID input is rejected inline before the export request is made.

### Edit vs Update (distinction)
**As a** raffle host **I want to** understand that "editing" changes the raffle's configuration while "updating" posts an announcement **so that** I use the right tool for the job.

**System behavior:**
- "Edit" modifies the raffle entity itself (title, description, dates, pricing, winners, participants, category, question, crypto, images) and is only permitted while the raffle is in draft status.
- "Update" creates a separate announcement record (text + images) attached to a live/fulfilling/completed raffle and never alters raffle configuration.
- The two flows have distinct permitted-status windows, distinct forms, and distinct destinations (edit returns to the dashboard; update returns to the public raffle page).

### Raffle lifecycle states (System)
**As the** system **I want to** move each raffle through a defined lifecycle **so that** every status has unambiguous permitted actions and outcomes.

**System behavior:**
- A raffle moves through these statuses: `draft` (created, not public, editable), `queued` (scheduled/published, awaiting start), `live` (accepting entries), `ended` (entry window closed, winners being finalized), `fulfilling` (winners drawn, prizes being delivered), `completed` (concluded), `cancelled` (withdrawn or auto-cancelled).
- Editing is allowed only in `draft`; queued raffles must be reverted to draft before editing.
- Update/announcement posting is allowed only in `live`, `fulfilling`, `completed`.
- Promo code management is allowed only in `draft`, `queued`, `live`.
- Drawing winners is a backend process: an `isProcessingCompletion` flag is set while the draw runs, the raffle records winners (position, ticket code, status), total tickets at draw, and on-chain proof artifacts (manifest hash, commit transaction hash, VRF request ID, VRF fulfillment transaction hash) — the draw is verifiable on-chain.
- Auto-cancellation occurs when participation falls below the number of winners; cancellation reasons recorded by the system include `admin_rejected`, `host_cancelled`, `insufficient_participants`, `no_tickets`, and `partial_participation`; cancelled raffles refund all entries.

### Raffle analytics / stats shown to host
**As a** raffle host **I want to** see key statistics for each raffle **so that** I can gauge its performance.

**System behavior:**
- Each raffle exposes to the host: participant count, tickets sold count, revenue amount, fill progress (participants ÷ max), entry price, declared prize value, number of winners, and min/max participants.
- The host's total raffle count is displayed in the create/edit sidebar and review preview.
- The promo codes table shows per-code usage count, max uses, and per-user redemption limit, plus a total code count for the raffle.
- Once a raffle concludes, winner records (position, ticket code, name, status) and total tickets at draw are available.

---

## Profile, Account & Messaging

### Profile Overview & Settings Page
**As a** signed-in user **I want to** see and manage all my account settings in one place **so that** I can keep my profile, security, billing, and preferences up to date without hunting across separate pages.

**Acceptance criteria:**
- The page presents my profile organized into sections: Personal Information, Redemption Code, Credits, Subscription, Verification, Password, Email Preferences, and Payment History.
- A settings sidebar (visible on larger screens) lists the section names; clicking one smoothly scrolls the page to that section.
- A "My Profile" heading is shown alongside a verification badge reflecting my overall identity-verification status.
- A "Sign out" action is available.
- Deep links with a `#subscription` anchor scroll directly to the Subscription section.
- The page is reachable only when authenticated; unauthenticated users are redirected to sign in.

**System behavior:**
- The system loads the session, the full profile record, and the verification status in parallel; each section degrades gracefully if its data source fails (e.g. shows zeros, hides the badge) rather than erroring the whole page.
- An overall verification status is derived from a per-type breakdown of verification submissions; the badge only renders when that data is available.
- A "profile viewed" analytics event is recorded after the page renders, including whether verification data was present.
- Signing out clears local user state and ends the session.

### Personal Information (Name, Email, Avatar, Bio)
**As a** signed-in user **I want to** edit my display name, profile photo, and bio **so that** my public identity reflects who I am.

**Acceptance criteria:**
- My avatar, full name, email address, and bio are displayed; the email address is read-only.
- When no avatar image exists, my initials (up to two uppercase letters, from the words of my name) are shown as a placeholder.
- Hovering the avatar shows an edit affordance; clicking it opens a file picker.
- Name and bio are inline-editable via a pencil control: an edit field appears with confirm/cancel controls; pressing Enter saves, Escape cancels (name field), and the value reverts on cancel.
- The name field accepts up to 100 characters and cannot be empty.
- The bio field accepts up to 500 characters, shows a live character counter, and may be left blank ("No bio." is shown when empty).
- Success and failure of each save are communicated via toast messages.
- After a successful avatar upload, the page reloads to show the new image.

**System behavior:**
- The name save is skipped entirely if the trimmed value is unchanged; empty or over-length names are rejected client-side before any request.
- Saved values are validated server-side; the confirmed name returned by the server replaces the local value to avoid showing a stale cached name.
- Avatar uploads accept only PNG, JPEG, and WebP images up to 5 MB; invalid type and oversized-file errors produce specific messages, and network/timeout errors produce their own messages.
- The system schedules a cache refresh after an avatar upload so the new image propagates.

### Redeem a Credit Code
**As a** signed-in user **I want to** redeem a promotional or grant code **so that** I receive credits directly into my balance.

**Acceptance criteria:**
- A redemption banner with a "Redeem code" action is shown; activating it reveals a code input and "Apply" button.
- The code input auto-uppercases input, accepts codes 8–32 characters long made of letters, digits, and dashes, and shows a placeholder format (`XXXX-XXXX`).
- Pressing Enter submits; Escape collapses the form; a Cancel control appears beside inline errors.
- On success, the form collapses and a success dialog shows the amount of credits granted and the new balance.
- Business errors (invalid, expired, already-redeemed code) appear inline beneath the field; transient errors (network/timeout) appear as a toast so the user can retry with the same code.
- The "Apply" button is disabled while empty or while a submission is in flight, and shows a loading indicator during submission.

**System behavior:**
- Codes are format-validated client-side before any request to avoid an obviously-malformed round trip.
- Redemption is idempotent: re-redeeming an already-used code returns the original redemption without granting new credits; the system detects a repeated redemption identifier and shows an "already redeemed" message instead of re-opening the success dialog with misleading numbers.
- A successful redemption invalidates cached credit data so the balance display and any global credit indicators refresh.
- The success dialog can detect a migration-tier code (recognizable by prefix) and show a tailored welcome variant.

### Credits Balance Summary
**As a** signed-in user **I want to** see my credit balance and subscription status at a glance **so that** I know how much I can spend and whether I am subscribed.

**Acceptance criteria:**
- A Credits section shows four values: my subscription label ("No active subscription" or the plan name with a star icon), available balance, total earned, and total spent — all formatted as currency.
- A "View History" link appears only when there is credit activity to view (total earned or total spent is greater than zero).
- If I have no entitling subscription, an upsell banner ("Why pay full price for entries?") is shown linking to the pricing page; subscribers do not see this banner.

**System behavior:**
- Credit balance and subscription status are fetched in parallel; a failed balance fetch falls back to zeros and a failed subscription fetch falls back to "no subscription" (so the upsell still appears).
- Subscription entitlement is granted for `active`, `cancelled` (perks retained until period end), and `past_due` (dunning) statuses; `expired` is treated as non-subscriber.
- Credits are always denominated in USD.

### Credit History
**As a** signed-in user **I want to** browse my full credit ledger **so that** I can audit every credit grant and spend.

**Acceptance criteria:**
- A "Credit History" page lists ledger entries newest-first, 10 per page, with pagination (Previous/Next, current page of total).
- Each entry shows its type/reason (human-readable label), signed amount (`+` for grants/reversals shown green with an up arrow, `-` for spends shown red with a down arrow), the balance after the entry, and the date.
- An empty state ("No credit activity yet") is shown when there are no entries.
- A "Back to Profile" link is provided.

**System behavior:**
- Reasons are mapped to friendly labels: Admin Grant, Cancellation Refund, Checkout Payment, Chargeback Clawback, Credit Purchase, Order Reversal, Promo Code Redeemed, Revenue Share Payout, Referral Reward, Subscription Renewal; unknown reasons fall back to the raw value.
- Entry direction is derived from type: anything other than a spend increases the balance.
- An invalid or non-positive page parameter is normalized to a valid page.

### Subscription Management
**As a** subscribed user **I want to** view and manage my subscription from my profile **so that** I can change plans, cancel, update payment details, or cancel a scheduled change.

**Acceptance criteria:**
- The Subscription section shows the plan name, monthly price, and a renewal-or-end date ("Renews <date>" while active, "Ends <date>" once cancelled).
- Users with no subscription see an empty-state with a description of subscriber benefits and a "View plans" link to the pricing page.
- Up to three management actions are offered — Change plan, Cancel subscription, Update payment method — each enabled only when the backend says the action is permitted.
- "Update payment method" appears only when a self-serve billing portal is available; clicking it opens the billing portal and shows an "Opening…" state.
- If a plan downgrade is scheduled, a banner states which plan takes effect and when, with a "Cancel scheduled change" action.
- Cancelling opens a two-step dialog: a loss-framed confirmation listing benefits about to be lost (with the retention window "keep <plan> until <date>. No further charges."), then a success acknowledgement restating when access lapses and noting a confirmation email was sent.

**System behavior:**
- All capability gates (can change plan, can cancel, can update payment method, has self-serve portal, can schedule downgrade, can cancel scheduled change) default to disabled when the backend has not explicitly granted them.
- Change-plan and cancel actions are disabled when the subscription is already cancelled (cancelled flag set or status `cancelled`).
- The "has pending change" state requires both a pending plan and a pending effective date.
- The change-plan flow filters out plans the user's locked payment provider cannot serve.
- Cancellation surfaces cancel-specific messages for "already cancelled" and "not found"; cancelling a scheduled change treats "already applied" and "already cancelled by another tab" as soft non-error outcomes and refetches subscription state.
- A failed subscription fetch degrades to the empty-state CTA so a recovery path is still visible.

### Identity Verification Summary
**As a** signed-in user **I want to** see my verification submissions and start a new one **so that** I can complete the identity checks needed to use the platform.

**Acceptance criteria:**
- The Verification section lists each submission with its type label, submission date, and current status badge.
- Each submission row links to a verification detail page.
- A button reads "Start Verification" when there are no submissions and "New Verification" otherwise, linking to the verification flow.
- An empty state ("No verifications submitted yet") is shown when there are none.

**System behavior:**
- Submission data is fetched server-side; a failed fetch shows the empty state.

### Password Management
**As a** signed-in user **I want to** set or change my password **so that** I can sign in securely with credentials.

**Acceptance criteria:**
- If I do not yet have a password (social-login / magic-link signup), the section offers a "Set Password" form with new-password and confirm-password fields.
- If I already have a password, the section offers a "Change Password" form with current-password, new-password, and confirm-password fields.
- New passwords must be at least 12 characters (max 128); the confirmation must match the new password.
- Successful set/change shows a success toast and clears the form.
- Errors render inline at the form level.

**System behavior:**
- Which form is shown is driven by the account's `hasPassword` flag; if that flag cannot be read the system defaults to the change-password form (the safer fallback — it cannot let a password user overwrite their password without proving ownership).
- Specific error messages are mapped for: incorrect current password, password not available on social-login accounts, password already set (advising a page refresh to switch to Change Password), a password found in known breaches, not-authenticated, rate-limit exceeded, network, timeout, and server errors.

### Email Notification Preferences
**As a** signed-in user **I want to** control which email notifications I receive **so that** my inbox only gets the messages I care about.

**Acceptance criteria:**
- Four toggleable categories are shown, each with a label and description: Sweepstakes Updates, Prize Updates, Host Notifications, Reviews.
- Each toggle reflects my current preference and changes immediately when flipped.
- If preferences cannot be loaded, an "Unable to load email preferences" message is shown.

**System behavior:**
- Each toggle is applied as an individual update with an optimistic UI change; on failure the toggle rolls back and an error toast is shown.
- The successful server response replaces local state to stay authoritative.
- All four categories are treated as transactional notifications (not marketing), so no consent gate applies; they remain opt-out by default.

### Payment / Order History (Profile Summary)
**As a** signed-in user **I want to** see my recent orders on my profile **so that** I can quickly review my latest purchases.

**Acceptance criteria:**
- The Payment History section lists the most recent orders (up to 5), each showing the sweepstakes name, date, total amount, and a status badge.
- A "View All" link leads to the full order history page.
- An empty state ("No orders yet") is shown when there are no orders.

**System behavior:**
- The summary excludes stale orders.
- Order statuses are Completed (green), Pending (yellow), Failed (red), Refunded (gray).

### Full Order History
**As a** signed-in user **I want to** browse all my orders **so that** I can find and inspect any past purchase.

**Acceptance criteria:**
- The order history page lists orders in a table, 10 per page, with pagination.
- Each row shows the sweepstakes name, total amount, status badge, date, and a "View" action linking to the order detail page.
- An empty state ("No orders yet") is shown when there are none.
- A "Back to Profile" link is provided.

**System behavior:**
- An invalid or non-positive page parameter is normalized to a valid page.
- Monetary amounts are formatted using each order's own currency.

### Order Detail
**As a** signed-in user **I want to** view the full details of a single order **so that** I can verify what I bought and for how much.

**Acceptance criteria:**
- The order detail page shows the sweepstakes name (linking to the sweepstakes page), entries included, per-entry price, total amount, the date and time, a status badge, and the promo code if one was applied.
- If the order cannot be found, an "Order not found" message with a "Back to Orders" link is shown.
- A "Back to Orders" link is always provided.

**System behavior:**
- The order is fetched by its identifier; any failure (not found, network, contract error) renders the not-found state.
- The sweepstakes link uses the order's slug, falling back to the raffle identifier.
- Order status transitions: pending → completed (payment verified, or a $0 / free-tickets promo order), pending → failed (session expired/abandoned/verification failed), completed → refunded; failed and refunded are terminal.

### Notifications Feed
**As a** signed-in user **I want to** see my notifications **so that** I can stay aware of activity on my account, sweepstakes, prizes, and reviews.

**Acceptance criteria:**
- The Notifications page lists notifications, 10 per page, with pagination.
- Each notification shows a type icon, title, body (clamped to two lines), and a relative timestamp.
- Unread notifications are visually highlighted and carry an unread dot.
- Clicking a notification marks it read and navigates to the relevant destination.
- An empty state ("No notifications yet") is shown when there are none.
- A "Back to Profile" link is provided.

**System behavior:**
- Chat-message notifications are filtered out of this feed because the messaging inbox owns its own unread surface; the displayed total and pagination reflect only the visible (non-chat) notifications.
- Clicking an unread notification optimistically marks it read, decrements the global unread counter, persists the read state, and shows a confirmation toast.
- Navigation destination is derived from notification type and metadata: raffle-lifecycle notifications go to the sweepstakes landing page; host fulfillment reminders go to the sweepstakes fulfillment dashboard; order-confirmed goes to that order's detail page; prize/dispute/review notifications go to the profile page; chat-message notifications go to the relevant conversation; notifications lacking the required identifier produce no navigation.
- Notification types span ~30 categories including raffle started/ending/completed/cancelled, raffle won, comment/reply, review received, order confirmed, prize claim/sent/delivered/auto-confirmed, dispute opened/under-review/resolved/deadline-reminder, partial-participation outcomes, and host shipping/delivery reminders.

### Messaging Inbox (Conversation List)
**As a** signed-in user **I want to** browse my conversations **so that** I can find and continue a chat related to a sweepstakes I won or hosted.

**Acceptance criteria:**
- The inbox shows a two-pane layout: a conversation list on the left and a conversation view (or empty-state) on the right; on mobile only one pane shows at a time.
- The list supports searching by text, filtering by All / Unread (with count badges), and sorting by Most recent / Oldest first / Unread first.
- Each conversation row shows an avatar, a title, an optional subtitle (the winner's name for winner chats), the last-message preview, a relative timestamp, and an unread-count badge (capped at "9+").
- Distinct empty states are shown for: no conversations yet, no matches for the current search/filter (with a "Clear filters" action), and a load error (with a refresh hint).
- A "Load more" control paginates additional conversations.
- The right pane, when no conversation is selected, explains that chats open automatically when you win or host a sweepstakes and cannot be started manually.
- A platform-wide moderation notice states that messages are reviewed and that harassment, scams, or off-platform payment requests can lead to suspension or a ban.

**System behavior:**
- The selected conversation is determined entirely by the URL, so deep links and the browser back button work without separate selection state.
- Search input is debounced (~300 ms) before querying; filtering, searching, and sorting are all performed server-side with keyset pagination.
- Conversation titles prefer an explicit name, then the sweepstakes title, then a generic type label ("Winner chat", "Sweepstakes room", "Group", "Direct message").
- Each row's unread count comes from a live client-side store updated by real-time events.
- Conversation kinds are direct, group, sweepstakes room, and winner chat.

### Conversation Thread (Chat)
**As a** participant in a conversation **I want to** read and send messages in real time **so that** I can coordinate a prize handoff or other sweepstakes matters.

**Acceptance criteria:**
- The conversation pane shows a header (title, optional winner subtitle, participant roster, my role badge, a live connection indicator), a scrollable message list, and a message composer.
- Messages render as bubbles aligned by sender (mine on one side, others' on the other), each with sender role badge, avatar/monogram, timestamp, an "(edited)" marker when applicable, and clickable links.
- Deleted messages render as a "Message removed" tombstone; system and shipment-update messages render as centered, muted, non-attributed notes.
- The composer accepts up to 4,000 characters; Enter sends, Shift+Enter inserts a newline; the send button is disabled when the input is empty or a send is in flight.
- A typing indicator appears when another participant is typing.
- Older history can be loaded via a "Load older messages" control; the list auto-scrolls to the newest message on first load and when I'm already near the bottom.
- A new message I send appears immediately as an optimistic "sending…" bubble; if it fails it shows a "failed — refresh to retry" state.
- Empty conversations show a "No messages yet" prompt.
- The participant roster names other members with role chips, collapsing extras into a "+N more" popover.
- Deep-linking to a conversation I'm not a member of, or to a non-existent one, shows the same not-found result so no information leaks.

**System behavior:**
- Access is authorized twice: an authentication guard plus a membership check; non-members receive a not-found response identical to a missing conversation.
- Messages are sent over a real-time connection when available and fall back to a request-based path when disconnected (the composer placeholder changes to "Reconnecting… (messages send via REST)").
- The conversation is marked read once messages are present and again on each new inbound message; the read watermark is acked to the server exactly once per watermark (reconnect flaps do not re-ack).
- Message history is paginated and merged into a single client store, so messages from the real-time stream and from history render uniformly.
- Message bodies are linkified with a strict protocol allow-list (only http/https expand into anchors) and rendered as escaped text segments — never as raw HTML — as an XSS defense; links carry safe `rel` attributes.
- A participant's role is derived from conversation metadata with priority Winner > Host > Staff > Member; staff names are masked to first-name only in the roster.
- True participant counts come from an authoritative member count, not the (capped) roster slice; rooms can have thousands of members while only the top ~50 prioritized members are listed.
- Relative timestamps are intentionally coarse ("just now", "5m", "2h", "3d", "5w") to avoid leaking precise activity timing.
- Real-time events handled include new message, message edited, message deleted, presence, read receipt, typing, and acks.
- The composer throttles typing events (~every 2 s) to keep them in sync with the server's presence TTL without flooding the connection.
- Winner email and member display names are treated as PII and never logged to error tracking or analytics.

### Winner Chat Prize-Coordination Panel
**As a** winner or host in a winner chat **I want to** see and act on the prize-fulfillment status inside the conversation **so that** I can coordinate the handoff without leaving the chat.

**Acceptance criteria:**
- Winner chats display a collapsible "Prize coordination" panel at the top of the message list, defaulting collapsed.
- The panel shows a vertical status stepper for the prize lifecycle: Pending → Awaiting host → Sent → Delivered → Received, each step with an explanatory sub-line and a state marker (completed / current / upcoming).
- If a dispute exists, a separate "Dispute branch" shows Disputed → Resolved.
- A role-appropriate action button appears under the currently-active step: the winner sees "Submit shipping info" (pending) and "Confirm received" (delivered); the host sees "Mark as sent" (awaiting host) and "Mark as delivered" (sent).
- No action button appears for steps the viewer cannot act on, terminal states, or admin-only states.
- Action results are confirmed via toast; the view refreshes afterward.

**System behavior:**
- The current winning status and winning identifier are derived from the conversation's shipment-update messages, avoiding an extra backend call.
- The panel is only shown for winner-chat conversations that have an associated sweepstakes.
- Status is conveyed by icon shape as well as color (high-contrast accessible); the stepper is announced as an ordered list with the current step marked.
- Legacy "pending partial fulfillment" rows collapse into the Pending step so historic records still get the correct action.
- A delivered prize is auto-confirmed by a scheduled job ~48 hours after delivery if the winner does not confirm.
- Winner-chat actions reuse the same fulfillment flows and services as the standalone fulfillment page, so no business logic is duplicated.

### User Mode (Participant / Host)
**As a** signed-in user **I want to** switch between participant mode and host mode **so that** the interface shows the surfaces relevant to what I am doing.

**Acceptance criteria:**
- A user's current mode (participant or host) determines which dashboards and actions are shown (e.g. the "Create new Sweepstakes" button and host-only raffle statuses appear only in host mode).
- Switching to host mode is only offered to users permitted to host.

**System behavior:**
- The current mode is persisted as a client-readable preference distinct from the session credential.
- Host-only raffle statuses (draft, queued) and creation actions are gated on host mode plus host permission.

---

## Verification & Administration

### Verification Hub (My Verification)
**As a** signed-in user **I want to** see all my verification submissions and start a new one from a single page **so that** I can become a host or claim a prize and track where each request stands.

**Acceptance criteria:**
- The page is only accessible while signed in; unauthenticated visitors are redirected to the home page.
- All of my existing submissions are listed, each showing its verification type, the date it was submitted, and a colored status pill (Pending = yellow, Approved = green, Rejected = red).
- Each listed submission is clickable and opens its detail view.
- If I have no submissions yet, the list section is omitted entirely.
- A multi-step "start a new verification" form is shown below the list.
- The new-verification form is hidden only when all three verification types already have an active (pending or approved) submission.
- If one of my current submissions was rejected, a rejection banner appears above the form showing the rejected type and, if available, the rejection reason, plus an invitation to resubmit.

**System behavior:**
- The system fetches the submission list and an aggregate verification status in parallel; if either fetch fails it degrades gracefully (empty list / no status) rather than erroring the page.
- The form is gated by counting submissions in pending/approved status; when that count reaches the total number of verification types (3), the form is suppressed.
- Backend enforces per-type uniqueness: a user may not hold two active submissions of the same type.
- The rejection banner is sourced from the per-type status endpoint (authoritative current state), never from historical submission records, so already-superseded rejections are not surfaced.
- The rejected submission is matched first by the submission ID returned in the status, falling back to a type + "rejected" status match for older submissions that predate the ID field.

### Verification Types
**As a** user **I want to** choose the verification type that matches my goal **so that** I am only asked for the information relevant to me.

**Acceptance criteria:**
- Three types are offered: Individual Host (verify identity to host raffles as a person), Company Host (register a business/organization to host), and Sweepstakes Winner (verify identity to claim a prize won).
- Each type is presented as a selectable card with an icon, title, and description.
- The "Continue" button is disabled until a type is selected.
- Selecting a type and continuing resets the form to that type's field set.

**System behavior:**
- The chosen type drives which detail fields and which document slots are required in later steps.
- Switching type re-initializes the form with type-appropriate default values, discarding prior input.

### Verification Submission Form (multi-step)
**As a** user **I want to** complete a guided multi-step form **so that** I can submit my identity/business data and documents in an organized way.

**Acceptance criteria:**
- The form has four steps: (1) select type, (2) enter details, (3) upload documents, (4) review and submit.
- I can move forward and backward between steps; forward navigation is blocked until the current step's fields validate.
- The details step shows the field set for my chosen type.
- Step 3 lets me upload the documents required for my type.
- Step 4 shows a read-only summary of every entered value and the names of uploaded files, plus a confirmation statement that all information is accurate and documents genuine.
- The final submit button is disabled and shows "Submitting..." while the request is in progress.
- On success, the form is replaced by a success screen.

**Individual Host detail requirements:**
- Full legal name (2–200 chars), date of birth (required), phone number (5–30 chars, only digits/+/-/parentheses/spaces), residential address (10–500 chars).
- Identity document type: passport, driver's license, or national ID.
- Address document type: utility bill, bank statement, rental agreement, or government correspondence.
- At least one planned raffle category from: electronics, fashion, gaming, home & living, sports, collectibles, art, other.
- Documents: ID front (required), ID back (required), proof of address (required).

**Company Host detail requirements:**
- Legal entity name (2–300 chars), business registration number (1–100 chars), country of incorporation (2–100 chars), contact person name (2–200 chars), valid contact email.
- Documents: company documents (required), proof of business address (required).

**Sweepstakes Winner detail requirements:**
- Full legal name (2–200 chars), date of birth (required), country of residence (2–100 chars), identity document type (passport/driver's license/national ID).
- Optional bank account or wallet identifier (up to 500 chars).
- Mandatory complete shipping address: recipient name, street, city, postal/ZIP code, country, optional phone — even for wallet-only claimants.
- Documents: ID front (required), ID back (optional).

**System behavior:**
- Submission runs as a three-phase backend flow with visible phase progress: submit form data → upload each document sequentially → finalize the submission.
- Phase 1 sends the type-specific form data and receives a submission identifier.
- If phase 1 fails because an active submission of that type already exists, the system recovers by looking up the user's existing pending submission of that type and resumes document upload against it, informing the user it is "resuming your existing draft."
- Phase 2 uploads each document one at a time against its assigned purpose slot; any single upload failure aborts the flow with a specific error message.
- Phase 3 finalizes the submission, moving it from draft to under-review.
- On any failure the progress phase resets and a specific toast message is shown; on unexpected errors a generic "Something went wrong" message appears.
- Successful submission events and failures are recorded for analytics.

### Document Upload Rules
**As a** user **I want to** upload my documents with clear constraints **so that** I know which files are accepted and avoid rejected uploads.

**Acceptance criteria:**
- Accepted file formats: PDF, JPEG, PNG, WebP.
- Maximum file size: 10 MB per file.
- One file per document slot.
- Invalid files are flagged inline at the upload step, including invalid files in optional slots.

**System behavior:**
- File type and size are validated client-side before submission and re-validated server-side on upload; a violation rejects the upload.
- Each document is uploaded against a named purpose (e.g. ID front, ID back, proof of address, company documents, proof of business address).
- Server-side errors map to specific user messages: file too large, invalid file type, invalid document purpose, document slot already filled, submission no longer in draft, missing required documents, permission denied.

### Verification States
**As a** user and as the system **I want** each verification to move through a defined lifecycle **so that** status is always unambiguous.

**System behavior:**
- A submission's raw status is one of: pending, approved, rejected.
- The per-type aggregate status further distinguishes: none (no submission), draft (created but not finalized — still uploading documents), in_review (finalized, awaiting admin review), approved, rejected.
- When deriving a single overall verification badge across all three types, the system picks the highest-priority status in the order: approved, in_review, rejected, draft, then none.
- A rejection reason is carried only while a type is in the rejected state.

### Submission Detail (user view)
**As a** user **I want to** open one of my submissions **so that** I can review exactly what I submitted and the review outcome.

**Acceptance criteria:**
- Shows the verification type as a heading, a status pill, and the submitted/finalized/reviewed dates (unset dates render as a dash).
- Shows every submitted form field as labeled key-value pairs.
- If documents were uploaded, shows them as cards: an image thumbnail, a PDF inline preview, or a generic file icon fallback, with the file's purpose label and original filename.
- Each document card links to open/download the full file in a new tab.
- If the submission was rejected, the rejection reason is displayed prominently.
- A back link returns to the verification hub.

**System behavior:**
- The submission is fetched by ID; if the fetch fails or the submission is not found, a 404 page is shown.
- Document files are served via short-lived signed URLs; if a URL could not be generated, the document falls back to a non-clickable file-icon placeholder.
- Detail data is never cached so the latest status is always shown.

### Submission Confirmation
**As a** user who has just submitted **I want** a clear confirmation **so that** I know my request was received and what happens next.

**Acceptance criteria:**
- A success screen replaces the form, stating the submission was received and will be reviewed.
- It tells me I will receive a confirmation email shortly and a second email with the review outcome.
- It offers navigation to browse raffles or to my raffles.

### Admin Access Control
**As the** system **I want to** restrict the admin area to authorized reviewers **so that** sensitive verification data is protected.

**Acceptance criteria:**
- Only users holding the KYC review permission can access any admin page.
- Users without that permission (including signed-out users) see a standard 404 page, not a redirect or an "access denied" message — the admin routes' very existence is not disclosed.
- Authorized admins see an admin-specific navigation shell.
- Visiting the admin root lands on the verification reviews list.

**System behavior:**
- The user's permissions are read from their session and validated; unrecognized permission strings are discarded.
- Access control is enforced again on the server side of every review action (defense-in-depth): a direct call to approve/reject without the KYC review permission is rejected as forbidden, even though the layout already hides the UI.

### Admin Verification Review List
**As an** admin reviewer **I want to** see and filter all verification submissions **so that** I can work through the review queue efficiently.

**Acceptance criteria:**
- Lists submissions with user name, user email, verification type (short label), status pill, and submitted date.
- Shows a total count of submissions ("N submissions").
- Can be filtered by status (all / pending / approved / rejected) and by type (all / Individual Host / Company Host / Sweepstakes Winner) via dropdowns.
- Supports Prev/Next pagination at 20 submissions per page; pagination controls hide when results fit on one page; Prev disables on the first page and Next on the last.
- Each row links to that submission's review detail.
- Missing user name or email renders as a dash.
- An empty result set shows a "No submissions found" message.

**System behavior:**
- Filter and page selections are reflected in the page URL; the list re-fetches whenever filters or page change.
- Changing a filter resets pagination to page 1, preventing landing on an empty page.
- Invalid or unrecognized filter/page values in the URL are ignored and treated as defaults (page 1, limit 20, all statuses, all types).
- The page limit is capped at 100.
- User name/email may be null when the auth-service lookup fails; this is tolerated and rendered as a dash.

### Admin Submission Review Detail
**As an** admin reviewer **I want to** inspect a single submission's full data and documents **so that** I can make an informed approve/reject decision.

**Acceptance criteria:**
- Shows the applicant's name and email, verification type, status pill, and submitted/finalized/reviewed dates.
- Shows all submitted form fields as labeled key-value pairs.
- Shows all uploaded documents in a viewer.
- If the submission was rejected, shows the rejection reason.
- A back link returns to the review list.

**System behavior:**
- The submission is fetched by ID; a failed fetch or missing submission yields a 404 (also concealing existence from unauthorized callers).
- Detail data is never cached so reviewers always see the current status.

### PII Protection on Review Detail
**As an** admin reviewer **I want** sensitive applicant data hidden by default **so that** I avoid casual or accidental exposure of identity data.

**Acceptance criteria:**
- On opening a submission, the applicant's name/email, all form-data fields, and all document previews are masked behind placeholders.
- A "Reveal PII" toggle near the top of the page reveals all sensitive sections; toggling again re-hides them.
- Masked sections display a lock icon and a message explaining the content is hidden and how to reveal it (so it is not mistaken for a loading failure).
- Non-sensitive elements (type, status, dates, the approve/reject controls) remain visible regardless of the toggle.

**System behavior:**
- The reveal state is per-page and not persisted; opening another submission starts hidden again.
- Masked placeholders preserve the layout shape so toggling does not cause visual jumps.

### Admin Approve / Reject Decision
**As an** admin reviewer **I want to** approve or reject a pending submission **so that** legitimate users gain access and invalid submissions are sent back for correction.

**Acceptance criteria:**
- Approve and Reject controls appear only when the submission is pending; approved or rejected submissions show no review actions.
- Each action opens a confirmation dialog before it is applied.
- Approving confirms it will verify the user and grant access to the associated features, and notes the decision can be reversed by rejecting later.
- Rejecting requires a reason; an empty/whitespace-only reason is blocked and the reviewer is prompted to provide one.
- The rejection reason field shows a character counter and is capped at 1,000 characters.
- During submission, action buttons and the dialog are disabled and show a progress label ("Approving..." / "Rejecting...").
- On success, a confirmation toast is shown and the detail view refreshes to reflect the new status.
- On failure, a specific error message toast is shown and no status change occurs.

**System behavior:**
- The review decision is validated server-side; a rejection without a non-empty reason is rejected as invalid input.
- The server re-verifies the reviewer's KYC review permission before applying the decision.
- A successful approval verifies the user and unlocks the associated capability (e.g. hosting); the rejection reason is stored and later surfaced to the user on their submission detail and the resubmission banner.
- After a decision, both the admin review list and the submission detail are refreshed so they reflect the updated status.
- The user is notified of the outcome by email.
