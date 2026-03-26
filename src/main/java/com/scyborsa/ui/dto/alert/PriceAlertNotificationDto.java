package com.scyborsa.ui.dto.alert;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Fiyat alarmi bildirim DTO sinifi.
 *
 * <p>STOMP uzerinden gonderilen gercek zamanli bildirim mesaj yapisini temsil eder.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PriceAlertNotificationDto {

    /** Hisse kodu. */
    private String stockCode;

    /** Alarm yonu: ABOVE veya BELOW. */
    private String direction;

    /** Hedef fiyat. */
    private BigDecimal targetPrice;

    /** Tetiklendigi andaki fiyat. */
    private BigDecimal triggerPrice;

    /** Bildirim mesaji. */
    private String message;
}
