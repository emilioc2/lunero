# Tech Stack

## Platform Targets

- **Phase 1**: Web (browser) only
- **Phase 2**: iOS and Android (React Native / Expo)

## Stack

### Frontend
- **Next.js (React)** — Web app (Phase 1)
- **React Native (Expo)** — iOS & Android mobile app (Phase 2)
- **Tamagui** — Unified design system across web and mobile

### Backend
- **Spring Boot + Spring AI** — REST API server
- REST APIs for FlowSheets, categories, transactions, and trends

### Database
- **PostgreSQL** via NeonDB or Supabase

### Authentication
- **Clerk** — email/password, Google OAuth, Apple Sign-In
- Apple Sign-In may be deferred to Phase 2 (requires paid Apple Developer account)

### AI Coach
- **Google Gemini 1.5 Flash** — free tier for MVP/trial
- Migrate to a paid Gemini model (or alternative) when the app scales
- Integrated via Spring AI on the backend
- The AI coach is named **Mira** throughout the UI

### Hosting
- **Vercel** — web (Next.js)
- **Railway / Render** — backend (Spring Boot)
- **Expo EAS** — mobile builds (Phase 2)

## Key Conventions

- Currency conversion is always handled server-side (Spring Boot); never on the client
- Offline-first sync is a Phase 2 concern (mobile); web assumes always-online
- All auth flows go through Clerk; do not implement custom auth logic
- Tamagui components are the source of truth for UI — do not use platform-native components where a Tamagui equivalent exists

## Common Commands

```bash
# Web (Next.js)
npm run dev             # Start Next.js dev server
npm run build           # Production build
npm run start           # Start production server

# Backend (Spring Boot)
./mvnw spring-boot:run  # Run backend locally
./mvnw test             # Run tests
./mvnw package          # Build JAR

# Mobile (Expo) — Phase 2
npx expo start          # Start Expo dev server
npx expo run:ios        # Run on iOS simulator
npx expo run:android    # Run on Android emulator
eas build               # Trigger EAS build
```
