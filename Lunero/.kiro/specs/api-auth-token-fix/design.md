# API Auth Token Fix — Bugfix Design

## Overview

The Lunero web app's `Providers` component wraps the application with `ClerkProvider` and `QueryClientProvider` but never wires up Clerk's `getToken` to the API client's token injection mechanism. The `setTokenProvider` function exported by `@lunero/api-client` is never called, so the axios request interceptor in `packages/api-client/src/http.ts` skips the `Authorization` header on every request. The backend's `SecurityConfig` requires authentication on all `/api/v1/**` routes, so every API call returns 401 Unauthorized. This causes the `OnboardingGuard` to remain stuck in its loading state indefinitely.

The fix is minimal: add a small client component inside the `ClerkProvider` tree that calls `useAuth()` to obtain `getToken`, then passes it to `setTokenProvider` once on mount. No backend changes are needed.

## Glossary

- **Bug_Condition (C)**: The condition where `tokenProvider` in `http.ts` is `null` when an authenticated user's API request fires, causing the interceptor to skip the `Authorization` header
- **Property (P)**: After the fix, every API request made by an authenticated user SHALL include an `Authorization: Bearer <token>` header with a valid Clerk JWT
- **Preservation**: Existing behaviors that must remain unchanged — unauthenticated routes, provider initialization order, theme hydration, onboarding flow, and backend JWT validation
- **`setTokenProvider`**: The function in `packages/api-client/src/http.ts` that accepts a `() => Promise<string | null>` and stores it for the axios request interceptor to call
- **`tokenProvider`**: The module-level variable in `http.ts` that holds the injected token function; currently always `null`
- **`OnboardingGuard`**: The component in `apps/web/app/(app)/layout.tsx` that checks `useProfile()` and shows a loading screen while the profile is being fetched

## Bug Details

### Bug Condition

The bug manifests when an authenticated user loads the app and any React Query hook (e.g., `useProfile`) triggers an API request through the `apiClient` singleton. The axios request interceptor checks `tokenProvider`, finds it `null`, and sends the request without an `Authorization` header. The backend's `ClerkJwtFilter` finds no Bearer token, so `SecurityContextHolder` remains empty, and Spring Security returns 401.

**Formal Specification:**
```
FUNCTION isBugCondition(request)
  INPUT: request of type AxiosRequestConfig (outgoing API call)
  OUTPUT: boolean

  RETURN request.url STARTS_WITH "/api/v1/"
         AND userIsAuthenticated()
         AND tokenProvider IS null
END FUNCTION
```

### Examples

- **Profile fetch on app load**: User signs in via Clerk, `OnboardingGuard` mounts, `useProfile()` fires `GET /api/v1/profile` — no `Authorization` header → 401 → `isLoading` stays `true` → infinite loading screen
- **FlowSheet fetch**: User navigates to dashboard, `useFlowSheets()` fires `GET /api/v1/flow-sheets` — no header → 401 → empty dashboard or error
- **Entry creation**: User submits a new expense, `POST /api/v1/entries` — no header → 401 → entry silently fails
- **Edge case — token is null**: Even after the fix, if Clerk's `getToken` returns `null` (user signed out or session expired), the interceptor correctly omits the header and the backend returns 401 — this is expected behavior, not a bug

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Mouse/keyboard interactions with all UI components must continue to work exactly as before
- The `TamaguiThemeProvider` must continue to resolve and apply the user's theme preference
- The `QueryClientProvider` must continue to provide the shared `queryClient` instance
- `ClerkProvider` must continue to manage authentication state and session lifecycle
- The backend `ClerkJwtFilter` and `SecurityConfig` must continue to validate JWTs and enforce auth on `/api/v1/**`
- The `OnboardingGuard` redirect logic (onboarding incomplete → `/onboarding`) must remain unchanged
- Unauthenticated users accessing public routes must not be affected

**Scope:**
All inputs that do NOT involve the `tokenProvider` being `null` for authenticated API requests should be completely unaffected by this fix. This includes:
- Clerk sign-in/sign-up flows
- Theme switching and persistence
- React Query cache behavior
- Backend JWT validation logic
- All UI rendering and interaction patterns

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is clear:

1. **Missing `setTokenProvider` call**: The `Providers` component in `apps/web/app/providers.tsx` renders `ClerkProvider` → `QueryClientProvider` → `TamaguiThemeProvider` but never calls `setTokenProvider` from `@lunero/api-client`. The `tokenProvider` variable in `http.ts` remains `null` for the entire app lifecycle.

2. **No bridge component between Clerk and API client**: There is no component that uses `useAuth()` from `@clerk/nextjs` (which must be called inside the `ClerkProvider` tree) and passes the resulting `getToken` function to `setTokenProvider`. This bridge is the missing piece.

3. **Silent failure**: The axios interceptor gracefully skips token injection when `tokenProvider` is `null` — it doesn't throw or log a warning. This makes the bug non-obvious during development; the only symptom is 401 responses from the backend.

## Correctness Properties

Property 1: Bug Condition — Authenticated API Requests Include Bearer Token

_For any_ API request made through the `apiClient` where the user is authenticated (Clerk session is active and `getToken` returns a valid JWT string), the axios request interceptor SHALL attach an `Authorization: Bearer <token>` header to the outgoing request, and the backend SHALL authenticate it successfully.

**Validates: Requirements 2.1, 2.3**

Property 2: Preservation — Unauthenticated Requests Remain Headerless

_For any_ API request where the user is not authenticated (no Clerk session, or `getToken` returns `null`), the axios request interceptor SHALL NOT attach an `Authorization` header, preserving the existing behavior where the backend returns 401 for unauthenticated requests to protected routes.

**Validates: Requirements 3.1, 3.2**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `apps/web/app/providers.tsx`

**Function**: `Providers`

**Specific Changes**:

1. **Import `useAuth`**: Add `import { useAuth } from '@clerk/nextjs'` to the existing imports

2. **Import `setTokenProvider`**: Add `import { setTokenProvider } from '@lunero/api-client'` to the existing imports

3. **Create `AuthTokenProvider` component**: Add a small client component that:
   - Calls `useAuth()` to get `getToken`
   - Calls `setTokenProvider(getToken)` inside a `useEffect` on mount
   - Renders its `children` transparently (no extra DOM nodes or wrappers)

4. **Insert `AuthTokenProvider` in the provider tree**: Place it as a child of `ClerkProvider` and parent of `QueryClientProvider` so that `useAuth()` has access to the Clerk context:
   ```
   <ClerkProvider>
     <AuthTokenProvider>
       <QueryClientProvider client={queryClient}>
         <TamaguiThemeProvider>{children}</TamaguiThemeProvider>
       </QueryClientProvider>
     </AuthTokenProvider>
   </ClerkProvider>
   ```

5. **No backend changes**: The `ClerkJwtFilter` and `SecurityConfig` are working correctly — they just never receive a token because the frontend never sends one

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that render the `Providers` component and inspect whether `setTokenProvider` is called, and whether the axios interceptor attaches an `Authorization` header. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **setTokenProvider not called**: Render `Providers`, assert `setTokenProvider` was called — will fail on unfixed code because no component calls it
2. **Request interceptor skips header**: Create an API request through `apiClient` with `tokenProvider` as `null`, assert no `Authorization` header — will demonstrate the bug path
3. **Profile fetch returns 401**: Mock the API to require auth, render `OnboardingGuard` without token provider — will show the loading state never resolves

**Expected Counterexamples**:
- `setTokenProvider` is never invoked during the `Providers` component lifecycle
- Possible cause: no component bridges `useAuth().getToken` to `setTokenProvider`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL request WHERE isBugCondition(request) DO
  result := apiClient_fixed.interceptors.request(request)
  ASSERT result.headers.Authorization STARTS_WITH "Bearer "
  ASSERT result.headers.Authorization.token IS valid_clerk_jwt
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL request WHERE NOT isBugCondition(request) DO
  ASSERT apiClient_original.interceptors.request(request).headers
       = apiClient_fixed.interceptors.request(request).headers
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many request configurations automatically across the input domain
- It catches edge cases where token injection might incorrectly fire (e.g., unauthenticated users, null tokens)
- It provides strong guarantees that non-authenticated request behavior is unchanged

**Test Plan**: Observe behavior on UNFIXED code first for unauthenticated requests and null-token scenarios, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Null token preservation**: When `getToken` returns `null`, verify no `Authorization` header is added — same behavior before and after fix
2. **Provider tree structure preservation**: Verify `ClerkProvider`, `QueryClientProvider`, and `TamaguiThemeProvider` still render in the correct order after adding `AuthTokenProvider`
3. **Theme hydration preservation**: Verify theme preference resolution continues to work after the component tree change
4. **Query client preservation**: Verify the shared `queryClient` instance is still provided to all descendants

### Unit Tests

- Test that `AuthTokenProvider` calls `setTokenProvider` with `getToken` on mount
- Test that the axios request interceptor adds `Authorization: Bearer <token>` when `tokenProvider` returns a valid string
- Test that the interceptor does NOT add a header when `tokenProvider` returns `null`
- Test that `setTokenProvider` correctly replaces the module-level `tokenProvider` variable

### Property-Based Tests

- Generate random request configs and verify: when `tokenProvider` is set and returns a token, `Authorization` header is always present
- Generate random request configs and verify: when `tokenProvider` is `null` or returns `null`, `Authorization` header is never present
- Generate random sequences of `setTokenProvider` calls and verify the last-set provider is always used

### Integration Tests

- Render the full `Providers` tree with a mocked Clerk session and verify API requests include the Bearer token
- Render `OnboardingGuard` with the fixed `Providers` and a mocked profile API — verify it transitions out of loading
- Verify the app layout (sidebar, topbar, content) renders after successful profile fetch with auth
