package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Sektor ozet DTO'su -- listeleme sayfasi icin.
 *
 * <p>scyborsaApi'deki {@code /api/v1/sector/summaries} endpoint'inden
 * donen JSON'u deserialize etmek icin kullanilir.</p>
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class SectorSummaryDto {

    /** Sektor URL slug degeri. */
    private String slug;

    /** Turkce sektor adi. */
    private String displayName;

    /** Kisa sektor aciklamasi. */
    private String description;

    /** Remixicon sinif adi (orn. "ri-bank-line"). */
    private String icon;

    /** Sektordeki hisse sayisi. */
    private int stockCount;

    /** Ortalama gunluk degisim yuzdesi. */
    private double avgChangePercent;

    /** Sektordeki en yuksek degisime sahip top 3 hisse. */
    private List<TopStockInfo> topStocks;

    /**
     * Sektor icindeki bireysel hisse ozet bilgisi.
     */
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TopStockInfo {

        /** Hisse borsa kodu. */
        private String ticker;

        /** Hisse aciklamasi. */
        private String description;

        /** Son fiyat. */
        private double price;

        /** Gunluk degisim yuzdesi. */
        private double changePercent;

        /** Islem hacmi. */
        private double volume;

        /** Logo proxy icin logoid. */
        private String logoid;
    }
}
