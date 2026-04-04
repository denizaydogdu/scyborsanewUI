package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Analist tavsiye UI DTO'su.
 *
 * <p>scyborsaApi'den gelen analist tavsiye verilerini tasir.
 * API camelCase serialize ettigi icin @JsonAlias gerekmez.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AnalistTavsiyeDto {

    /** Tavsiye tipi (al, tut, sat, vb.). */
    private String ratingType;

    /** Hedef fiyat (TL). */
    private Double targetPrice;

    /** Tavsiye tarihi (ISO-8601, ornek: 2026-03-06T14:34:49Z). */
    private String date;

    /** Hisse kodu (BIST ticker). */
    private String stockCode;

    /** Model portfoy tavsiyesi mi. */
    private boolean modelPortfolio;

    /** Araci kurum bilgisi (nested — API'den gelen). */
    private BrokerageInfo brokerage;

    /** Ek dosyalar (PDF raporlar). */
    private List<AttachmentInfo> attachments;

    /** Katilim endeksi uyesi mi. */
    @JsonProperty("katilim")
    private boolean katilim;

    /** Su anki fiyat (TL). API zenginlestirmesi ile doldurulur. */
    private Double currentPrice;

    /**
     * Araci kurum bilgisi.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class BrokerageInfo {
        /** Araci kurum kodu. */
        private String code;
        /** Araci kurum tam adi. */
        private String title;
        /** Araci kurum logo URL'i. */
        private String logo;
        /** Araci kurum kisa adi. */
        private String shortTitle;
    }

    /**
     * Ek dosya bilgisi.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AttachmentInfo {
        /** Ek dosya ID'si. */
        private Integer id;
        /** PDF dosya URL'i. */
        private String file;
    }
}
