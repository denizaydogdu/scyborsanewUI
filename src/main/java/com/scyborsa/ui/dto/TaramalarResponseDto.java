package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Taramalar API yanıt DTO'su.
 *
 * <p>scyborsaApi'deki {@code /api/v1/taramalar} endpoint'inden
 * dönen tüm verileri (tarama listesi, özet, filtre seçenekleri)
 * kapsayan üst düzey yanıt nesnesi.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaramalarResponseDto {

    /** Tarama sonuçları listesi. */
    private List<TaramaDto> taramalar;

    /** Özet istatistikler (KPI kartları için). */
    private TaramaOzetDto ozet;

    /** Mevcut tarama adları (filtre dropdown için). */
    private List<String> screenerNames;

    /** Toplam kart sayısı. */
    private int toplamKart;

    /** Hisse bazlı gruplu sinyal listesi. {@code groupByStock=true} ise dolu, değilse {@code null}. */
    private List<StockGroupDto> stockGroups;
}
