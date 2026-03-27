/**
 * Bug Condition Exploration Test — Authenticated API Requests Missing Bearer Token
 *
 * Validates: Requirements 1.1, 1.3, 2.1, 2.3
 *
 * Part A: Verifies that the Providers component calls setTokenProvider with
 *         Clerk's getToken function. EXPECTED TO FAIL on unfixed code because
 *         Providers never bridges useAuth().getToken to setTokenProvider.
 *
 * Part B: Verifies that when setTokenProvider IS configured with a token-returning
 *         function, the axios request interceptor attaches Authorization: Bearer <token>.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ── Part A: Static source analysis of providers.tsx ───────────────────────────
// Uses regex on the raw source instead of rendering the component, because the
// bug is a missing import/call — there's nothing to observe at runtime.

describe('Part A: Providers component calls setTokenProvider', () => {
  it('should import and call setTokenProvider in providers.tsx', () => {
    // Read the actual source of providers.tsx to verify it wires up
    // setTokenProvider from @lunero/api-client.
    const source = readFileSync(
      resolve(__dirname, '../../app/providers.tsx'),
      'utf-8',
    );

    // Regex checks: does providers.tsx import and invoke setTokenProvider?
    // On UNFIXED code neither pattern matches, confirming the bug.
    // Pattern breakdown:
    //   imports — matches `import { ..., setTokenProvider, ... }` (named import)
    //   calls   — matches `setTokenProvider(` (function invocation)
    const imports = /import\s+\{[^}]*setTokenProvider[^}]*\}/.test(source);
    const calls = /setTokenProvider\s*\(/.test(source);

    expect(imports).toBe(true);
    expect(calls).toBe(true);
  });

  it('should import useAuth from @clerk/nextjs to bridge getToken', () => {
    const source = readFileSync(
      resolve(__dirname, '../../app/providers.tsx'),
      'utf-8',
    );

    // The fix requires useAuth so getToken can be passed to
    // setTokenProvider. On unfixed code, useAuth is not imported.
    const hasUseAuth = /import\s+\{[^}]*useAuth[^}]*\}/.test(source);
    expect(hasUseAuth).toBe(true);
  });
});

// ── Part B: Interceptor attaches Authorization header when tokenProvider is set ─
// This section tests the runtime behavior of the axios interceptor in http.ts.
// Unlike Part A, this exercises actual module code rather than static analysis.

describe('Part B: Axios interceptor attaches Bearer token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should attach Authorization: Bearer <token> header when tokenProvider returns a token', async () => {
    const { createApiClient, setTokenProvider } = await import('@lunero/api-client');

    const mockTokenFn = vi.fn().mockResolvedValue('test-jwt-token');
    setTokenProvider(mockTokenFn);

    const client = createApiClient('http://localhost:9999');

    // Capture the request config via a second interceptor, then immediately
    // abort the request. This lets us inspect the headers the first interceptor
    // (in http.ts) attached without needing a running server.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let capturedConfig: any = null;

    client.interceptors.request.use((config) => {
      capturedConfig = config;
      const controller = new AbortController();
      controller.abort();
      config.signal = controller.signal;
      return config;
    });

    try {
      await client.get('/api/v1/profile');
    } catch {
      // Expected — request is aborted by the capture interceptor above.
      // We only care about the config snapshot, not the response.
    }

    // The auth interceptor in http.ts should have injected the Bearer header
    // before our capture interceptor ran (interceptors execute in registration order).
    expect(capturedConfig).not.toBeNull();
    expect(capturedConfig?.headers?.Authorization).toBe('Bearer test-jwt-token');

    // Clean up: reset tokenProvider to null so it doesn't leak into other tests.
    // The cast is needed because setTokenProvider expects a function, not null.
    setTokenProvider(null as unknown as () => Promise<string | null>);
  });
});
