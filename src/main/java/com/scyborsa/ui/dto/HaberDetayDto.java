package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

/**
 * Haber detay veri transfer nesnesi.
 *
 * <p>scyborsaApi'deki {@code GET /api/v1/kap/haber/{newsId}} endpoint'inden
 * donen haber detay verilerini tasir. Detay icerigi HTML formatinda olabilir.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class HaberDetayDto {

    /** Veritabani kayit ID'si. */
    private Long id;

    /** TradingView haber kimligi. */
    private String newsId;

    /** Haber basligi. */
    private String title;

    /** Haber saglayicisi (orn: "kap", "reuters", "matriks"). */
    private String provider;

    /** Haber detay icerigi (HTML formatinda). */
    private String detailContent;

    /** Kisa ozet (Matriks/Reuters). */
    private String shortDescription;

    /** Orijinal KAP bildirimi URL'i. */
    private String originalKapUrl;

    /** Formatlanmis yayinlanma zamani (orn: "05 Mar 2026 14:30"). */
    private String publishedFormatted;

    /** Haber tipi (KAP, MARKET, WORLD). */
    private String newsType;

    /** Icerik API'den basariyla cekildi mi. */
    private boolean fetched;
}
