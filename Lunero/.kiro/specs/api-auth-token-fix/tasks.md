# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Authenticated API Requests Missing Bearer Token
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case: render `Providers` and assert `setTokenProvider` is called with a function
  - Create test file `apps/web/lib/__tests__/auth-token-provider.test.ts`
  - Mock `@clerk/nextjs` `useAuth` to return a `getToken` function
  - Mock `@lunero/api-client` `setTokenProvider` to track calls
  - Render the `Providers` component and assert `setTokenProvider` was called with `getToken`
  - Additionally, test that when `tokenProvider` is set and returns a valid token string, the axios request interceptor attaches `Authorization: Bearer <token>` header
  - Use `createApiClient` from `@lunero/api-client` to create a test client, call `setTokenProvider` with a mock that returns a token, fire a request, and assert the header is present
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (the `Providers` component never calls `setTokenProvider`, confirming the bug exists)
  - Document counterexamples: `setTokenProvider` is never invoked during `Providers` lifecycle because no component bridges `useAuth().getToken` to `setTokenProvider`
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.3, 2.1, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Unauthenticated Requests Remain Headerless
  - **IMPORTANT**: Follow observation-first methodology
  - Create test file `apps/web/lib/__tests__/auth-token-preservation.test.ts`
  - Observe on UNFIXED code: when `tokenProvider` is `null`, API requests have no `Authorization` header
  - Observe on UNFIXED code: when `tokenProvider` is set but `getToken` returns `null`, API requests have no `Authorization` header
  - Write property-based tests using vitest: for a variety of request configs (GET, POST, PUT, DELETE with various URLs), when `tokenProvider` is `null` or returns `null`, the interceptor never adds an `Authorization` header
  - Generate multiple request configurations (different HTTP methods, different URL paths) and assert no `Authorization` header is present in any case when there is no valid token
  - Verify that `ClerkProvider`, `QueryClientProvider`, and `TamaguiThemeProvider` still render (provider tree structure is preserved) by checking the `Providers` component renders children
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior: unauthenticated requests never get auth headers)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Fix for missing AuthTokenProvider in Providers component

  - [x] 3.1 Implement the fix
    - In `apps/web/app/providers.tsx`:
    - Add `import { useAuth } from '@clerk/nextjs'` to imports
    - Add `import { setTokenProvider } from '@lunero/api-client'` to imports
    - Create `AuthTokenProvider` component that calls `useAuth()` to get `getToken`, then calls `setTokenProvider(getToken)` inside a `useEffect` on mount
    - `AuthTokenProvider` renders `{children}` transparently (no extra DOM)
    - Insert `AuthTokenProvider` in the provider tree between `ClerkProvider` and `QueryClientProvider`:
      ```
      <ClerkProvider>
        <AuthTokenProvider>
          <QueryClientProvider client={queryClient}>
            <TamaguiThemeProvider>{children}</TamaguiThemeProvider>
          </QueryClientProvider>
        </AuthTokenProvider>
      </ClerkProvider>
      ```
    - _Bug_Condition: isBugCondition(request) where tokenProvider IS null AND userIsAuthenticated() AND request.url STARTS_WITH "/api/v1/"_
    - _Expected_Behavior: After fix, every authenticated API request includes Authorization: Bearer <token> header_
    - _Preservation: Unauthenticated requests remain headerless; provider tree order preserved; theme hydration unchanged_
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.3_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Authenticated API Requests Include Bearer Token
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior: `setTokenProvider` is called with `getToken` during `Providers` mount
    - Run bug condition exploration test from step 1: `cd apps/web && npx vitest run lib/__tests__/auth-token-provider.test.ts`
    - **EXPECTED OUTCOME**: Test PASSES (confirms `AuthTokenProvider` correctly wires up Clerk's `getToken` to the API client)
    - _Requirements: 2.1, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Unauthenticated Requests Remain Headerless
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2: `cd apps/web && npx vitest run lib/__tests__/auth-token-preservation.test.ts`
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions - unauthenticated requests still have no auth header, provider tree still works)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite: `cd apps/web && npx vitest run`
  - Ensure all tests pass, ask the user if questions arise.
