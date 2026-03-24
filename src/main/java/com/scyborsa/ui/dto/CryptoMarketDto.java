package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Kripto para pazar verisi DTO'su.
 * CoinGecko /coins/markets endpoint'inden gelen verileri taşır.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CryptoMarketDto {

    /** CoinGecko coin ID'si (ör: "bitcoin"). */
    private String id;

    /** Kripto para sembolü (ör: "btc"). */
    private String symbol;

    /** Kripto para adı (ör: "Bitcoin"). */
    private String name;

    /** Coin logo URL'i. */
    private String image;

    /** Güncel fiyat (USD). */
    private Double currentPrice;

    /** Piyasa değeri (USD). */
    private Long marketCap;

    /** Piyasa değeri sıralaması. */
    private Integer marketCapRank;

    /** 24 saatlik işlem hacmi (USD). */
    private Double totalVolume;

    /** Son 1 saatlik fiyat değişim yüzdesi. */
    private Double priceChangePercentage1hInCurrency;

    /** Son 24 saatlik fiyat değişim yüzdesi. */
    private Double priceChangePercentage24hInCurrency;

    /** Son 7 günlük fiyat değişim yüzdesi. */
    private Double priceChangePercentage7dInCurrency;

    /** 24 saatlik en yüksek fiyat (USD). */
    private Double high24h;

    /** 24 saatlik en düşük fiyat (USD). */
    private Double low24h;

    /** Son güncelleme zamanı (epoch saniye). */
    private Long lastUpdated;
}
