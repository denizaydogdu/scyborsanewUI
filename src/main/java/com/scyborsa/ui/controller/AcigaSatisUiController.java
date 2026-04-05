package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.AcigaSatisUiDto;
import com.scyborsa.ui.service.AcigaSatisUiService;
import com.scyborsa.ui.service.Bist100Service;
import com.scyborsa.ui.service.KatilimEndeksiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/**
 * Açığa satış istatistikleri sayfası controller'ı.
 *
 * <p>Günlük açığa satış verilerini server-side render ederek
 * kullanıcıya sunar.</p>
 *
 * @see AcigaSatisUiService
 * @see AcigaSatisUiDto
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class AcigaSatisUiController {

    /** Açığa satış verilerini sağlayan servis. */
    private final AcigaSatisUiService acigaSatisUiService;

    /** Hisse logo haritası için servis. */
    private final Bist100Service bist100Service;

    /** Katılım endeksi kontrol servisi. */
    private final KatilimEndeksiService katilimEndeksiService;

    /**
     * Açığa satış istatistikleri listesi sayfasını görüntüler.
     *
     * <p>Günlük açığa satış verilerini API'den alır, KPI hesaplar ve template'e iletir.</p>
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "aciga-satis/aciga-satis-list"} template adı
     */
    @GetMapping("/aciga-satis")
    public String acigaSatisList(Model model) {
        List<AcigaSatisUiDto> veriler;
        try {
            veriler = acigaSatisUiService.getGunlukAcigaSatislar();
        } catch (Exception e) {
            log.warn("[ACIGA-SATIS-UI] Veriler alınamadı: {}", e.getMessage());
            veriler = Collections.emptyList();
        }

        // KPI: toplam hisse sayısı
        int toplamHisse = veriler.size();

        // KPI: en yüksek açığa satış lotuna sahip hisse
        String enYuksekHisse = veriler.stream()
                .filter(v -> v.getAcigaSatisLotu() != null)
                .max(Comparator.comparingLong(AcigaSatisUiDto::getAcigaSatisLotu))
                .map(AcigaSatisUiDto::getHisseSenediKodu)
                .orElse("-");

        // KPI: ortalama açığa satış oranı (%)
        double ortalamaOran = veriler.stream()
                .filter(v -> v.getAcigaSatisLotu() != null && v.getToplamIslemHacmiLot() != null
                        && v.getToplamIslemHacmiLot() > 0)
                .mapToDouble(v -> v.getAcigaSatisLotu() * 100.0 / v.getToplamIslemHacmiLot())
                .average()
                .orElse(0.0);

        // Veri tarihi (ilk elemanın tarihinden al)
        String veriTarihi = veriler.stream()
                .filter(v -> v.getTarih() != null && v.getTarih().length() >= 10)
                .findFirst()
                .map(v -> v.getTarih().substring(8, 10) + "." + v.getTarih().substring(5, 7) + "." + v.getTarih().substring(0, 4))
                .orElse("-");

        model.addAttribute("veriler", veriler);
        model.addAttribute("toplamHisse", toplamHisse);
        model.addAttribute("enYuksekHisse", enYuksekHisse);
        model.addAttribute("ortalamaOran", String.format("%.2f", ortalamaOran));
        model.addAttribute("veriTarihi", veriTarihi);
        model.addAttribute("katilimCodes", katilimEndeksiService.getKatilimCodes());

        try {
            model.addAttribute("stockLogos", bist100Service.getStockLogos());
        } catch (Exception e) {
            model.addAttribute("stockLogos", java.util.Collections.emptyMap());
        }

        return "aciga-satis/aciga-satis-list";
    }
}
