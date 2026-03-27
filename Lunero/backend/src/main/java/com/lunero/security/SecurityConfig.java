package com.lunero.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

// Stateless security configuration for the Lunero API.
// All auth is handled by Clerk JWTs — no session cookies, no form login.
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    // Validates Clerk-issued JWTs and populates the SecurityContext per request
    private final ClerkJwtFilter clerkJwtFilter;

    // Comma-separated allowed origins, e.g. "https://lunero.app,http://localhost:3000".
    // Defaults to wildcard (*) for local dev; override in application-prod.yml.
    @Value("${cors.allowed-origins:*}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // CSRF disabled — stateless JWT auth; no cookie-based sessions to protect
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Health check stays public for load-balancer probes (Railway / Render)
                .requestMatchers("/actuator/health").permitAll()
                // All versioned API routes require a valid Clerk JWT
                .requestMatchers("/api/v1/**").authenticated()
                // Deny everything else to minimise attack surface
                .anyRequest().denyAll()
            )
            .exceptionHandling(ex -> ex
                // Return 401 instead of redirecting to a login page (no server-side login)
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                .accessDeniedHandler((req, res, e) -> res.setStatus(HttpStatus.FORBIDDEN.value()))
            )
            // Run the Clerk JWT filter before Spring's default username/password filter
            .addFilterBefore(clerkJwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // CORS policy scoped to /api/** — the Next.js frontend calls these endpoints
    // cross-origin during local dev and from the Vercel deployment in production.
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // Split on comma so a single env var can list multiple origins
        config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        // Credentials required so the browser sends the Authorization header with Clerk JWTs
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
