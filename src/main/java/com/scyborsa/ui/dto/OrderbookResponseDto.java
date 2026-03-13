package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/**
 * Emir defteri API response mirror DTO'su.
 * scyborsaApi'den dönen orderbook verisini UI tarafında temsil eder.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class OrderbookResponseDto {

    /** İşlem listesi (zenginleştirilmiş). */
    private List<OrderbookTransactionDto> transactions;

    /** Görüntülenen işlem sayısı (ilk sayfa, toplam değil). */
    private int totalCount;

    /**
     * Tek bir zenginleştirilmiş emir defteri işlemi.
     */
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OrderbookTransactionDto {

        /** Saat (HH:mm:ss formatında). */
        private String time;

        /** Unix epoch timestamp. */
        private long timestamp;

        /** İşlem fiyatı. */
        private double price;

        /** İşlem lot adedi. */
        private int lot;

        /** İşlem yönü: "B" / "S". */
        private String action;

        /** İşlem yönü etiketi: "Alış" / "Satış". */
        private String actionLabel;

        /** Alıcı kurum kodu. */
        private String buyerCode;

        /** Alıcı kurum kısa adı. */
        private String buyerShortTitle;

        /** Alıcı kurum logo URL. */
        private String buyerLogoUrl;

        /** Satıcı kurum kodu. */
        private String sellerCode;

        /** Satıcı kurum kısa adı. */
        private String sellerShortTitle;

        /** Satıcı kurum logo URL. */
        private String sellerLogoUrl;
    }
}
