package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Takip hissesi veri transfer nesnesi.
 *
 * <p>scyborsaApi'deki takip hissesi verilerini UI katmanina tasir.
 * Kullanicinin takip ettigi hisse onerilerini temsil eder.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TakipHisseDto {

    /** Takip hissesi benzersiz ID'si. */
    private Long id;

    /** Hisse kodu (BIST ticker, ornek: THYAO). */
    private String hisseKodu;

    /** Hisse adi (ornek: Turk Hava Yollari). */
    private String hisseAdi;

    /** Vade bilgisi (KISA_VADE, ORTA_VADE, UZUN_VADE). */
    private String vade;

    /** Giris (alis) fiyati. */
    private Double girisFiyati;

    /** Giris tarihi (yyyy-MM-dd formati). */
    private String girisTarihi;

    /** Hedef fiyat. */
    private Double hedefFiyat;

    /** Zarar durdur (stop loss) fiyati. */
    private Double zararDurdur;

    /** Kullanici notu / aciklama. */
    private String notAciklama;

    /** Guncel piyasa fiyati. */
    private Double guncelFiyat;

    /** Getiri yuzdesi (%). */
    private Double getiriYuzde;

    /** Hedef fiyata ulasildi mi. */
    private Boolean hedefUlasildi;

    /** Zarar durdur seviyesine ulasildi mi. */
    private Boolean zararDurdurUlasildi;

    /** Aktif/pasif durumu. */
    private Boolean aktif;

    /** Maliyet fiyati (ortalama alis maliyeti). */
    private Double maliyetFiyati;

    /** Maliyet getiri yuzdesi (%). */
    private Double maliyetGetiriYuzde;

    /** Resim URL (grafik screenshot). */
    private String resimUrl;

    /** TradingView logoid (hisse logosu icin, orn. "turk-hava-yollari"). */
    private String logoid;

    /** Siralama numarasi. */
    private Integer siraNo;

    /** Olusturulma zamani. */
    private String createTime;

    /** Son guncelleme zamani. */
    private String updateTime;
}
