package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * KAP MCP haber arama sonucu UI DTO.
 *
 * <p>scyborsaApi'deki {@code /api/v1/kap-mcp/{stockCode}} endpoint'inden
 * dönen haber verilerini taşır. Araştırma Yazıları ve Faaliyet Raporları
 * sayfalarında kullanılır.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class KapMcpHaberUiDto {

    /** Haber başlığı. */
    private String baslik;

    /** Haber özeti. */
    private String ozet;

    /** Haber tarihi. */
    private String tarih;

    /** Bildirim tipi (örn. FR, ODA, SPK). */
    private String bildirimTipi;

    /** Hisse senedi kodu (örn. GARAN). */
    private String hisseSenediKodu;

    /** Detay içerik chunk ID listesi. */
    private List<String> chunkIds;
}
