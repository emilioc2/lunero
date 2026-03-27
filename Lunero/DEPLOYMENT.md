# Lunero — Deployment Guide

## Prerequisites

- Node.js >= 20
- Java 21 (for the Spring Boot backend)
- A PostgreSQL 16 database (NeonDB recommended for production)
- Accounts on: [Clerk](https://clerk.com), [Google AI Studio](https://aistudio.google.com), [Vercel](https://vercel.com), [Railway](https://railway.app) (or Render)

---

## 1. External Service Setup

### 1.1 Clerk (Authentication)

1. Create a Clerk application at https://dashboard.clerk.com
2. Enable Email/Password and Google OAuth sign-in methods
3. Note down:
   - **Publishable Key** (starts with `pk_live_` or `pk_test_`)
   - **Secret Key** (starts with `sk_live_` or `sk_test_`)
   - **JWKS URI** — found under your Clerk app's API Keys page, typically: `https://<your-clerk-domain>/.well-known/jwks.json`
4. In Clerk dashboard, add your production domain to the allowed origins

### 1.2 Google Gemini (AI Coach — Mira)

1. Go to https://aistudio.google.com/apikey
2. Create an API key for the Gemini API
3. Note down the **API Key** — this becomes `GEMINI_API_KEY`
4. The app uses `gemini-1.5-flash` by default (free tier works for MVP)

### 1.3 PostgreSQL (NeonDB)

1. Create a project at https://neon.tech
2. Create a database (e.g. `lunero_prod`)
3. Copy the connection string — this becomes `DATABASE_URL`
   - Format: `jdbc:postgresql://<host>/<database>?user=<user>&password=<password>&sslmode=require`
4. Ensure the `btree_gist` extension is enabled (required for the FlowSheet overlap constraint):
   ```sql
   CREATE EXTENSION IF NOT EXISTS btree_gist;
   ```

### 1.4 VAPID Keys (Web Push Notifications)

Generate a VAPID key pair for Web Push:

```bash
npx web-push generate-vapid-keys
```

This outputs a public key and a private key. Note both down.

---

## 2. Backend Deployment (Railway)

### 2.1 Build the JAR

```bash
cd backend
./mvnw clean package -DskipTests
```

This produces `backend/target/lunero-backend-0.0.1-SNAPSHOT.jar`.

### 2.2 Deploy to Railway

1. Create a new project on https://railway.app
2. Connect your GitHub repo, or deploy from the `backend/` directory
3. Set the build command: `cd backend && ./mvnw clean package -DskipTests`
4. Set the start command:
   ```
   java -jar backend/target/lunero-backend-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
   ```

### 2.3 Environment Variables (Railway)

Set these in the Railway service settings:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `jdbc:postgresql://...` | NeonDB connection string (JDBC format) |
| `CLERK_JWKS_URI` | `https://<clerk-domain>/.well-known/jwks.json` | From Clerk dashboard |
| `GEMINI_API_KEY` | `AIza...` | From Google AI Studio |
| `VAPID_PUBLIC_KEY` | `BN...` | From `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | `<private-key>` | From `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | `mailto:you@example.com` | Contact email for VAPID |
| `SPRING_PROFILES_ACTIVE` | `prod` | Activates `application-prod.yml` |

### 2.4 Database Migrations

Flyway runs automatically on startup. The initial migration (`V1__initial_schema.sql`) creates all tables. No manual migration step is needed — just make sure the `btree_gist` extension is enabled on the database first (see section 1.3).

### 2.5 Verify Backend

Once deployed, check the health endpoint:

```bash
curl https://<your-railway-url>/actuator/health
```

Expected response: `{"status":"UP"}`

---

## 3. Frontend Deployment (Vercel)

### 3.1 Connect to Vercel

1. Import your repo at https://vercel.com/new
2. Set the framework preset to **Next.js**

### 3.2 Vercel Build Settings

Configure these in the Vercel project settings:

- **Root Directory**: `.` (repo root — needed for monorepo workspace resolution)
- **Build Command**: `npx turbo run build --filter=@lunero/web`
- **Output Directory**: `apps/web/.next`
- **Install Command**: `npm install`
- **Node.js Version**: 20.x

### 3.3 Environment Variables (Vercel)

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | Clerk publishable key |
| `CLERK_SECRET_KEY` | `sk_live_...` | Clerk secret key |
| `NEXT_PUBLIC_API_BASE_URL` | `https://<your-railway-url>` | Backend URL (no trailing slash) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `BN...` | Same VAPID public key as backend |

### 3.4 Verify Frontend

Visit your Vercel deployment URL. You should see the Clerk sign-in page.

---

## 4. CORS Configuration

The Spring Boot backend needs to allow requests from your Vercel domain. Add a CORS configuration bean or update `SecurityConfig.java`:

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of("https://your-app.vercel.app"));
    config.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", config);
    return source;
}
```

Then enable it in the security filter chain:

```java
http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
```

Replace `https://your-app.vercel.app` with your actual Vercel domain. For staging, you can add multiple origins.

---

## 5. Post-Deployment Smoke Test

1. Register a new account via the sign-up page
2. Complete the onboarding flow (display name, currency, period, theme, notifications)
3. Create a FlowSheet
4. Add income, expense, and savings entries
5. Verify the Available Balance = Income - (Expenses + Savings)
6. Navigate to Calendar View, Trends, Categories, Recurring Entries, and Mira
7. Test Web Push notification permission prompt
8. Try a multi-currency entry (e.g. EUR expense with USD default) and verify conversion
9. Ask Mira a question (e.g. "What is my available balance?") and verify a grounded response

---

## 6. Local Development

```bash
# Start local PostgreSQL
docker compose up -d

# Run backend (dev profile)
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# Run frontend (in a separate terminal)
npm run dev --filter=@lunero/web
```

Local environment files:
- Copy `apps/web/.env.local.example` to `apps/web/.env.local` and fill in your Clerk keys + set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080`
- The dev profile (`application-dev.yml`) expects PostgreSQL at `localhost:5432/lunero_dev` (provided by docker-compose)

---

## 7. Environment Variable Reference

### Backend (Spring Boot)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | JDBC PostgreSQL connection string |
| `CLERK_JWKS_URI` | Yes | Clerk JWKS endpoint for JWT validation |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for Mira |
| `VAPID_PUBLIC_KEY` | Yes | VAPID public key for Web Push |
| `VAPID_PRIVATE_KEY` | Yes | VAPID private key for Web Push |
| `VAPID_SUBJECT` | Yes | VAPID subject (`mailto:` URI) |
| `SPRING_PROFILES_ACTIVE` | Yes | `prod` for production, `dev` for local |

### Frontend (Next.js)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key (exposed to browser) |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key (server-side only) |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Backend API URL (exposed to browser) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Yes | VAPID public key for push subscription |

---

## 8. Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Backend 401 on all requests | `CLERK_JWKS_URI` wrong or unreachable | Verify the URI returns a JSON JWKS document |
| Flyway migration fails | `btree_gist` extension not enabled | Run `CREATE EXTENSION IF NOT EXISTS btree_gist;` on the database |
| Frontend can't reach backend | CORS not configured or `NEXT_PUBLIC_API_BASE_URL` wrong | Add your Vercel domain to CORS allowed origins |
| Mira returns "unavailable" | `GEMINI_API_KEY` invalid or quota exceeded | Check the key in Google AI Studio; check Railway logs |
| Web Push not working | VAPID keys mismatch between frontend and backend | Ensure `NEXT_PUBLIC_VAPID_PUBLIC_KEY` matches `VAPID_PUBLIC_KEY` |
| Currency conversion returns null | Frankfurter API unreachable on first startup | The scheduled job retries every 24h; check backend logs for FX errors |
