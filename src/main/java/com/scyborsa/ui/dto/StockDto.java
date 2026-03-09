package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Hisse bilgileri DTO sinifi.
 *
 * <p>scyborsaApi'den gelen hisse verilerinin deserialize edilmesinde kullanilir.
 * Backoffice hisse yonetim sayfasinda listeleme icin kullanilir.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockDto {

    /** Hisse ID'si. */
    private Long id;

    /** Hisse borsa kodu (orn: "THYAO"). */
    private String stockName;

    /** Hisse tipi kimligi. */
    private Long stockTypeId;

    /** Hissenin yasakli olup olmadigi. */
    private Boolean isBanned;

    /** Yasaklama nedeni aciklamasi. */
    private String bannedSituation;

    /** Kayit olusturma zamani. */
    private String createTime;
}
