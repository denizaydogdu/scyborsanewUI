package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Şirket beklentileri (guidance) UI DTO sınıfı.
 *
 * <p>Şirketlerin yıllık beklenti/rehberlik (guidance) verilerini taşır.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class GuidanceUiDto {

    /** Hisse senedi kodu (örn. GARAN). */
    private String hisseSenediKodu;

    /** Beklenti yılı. */
    private Integer yil;

    /** Beklenti detay metni. */
    private String beklentiler;
}
