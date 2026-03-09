package com.scyborsa.ui.dto;

import lombok.Data;

/**
 * AKD tablosunda tek bir aracı kurum satırını temsil eden DTO.
 * scyborsaApi'den dönen zenginleştirilmiş kurum verisi.
 */
@Data
public class AkdBrokerDto {

    /** Aracı kurum kodu (ör: "ZRY"). "Diğer" satırı için "DIGER". */
    private String code;

    /** Aracı kurum tam adı. */
    private String title;

    /** Aracı kurum kısa adı. */
    private String shortTitle;

    /** Aracı kurum logo URL'i. */
    private String logoUrl;

    /** Lot sayısı. */
    private long adet;

    /** Yüzde oranı (0-100 arası, ör: 25.03). */
    private double yuzde;

    /** Ortalama maliyet (TL). */
    private double maliyet;
}
