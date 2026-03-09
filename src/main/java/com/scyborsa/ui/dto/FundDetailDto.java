package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * TEFAS fon detay DTO sinifi (UI mirror).
 *
 * <p>scyborsaApi'den donen zenginlestirilmis fon detay bilgilerini tasir.
 * Fon detay sayfasinda ({@code /fonlar/{code}}) kullanilir.</p>
 *
 * <p>Temel fon bilgilerine ek olarak varlik dagilimi, holdingler,
 * benzer fonlar, kategori siralaması, sektor agirliklari, benchmark
 * ve fiyat gecmisi icerir.</p>
 *
 * @see FundDto
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class FundDetailDto {

    // ── Temel Bilgiler (19 alan) ──────────────────────────

    /** TEFAS fon kodu (orn. "TEB"). */
    private String tefasCode;

    /** Fon adi. */
    private String fundName;

    /** Fon tipi: YAT (Yatirim), EMK (Emeklilik), BYF (Borsa Yatirim Fonu). */
    private String fundType;

    /** Fon kategorisi. */
    private String fundCategory;

    /** Fon aktif mi? */
    private boolean active;

    /** Katilim fonu mu? */
    private boolean participation;

    /** Son NAV (Net Aktif Deger, nullable). */
    private Double latestPrice;

    /** Portfoy buyuklugu (TL, nullable). */
    private Double portfolioSize;

    /** Yatirimci sayisi (nullable). */
    private Integer investorCount;

    /** Risk seviyesi (1-7, nullable). */
    private Integer riskLevel;

    /** Gunluk getiri (%). */
    private Double return1D;

    /** Haftalik getiri (%). */
    private Double return1W;

    /** 1 aylik getiri (%). */
    private Double return1M;

    /** 3 aylik getiri (%). */
    private Double return3M;

    /** 6 aylik getiri (%). */
    private Double return6M;

    /** Yil basi getiri (%). */
    private Double returnYTD;

    /** 1 yillik getiri (%). */
    private Double return1Y;

    /** 3 yillik getiri (%). */
    private Double return3Y;

    /** 5 yillik getiri (%). */
    private Double return5Y;

    // ── Ek Bilgiler ──────────────────────────────────────

    /** Fon kurucusu. */
    private String founder;

    /** Yonetim ucreti (%). */
    private Double managementFee;

    /** Alis valoru (is gunu). */
    private Integer buyingValor;

    /** Satis valoru (is gunu). */
    private Integer sellingValor;

    /** Fon strateji aciklamasi. */
    private String strategyStatement;

    /** Kategori adi. */
    private String categoryName;

    /** Kategori kodu. */
    private String categoryCode;

    /** Bilesik yillik buyume orani (%). */
    private Double cagr;

    /** Toplam pay sayisi. */
    private Long totalShares;

    /** Fiyat tarihi (yyyy-MM-dd). */
    private String priceDate;

    /** Emeklilik fonu mu? */
    private boolean retirement;

    // ── Zenginlestirilmis Veriler ────────────────────────

    /** Varlik dagilimi bilgisi. */
    private Allocation allocation;

    /** Fon holdinglari (portfoy icerigi). */
    private List<Holding> holdings;

    /** Benzer fonlar listesi. */
    private List<SimilarFund> similarFunds;

    /** Kategori icerisindeki siralama. */
    private CategoryRank categoryRank;

    /** Sektor agirliklari. */
    private List<SectorWeight> sectorWeights;

    /** Benchmark karsilastirma bilgisi. */
    private BenchmarkInfo benchmark;

    /** Fiyat gecmisi. */
    private List<PricePoint> priceHistory;

    // ── Inner Classes ────────────────────────────────────

    /**
     * Fon varlik dagilimi bilgisi.
     *
     * <p>Fon portfoyunun varlik siniflarına gore yuzdelik dagilimini icerir.</p>
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Allocation {

        /** Hisse senedi orani (%). */
        private Double stockPercentage;

        /** Tahvil/bono orani (%). */
        private Double bondPercentage;

        /** Nakit orani (%). */
        private Double cashPercentage;

        /** Repo orani (%). */
        private Double repoPercentage;

        /** Doviz orani (%). */
        private Double foreignCurrencyPercentage;

        /** Diger varlik orani (%). */
        private Double otherPercentage;

        /** Dagilim tarihi (yyyy-MM-dd). */
        private String allocationDate;
    }

    /**
     * Fon portfoy holding (pozisyon) bilgisi.
     *
     * <p>Fon portfoyundeki bireysel varlik kalemlerini temsil eder.</p>
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Holding {

        /** Varlik adi. */
        private String name;

        /** Hisse ticker kodu. */
        private String ticker;

        /** Portfoy icerisindeki yuzde (%). */
        private Double percentage;

        /** Piyasa degeri (TL). */
        private Double marketValue;

        /** Onceki ay agirligi (%). */
        private Double lastMonthWeight;

        /** Agirlik degisimi (%). */
        private Double weightChange;
    }

    /**
     * Benzer fon bilgisi.
     *
     * <p>Ayni kategori veya stratejideki benzer fonlari temsil eder.</p>
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SimilarFund {

        /** TEFAS fon kodu. */
        private String tefasCode;

        /** Fon adi. */
        private String fundName;

        /** Fon tipi. */
        private String fundType;

        /** 1 aylik getiri (%). */
        private Double return1M;

        /** 3 aylik getiri (%). */
        private Double return3M;

        /** 1 yillik getiri (%). */
        private Double return1Y;

        /** Benzerlik skoru (0-1). */
        private Double similarityScore;

        /** Benzerlik nedenleri. */
        private List<String> matchReasons;
    }

    /**
     * Fon kategori icerisindeki siralama bilgisi.
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CategoryRank {

        /** Kategori icerisindeki sira. */
        private Integer rank;

        /** Kategorideki toplam fon sayisi. */
        private Integer totalFunds;

        /** Siralama donemi. */
        private String period;
    }

    /**
     * Fon portfoyundeki sektor agirligi.
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SectorWeight {

        /** Sektor adi. */
        private String sectorName;

        /** Sektor agirligi (%). */
        private Double percentage;
    }

    /**
     * Benchmark karsilastirma bilgisi.
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class BenchmarkInfo {

        /** Benchmark adi. */
        private String name;

        /** 1 aylik getiri (%). */
        private Double return1M;

        /** 3 aylik getiri (%). */
        private Double return3M;

        /** 1 yillik getiri (%). */
        private Double return1Y;
    }

    /**
     * Fiyat gecmisi veri noktasi.
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PricePoint {

        /** Tarih (yyyy-MM-dd). */
        private String date;

        /** Fiyat degeri. */
        private Double value;

        /** Gunluk degisim orani (%). */
        private Double change;
    }
}
