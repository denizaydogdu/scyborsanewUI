package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Aracı kurum tahmin verileri UI DTO sınıfı.
 *
 * <p>scyborsaApi'deki hedef fiyat/tahmin verisini UI katmanında taşır.
 * Analist tavsiye detay sayfasında tahmin tablosu için kullanılır.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AraciKurumTahminUiDto {

    /** Hisse senedi kodu (örn. GARAN). */
    private String hisseSenediKodu;

    /** Araci kurum kodu. */
    private String araciKurumKodu;

    /** Araci kurum adi. */
    private String araciKurumAdi;

    /** Tahmin yili. */
    private Integer yil;

    /** Tahmin ayi. */
    private Integer ay;

    /** Tahmini satislar. */
    private Double satislar;

    /** Tahmini FAVOK (EBITDA). */
    private Double favok;

    /** Tahmini net kar. */
    private Double netKar;

    /** Hedef fiyat. */
    private Double hedefFiyat;

    /** Tavsiye tipi (örn. AL, TUT, SAT). */
    private String tavsiyeTipi;
}
