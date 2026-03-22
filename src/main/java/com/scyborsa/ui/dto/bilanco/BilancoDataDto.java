package com.scyborsa.ui.dto.bilanco;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Bilanco rapor verisi DTO'su.
 *
 * <p>Bir hissenin finansal raporunun icerigini tasir.
 * Rapor bilanco, gelir tablosu veya nakit akim tablosu olabilir.</p>
 *
 * @see BilancoTablesDto
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BilancoDataDto {

    /** Rapor ID'si (Gate Velzon API'deki benzersiz tanimlayici). */
    private Long id;

    /** Rapor basligi (orn. "GARAN 2024 Yillik Bilanco"). */
    private String title;

    /** Konsolidasyon durumu (CS=konsolide, NC=konsolide olmayan). */
    private String consolidation;

    /** Rapor yili. */
    private Integer year;

    /** Rapor donemi (orn. "3 Aylik", "Yillik"). */
    private String period;

    /** KAP bildirim sayfasi linki. */
    private String link;

    /** Rapor konusu/aciklamasi. */
    private String subject;

    /** Rapor tablolari (kalemler ve degerler). */
    private BilancoTablesDto tables;
}
