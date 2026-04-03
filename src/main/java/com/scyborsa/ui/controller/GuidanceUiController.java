package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.GuidanceUiDto;
import com.scyborsa.ui.service.GuidanceUiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Şirket beklentileri (guidance) sayfası controller'ı.
 *
 * <p>Şirketlerin yıllık beklenti/rehberlik verilerini tablo formatında sunar.
 * Client-side JS ile arama, yıl filtre ve sayfalama destekler.</p>
 *
 * @see GuidanceUiService
 * @see GuidanceUiDto
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class GuidanceUiController {

    /** Guidance verilerini sağlayan servis. */
    private final GuidanceUiService guidanceUiService;

    /**
     * Şirket beklentileri listesi sayfasını görüntüler.
     *
     * <p>Tüm guidance verilerini API'den alır, KPI hesaplar (toplam şirket,
     * yıl listesi) ve template'e iletir.</p>
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "guidance/guidance-list"} template adı
     */
    @GetMapping("/guidance")
    public String guidanceList(Model model) {
        List<GuidanceUiDto> guidancelar;
        try {
            guidancelar = guidanceUiService.getGuidancelar();
        } catch (Exception e) {
            log.warn("[GUIDANCE-UI] Veriler alınamadı: {}", e.getMessage());
            guidancelar = Collections.emptyList();
        }

        long toplamSirket = guidancelar.stream()
                .map(GuidanceUiDto::getHisseSenediKodu)
                .distinct()
                .count();

        List<Integer> yillar = guidancelar.stream()
                .map(GuidanceUiDto::getYil)
                .filter(y -> y != null)
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        model.addAttribute("guidancelar", guidancelar);
        model.addAttribute("toplamSirket", toplamSirket);
        model.addAttribute("yillar", yillar);

        return "guidance/guidance-list";
    }
}
