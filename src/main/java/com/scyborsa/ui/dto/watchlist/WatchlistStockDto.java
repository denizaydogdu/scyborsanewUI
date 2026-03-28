package com.scyborsa.ui.dto.watchlist;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Takip listesindeki hisse DTO sinifi.
 *
 * <p>Bir takip listesine eklenmis hissenin UI tarafindaki temsilidir.
 * Fiyat ve degisim alanlari API'den zenginlestirilmis olarak gelir.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WatchlistStockDto {

    /** Takip listesi kalemi benzersiz kimlik numarasi. */
    private Long id;

    /** Hisse borsa kodu (orn: THYAO). */
    private String stockCode;

    /** Hisse adi (orn: Turk Hava Yollari A.O.). */
    private String stockName;

    /** Hisse logo ID'si (StockLogoService enrichment). */
    private String logoid;

    /** Siralama (displayOrder). */
    private Integer displayOrder;

    /** Son fiyat (API: lastPrice). */
    private Double lastPrice;

    /** Fiyat degisimi (mutlak). */
    private Double change;

    /** Gunluk degisim yuzdesi. */
    private Double changePercent;

    /** Islem hacmi. */
    private Double volume;
}
