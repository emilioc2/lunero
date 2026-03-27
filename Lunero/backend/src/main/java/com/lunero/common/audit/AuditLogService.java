package com.lunero.common.audit;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

/**
 * Fire-and-forget audit log writer.
 * All methods are {@code @Async} — callers do not wait for the write to complete.
 * Uses {@code REQUIRES_NEW} so audit writes never roll back with the caller's transaction.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String userId, String entityType, String entityId,
                    AuditAction action, Map<String, Object> payload) {
        try {
            AuditLogEntity entry = AuditLogEntity.builder()
                    .userId(UUID.fromString(userId))
                    .entityType(entityType)
                    .entityId(UUID.fromString(entityId))
                    .action(action)
                    .payload(payload)
                    .build();
            auditLogRepository.save(entry);
        } catch (Exception ex) {
            // Audit failures must never propagate to the caller
            log.error("Failed to write audit log: userId={}, entityType={}, entityId={}, action={}",
                    userId, entityType, entityId, action, ex);
        }
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String userId, String entityType, String entityId, AuditAction action) {
        log(userId, entityType, entityId, action, null);
    }
}
