package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/**
 * Araci kurum takas (saklama) dagilim listesi UI DTO sinifi.
 *
 * <p>scyborsaApi'deki {@code /api/v1/araci-kurumlar/takas-list} endpoint'inden
 * donen araci kurum takas verilerini tasir.</p>
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class BrokerageTakasListDto {

    /** Araci kurum takas ogeleri listesi. */
    private List<BrokerageTakasItemDto> items;

    /** Toplam kurum sayisi. */
    private int totalCount;

    /**
     * Tek bir araci kurumun takas dagilimdaki verisini temsil eder.
     */
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class BrokerageTakasItemDto {

        /** Kurum kodu (ornegin MLB, YKR). */
        private String code;

        /** Kurum tam adi. */
        private String title;

        /** Kurum kisa adi. */
        private String shortTitle;

        /** Kurum logo URL'i. */
        private String logoUrl;

        /** Guncel takas degeri (TL). */
        private double lastValue;

        /** Guncel deger formatli metin (ornegin "1.23 Milyar"). */
        private String formattedLast;

        /** Onceki hafta degeri. */
        private double prevWeek;

        /** Onceki ay degeri. */
        private double prevMonth;

        /** Onceki 3 ay degeri. */
        private double prev3Months;

        /** Piyasa payi yuzdesi (0-100). */
        private double percentage;

        /** Haftalik degisim yuzdesi. */
        private double weeklyChange;
    }
}
