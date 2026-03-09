package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Backoffice dashboard KPI verileri DTO sinifi.
 *
 * <p>scyborsaApi'den gelen dashboard istatistiklerinin deserialize edilmesinde kullanilir.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BackofficeDashboardDto {

    /** Hisse istatistikleri. */
    private StockStats stocks;

    /** Icerik istatistikleri (analist, kurum, sektor). */
    private ContentStats content;

    /** Tarama istatistikleri. */
    private ScreenerStats screener;

    /** Sistem bilgileri. */
    private SystemSummary system;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockStats {
        private long total;
        private long active;
        private long banned;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContentStats {
        private long analistCount;
        private long kurumCount;
        private long sektorCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScreenerStats {
        private long todayTotal;
        private long telegramSent;
        private long telegramUnsent;
        private long tpSlPending;
        private long scanBodyCount;
        private boolean telegramEnabled;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SystemSummary {
        private long uptimeMs;
        private long usedHeapBytes;
        private long maxHeapBytes;
        private String activeProfile;
    }
}
