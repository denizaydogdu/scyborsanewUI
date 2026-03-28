package com.scyborsa.ui.dto.watchlist;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Takip listesi DTO sinifi.
 *
 * <p>Kullanicinin olusturdugu takip listelerinin UI tarafindaki
 * temsilidir. API'deki WatchlistDto ile uyumlu alanlari icerir.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WatchlistDto {

    /** Takip listesi benzersiz kimlik numarasi. */
    private Long id;

    /** Liste adi. */
    private String name;

    /** Liste aciklamasi. */
    private String description;

    /** Listedeki hisse sayisi. */
    private Integer stockCount;

    /** Olusturulma zamani. */
    private LocalDateTime createTime;

    /** Son guncelleme zamani. */
    private LocalDateTime updateTime;

    /** Varsayilan liste mi. */
    private Boolean isDefault;
}
