package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * VBTS tedbirli hisse DTO sınıfı.
 *
 * <p>Borsa İstanbul VBTS (Vadeli İşlem ve Opsiyon Piyasası Borsası Takas Sistemi)
 * tedbirli hisse verilerini taşır.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class VbtsTedbirDto {

    /** Tedbir ID. */
    private Integer tedbirId;

    /** Hisse senedi kodu (örn. GARAN). */
    private String hisseSenediKodu;

    /** Tedbir tipi (örn. brut_takas, tek_fiyat). */
    private String tedbirTipi;

    /** Tedbir başlangıç tarihi. */
    private String tedbirBaslangicTarihi;

    /** Tedbir bitiş tarihi. */
    private String tedbirBitisTarihi;

    /** KAP bildirim ID. */
    private Long kapBildirimId;
}
