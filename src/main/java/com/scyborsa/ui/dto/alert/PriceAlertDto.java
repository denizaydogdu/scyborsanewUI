package com.scyborsa.ui.dto.alert;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Fiyat alarmi DTO sinifi.
 *
 * <p>Kullanicinin olusturdugu fiyat alarmlarinin UI tarafindaki
 * temsilidir. API'deki PriceAlertDto ile ayni alanlari icerir.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PriceAlertDto {

    /** Alarm benzersiz kimlik numarasi. */
    private Long id;

    /** Hisse kodu (orn: THYAO). */
    private String stockCode;

    /** Hisse adi (orn: Turk Hava Yollari A.O.). */
    private String stockName;

    /** Alarm yonu: ABOVE (ustune cikinca) veya BELOW (altina dusunce). */
    private String direction;

    /** Hedef fiyat. */
    private BigDecimal targetPrice;

    /** Alarm olusturuldugundaki fiyat. */
    private BigDecimal priceAtCreation;

    /** Alarm durumu: ACTIVE, TRIGGERED, CANCELLED. */
    private String status;

    /** Tetiklendigi andaki fiyat. */
    private BigDecimal triggerPrice;

    /** Tetiklenme zamani. */
    private LocalDateTime triggeredAt;

    /** Okunma zamani. */
    private LocalDateTime readAt;

    /** Kullanici notu. */
    private String note;

    /** Olusturulma zamani. */
    private LocalDateTime createTime;

    /** Mevcut fiyat (hesaplanan alan). */
    private BigDecimal currentPrice;

    /** Hedef fiyata uzaklik yuzdesi (hesaplanan alan). */
    private BigDecimal distancePercent;
}
