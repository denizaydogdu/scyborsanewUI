package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.GuidanceUiDto;
import com.scyborsa.ui.service.GuidanceUiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Sirket beklentileri (guidance) sayfasi controller'i.
 *
 * <p>Sirketlerin yillik beklenti/rehberlik verilerini tablo formatinda sunar.
 * Liste gorunumunde sadece hisse kodu + yil gosterilir.
 * Detay icin AJAX ile hisse bazli raw beklenti metni getirilir.</p>
 *
 * @see GuidanceUiService
 * @see GuidanceUiDto
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class GuidanceUiController {

    /** Gecerli BIST hisse kodu pattern'i. */
    private static final java.util.regex.Pattern VALID_STOCK_CODE =
            java.util.regex.Pattern.compile("^[A-Z0-9]{1,10}$");

    /** Guidance verilerini saglayan servis. */
    private final GuidanceUiService guidanceUiService;

    /**
     * Sirket beklentileri listesi sayfasini goruntuler.
     *
     * <p>Tum guidance verilerini API'den alir (sadece hisse+yil), KPI hesaplar
     * (toplam sirket, yil listesi) ve template'e iletir.</p>
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "guidance/guidance-list"} template adi
     */
    @GetMapping("/guidance")
    public String guidanceList(Model model) {
        List<GuidanceUiDto> guidancelar;
        try {
            guidancelar = guidanceUiService.getGuidancelar();
        } catch (Exception e) {
            log.warn("[GUIDANCE-UI] Veriler alinamadi: {}", e.getMessage());
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

    /**
     * Belirtilen hisse icin raw guidance (beklentiler) metnini AJAX ile dondurur.
     *
     * <p>Hisse kodunu dogrular, API'deki raw endpoint'i cagirarak
     * ham markdown metnini dondurur. UI tarafinda JS ile HTML tabloya donusturulur.</p>
     *
     * @param stockCode hisse kodu (orn. THYAO)
     * @return ham beklenti metni veya 204 No Content
     */
    @GetMapping(value = "/ajax/guidance/{stockCode}", produces = MediaType.TEXT_PLAIN_VALUE)
    @ResponseBody
    public ResponseEntity<String> getGuidanceRaw(@PathVariable String stockCode) {
        if (stockCode == null || stockCode.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        String safeName = stockCode.trim().toUpperCase();
        if (!VALID_STOCK_CODE.matcher(safeName).matches()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            String rawText = guidanceUiService.getRawGuidance(safeName);
            if (rawText == null || rawText.isBlank()) {
                return ResponseEntity.noContent().build();
            }
            return ResponseEntity.ok(rawText);
        } catch (Exception e) {
            log.warn("[GUIDANCE-UI] Raw guidance AJAX hatasi: {}", safeName, e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
