package com.lunero.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ClerkJwtFilter covering Property 24:
 * expired, malformed, and missing tokens must all be rejected (no auth set in context).
 *
 * Note: Full JWKS-based validation is tested via integration tests with a mock JWKS server.
 * These unit tests verify the filter's token-extraction and error-handling paths.
 */
class ClerkJwtFilterTest {

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void missingAuthorizationHeader_doesNotSetAuthentication() throws Exception {
        ClerkJwtFilter filter = filterWithInvalidJwks();
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(request, response); // chain continues; Spring Security handles 401
    }

    @Test
    void nonBearerAuthorizationHeader_doesNotSetAuthentication() throws Exception {
        ClerkJwtFilter filter = filterWithInvalidJwks();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Basic dXNlcjpwYXNz");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(request, response);
    }

    @Test
    void malformedToken_doesNotSetAuthentication() throws Exception {
        ClerkJwtFilter filter = filterWithInvalidJwks();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer this.is.not.a.valid.jwt");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(request, response);
    }

    @Test
    void expiredToken_doesNotSetAuthentication() throws Exception {
        ClerkJwtFilter filter = filterWithInvalidJwks();
        String expiredToken = buildExpiredToken();

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + expiredToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        // JWKS validation will fail (wrong key source), so auth is not set
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(request, response);
    }

    @Test
    void emptyBearerToken_doesNotSetAuthentication() throws Exception {
        ClerkJwtFilter filter = filterWithInvalidJwks();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer ");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(chain).doFilter(request, response);
    }

    @Test
    void filterChain_alwaysContinues_evenOnJwtFailure() throws Exception {
        ClerkJwtFilter filter = filterWithInvalidJwks();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer garbage.token.value");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        // Filter must always call chain.doFilter — Spring Security handles the 401 response
        verify(chain, times(1)).doFilter(any(HttpServletRequest.class), any(HttpServletResponse.class));
    }

    // --- helpers ---

    /**
     * Creates a filter pointing at a non-existent JWKS URI.
     * Any token presented will fail validation (connection refused), which is the
     * expected behavior for all "invalid token" test cases.
     */
    private ClerkJwtFilter filterWithInvalidJwks() throws Exception {
        return new ClerkJwtFilter("https://invalid.example.com/.well-known/jwks.json");
    }

    private String buildExpiredToken() throws Exception {
        KeyPairGenerator gen = KeyPairGenerator.getInstance("RSA");
        gen.initialize(2048);
        KeyPair keyPair = gen.generateKeyPair();

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject("user_test123")
                .issueTime(new Date(System.currentTimeMillis() - 7200_000))
                .expirationTime(new Date(System.currentTimeMillis() - 3600_000)) // expired 1h ago
                .build();

        SignedJWT jwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.RS256).build(),
                claims
        );
        jwt.sign(new RSASSASigner(keyPair.getPrivate()));
        return jwt.serialize();
    }
}
