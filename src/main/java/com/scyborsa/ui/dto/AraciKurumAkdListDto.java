package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/**
 * Aracı kurum AKD (Aracı Kurum Dağılımı) piyasa geneli liste DTO'su.
 *
 * <p>scyborsaApi'den dönen aracı kurum bazlı AKD dağılım verisini
 * UI tarafında temsil eder. Tüm aracı kurumların alış/satış/net
 * hacim bilgilerini içerir.</p>
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AraciKurumAkdListDto {

    /** Aracı kurum AKD dağılım listesi. */
    private List<BrokerageAkdItemDto> items;

    /** Verinin ait olduğu tarih (yyyy-MM-dd formatında). */
    private String dataDate;

    /** Formatlanmış tarih (ör: "11 Mart 2026"). */
    private String formattedDataDate;

    /** Listedeki toplam aracı kurum sayısı. */
    private int totalCount;

    /**
     * Tek bir aracı kurumun AKD dağılım bilgilerini temsil eden iç DTO.
     *
     * <p>Alış, satış, net ve toplam hacim ile yüzde bilgilerini içerir.</p>
     */
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class BrokerageAkdItemDto {

        /** Aracı kurum kodu (ör: "AK"). */
        private String code;

        /** Aracı kurum tam adı. */
        private String title;

        /** Aracı kurum kısa adı. */
        private String shortTitle;

        /** Aracı kurum logo URL'i (Fintables CDN). */
        private String logoUrl;

        /** Alış hacmi (TL cinsinden). */
        private long buyVolume;

        /** Alış yüzdesi (%). */
        private double buyPercentage;

        /** Satış hacmi (TL cinsinden). */
        private long sellVolume;

        /** Satış yüzdesi (%). */
        private double sellPercentage;

        /** Net hacim (alış - satış, TL cinsinden). */
        private long netVolume;

        /** Net yüzde (%). */
        private double netPercentage;

        /** Toplam hacim (alış + satış, TL cinsinden). */
        private long totalVolume;

        /** Toplam yüzde (%). */
        private double totalPercentage;
    }
}
