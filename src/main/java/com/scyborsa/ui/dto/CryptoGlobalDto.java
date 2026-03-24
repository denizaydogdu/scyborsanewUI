package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Küresel kripto pazar verileri DTO'su.
 * CoinGecko /global endpoint'inden gelen verileri taşır.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CryptoGlobalDto {

    /** Toplam piyasa değeri (USD). */
    private Double totalMarketCapUsd;

    /** Toplam 24 saatlik işlem hacmi (USD). */
    private Double totalVolumeUsd;

    /** Bitcoin dominansı yüzdesi. */
    private Double btcDominance;

    /** Aktif kripto para sayısı. */
    private Integer activeCryptocurrencies;

    /** Son 24 saatlik piyasa değeri değişim yüzdesi (USD). */
    private Double marketCapChangePercentage24hUsd;
}
