package com.lunero.projection;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * JPA entity for the category_projections table.
 * Unique constraint: (flow_sheet_id, category_id) — one projection per category per FlowSheet.
 */
@Entity
@Table(
    name = "category_projections",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_projection_flowsheet_category",
        columnNames = {"flow_sheet_id", "category_id"}
    )
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryProjectionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "flow_sheet_id", nullable = false)
    private UUID flowSheetId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "category_id", nullable = false)
    private UUID categoryId;

    @Column(name = "projected_amount", nullable = false, precision = 18, scale = 4)
    private BigDecimal projectedAmount;

    @Column(name = "currency", nullable = false, length = 10)
    private String currency;

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
