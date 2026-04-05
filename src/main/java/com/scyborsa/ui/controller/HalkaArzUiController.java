package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.HalkaArzUiDto;
import com.scyborsa.ui.service.Bist100Service;
import com.scyborsa.ui.service.HalkaArzUiService;
import com.scyborsa.ui.service.KatilimEndeksiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;

/**
 * Halka arz takvimi sayfası controller'ı.
 *
 * <p>Halka arz verilerini server-side render ederek kullanıcıya sunar.
 * Aktif ve geçmiş halka arzları ayrı ayrı listeler.</p>
 *
 * @see HalkaArzUiService
 * @see HalkaArzUiDto
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class HalkaArzUiController {

    /** Halka arz verilerini sağlayan servis. */
    private final HalkaArzUiService halkaArzUiService;

    /** Hisse logo haritası için servis. */
    private final Bist100Service bist100Service;
    private final KatilimEndeksiService katilimEndeksiService;

    /**
     * Halka arz takvimi sayfasını görüntüler.
     *
     * <p>Tüm ve aktif halka arzları API'den alır, KPI hesaplar ve template'e iletir.</p>
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "halka-arz/halka-arz-list"} template adı
     */
    @GetMapping("/halka-arz")
    public String halkaArzList(Model model) {
        List<HalkaArzUiDto> tumHalkaArzlar;
        List<HalkaArzUiDto> aktifler;
        try {
            tumHalkaArzlar = halkaArzUiService.getHalkaArzlar().stream()
                    .filter(h -> h.getBaslik() != null && !"false".equalsIgnoreCase(h.getBaslik()))
                    .filter(h -> h.getHalkaArzFiyati() != null || h.getIlkIslemTarihi() != null
                            || h.getTalepToplamaBaslangicTarihi() != null)
                    .collect(java.util.stream.Collectors.toList());
        } catch (Exception e) {
            log.warn("[HALKA-ARZ-UI] Halka arz verileri alınamadı: {}", e.getMessage());
            tumHalkaArzlar = Collections.emptyList();
        }
        try {
            aktifler = halkaArzUiService.getAktifHalkaArzlar();
        } catch (Exception e) {
            log.warn("[HALKA-ARZ-UI] Aktif halka arz verileri alınamadı: {}", e.getMessage());
            aktifler = Collections.emptyList();
        }

        // KPI: aktif halka arz sayısı
        int aktifSayisi = aktifler.size();

        // KPI: son 30 günde ilk işlem gören IPO sayısı
        LocalDate otuzGunOnce = LocalDate.now().minusDays(30);
        long son30Gun = tumHalkaArzlar.stream()
                .filter(h -> h.getIlkIslemTarihi() != null && h.getIlkIslemTarihi().length() >= 10)
                .filter(h -> {
                    try {
                        // Tarih "2026-03-11T00:00:00.000Z" formatında — ilk 10 karakter al
                        LocalDate tarih = LocalDate.parse(h.getIlkIslemTarihi().substring(0, 10));
                        return !tarih.isBefore(otuzGunOnce);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .count();

        // Geçmiş = tüm liste - aktifler
        java.util.Set<String> aktifKodlar = aktifler.stream()
                .map(HalkaArzUiDto::getHisseSenediKodu)
                .collect(java.util.stream.Collectors.toSet());
        List<HalkaArzUiDto> gecmisler = tumHalkaArzlar.stream()
                .filter(h -> !aktifKodlar.contains(h.getHisseSenediKodu()))
                .collect(java.util.stream.Collectors.toList());

        // KPI: toplam = tüm benzersiz halka arz sayısı (çift sayım yok)
        int gecmisSayisi = gecmisler.size();
        int toplam = tumHalkaArzlar.size();

        model.addAttribute("tumHalkaArzlar", tumHalkaArzlar);
        model.addAttribute("gecmisler", gecmisler);
        model.addAttribute("aktifler", aktifler);
        model.addAttribute("aktifSayisi", aktifSayisi);
        model.addAttribute("son30Gun", son30Gun);
        model.addAttribute("toplam", toplam);

        // Hisse logoları + Katılım
        try {
            model.addAttribute("stockLogos", bist100Service.getStockLogos());
        } catch (Exception e) {
            model.addAttribute("stockLogos", java.util.Collections.emptyMap());
        }
        model.addAttribute("katilimCodes", katilimEndeksiService.getKatilimCodes());

        return "halka-arz/halka-arz-list";
    }
}
