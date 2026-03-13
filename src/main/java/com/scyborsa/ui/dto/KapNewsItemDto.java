package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/**
 * Tek bir KAP haber ogesini temsil eden DTO.
 *
 * <p>Template'in ihtiyaci olan alanlari tasir.
 * {@code formattedPublished} alani API tarafindan formatlanmis olarak gelir.</p>
 *
 * @see RelatedSymbolDto
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class KapNewsItemDto {

    /** Haberin benzersiz kimligi. */
    private String id;

    /** Haber basligi. */
    private String title;

    /** Haber kaynagi (orn: "KAP", "Fintables", "Gündem", "Makro", "KAP (Fintables)"). */
    private String source;

    /** Haber saglayici adi (orn: "kap", "Fintables", "Matriks"). */
    private String provider;

    /** Formatlanmis yayinlanma zamani (orn: "03 Mart 2026 14:30"). */
    private String formattedPublished;

    /** Haber detay yolu. KAP haber sayfasına yönlendirme için kullanılır. */
    private String storyPath;

    /** Iliskili semboller listesi. */
    private List<RelatedSymbolDto> relatedSymbols;

    /**
     * Iliskili sembol bilgisi.
     */
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RelatedSymbolDto {

        /** Sembol kodu (orn: "BIST:THYAO"). */
        private String symbol;

        /** Logo kimlik kodu. */
        private String logoid;

        /** Tam logo URL'i. */
        private String logoUrl;
    }
}
