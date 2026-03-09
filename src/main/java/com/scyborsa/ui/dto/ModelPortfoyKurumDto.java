package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Model portföy aracı kurum DTO sınıfı.
 *
 * <p>scyborsaApi'den gelen kurum verilerinin deserialize edilmesinde kullanılır.</p>
 *
 * @see com.scyborsa.ui.service.ModelPortfoyService
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModelPortfoyKurumDto {

    /** Kurum ID'si. */
    private Long id;

    /** Aracı kurum adı. Örn: "Burgan", "Tacirler". */
    private String kurumAdi;

    /** Kurum logo URL'i. */
    private String logoUrl;

    /** Kurum model portföyündeki hisse sayısı. */
    private Integer hisseSayisi;

    /** Kartların gösterim sırası. */
    private Integer siraNo;

    /** Kurumun aktif olup olmadigini belirtir. */
    private Boolean aktif;
}
