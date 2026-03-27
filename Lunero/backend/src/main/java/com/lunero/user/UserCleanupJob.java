package com.lunero.user;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Scheduled job that permanently removes user accounts (and all cascaded data)
 * that were soft-deleted more than 30 days ago.
 *
 * Cascade deletes on the DB schema handle removal of flow_sheets, entries,
 * categories, recurring_entries, and all other user-owned data automatically.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserCleanupJob {

    private final UserRepository userRepository;

    @Scheduled(cron = "0 0 2 * * *") // daily at 02:00
    @Transactional
    public void purgeDeletedUsers() {
        Instant cutoff = Instant.now().minus(30, ChronoUnit.DAYS);
        List<UserEntity> toDelete = userRepository.findAllByDeletedAtBefore(cutoff);

        if (toDelete.isEmpty()) {
            return;
        }

        log.info("Purging {} user account(s) soft-deleted before {}", toDelete.size(), cutoff);
        userRepository.deleteAll(toDelete);
        log.info("Purge complete");
    }
}
