package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Temel analiz skoru UI DTO sınıfı.
 *
 * <p>Hisse bazlı Piotroski F-Score, Altman Z-Score ve Graham sayısı/marjı
 * verilerini taşır.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TemelAnalizSkorUiDto {

    /** Hisse senedi kodu (örn. GARAN). */
    private String hisseSenediKodu;

    /** Altman Z-Score değeri. */
    private Double altmanZScore;

    /** Altman Z-Score bölge açıklaması (örn. Güvenli Bölge, Gri Bölge, Tehlikeli Bölge). */
    private String altmanZone;

    /** Piotroski F-Score değeri (0-9 arası). */
    private Integer piotroskiFScore;

    /** Piotroski F-Score bölge açıklaması (örn. Güçlü, Orta, Zayıf). */
    private String piotroskiZone;

    /** Graham sayısı. */
    private Double grahamSayisi;

    /** Graham marjı (yüzde). */
    private Double grahamMarji;
}
