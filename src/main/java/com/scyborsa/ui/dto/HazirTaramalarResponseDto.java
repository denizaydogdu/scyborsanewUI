package com.scyborsa.ui.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Hazir Taramalar API yanit DTO'su.
 *
 * <p>scyborsaApi'deki {@code /api/v1/hazir-taramalar/scan} endpoint'inden
 * donen strateji tarama sonuclarini kapsayan ust duzey yanit nesnesi.</p>
 *
 * @see HazirTaramaStockDto
 */
@Data
@NoArgsConstructor
public class HazirTaramalarResponseDto {

    /** Strateji kodu. */
    private String strategy;

    /** Strateji goruntuleme adi (Turkce). */
    private String strategyDisplayName;

    /** Strateji kategorisi. */
    private String category;

    /** Tarama sonucu hisse listesi. */
    private List<HazirTaramaStockDto> stocks;

    /** Toplam sonuc sayisi. */
    private int totalCount;
}
