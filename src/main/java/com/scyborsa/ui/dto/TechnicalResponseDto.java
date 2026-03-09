package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

/**
 * Teknik analiz yanıt DTO sınıfı.
 * <p>
 * Belirli bir sembol ve periyot için yapılan teknik analiz sorgusunun
 * sonucunu taşır. {@code responseMap} alanı, analiz göstergelerinin
 * (RSI, MACD, EMA vb.) anahtar-değer çiftlerini içerir.
 * </p>
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class TechnicalResponseDto {

    /** Teknik analizin yapıldığı periyot adı (örn. "15 DAKIKALIK TARAMA"). */
    private String periodName;

    /** Analiz edilen hisse senedi veya kripto para sembolü (örn. "BIST:THYAO"). */
    private String symbol;

    /** Teknik gösterge sonuçlarını içeren anahtar-değer haritası. */
    private Map<String, Object> responseMap;
}
