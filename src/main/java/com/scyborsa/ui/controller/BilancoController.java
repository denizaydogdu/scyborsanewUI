package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.FinansalTabloUiDto;
import com.scyborsa.ui.dto.SektorelKarsilastirmaUiDto;
import com.scyborsa.ui.service.BilancoService;
import com.scyborsa.ui.service.FinansalTabloUiService;
import com.scyborsa.ui.service.SektorelKarsilastirmaUiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.*;
import java.util.stream.Collectors;

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

    /** Finansal tablo verilerini saglayan servis. */
    private final FinansalTabloUiService finansalTabloUiService;

    /** Sektorel karsilastirma verilerini saglayan servis. */
    private final SektorelKarsilastirmaUiService sektorelKarsilastirmaUiService;

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

    /**
     * Gelir ve net kar trend verisini JSON olarak doner.
     *
     * <p>Bilanco detay sayfasindaki trend grafik karti icin
     * AJAX endpoint'i olarak kullanilir. Son ceyrekler bazinda
     * hasilat ve net donem kari verilerini dondurur.</p>
     *
     * @param symbol hisse kodu (orn. GARAN)
     * @return trend verisi (labels, hasilat, netKar); gecersiz sembolde bos map
     */
    @GetMapping("/ajax/bilanco/{symbol}/trend")
    @ResponseBody
    public Map<String, Object> ajaxTrend(@PathVariable String symbol) {
        symbol = symbol != null ? symbol.toUpperCase() : "";
        if (!symbol.matches("^[A-Z0-9]{1,20}$")) {
            return Collections.emptyMap();
        }
        String sanitized = symbol;
        log.info("[BILANCO-UI] Trend AJAX isteniyor [symbol={}]", sanitized);

        try {
            List<FinansalTabloUiDto> gelirRows = finansalTabloUiService.getHisseGelir(sanitized);
            if (gelirRows.isEmpty()) {
                return Collections.emptyMap();
            }

            // Hasilat ve Net Donem Kari satirlarini filtrele
            List<FinansalTabloUiDto> hasilatRows = gelirRows.stream()
                    .filter(r -> r.getKalem() != null && r.getKalem().toLowerCase().contains("hasılat"))
                    .collect(Collectors.toList());
            List<FinansalTabloUiDto> netKarRows = gelirRows.stream()
                    .filter(r -> r.getKalem() != null &&
                            (r.getKalem().toLowerCase().contains("net dönem kârı") ||
                             r.getKalem().toLowerCase().contains("net dönem karı")))
                    .collect(Collectors.toList());

            // Yil+ay bazinda sirala (eski → yeni)
            Comparator<FinansalTabloUiDto> cmp = Comparator
                    .comparingInt((FinansalTabloUiDto d) -> d.getYil() != null ? d.getYil() : 0)
                    .thenComparingInt(d -> d.getAy() != null ? d.getAy() : 0);
            hasilatRows.sort(cmp);
            netKarRows.sort(cmp);

            // Son 8 ceyrek
            int limit = 8;
            if (hasilatRows.size() > limit) {
                hasilatRows = hasilatRows.subList(hasilatRows.size() - limit, hasilatRows.size());
            }
            if (netKarRows.size() > limit) {
                netKarRows = netKarRows.subList(netKarRows.size() - limit, netKarRows.size());
            }

            // Label: "2024/03" formatinda (hasilat satirlarindan)
            List<String> labels = hasilatRows.stream()
                    .map(r -> r.getYil() + "/" + String.format("%02d", r.getAy() != null ? r.getAy() : 0))
                    .collect(Collectors.toList());
            List<Double> hasilatValues = hasilatRows.stream()
                    .map(r -> r.getTryDonemsel() != null ? r.getTryDonemsel() : 0.0)
                    .collect(Collectors.toList());

            // Net kar degerlerini labels ile hizala (farkli boyut olabilir)
            Map<String, Double> netKarByPeriod = netKarRows.stream()
                    .collect(Collectors.toMap(
                            r -> r.getYil() + "/" + String.format("%02d", r.getAy() != null ? r.getAy() : 0),
                            r -> r.getTryDonemsel() != null ? r.getTryDonemsel().doubleValue() : 0.0,
                            (a, b) -> a
                    ));
            List<Double> netKarValues = labels.stream()
                    .map(l -> netKarByPeriod.getOrDefault(l, 0.0))
                    .collect(Collectors.toList());

            Map<String, Object> result = new HashMap<>();
            result.put("labels", labels);
            result.put("hasilat", hasilatValues);
            result.put("netKar", netKarValues);
            return result;
        } catch (Exception e) {
            log.error("[BILANCO-UI] Trend verisi alinamadi [symbol={}]", sanitized, e);
            return Collections.emptyMap();
        }
    }

    /**
     * Sektorel karsilastirma verisini JSON olarak doner.
     *
     * <p>Bilanco detay sayfasindaki sektorel karsilastirma karti icin
     * AJAX endpoint'i olarak kullanilir.</p>
     *
     * @param symbol hisse kodu (orn. GARAN)
     * @return sektorel karsilastirma verisi; gecersiz sembolde bos map
     */
    @GetMapping("/ajax/bilanco/{symbol}/sektor-karsilastirma")
    @ResponseBody
    public Map<String, Object> ajaxSektorKarsilastirma(@PathVariable String symbol) {
        symbol = symbol != null ? symbol.toUpperCase() : "";
        if (!symbol.matches("^[A-Z0-9]{1,20}$")) {
            return Collections.emptyMap();
        }
        String sanitized = symbol;
        log.info("[BILANCO-UI] Sektörel karşılaştırma AJAX isteniyor [symbol={}]", sanitized);

        try {
            SektorelKarsilastirmaUiDto dto = sektorelKarsilastirmaUiService.getKarsilastirma(sanitized);
            if (dto == null) {
                return Collections.emptyMap();
            }

            Map<String, Object> result = new HashMap<>();
            result.put("sektor", dto.getSektor());
            result.put("sirketOranlari", dto.getSirketOranlari() != null ? dto.getSirketOranlari() : Collections.emptyMap());
            result.put("sektorOrtalama", dto.getSektorOrtalama() != null ? dto.getSektorOrtalama() : Collections.emptyMap());
            result.put("sektorMedian", dto.getSektorMedian() != null ? dto.getSektorMedian() : Collections.emptyMap());
            result.put("pozisyon", dto.getPozisyon() != null ? dto.getPozisyon() : Collections.emptyMap());
            return result;
        } catch (Exception e) {
            log.error("[BILANCO-UI] Sektörel karşılaştırma alinamadi [symbol={}]", sanitized, e);
            return Collections.emptyMap();
        }
    }
}
