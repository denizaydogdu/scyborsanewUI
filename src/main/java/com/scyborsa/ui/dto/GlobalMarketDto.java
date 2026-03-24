package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Global piyasa verisi DTO sinifi.
 *
 * <p>scyborsaApi'deki GlobalMarketDto'nun UI mirror'i.
 * Dolar, Euro, altin, petrol gibi global enstrumanlarin
 * guncel fiyat ve degisim bilgilerini tasir.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GlobalMarketDto {

    /** Enstruman sembolu (ornegin DXY, XAUUSD, USDTRY). */
    private String symbol;

    /** Enstruman goruntuleme adi (ornegin "Dolar Endeksi", "Altin"). */
    private String name;

    /** Son islem fiyati. */
    private Double lastPrice;

    /** Gunluk degisim yuzdesi. */
    private Double dailyChange;

    /** Kategori: "EMTIA", "DOVIZ", "KRIPTO" veya "ENDEKS". */
    private String category;
}
