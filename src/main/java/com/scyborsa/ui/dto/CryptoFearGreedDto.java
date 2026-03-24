package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Kripto piyasa duygu endeksi (Fear and Greed Index) DTO'su.
 * Alternative.me API'sinden gelen verileri taşır.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CryptoFearGreedDto {

    /** Korku-açgözlülük endeks değeri (0-100). */
    private Integer value;

    /** Endeks sınıflandırması (ör: "Extreme Fear", "Greed"). */
    private String classification;
}
