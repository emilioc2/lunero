package com.lunero.common.audit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    private AuditLogService auditLogService;

    private final String userId = UUID.randomUUID().toString();
    private final String entityId = UUID.randomUUID().toString();

    @BeforeEach
    void setUp() {
        auditLogService = new AuditLogService(auditLogRepository);
    }

    @Test
    void log_withPayload_savesCorrectEntry() {
        Map<String, Object> payload = Map.of("amount", 100);

        auditLogService.log(userId, "entry", entityId, AuditAction.CREATE, payload);

        ArgumentCaptor<AuditLogEntity> captor = ArgumentCaptor.forClass(AuditLogEntity.class);
        verify(auditLogRepository).save(captor.capture());

        AuditLogEntity saved = captor.getValue();
        assertThat(saved.getUserId()).isEqualTo(UUID.fromString(userId));
        assertThat(saved.getEntityType()).isEqualTo("entry");
        assertThat(saved.getEntityId()).isEqualTo(UUID.fromString(entityId));
        assertThat(saved.getAction()).isEqualTo(AuditAction.CREATE);
        assertThat(saved.getPayload()).isEqualTo(payload);
    }

    @Test
    void log_withoutPayload_savesNullPayload() {
        auditLogService.log(userId, "flowsheet", entityId, AuditAction.DELETE);

        ArgumentCaptor<AuditLogEntity> captor = ArgumentCaptor.forClass(AuditLogEntity.class);
        verify(auditLogRepository).save(captor.capture());

        assertThat(captor.getValue().getPayload()).isNull();
        assertThat(captor.getValue().getAction()).isEqualTo(AuditAction.DELETE);
    }

    @Test
    void log_doesNotThrow_whenRepositoryFails() {
        when(auditLogRepository.save(any())).thenThrow(new RuntimeException("DB error"));

        // Fire-and-forget: must never propagate exceptions to caller
        assertThatCode(() ->
                auditLogService.log(userId, "entry", entityId, AuditAction.UPDATE)
        ).doesNotThrowAnyException();
    }

    @Test
    void log_allActions_areSupported() {
        for (AuditAction action : AuditAction.values()) {
            auditLogService.log(userId, "entry", entityId, action);
        }

        verify(auditLogRepository, times(AuditAction.values().length)).save(any());
    }
}
