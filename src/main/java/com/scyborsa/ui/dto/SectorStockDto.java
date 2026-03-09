package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Sektor hisse bilgisi DTO'su.
 *
 * <p>scyborsaApi'den alinan sektor hisse verilerini tasir.</p>
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class SectorStockDto {
    /** Hisse borsa kodu (or. "GARAN"). */
    private String ticker;
    /** Hissenin aciklama/tam adi (or. "Garanti BBVA"). */
    private String description;
    /** Hissenin anlik fiyati (TL cinsinden). */
    private double price;
    /** Gunluk yuzdesel degisim orani. */
    private double changePercent;
    /** Gunluk islem hacmi. */
    private double volume;
    /** TradingView logo kimligi. */
    private String logoid;
}
