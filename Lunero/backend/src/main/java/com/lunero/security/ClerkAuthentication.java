package com.lunero.security;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;

import java.util.Collection;

/**
 * Authentication token representing a validated Clerk JWT.
 * The principal is the Clerk userId (sub claim).
 */
public class ClerkAuthentication extends AbstractAuthenticationToken {

    private final String userId;

    public ClerkAuthentication(String userId, Collection<? extends GrantedAuthority> authorities) {
        super(authorities);
        this.userId = userId;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return null;
    }

    @Override
    public Object getPrincipal() {
        return userId;
    }

    public String getUserId() {
        return userId;
    }
}
