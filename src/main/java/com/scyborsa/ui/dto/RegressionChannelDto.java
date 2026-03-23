package com.scyborsa.ui.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Regresyon kanali tarama sonuc DTO'su.
 *
 * <p>scyborsaApi'den donen regresyon kanali verilerini tasir.
 * Her hisse icin regresyon kanalinin periyodu, R-kare degeri,
 * egim yonu, kanal icindeki pozisyon ve logoid bilgisini icerir.</p>
 *
 * @see com.scyborsa.ui.service.RegressionScreenerService
 */
@Data
@NoArgsConstructor
public class RegressionChannelDto {

    /** Hisse sembol kodu (ornegin THYAO). */
    private String symbol;

    /** Regresyon kanali periyodu (mum sayisi). */
    private Integer period;

    /** R-kare (R²) degeri — trend gucunu gosterir (0-1 arasi, 1'e yakin = guclu trend). */
    private Double r2;

    /** Egim yonu — "up" veya "down". */
    private String slope;

    /** Kanal icindeki pozisyon — "above", "upper", "middle", "lower", "below". */
    private String position;

    /** Kanal icindeki yuzdesel pozisyon (0-100 arasi). */
    private Double pctPosition;

    /** TradingView logo kimlik bilgisi. */
    private String logoid;
}
