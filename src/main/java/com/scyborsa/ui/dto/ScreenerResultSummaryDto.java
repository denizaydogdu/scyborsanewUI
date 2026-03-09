package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Tarama sonucu ozet DTO sinifi.
 *
 * <p>scyborsaApi'den gelen tarama sonuclarinin deserialize edilmesinde kullanilir.
 * Backoffice tarama izleme sayfasinda listeleme icin kullanilir.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScreenerResultSummaryDto {

    /** Hisse borsa kodu. */
    private String stockName;

    /** Hisse fiyati. */
    private Double price;

    /** Yuzde degisim. */
    private Double percentage;

    /** Tarama adi. */
    private String screenerName;

    /** Tarama turu. */
    private String screenerType;

    /** Tarama saati. */
    private String screenerTime;

    /** Telegram'a gonderildi mi. */
    private Boolean telegramSent;

    /** TP kontrolu tamamlandi mi. */
    private Boolean tpCheckDone;

    /** SL kontrolu tamamlandi mi. */
    private Boolean slCheckDone;

    /** TP fiyati. */
    private Double tpPrice;

    /** SL fiyati. */
    private Double slPrice;
}
