package com.scyborsa.ui.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Hazir tarama sonucundaki tek bir hisse bilgisi DTO'su.
 *
 * <p>Strateji taramasinda eslesen her hissenin fiyat, degisim ve
 * hacim bilgilerini tasir.</p>
 */
@Data
@NoArgsConstructor
public class HazirTaramaStockDto {

    /** Hisse kodu (or. THYAO). */
    private String stockCode;

    /** Hisse adi. */
    private String stockName;

    /** TradingView logo ID'si. */
    private String logoid;

    /** Son fiyat (TL). */
    private Double price;

    /** Gunluk degisim yuzdesi. */
    private Double changePercent;

    /** Relatif hacim (gunluk hacim / ortalama hacim). */
    private Double relativeVolume;

    /** 10 gunluk ortalama hacim. */
    private Double avgVolume10d;

    /** 60 gunluk ortalama hacim. */
    private Double avgVolume60d;

    /** 90 gunluk ortalama hacim. */
    private Double avgVolume90d;
}
