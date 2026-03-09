package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Dashboard piyasa sentiment DTO'su.
 *
 * <p>scyborsaApi'deki {@code /api/v1/dashboard/sentiment} endpoint'inden
 * donen sentiment verilerini tasir. Kisa, orta ve uzun vadeli
 * teknik gostergeler uzerinden hesaplanan yuzdesel degerleri icerir.</p>
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DashboardSentimentDto {

    /** Kisa vadeli (15dk-1sa) sentiment yuzdesi (0-100). */
    private double kisaVadeli;

    /** Orta vadeli (1sa-4sa) sentiment yuzdesi (0-100). */
    private double ortaVadeli;

    /** Uzun vadeli (gunluk-haftalik) sentiment yuzdesi (0-100). */
    private double uzunVadeli;

    /** Hesaplamada kullanilan toplam hisse sayisi. */
    private int toplamHisse;

    /** Son guncelleme zamani (ISO-8601 format). */
    private String timestamp;
}
