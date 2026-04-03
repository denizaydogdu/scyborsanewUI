package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Halka arz takvimi UI DTO sinifi.
 *
 * <p>scyborsaApi'deki halka arz verisini UI katmaninda tasir.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class HalkaArzUiDto {

    /** Hisse senedi kodu (orn. XYZ). */
    private String hisseSenediKodu;

    /** Halka arz basligi. */
    private String baslik;

    /** Talep toplama baslangic tarihi. */
    private String talepToplamaBaslangicTarihi;

    /** Talep toplama bitis tarihi. */
    private String talepToplamaBitisTarihi;

    /** Ilk islem tarihi. */
    private String ilkIslemTarihi;

    /** Halka arz fiyati. */
    private Double halkaArzFiyati;

    /** Duzeltilmis halka arz fiyati. */
    private Double duzeltilmisHalkaArzFiyati;

    /** Pay adedi. */
    private Long payAdedi;

    /** Ek pay adedi. */
    private Long ekPayAdedi;

    /** Araci kurum. */
    private String araciKurum;

    /** Katilim endeksi uygunlugu. */
    private Boolean katilimEndeksiUygunMu;

    /** Katilimci sayisi. */
    private Integer katilimciSayisi;

    /** Durum kodu (orn. AKTIF, TAMAMLANDI). */
    private String durumKodu;

    /** Yilliklandirilmis kar. */
    private Double yilliklandirilmisKar;

    /** Halka arz sonrasi odenmis sermaye. */
    private Double halkaArzSonrasiOdenmisSermaye;

    /** Iskonto orani. */
    private Double iskontoOrani;

    /** Net kar. */
    private Double netKar;

    /** FAVOK (EBITDA). */
    private Double favok;

    /** Net borc. */
    private Double netBorc;
}
