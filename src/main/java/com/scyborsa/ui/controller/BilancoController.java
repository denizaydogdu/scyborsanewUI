package com.scyborsa.ui.controller;

import com.scyborsa.ui.service.BilancoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Collections;
import java.util.Map;

/**
 * Bilancolar sayfa controller'i.
 *
 * <p>{@code /bilancolar} adresinde bilanco listesi ve detay sayfalarini sunar.
 * AJAX endpoint'leri ile tab bazli lazy-loading desteklenir.
 * Tum finansal veriler scyborsaApi uzerinden gelir.</p>
 *
 * @see BilancoService
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class BilancoController {

    /** Bilanco verilerini saglayan servis. */
    private final BilancoService bilancoService;

    /**
     * Bilancolar liste sayfasini goruntular.
     *
     * <p>Tum semboller icin son bilanco rapor metadata listesini
     * scyborsaApi'den getirir ve template'e aktarir.</p>
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "bilancolar/bilancolar-list"} template adi
     */
    @GetMapping("/bilancolar")
    public String bilancolarList(Model model) {
        log.info("[BILANCO-UI] Bilancolar liste sayfasi isteniyor");

        Map<String, Object> result = bilancoService.getSonRaporlar();
        model.addAttribute("raporlar", result.getOrDefault("data", Collections.emptyList()));
        model.addAttribute("totalCount", result.getOrDefault("totalCount", 0));

        log.info("[BILANCO-UI] Bilancolar liste sayfasi yuklendi [totalCount={}]",
                result.getOrDefault("totalCount", 0));

        return "bilancolar/bilancolar-list";
    }

    /**
     * Bilanco detay sayfasini goruntular.
     *
     * <p>Belirtilen sembol icin bilanco detay sayfasini sunar.
     * Tab iceriklerinin yuklenmesi AJAX endpoint'leri ile lazy olarak yapilir.</p>
     *
     * @param symbol hisse kodu (orn. GARAN)
     * @param model Thymeleaf model nesnesi
     * @return {@code "bilancolar/bilanco-detail"} template adi veya gecersiz sembolde redirect
     */
    @GetMapping("/bilancolar/{symbol}")
    public String bilancoDetail(@PathVariable String symbol, Model model) {
        symbol = symbol != null ? symbol.toUpperCase() : "";
        if (!symbol.matches("^[A-Z0-9]{1,20}$")) {
            log.warn("[BILANCO-UI] Gecersiz sembol: {}", symbol);
            return "redirect:/bilancolar";
        }

        String sanitized = symbol;
        log.info("[BILANCO-UI] Bilanco detay sayfasi isteniyor [symbol={}]", sanitized);

        model.addAttribute("symbol", sanitized);

        return "bilancolar/bilanco-detail";
    }

    // ── AJAX Endpoints ─────────────────────────────────────

    /**
     * Bilanco (mali durum tablosu) verisini JSON olarak doner.
     *
     * <p>Bilanco detay sayfasindaki "Bilanco" tab'i icin
     * AJAX endpoint'i olarak kullanilir.</p>
     *
     * @param symbol hisse kodu (orn. GARAN)
     * @return bilanco verisi; gecersiz sembolde bos map
     */
    @GetMapping("/ajax/bilanco/{symbol}")
    @ResponseBody
    public Map<String, Object> ajaxBilanco(@PathVariable String symbol) {
        symbol = symbol != null ? symbol.toUpperCase() : "";
        if (!symbol.matches("^[A-Z0-9]{1,20}$")) {
            return Collections.emptyMap();
        }
        String sanitized = symbol;
        log.info("[BILANCO-UI] Bilanco AJAX isteniyor [symbol={}]", sanitized);
        return bilancoService.getBilanco(sanitized);
    }

    /**
     * Gelir tablosu verisini JSON olarak doner.
     *
     * <p>Bilanco detay sayfasindaki "Gelir Tablosu" tab'i icin
     * AJAX endpoint'i olarak kullanilir.</p>
     *
     * @param symbol hisse kodu (orn. GARAN)
     * @return gelir tablosu verisi; gecersiz sembolde bos map
     */
    @GetMapping("/ajax/bilanco/{symbol}/income")
    @ResponseBody
    public Map<String, Object> ajaxGelirTablosu(@PathVariable String symbol) {
        symbol = symbol != null ? symbol.toUpperCase() : "";
        if (!symbol.matches("^[A-Z0-9]{1,20}$")) {
            return Collections.emptyMap();
        }
        String sanitized = symbol;
        log.info("[BILANCO-UI] Gelir tablosu AJAX isteniyor [symbol={}]", sanitized);
        return bilancoService.getGelirTablosu(sanitized);
    }

    /**
     * Nakit akim tablosu verisini JSON olarak doner.
     *
     * <p>Bilanco detay sayfasindaki "Nakit Akim" tab'i icin
     * AJAX endpoint'i olarak kullanilir.</p>
     *
     * @param symbol hisse kodu (orn. GARAN)
     * @return nakit akim verisi; gecersiz sembolde bos map
     */
    @GetMapping("/ajax/bilanco/{symbol}/cashflow")
    @ResponseBody
    public Map<String, Object> ajaxNakitAkim(@PathVariable String symbol) {
        symbol = symbol != null ? symbol.toUpperCase() : "";
        if (!symbol.matches("^[A-Z0-9]{1,20}$")) {
            return Collections.emptyMap();
        }
        String sanitized = symbol;
        log.info("[BILANCO-UI] Nakit akim AJAX isteniyor [symbol={}]", sanitized);
        return bilancoService.getNakitAkim(sanitized);
    }

    /**
     * Tum finansal tablolari (bilanco + gelir + nakit) JSON olarak doner.
     *
     * <p>Bilanco detay sayfasindaki "Tumu" tab'i icin
     * AJAX endpoint'i olarak kullanilir.</p>
     *
     * @param symbol hisse kodu (orn. GARAN)
     * @return tum finansal tablolar; gecersiz sembolde bos map
     */
    @GetMapping("/ajax/bilanco/{symbol}/all")
    @ResponseBody
    public Map<String, Object> ajaxAllReports(@PathVariable String symbol) {
        symbol = symbol != null ? symbol.toUpperCase() : "";
        if (!symbol.matches("^[A-Z0-9]{1,20}$")) {
            return Collections.emptyMap();
        }
        String sanitized = symbol;
        log.info("[BILANCO-UI] Tum tablolar AJAX isteniyor [symbol={}]", sanitized);
        return bilancoService.getAllReports(sanitized);
    }

    /**
     * Finansal oranlari (rasyolari) JSON olarak doner.
     *
     * <p>Bilanco detay sayfasindaki "Rasyolar" tab'i icin
     * AJAX endpoint'i olarak kullanilir.</p>
     *
     * @param symbol hisse kodu (orn. GARAN)
     * @return finansal oranlar; gecersiz sembolde bos map
     */
    @GetMapping("/ajax/bilanco/{symbol}/rasyo")
    @ResponseBody
    public Map<String, Object> ajaxRasyo(@PathVariable String symbol) {
        symbol = symbol != null ? symbol.toUpperCase() : "";
        if (!symbol.matches("^[A-Z0-9]{1,20}$")) {
            return Collections.emptyMap();
        }
        String sanitized = symbol;
        log.info("[BILANCO-UI] Rasyolar AJAX isteniyor [symbol={}]", sanitized);
        return bilancoService.getRasyo(sanitized);
    }
}
