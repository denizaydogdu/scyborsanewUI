package com.scyborsa.ui.dto;

import lombok.Data;

import java.util.List;

/**
 * AKD (Aracı Kurum Dağılımı) API response mirror DTO'su.
 * scyborsaApi'den dönen AKD verisini UI tarafında temsil eder.
 */
@Data
public class AkdResponseDto {

    /** Net alıcı kurumlar listesi. */
    private List<AkdBrokerDto> alicilar;

    /** Net satıcı kurumlar listesi. */
    private List<AkdBrokerDto> saticilar;

    /** Tüm kurumlar toplam işlem listesi. */
    private List<AkdBrokerDto> toplam;

    /** Verinin ait olduğu tarih (yyyy-MM-dd formatında). */
    private String dataDate;

    /** Formatlanmış tarih (ör: "11 Mart 2026"). */
    private String formattedDataDate;
}
