package com.lunero.common.exception;

/**
 * Thrown when a business-level validation fails that should return HTTP 400.
 * Use for domain rule violations that are logically "bad input" (e.g. overlapping FlowSheet dates).
 * Distinct from {@link BusinessRuleException} which maps to 422.
 */
public class ValidationException extends RuntimeException {

    public ValidationException(String message) {
        super(message);
    }
}
