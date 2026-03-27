package com.lunero.ai;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "dismissed_alerts")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DismissedAlertEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "alert_type", nullable = false, length = 50)
    private String alertType;

    @Column(name = "flow_sheet_id")
    private UUID flowSheetId;

    @Column(name = "dismissed_at", nullable = false)
    @Builder.Default
    private Instant dismissedAt = Instant.now();
}
