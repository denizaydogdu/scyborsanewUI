package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Analist DTO sinifi.
 *
 * <p>scyborsaApi'den gelen analist verilerinin deserialize edilmesinde kullanilir.</p>
 *
 * @see com.scyborsa.ui.service.AnalistService
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalistDto {

    /** Analist ID'si. */
    private Long id;

    /** Analist adi. Orn: "Seyda Hoca", "Ozkan Filiz". */
    private String ad;

    /** Analist unvani. Orn: "Akademisyen", "Analist". */
    private String unvan;

    /** Analist resim URL'i. */
    private String resimUrl;

    /** Analistin toplam hisse onerisi sayisi. */
    private Integer hisseOnerisi;

    /** Analistin toplam kazanci (TL). */
    private Integer kazanc;

    /** Analistin trend durumu. {@code true} ise "Trending" rozeti gosterilir. */
    private Boolean trend;

    /** Sparkline chart rengi. Kabul edilen degerler: "danger", "success", "warning". */
    private String chartRenk;

    /** Sparkline chart verisi. JSON dizi formati, orn: "[12,14,2,47,42,15,47,75,65,19,14]". */
    private String chartVerisi;

    /** Kartlarin gosterim sirasi. */
    private Integer siraNo;

    /** Analistin aktif olup olmadigini belirtir. */
    private Boolean aktif;
}
