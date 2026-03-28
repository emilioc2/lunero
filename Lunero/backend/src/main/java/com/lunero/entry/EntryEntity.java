package com.lunero.entry;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * JPA entity for the entries table.
 * Full service implementation is in task 8.
 */
@Entity
@Table(name = "entries")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EntryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "flow_sheet_id", nullable = false)
    private UUID flowSheetId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "entry_type", nullable = false, length = 20)
    private String entryType;

    @Column(name = "category", nullable = false)
    private String category;

    @Column(name = "amount", nullable = false, precision = 18, scale = 4)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 10)
    private String currency;

    @Column(name = "converted_amount", precision = 18, scale = 4)
    private BigDecimal convertedAmount;

    @Column(name = "conversion_rate", precision = 18, scale = 8)
    private BigDecimal conversionRate;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Column(name = "note")
    private String note;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    @Column(name = "client_updated_at")
    private Instant clientUpdatedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
