package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Açığa satış istatistikleri UI DTO sınıfı.
 *
 * <p>scyborsaApi'deki açığa satış verisini UI katmanında taşır.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AcigaSatisUiDto {

    /** Hisse senedi kodu (örn. GARAN). */
    private String hisseSenediKodu;

    /** İşlem tarihi. */
    private String tarih;

    /** Ortalama açığa satış fiyatı. */
    private Double ortalamaAcigaSatisFiyati;

    /** En yüksek açığa satış fiyatı. */
    private Double enYuksekAcigaSatisFiyati;

    /** En düşük açığa satış fiyatı. */
    private Double enDusukAcigaSatisFiyati;

    /** Açığa satış hacmi (TL). */
    private Double acigaSatisHacmiTl;

    /** Toplam işlem hacmi (TL). */
    private Double toplamIslemHacmiTl;

    /** Açığa satış lotu. */
    private Long acigaSatisLotu;

    /** Toplam işlem hacmi (lot). */
    private Long toplamIslemHacmiLot;
}
