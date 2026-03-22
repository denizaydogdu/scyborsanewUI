package com.scyborsa.ui.dto.bilanco;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Bilanco tablo konteynir DTO'su.
 *
 * <p>Bir finansal raporun tablo tipini ve tablo kalemlerini icerir.
 * Tablo tipi "Bilanco", "Gelir Tablosu" veya "Nakit Akim Tablosu" olabilir.</p>
 *
 * @see BilancoTableItemDto
 * @see BilancoDataDto
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BilancoTablesDto {

    /** Tablo tipi adi (orn. "Bilanco", "Gelir Tablosu"). */
    private String tableTypeName;

    /** Tablo kalemleri listesi. */
    private List<BilancoTableItemDto> tableItems;
}
