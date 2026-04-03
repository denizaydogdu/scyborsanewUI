package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Sektörel karşılaştırma UI DTO sınıfı.
 *
 * <p>scyborsaApi'deki sektörel karşılaştırma verisini UI katmanında taşır.
 * Bilanço detay sayfasında şirket vs sektör ortalaması karşılaştırması için kullanılır.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SektorelKarsilastirmaUiDto {

    /** Hisse senedi kodu (örn. GARAN). */
    private String hisseSenediKodu;

    /** Sektör adı. */
    private String sektor;

    /** Şirket oranları (oran adı → değer). */
    private Map<String, Double> sirketOranlari;

    /** Sektör ortalaması (oran adı → değer). */
    private Map<String, Double> sektorOrtalama;

    /** Sektör medyanı (oran adı → değer). */
    private Map<String, Double> sektorMedian;

    /** Sektördeki pozisyon (oran adı → UCUZ/ORTADA/PAHALI/GÜÇLÜ/ZAYIF). */
    private Map<String, String> pozisyon;
}
