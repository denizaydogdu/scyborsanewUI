package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Tekil tarama sonucu DTO'su.
 *
 * <p>scyborsaApi'deki {@code /api/v1/taramalar} endpoint'inden
 * donen JSON listesindeki her bir tarama kaydini temsil eder.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaramaDto {

    /** Tarama sonucu benzersiz kimliği. */
    private Long id;

    /** Hisse kodu (orn. GARAN, THYAO). */
    private String stockName;

    /** Tarama anındaki fiyat. */
    private Double price;

    /** Tarama anındaki değişim yüzdesi. */
    private Double percentage;

    /** Tarama adı (orn. RSI Oversold, MACD Cross). */
    private String screenerName;

    /** Tarama tipi (orn. TEKNIK, HACIM). */
    private String screenerType;

    /** Tarama saati (orn. 10:30). */
    private String screenerTime;

    /** Tarama tarihi (orn. 2025-01-15). */
    private String screenerDay;

    /** Gün sonu değişim yüzdesi. */
    private Double gunSonuDegisim;

    /** Gruplanmış tarama mı (aynı hisse birden fazla taramada). */
    private boolean grouped;

    /**
     * Değişim yüzdesinin pozitif olup olmadığını döndürür.
     *
     * @return pozitif ise {@code true}
     */
    public boolean isPozitif() {
        return percentage != null && percentage > 0;
    }

    /**
     * Değişim yüzdesinin negatif olup olmadığını döndürür.
     *
     * @return negatif ise {@code true}
     */
    public boolean isNegatif() {
        return percentage != null && percentage < 0;
    }

    /**
     * Fiyatı formatlanmış metin olarak döndürür.
     *
     * @return "X.XX" formatında fiyat veya "-"
     */
    public String getFormattedPrice() {
        return price != null ? String.format("%.2f", price) : "-";
    }

    /**
     * Değişim yüzdesini formatlanmış metin olarak döndürür.
     *
     * @return "+X.XX%" formatında yüzde veya "-"
     */
    public String getFormattedPercentage() {
        return percentage != null ? String.format("%+.2f%%", percentage) : "-";
    }

    /**
     * Değişim yüzdesine göre CSS sınıfını döndürür.
     *
     * @return "text-success" (pozitif), "text-danger" (negatif) veya "" (nötr)
     */
    public String getCssClass() {
        if (isPozitif()) return "text-success";
        if (isNegatif()) return "text-danger";
        return "";
    }

    /**
     * Gün sonu değişim oranını formatlar (+/- işaretli).
     *
     * @return formatlanmış gün sonu değişim oranı veya "-"
     */
    public String getFormattedGunSonuDegisim() {
        return gunSonuDegisim != null ? String.format("%+.2f%%", gunSonuDegisim) : "-";
    }

    /**
     * Gün sonu değişim oranı için CSS sınıfını döndürür.
     *
     * @return CSS sınıf adı
     */
    public String getGunSonuCssClass() {
        if (gunSonuDegisim == null) return "text-muted";
        if (gunSonuDegisim > 0) return "text-success";
        if (gunSonuDegisim < 0) return "text-danger";
        return "";
    }
}
