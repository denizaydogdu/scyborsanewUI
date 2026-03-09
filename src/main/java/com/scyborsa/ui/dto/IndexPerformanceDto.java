package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Dashboard endeks performans DTO sinifi.
 *
 * <p>scyborsaApi'den gelen endeks performans verilerini tasir.
 * Her bir endeks icin son fiyat, gunluk, haftalik, aylik, ceyreklik,
 * 6 aylik ve yillik degisim yuzde degerlerini icerir.</p>
 *
 * <p>Swiper karuseli icin kullanilir; frontend bu verileri
 * SSR + periyodik AJAX polling ile gunceller.</p>
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class IndexPerformanceDto {

    /** Endeks sembol kodu (ornegin "XU100", "XU030"). */
    private String symbol;

    /** Endeksin son islem fiyati. */
    private double lastPrice;

    /** Gunluk degisim yuzdesi. */
    private double dailyChange;

    /** Haftalik degisim yuzdesi. */
    private double weeklyChange;

    /** Aylik degisim yuzdesi. */
    private double monthlyChange;

    /** Ceyreklik (3 aylik) degisim yuzdesi. */
    private double quarterlyChange;

    /** 6 aylik degisim yuzdesi. */
    private double sixMonthChange;

    /** Yillik degisim yuzdesi. */
    private double yearlyChange;
}
