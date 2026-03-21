package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Hisse bazli gruplanmis tarama sinyallerini tasiyan UI DTO'su.
 *
 * <p>scyborsaApi'deki {@code groupByStock=true} parametresi ile donen
 * hisse bazli gruplanmis sinyal verilerini temsil eder.</p>
 *
 * @see TaramalarResponseDto
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockGroupDto {

    /** Hisse borsa kodu (orn. "GARAN"). */
    private String stockName;

    /** Bu hisseye ait toplam sinyal sayisi. */
    private int sinyalSayisi;

    /** Ilk sinyaldeki fiyat (zamana gore). */
    private Double ilkFiyat;

    /** Son sinyaldeki fiyat (zamana gore). */
    private Double sonFiyat;

    /** Son sinyalin gun sonu degisim yuzdesi. */
    private Double gunSonuDegisim;

    /** Bu hisseye ait tum sinyallerin detayli listesi. */
    private List<TaramaDto> sinyaller;

    /**
     * Ilk fiyati formatlanmis metin olarak dondurur.
     *
     * @return "X.XX" formatinda fiyat veya "-"
     */
    public String getFormattedIlkFiyat() {
        return ilkFiyat != null ? String.format("%.2f", ilkFiyat) : "-";
    }

    /**
     * Son fiyati formatlanmis metin olarak dondurur.
     *
     * @return "X.XX" formatinda fiyat veya "-"
     */
    public String getFormattedSonFiyat() {
        return sonFiyat != null ? String.format("%.2f", sonFiyat) : "-";
    }

    /**
     * Gun sonu degisim oranini formatlar (+/- isaretli).
     *
     * @return formatlanmis gun sonu degisim orani veya "-"
     */
    public String getFormattedGunSonuDegisim() {
        return gunSonuDegisim != null ? String.format("%+.2f%%", gunSonuDegisim) : "-";
    }

    /**
     * Gun sonu degisim orani icin CSS sinifini dondurur.
     *
     * @return CSS sinif adi
     */
    public String getGunSonuCssClass() {
        if (gunSonuDegisim == null) return "text-muted";
        if (gunSonuDegisim > 0) return "text-success";
        if (gunSonuDegisim < 0) return "text-danger";
        return "";
    }
}
