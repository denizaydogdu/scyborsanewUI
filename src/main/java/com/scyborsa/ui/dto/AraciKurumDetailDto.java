package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/**
 * Aracı kurum hisse bazlı AKD detay DTO'su.
 *
 * <p>scyborsaApi'den dönen belirli bir aracı kurumun hisse bazlı
 * AKD (Aracı Kurum Dağılımı) verilerini UI tarafında temsil eder.
 * Her hissenin alış/satış/net hacim, lot ve maliyet bilgilerini içerir.</p>
 *
 * @see AraciKurumAkdListDto
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AraciKurumDetailDto {

    /** Aracı kurum kodu (ör: "MLB", "YKR"). */
    private String brokerageCode;

    /** Hisse bazlı AKD dağılım listesi. */
    private List<StockAkdItemDto> items;

    /** Verinin ait olduğu tarih (yyyy-MM-dd formatında). */
    private String dataDate;

    /** Formatlanmış tarih (ör: "11 Mart 2026"). */
    private String formattedDataDate;

    /** Toplam alış hacmi (TL cinsinden). */
    private long totalBuyVolume;

    /** Toplam satış hacmi (TL cinsinden). */
    private long totalSellVolume;

    /** Toplam net hacim (alış - satış, TL cinsinden). */
    private long totalNetVolume;

    /** Listedeki hisse sayısı. */
    private int stockCount;

    /** Kurum başlığı (tam ad). */
    private String brokerageTitle;

    /** Kurum kısa başlığı. */
    private String brokerageShortTitle;

    /** Kurum logo URL'i. */
    private String brokerageLogoUrl;

    /**
     * Tek bir hissenin AKD dağılım bilgilerini temsil eden iç DTO.
     *
     * <p>Alış, satış, net ve toplam hacim ile yüzde, lot ve maliyet bilgilerini içerir.</p>
     */
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class StockAkdItemDto {

        /** Hisse kodu (ör: "GARAN", "THYAO"). */
        private String code;

        /** Alış hacmi (TL cinsinden). */
        private long buyVolume;

        /** Satış hacmi (TL cinsinden). */
        private long sellVolume;

        /** Net hacim (alış - satış, TL cinsinden). */
        private long netVolume;

        /** Toplam hacim (alış + satış, TL cinsinden). */
        private long totalVolume;

        /** Alış yüzdesi (%). */
        private double buyPercentage;

        /** Satış yüzdesi (%). */
        private double sellPercentage;

        /** Net yüzde (%). */
        private double netPercentage;

        /** Toplam yüzde (%). */
        private double totalPercentage;

        /** Alış lot adedi. */
        private long buySize;

        /** Satış lot adedi. */
        private long sellSize;

        /** Net lot adedi (alış - satış). */
        private long netSize;

        /** Toplam lot adedi (alış + satış). */
        private long totalSize;

        /** Ortalama maliyet (TL). */
        private double cost;

        /** Hisse logo tanımlayıcısı (TradingView CDN). */
        private String logoid;
    }
}
