package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Finansal oran UI DTO sınıfı.
 *
 * <p>scyborsaApi'deki finansal oran verisini UI katmanında taşır.
 * Hazır taramalar temel analiz bölümünde kullanılır.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class FinansalOranUiDto {

    /** Hisse senedi kodu (örn. GARAN). */
    private String hisseSenediKodu;

    /** Raporlama yili. */
    private Integer yil;

    /** Raporlama ayi. */
    private Integer ay;

    /** Satır numarası (oran sırası). */
    private Integer satirNo;

    /** Oran kategorisi. */
    private String kategori;

    /** Oran adi. */
    private String oran;

    /** Oran değeri. */
    private Double deger;
}
