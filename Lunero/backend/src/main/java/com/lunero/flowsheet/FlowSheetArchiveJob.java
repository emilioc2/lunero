package com.lunero.flowsheet;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Daily scheduled job that archives expired FlowSheets and creates the next period.
 * Runs at midnight UTC every day.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FlowSheetArchiveJob {

    private final FlowSheetService flowSheetService;

    @Scheduled(cron = "0 0 0 * * *", zone = "UTC")
    public void run() {
        log.info("FlowSheetArchiveJob starting");
        int archived = flowSheetService.archiveExpiredSheets();
        log.info("FlowSheetArchiveJob complete: archived={}", archived);
    }
}
