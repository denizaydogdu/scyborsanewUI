package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Para akisi hisse DTO'su.
 *
 * <p>scyborsaApi'deki {@code /api/v1/money-flow} endpoint'inden
 * donen tek bir hissenin para akisi verilerini tasir.
 * Giris (inflow) ve cikis (outflow) listelerinde kullanilir.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MoneyFlowStockDto {

    /** Hisse kodu (ornegin GARAN, THYAO). */
    private String ticker;

    /** Hisse aciklamasi (sirket adi). */
    private String description;

    /** TradingView logo ID'si (CDN proxy icin). */
    private String logoid;

    /** Son fiyat (TL). */
    private double price;

    /** Gunluk degisim yuzdesi. */
    private double changePercent;

    /** Islem hacmi (TL cinsinden). */
    private double turnoverTL;

    /** Formatlanmis islem hacmi (ornegin "1.2 Milyar"). */
    private String turnoverFormatted;
}
