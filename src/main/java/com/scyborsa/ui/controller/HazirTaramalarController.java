package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.HazirTaramalarResponseDto;
import com.scyborsa.ui.dto.PresetStrategyDto;
import com.scyborsa.ui.service.CandlePatternService;
import com.scyborsa.ui.service.HazirTaramalarService;
import com.scyborsa.ui.service.PatternScreenerService;
import com.scyborsa.ui.service.RegressionScreenerService;
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

    /** Mum formasyonu tarama verilerini saglayan servis. */
    private final CandlePatternService candlePatternService;

    /** Regresyon kanali tarama verilerini saglayan servis. */
    private final RegressionScreenerService regressionScreenerService;

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

        // Gizlenecek stratejiler (kullaniciya gosterilmeyecek)
        java.util.Set<String> hiddenCodes = java.util.Set.of(
                "momentum_positive", "williams_r_oversold", "ultimate_oscillator_strong",
                "sma_below_order",
                "low_volatility",
                "price_above_sma50", "oversold_bounce", "high_roc", "dmi_bullish",
                "trix_positive", "vortex_bullish", "aroon_up_trend", "commodity_channel_strong"
        );
        List<PresetStrategyDto> strategies = hazirTaramalarService.getStrategies()
                .stream()
                .filter(s -> !hiddenCodes.contains(s.getCode()))
                .collect(java.util.stream.Collectors.toList());
        model.addAttribute("strategies", strategies);
        // Kategoriler: HACIM, VOLATILITE, KOMPOZIT tümüyle gizli — sadece MOMENTUM ve TREND kalıyor
        model.addAttribute("categories", List.of("MOMENTUM", "TREND", "HACIM", "VOLATILITE"));

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

    /**
     * Mum formasyonu tarama calistirir (AJAX endpoint).
     *
     * <p>{@code GET /ajax/hazir-taramalar/candle-scan?period=1D} istegini karsilar.
     * Periyot parametresi sanitize edilir (max 3 karakter).</p>
     *
     * @param period tarama periyodu (varsayilan: 1D)
     * @return mum formasyonu tarama sonuclari JSON
     */
    @GetMapping("/ajax/hazir-taramalar/candle-scan")
    @ResponseBody
    public Map<String, Object> candleScan(@RequestParam(defaultValue = "1D") String period) {
        // Sanitize period: strip control chars, max 3 chars
        String safePeriod = period.replaceAll("[\\p{Cntrl}]", "");
        safePeriod = safePeriod.length() > 3 ? safePeriod.substring(0, 3) : safePeriod;
        log.info("[HAZIR-TARAMALAR-UI] Mum formasyonu tarama istendi, periyot: {}", safePeriod);
        return candlePatternService.scan(safePeriod);
    }

    /**
     * Regresyon kanali tarama calistirir (AJAX endpoint).
     *
     * <p>{@code GET /ajax/hazir-taramalar/regression-scan} istegini karsilar.
     * Tum hisseler icin regresyon kanali verilerini tarar ve sonuclari JSON olarak doner.</p>
     *
     * @return regresyon kanali tarama sonuclari JSON (regressions listesi + totalCount)
     */
    @GetMapping("/ajax/hazir-taramalar/regression-scan")
    @ResponseBody
    public Map<String, Object> regressionScan() {
        log.info("[HAZIR-TARAMALAR-UI] Regresyon kanali tarama istendi");
        return regressionScreenerService.scan();
    }
}
