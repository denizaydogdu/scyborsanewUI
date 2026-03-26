package com.scyborsa.ui.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Temettu bilgisi DTO'su.
 *
 * <p>scyborsaApi'deki {@code /api/v1/dividends} endpoint'inden
 * donen tek bir hissenin temettu verilerini tasir.
 * Dashboard temettu karti ve detay sayfalarinda kullanilir.</p>
 */
@Data
@NoArgsConstructor
public class DividendDto {

    /** Hisse kodu (ornegin GARAN, THYAO). */
    private String stockCode;

    /** Sirket adi. */
    private String companyName;

    /** Hisse basina temettu tutari (TL veya ilgili para birimi). */
    private Double dividendAmount;

    /** Temettu verimi (yuzde olarak). */
    private Double dividendYield;

    /** Hak dusumu tarihi (ISO format, ornegin 2026-03-25). */
    private String exDividendDate;

    /** Odeme tarihi (ISO format, ornegin 2026-04-15). */
    private String paymentDate;

    /** Para birimi (ornegin TRY, USD). */
    private String currency;

    /** Hissenin katılım endeksinde olup olmadığı. */
    private boolean katilim;
}
