# Bugfix Requirements Document

## Introduction

The Lunero web app displays an infinite loading screen for all authenticated users. The `Providers` component in `apps/web/app/providers.tsx` wraps the app with `ClerkProvider` and `QueryClientProvider` but never calls `setTokenProvider` from `@lunero/api-client` to wire up Clerk's `getToken` function. As a result, the axios request interceptor in `packages/api-client/src/http.ts` never attaches an `Authorization: Bearer <token>` header, causing every API request to `/api/v1/**` to return 401 Unauthorized. The `OnboardingGuard` in the app layout then stays in its `isLoading` state permanently, rendering "Loading…" forever.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an authenticated user loads the app THEN the system sends all API requests to `/api/v1/**` without an `Authorization` header, resulting in 401 Unauthorized responses

1.2 WHEN the `OnboardingGuard` component mounts and calls `useProfile()` THEN the system remains in `isLoading` state indefinitely because the profile fetch fails with 401, causing an infinite loading screen

1.3 WHEN the `Providers` component initializes THEN the system never calls `setTokenProvider` to connect Clerk's `getToken` to the API client, leaving the `tokenProvider` variable in `http.ts` as `null`

### Expected Behavior (Correct)

2.1 WHEN an authenticated user loads the app THEN the system SHALL attach a valid `Authorization: Bearer <token>` header to all API requests to `/api/v1/**`, and the backend SHALL authenticate them successfully

2.2 WHEN the `OnboardingGuard` component mounts and calls `useProfile()` THEN the system SHALL successfully fetch the user profile and either display the app content or redirect to onboarding, without getting stuck in a loading state

2.3 WHEN the `Providers` component initializes inside the `ClerkProvider` tree THEN the system SHALL call `setTokenProvider` with Clerk's `getToken` function so the API client can inject JWTs into outgoing requests

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user is not signed in and accesses a public route THEN the system SHALL CONTINUE TO render the page without attempting to inject an auth token

3.2 WHEN the Clerk session token expires or is invalid THEN the backend SHALL CONTINUE TO return 401 Unauthorized as expected

3.3 WHEN the app loads THEN the system SHALL CONTINUE TO initialize the Tamagui theme provider, query client, and Clerk provider in the correct order without disruption

3.4 WHEN a user completes onboarding THEN the system SHALL CONTINUE TO display the main app layout with sidebar, topbar, and content area
