# 4th Quarter — Design Brief for Claude

## What is this app?
4th Quarter is a free web app that sends NBA fans a notification when the 4th quarter of their team's game is about to start. The idea: skip the first three quarters and only tune in when it matters. Users sign up, pick their NBA team(s), and get push notifications and/or email alerts for key game moments.

**Live at:** https://4th-quarter-sooty.vercel.app

## Target audience
Casual NBA fans who don't want to watch full games but don't want to miss the exciting endings. The first user is my dad.

## Tech stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Hosted on Vercel (free tier)
- PWA (installable on iPhone/Android via Add to Home Screen)

## Current design
- **Theme:** Dark — zinc-950 (#0a0a0a) background throughout
- **Accent color:** Orange — Tailwind `orange-500` (#f97316) used for buttons, CTAs, active states, and the logo text
- **Typography:** Geist Sans (from Next.js), clean and modern
- **Layout:** Max-width 4xl (896px), centered, generous spacing
- **Borders/cards:** zinc-800 borders, zinc-900 card backgrounds
- **Text colors:** white for headings, zinc-400 for body text, zinc-600 for muted/footer text

## Pages

### 1. Landing page (`/`)
- Nav bar: "4th Quarter" text logo (orange, bold) + "Sign In" button
- Hero: "Skip the first three. Catch the fourth." — large bold heading, orange accent on second line
- Subtext explaining the app + "Get Started — Free" CTA
- 3 feature cards in a grid: 4th Quarter Alerts (bell emoji), Pick Your Teams (basketball emoji), Close Game Alerts (lightning emoji)
- Footer: "4th Quarter — Never miss when the game gets good"

### 2. Login page (`/login`)
- Centered card with "4th Quarter" heading in orange
- "Never miss when the game gets good" tagline
- Two OAuth buttons: "Continue with Google" (white) and "Continue with GitHub" (zinc-800)

### 3. Dashboard (`/dashboard`)
- Nav: "4th Quarter" logo, "My Teams" link, "Alerts" link, user avatar, "Sign out"
- Welcome message with user's first name
- "Enable Notifications" section: push notification button + email toggle with test buttons
- "Your Teams" section: grid of all 30 NBA teams split by East/West conference, orange border when selected

### 4. Preferences/Alerts page (`/preferences`)
- "Alert Settings" heading
- "Notification Method" section: email toggle
- "Game Events" section: toggle switches for 4 event types (4th Quarter Starting, Game Starting, 2nd Half Starting, Close Game Alert) — orange when enabled

## Current branding gaps (needs work)
- **No logo** — currently just the text "4th Quarter" in orange. No icon, no mark, no visual brand identity.
- **No app icons** — `manifest.json` references `/icon-192.png` and `/icon-512.png` but these files don't exist yet. Needed for PWA install on phones.
- **No favicon** — using the default Next.js favicon
- **No Open Graph image** — no social preview card when sharing the link
- **Generic visuals** — the landing page is functional but plain. No illustrations, no visual storytelling, no personality beyond the tagline.

## Design direction / vibe
- Sports energy but minimal and clean — not a cluttered ESPN-style page
- The orange + dark theme gives it a "nighttime game" feel — lean into that
- The tagline "Skip the first three. Catch the fourth." sets the tone: confident, casual, clever
- Should feel like a premium tool, not a toy — think of it like a beautifully designed utility

## Key files for visual changes
```
src/app/page.tsx                    — Landing page
src/app/layout.tsx                  — Root layout (fonts, metadata)
src/app/(auth)/login/page.tsx       — Login page
src/app/(dashboard)/layout.tsx      — Dashboard nav/shell
src/app/(dashboard)/dashboard/page.tsx — Main dashboard
src/app/(dashboard)/preferences/page.tsx — Alert settings
src/app/globals.css                 — Global CSS (Tailwind)
src/components/team-picker.tsx      — Team selection grid
src/components/notification-bell.tsx — Push notification UI
src/components/email-toggle.tsx     — Email notification toggle
src/components/preference-form.tsx  — Event type toggles
public/manifest.json                — PWA manifest (icons, theme)
public/sw.js                        — Service worker
```

## Color reference
| Usage | Tailwind class | Hex |
|-------|---------------|-----|
| Background | bg-zinc-950 | #0a0a0a |
| Card background | bg-zinc-900 | #18181b |
| Borders | border-zinc-800 | #27272a |
| Body text | text-zinc-400 | #a1a1aa |
| Muted text | text-zinc-600 | #52525b |
| Headings | text-white | #ffffff |
| Accent / CTA | bg-orange-500 / text-orange-500 | #f97316 |
| Active card border | border-orange-500/30 | #f97316 at 30% opacity |
| Active card bg | bg-orange-500/5 | #f97316 at 5% opacity |
