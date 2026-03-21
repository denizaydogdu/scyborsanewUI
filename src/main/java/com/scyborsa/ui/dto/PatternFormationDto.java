package com.scyborsa.ui.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Formasyon tarama sonuc DTO'su (UI tarafi).
 *
 * <p>scyborsaApi'den gelen formasyon tarama sonuclarini tasir.
 * Her bir formasyon icin sembol, formasyon adi, skor, uzaklik,
 * pencere ve periyot bilgilerini icerir.</p>
 */
@Data
@NoArgsConstructor
public class PatternFormationDto {

    /** Hisse sembolu (orn. THYAO). */
    private String symbol;

    /** Tespit edilen formasyon adi (orn. Yukselen Kanal). */
    private String patternName;

    /** Formasyon skoru (0-1 arasi). */
    private Double score;

    /** Formasyona uzaklik yuzdesi. */
    private Double distance;

    /** Formasyon pencere buyuklugu (orn. 10, 15, 20). */
    private Integer window;

    /** Analiz periyodu (orn. 1D, 1W). */
    private String period;

    /** Formasyon grafik dosya adi. */
    private String filename;

    /** Hisse logosu TradingView logoid'si (orn. "thyao"). */
    private String logoid;
}
