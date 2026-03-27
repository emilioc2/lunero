package com.lunero.common;

import com.lunero.common.exception.BusinessRuleException;
import com.lunero.common.exception.ConflictException;
import com.lunero.common.exception.EntityNotFoundException;
import com.lunero.common.exception.ServiceUnavailableException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    void handleValidation_returns400WithFieldErrors() {
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        FieldError fieldError = new FieldError("entry", "amount", "must be greater than 0");
        when(ex.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldErrors()).thenReturn(List.of(fieldError));

        ProblemDetail result = handler.handleValidation(ex);

        assertThat(result.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(result.getTitle()).isEqualTo("Validation Error");
        assertThat(result.getType().toString()).contains("validation-error");
        assertThat(result.getProperties()).containsKey("fieldErrors");
    }

    @Test
    void handleConstraintViolation_returns400() {
        ConstraintViolation<?> violation = mock(ConstraintViolation.class);
        Path path = mock(Path.class);
        when(path.toString()).thenReturn("amount");
        when(violation.getPropertyPath()).thenReturn(path);
        when(violation.getMessage()).thenReturn("must be positive");

        ConstraintViolationException ex = new ConstraintViolationException(Set.of(violation));

        ProblemDetail result = handler.handleConstraintViolation(ex);

        assertThat(result.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(result.getTitle()).isEqualTo("Validation Error");
        assertThat(result.getProperties()).containsKey("violations");
    }

    @Test
    void handleEntityNotFound_returns404() {
        EntityNotFoundException ex = new EntityNotFoundException("FlowSheet", "abc-123");

        ProblemDetail result = handler.handleEntityNotFound(ex);

        assertThat(result.getStatus()).isEqualTo(HttpStatus.NOT_FOUND.value());
        assertThat(result.getTitle()).isEqualTo("Not Found");
        assertThat(result.getDetail()).contains("FlowSheet");
        assertThat(result.getType().toString()).contains("not-found");
    }

    @Test
    void handleEntityNotFound_withMessageConstructor_returns404() {
        EntityNotFoundException ex = new EntityNotFoundException("Resource not found");

        ProblemDetail result = handler.handleEntityNotFound(ex);

        assertThat(result.getStatus()).isEqualTo(HttpStatus.NOT_FOUND.value());
        assertThat(result.getDetail()).isEqualTo("Resource not found");
    }

    @Test
    void handleAccessDenied_returns403() {
        AccessDeniedException ex = new AccessDeniedException("Access denied");

        ProblemDetail result = handler.handleAccessDenied(ex);

        assertThat(result.getStatus()).isEqualTo(HttpStatus.FORBIDDEN.value());
        assertThat(result.getTitle()).isEqualTo("Forbidden");
        assertThat(result.getType().toString()).contains("forbidden");
    }

    @Test
    void handleAuthentication_returns401() {
        BadCredentialsException ex = new BadCredentialsException("Bad credentials");

        ProblemDetail result = handler.handleAuthentication(ex);

        assertThat(result.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED.value());
        assertThat(result.getTitle()).isEqualTo("Unauthorized");
        assertThat(result.getType().toString()).contains("unauthorized");
    }

    @Test
    void handleBusinessRule_returns422() {
        BusinessRuleException ex = new BusinessRuleException("FlowSheet is locked");

        ProblemDetail result = handler.handleBusinessRule(ex);

        assertThat(result.getStatus()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY.value());
        assertThat(result.getTitle()).isEqualTo("Business Rule Violation");
        assertThat(result.getDetail()).isEqualTo("FlowSheet is locked");
        assertThat(result.getType().toString()).contains("business-rule-violation");
    }

    @Test
    void handleConflict_returns409() {
        ConflictException ex = new ConflictException("Category has assigned entries");

        ProblemDetail result = handler.handleConflict(ex);

        assertThat(result.getStatus()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(result.getTitle()).isEqualTo("Conflict");
        assertThat(result.getDetail()).isEqualTo("Category has assigned entries");
        assertThat(result.getType().toString()).contains("conflict");
    }

    @Test
    void handleServiceUnavailable_returns503() {
        ServiceUnavailableException ex = new ServiceUnavailableException("Gemini is unavailable");

        ProblemDetail result = handler.handleServiceUnavailable(ex);

        assertThat(result.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE.value());
        assertThat(result.getTitle()).isEqualTo("Service Unavailable");
        assertThat(result.getDetail()).isEqualTo("Gemini is unavailable");
        assertThat(result.getType().toString()).contains("service-unavailable");
    }

    @Test
    void handleServiceUnavailable_withCause_returns503() {
        ServiceUnavailableException ex = new ServiceUnavailableException("FX rates unavailable",
                new RuntimeException("connection timeout"));

        ProblemDetail result = handler.handleServiceUnavailable(ex);

        assertThat(result.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE.value());
        assertThat(result.getDetail()).isEqualTo("FX rates unavailable");
    }

    @Test
    void handleGeneric_returns500() {
        Exception ex = new RuntimeException("Something went wrong");

        ProblemDetail result = handler.handleGeneric(ex);

        assertThat(result.getStatus()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR.value());
        assertThat(result.getTitle()).isEqualTo("Internal Server Error");
        assertThat(result.getDetail()).isEqualTo("An unexpected error occurred");
        assertThat(result.getType().toString()).contains("internal-error");
    }
}
