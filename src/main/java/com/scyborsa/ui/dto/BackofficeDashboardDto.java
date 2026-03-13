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

    /**
     * Hisse istatistikleri.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StockStats {
        /** Toplam hisse sayisi. */
        private long total;
        /** Aktif hisse sayisi. */
        private long active;
        /** Yasakli hisse sayisi. */
        private long banned;
    }

    /**
     * Icerik istatistikleri (analist, kurum, sektor).
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContentStats {
        /** Toplam analist sayisi. */
        private long analistCount;
        /** Toplam kurum sayisi. */
        private long kurumCount;
        /** Toplam sektor sayisi. */
        private long sektorCount;
    }

    /**
     * Tarama istatistikleri.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScreenerStats {
        /** Bugunun toplam tarama sayisi. */
        private long todayTotal;
        /** Telegram gonderilmis tarama sayisi. */
        private long telegramSent;
        /** Telegram gonderi bekleyen tarama sayisi. */
        private long telegramUnsent;
        /** TP/SL kontrol bekleyen tarama sayisi. */
        private long tpSlPending;
        /** Toplam scan body sayisi. */
        private long scanBodyCount;
        /** Telegram gonderimi aktif mi. */
        private boolean telegramEnabled;
    }

    /**
     * Sistem bilgileri.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SystemSummary {
        /** Sistem calisma suresi (milisaniye). */
        private long uptimeMs;
        /** Kullanilan heap bellek (byte). */
        private long usedHeapBytes;
        /** Azami heap bellek (byte). */
        private long maxHeapBytes;
        /** Aktif Spring profili. */
        private String activeProfile;
    }
}
