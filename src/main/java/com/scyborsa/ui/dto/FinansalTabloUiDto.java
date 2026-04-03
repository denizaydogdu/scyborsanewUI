package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Finansal tablo UI DTO sınıfı.
 *
 * <p>scyborsaApi'deki finansal tablo (bilanço/gelir/nakit akım) verisini
 * UI katmanında taşır. Bilanço detay sayfasında trend grafik için kullanılır.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class FinansalTabloUiDto {

    /** Hisse senedi kodu (örn. GARAN). */
    private String hisseSenediKodu;

    /** Raporlama yılı. */
    private Integer yil;

    /** Raporlama ayı. */
    private Integer ay;

    /** Satır numarası. */
    private Integer satirNo;

    /** Kalem adı (örn. Hasılat, Net Dönem Kârı). */
    private String kalem;

    /** Dönemsel TRY değeri. */
    private Double tryDonemsel;

    /** Tablo tipi (BILANCO, GELIR, NAKIT_AKIM). */
    private String tabloTipi;
}
