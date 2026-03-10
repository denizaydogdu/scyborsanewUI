package com.scyborsa.ui.dto;

import lombok.Data;

import java.util.List;

/**
 * Takas (Saklama Dagilimi) API response mirror DTO'su.
 * scyborsaApi'den donen Takas verisini UI tarafinda temsil eder.
 */
@Data
public class TakasResponseDto {

    /** Zenginlestirilmis saklama kurulusu listesi. */
    private List<TakasCustodianEnrichedDto> custodians;

    /** Verinin ait oldugu tarih (yyyy-MM-dd formatinda). */
    private String dataDate;

    /** Formatlanmis tarih (or: "11 Mart 2026"). */
    private String formattedDataDate;

    /**
     * Tek bir saklama kurulusunun zenginlestirilmis verisi.
     */
    @Data
    public static class TakasCustodianEnrichedDto {

        /** Saklama kurulusu kodu (or: "TGB"). */
        private String code;

        /** Kurum tam adi. */
        private String title;

        /** Kurum kisa adi. */
        private String shortTitle;

        /** Kurum logo URL. */
        private String logoUrl;

        /** TL cinsinden tutulan deger (ham). */
        private double deger;

        /** Formatlanmis deger (or: "1.87 Milyar TL"). */
        private String formattedDeger;

        /** Yuzde orani (0-100 arasi, or: 76.01). */
        private double yuzde;
    }
}
