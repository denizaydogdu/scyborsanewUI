package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.HazirTaramalarResponseDto;
import com.scyborsa.ui.dto.PresetStrategyDto;
import com.scyborsa.ui.service.HazirTaramalarService;
import com.scyborsa.ui.service.PatternScreenerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Hazir Taramalar (Preset Screener) sayfasi controller'i.
 *
 * <p>{@code /hazir-taramalar} URL'inde onceden tanimli tarama stratejilerini
 * listeleyen ve AJAX ile tarama sonuclarini getiren sayfayi sunar.</p>
 *
 * @see HazirTaramalarService
 * @see HazirTaramalarResponseDto
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class HazirTaramalarController {

    /** Hazir tarama verilerini saglayan servis. */
    private final HazirTaramalarService hazirTaramalarService;

    /** Formasyon tarama verilerini saglayan servis. */
    private final PatternScreenerService patternScreenerService;

    /**
     * Hazir taramalar sayfasini gosterir.
     *
     * <p>Mevcut strateji listesini model'e ekleyerek SSR sayfasini render eder.
     * Tarama sonuclari AJAX ile ayri istenir.</p>
     *
     * @param model Thymeleaf model
     * @return template adi
     */
    @GetMapping("/hazir-taramalar")
    public String hazirTaramalar(Model model) {
        log.info("[HAZIR-TARAMALAR-UI] Hazir taramalar sayfasi istendi");

        List<PresetStrategyDto> strategies = hazirTaramalarService.getStrategies();
        model.addAttribute("strategies", strategies);
        model.addAttribute("categories", List.of("MOMENTUM", "TREND", "HACIM", "VOLATILITE", "KOMPOZIT"));

        // Strateji aciklama map'i — JS'e dogrudan JSON olarak gecilir
        Map<String, String> descMap = new LinkedHashMap<>();
        for (PresetStrategyDto s : strategies) {
            descMap.put(s.getCode(), s.getDescription());
        }
        model.addAttribute("strategyDescriptions", descMap);

        return "hazir-taramalar/hazir-taramalar";
    }

    /**
     * Belirtilen strateji icin tarama calistirir (AJAX endpoint).
     *
     * <p>{@code GET /ajax/hazir-taramalar/scan?strategy=...} istegini karsilar.
     * Strateji kodu sanitize edilir (max 50 karakter, kontrol karakterleri temizlenir).</p>
     *
     * @param strategy strateji kodu
     * @return tarama sonuclari JSON
     */
    @GetMapping("/ajax/hazir-taramalar/scan")
    @ResponseBody
    public HazirTaramalarResponseDto scan(@RequestParam(required = false) String strategy) {
        // Parametre sanitizasyonu
        if (strategy != null) {
            strategy = strategy.length() > 50 ? strategy.substring(0, 50) : strategy;
            strategy = strategy.replaceAll("[\\p{Cntrl}]", "");
        }

        log.info("[HAZIR-TARAMALAR-UI] AJAX tarama istendi, strateji={}",
                strategy != null ? strategy.replaceAll("[\\r\\n]", "_") : "null");

        return hazirTaramalarService.scan(strategy);
    }

    /**
     * Formasyon tarama calistirir (AJAX endpoint).
     *
     * <p>{@code GET /ajax/hazir-taramalar/pattern-scan} istegini karsilar.
     * Tum formasyonlari tarar ve sonuclari JSON olarak doner.</p>
     *
     * @return formasyon tarama sonuclari JSON (patterns listesi + totalCount)
     */
    @GetMapping("/ajax/hazir-taramalar/pattern-scan")
    @ResponseBody
    public Map<String, Object> patternScan() {
        log.info("[HAZIR-TARAMALAR-UI] Formasyon tarama istendi");
        return patternScreenerService.scan();
    }
}
