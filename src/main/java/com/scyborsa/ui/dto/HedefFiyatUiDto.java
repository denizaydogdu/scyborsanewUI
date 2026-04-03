package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Hedef fiyat konsensüs UI DTO sınıfı.
 *
 * <p>Aracı kurumların hisse bazlı hedef fiyat ve tavsiye bilgilerini taşır.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class HedefFiyatUiDto {

    /** Hedef fiyat kayıt ID'si. */
    private Long hedefFiyatId;

    /** Hisse senedi kodu (örn. GARAN). */
    private String hisseSenediKodu;

    /** Aracı kurum kodu. */
    private String araciKurumKodu;

    /** Yayın tarihi (ISO format). */
    private String yayinTarihi;

    /** Tavsiye metni (örn. AL, TUT, SAT). */
    private String tavsiye;

    /** Hedef fiyat (TL). */
    private Double hedefFiyat;

    /** Hedef fiyat geçerlilik tarihi. */
    private String hedefFiyatTarihi;

    /** Model portföyde olup olmadığı. */
    private Boolean modelPortfoyde;

    /** Aracı kurum rapor doküman ID'si. */
    private Long araciKurumRaporDokumanId;
}
