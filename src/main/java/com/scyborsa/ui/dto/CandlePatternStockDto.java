package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Mum formasyonu tarama sonucu DTO'su (UI tarafi).
 *
 * <p>scyborsaApi'den gelen mum formasyonu verilerini tasir.</p>
 */
@Data
@NoArgsConstructor
public class CandlePatternStockDto {

    /** Hisse kodu. */
    private String symbol;

    /** TradingView logo ID. */
    private String logoid;

    /** Tespit edilen formasyon ID listesi. */
    private List<String> patterns;

    /** Tespit edilen formasyon sayisi. */
    private int patternCount;

    /** Formasyon deger eslemesi. */
    private Map<String, Integer> patternValues;

    /** Guncel fiyat (TL). */
    private Double price;

    /** Gunluk degisim yuzdesi. */
    private Double changePercent;

    /** Islem hacmi. */
    private Double volume;

    /** Gunluk acilis fiyati (TL). */
    private Double open;

    /** Katılım Endeksi üyesi mi. */
    @JsonProperty("katilim")
    private boolean katilim;
}
