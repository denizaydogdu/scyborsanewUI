package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Fon zaman serisi veri noktasi DTO sinifi.
 *
 * <p>Nakit akisi (cashflow) ve yatirimci sayisi gecmisi gibi
 * zaman serisi verilerini tasir. Her veri noktasi bir tarih
 * ve deger ciftinden olusur.</p>
 *
 * @see FundDetailDto
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class FundTimeSeriesDto {

    /** Tarih (yyyy-MM-dd). */
    private String date;

    /** Deger (nakit akisi TL veya yatirimci sayisi). */
    private Double value;
}
