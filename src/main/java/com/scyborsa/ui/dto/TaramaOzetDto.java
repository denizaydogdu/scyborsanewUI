package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Tarama özet istatistikleri DTO'su.
 *
 * <p>Taramalar sayfasının KPI kartlarında gösterilecek
 * özet metrikleri taşır.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaramaOzetDto {

    /** Toplam sinyal sayısı. */
    private int toplamSinyal;

    /** Ortalama getiri yüzdesi. */
    private Double ortalamaGetiri;

    /** Başarı oranı yüzdesi (pozitif sinyal / toplam sinyal). */
    private Double basariOrani;

    /** Pozitif değişimli sinyal sayısı. */
    private int pozitifSayisi;

    /** Negatif değişimli sinyal sayısı. */
    private int negatifSayisi;

    /** Benzersiz hisse sayısı. */
    private int benzersizHisseSayisi;

    /** Tarama türü sayısı. */
    private int taramaSayisi;

    /** En yüksek getiri yüzdesi. */
    private Double maxGetiri;

    /** En düşük getiri yüzdesi. */
    private Double minGetiri;

    /**
     * Ortalama getiriyi formatlanmış metin olarak döndürür.
     *
     * @return "+X.XX%" formatında ortalama getiri veya "0.00%"
     */
    public String getFormattedOrtalamaGetiri() {
        return ortalamaGetiri != null ? String.format("%+.2f%%", ortalamaGetiri) : "0.00%";
    }

    /**
     * Başarı oranını formatlanmış metin olarak döndürür.
     *
     * @return "X.X%" formatında başarı oranı veya "0.0%"
     */
    public String getFormattedBasariOrani() {
        return basariOrani != null ? String.format("%.1f%%", basariOrani) : "0.0%";
    }

    /**
     * Ortalama getirinin pozitif olup olmadığını döndürür.
     *
     * @return pozitif ise {@code true}
     */
    public boolean isPozitif() {
        return ortalamaGetiri != null && ortalamaGetiri > 0;
    }
}
