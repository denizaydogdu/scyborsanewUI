package com.scyborsa.ui.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Hazir tarama strateji tanim DTO'su.
 *
 * <p>Mevcut strateji listesini gosterirken kullanilir.
 * Kod, goruntuleme adi, aciklama ve kategori bilgisi tasir.</p>
 */
@Data
@NoArgsConstructor
public class PresetStrategyDto {

    /** Strateji kodu (API'ye gonderilen deger). */
    private String code;

    /** Goruntuleme adi (kullaniciya gosterilen Turkce isim). */
    private String displayName;

    /** Strateji aciklamasi. */
    private String description;

    /** Strateji kategorisi (or. "hacim", "momentum"). */
    private String category;
}
