package com.scyborsa.ui.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Kripto para detay verisi DTO'su.
 * vApi /api/crypto/coin/{coinId} endpoint'inden gelen verileri tasir.
 */
@Data
@NoArgsConstructor
public class CryptoDetailDto {
    private String id;
    private String symbol;
    private String name;
    private String image;
    private Double currentPrice;
    private Long marketCap;
    private Integer marketCapRank;
    private Double totalVolume;
    private Double high24h;
    private Double low24h;
    private Double priceChangePercentage24h;
    private Double priceChangePercentage7d;
    private Double priceChangePercentage30d;
    private Double priceChangePercentage1y;
    private Double circulatingSupply;
    private Double totalSupply;
    private Double maxSupply;
    private Double ath;
    private String athDate;
    private Double athChangePercentage;
    private Double atl;
    private String atlDate;
    private Double atlChangePercentage;
    private String descriptionEn;
    private String descriptionTr;
    private Long fullyDilutedValuation;
}
