package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.FundDetailDto;
import com.scyborsa.ui.dto.FundDto;
import com.scyborsa.ui.dto.FundStatsDto;
import com.scyborsa.ui.dto.FundTimeSeriesDto;
import com.scyborsa.ui.service.FonlarService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.List;

/**
 * Fonlar (TEFAS Fon Listesi) sayfa controller'i.
 *
 * <p>{@code /fonlar} adresinde fon listesi sayfasini sunar.
 * Tum fon verileri scyborsaApi uzerinden gelir.</p>
 *
 * @see FonlarService
 * @see FundDto
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class FonlarController {

    /** Fon verilerini saglayan servis. */
    private final FonlarService fonlarService;

    /**
     * Fon listesi sayfasini goruntular.
     *
     * <p>Tum aktif fonlari ve istatistikleri scyborsaApi'den getirir.
     * Fon verisi Thymeleaf inline JS ile sayfaya JSON olarak embed edilir
     * (client-side filtreleme/siralama icin).</p>
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "fonlar/fonlar-list"} template adi
     */
    @GetMapping("/fonlar")
    public String fonlarList(Model model) {
        log.info("[FONLAR] Fon listesi sayfasi isteniyor");

        List<FundDto> funds = fonlarService.getAllFunds();
        FundStatsDto stats = fonlarService.getFundStats();

        log.info("[FONLAR] Fon listesi yuklendi [count={}]", funds.size());

        model.addAttribute("funds", funds);
        model.addAttribute("stats", stats);

        return "fonlar/fonlar-list";
    }

    /**
     * Fon detay sayfasını gösterir.
     *
     * @param code TEFAS fon kodu
     * @param model Thymeleaf model
     * @return Detay sayfası veya redirect
     */
    @GetMapping("/fonlar/{code}")
    public String fonlarDetail(@PathVariable String code, Model model) {
        if (code == null || code.length() > 10 || !code.matches("[a-zA-Z0-9]+")) {
            return "redirect:/fonlar";
        }
        String sanitized = code.replaceAll("[\\r\\n]", "").toUpperCase();
        log.info("[FONLAR] Fon detay sayfasi isteniyor [code={}]", sanitized);

        FundDetailDto fund = fonlarService.getFundDetail(sanitized);
        if (fund == null) {
            return "redirect:/fonlar";
        }

        model.addAttribute("fund", fund);
        return "fonlar/fonlar-detail";
    }

    // ── AJAX Endpoints ─────────────────────────────────────

    /**
     * Fon nakit akisi verilerini JSON olarak doner.
     *
     * <p>Fon detay sayfasindaki nakit akisi grafigi icin
     * AJAX endpoint'i olarak kullanilir.</p>
     *
     * @param code TEFAS fon kodu (orn: "AAJ")
     * @return nakit akisi zaman serisi listesi; gecersiz kod durumunda bos liste
     */
    @GetMapping("/ajax/fonlar/{code}/cashflow")
    @ResponseBody
    public List<FundTimeSeriesDto> getCashflow(@PathVariable String code) {
        if (code == null || code.length() > 10 || !code.matches("[a-zA-Z0-9]+")) {
            return List.of();
        }
        String sanitized = code.replaceAll("[\\r\\n]", "").toUpperCase();
        log.info("[FONLAR] Fon cashflow AJAX isteniyor [code={}]", sanitized);
        return fonlarService.getFundCashflow(sanitized);
    }

    /**
     * Fon yatirimci sayisi gecmisini JSON olarak doner.
     *
     * <p>Fon detay sayfasindaki yatirimci sayisi grafigi icin
     * AJAX endpoint'i olarak kullanilir.</p>
     *
     * @param code TEFAS fon kodu (orn: "AAJ")
     * @return yatirimci sayisi zaman serisi listesi; gecersiz kod durumunda bos liste
     */
    @GetMapping("/ajax/fonlar/{code}/investors")
    @ResponseBody
    public List<FundTimeSeriesDto> getInvestors(@PathVariable String code) {
        if (code == null || code.length() > 10 || !code.matches("[a-zA-Z0-9]+")) {
            return List.of();
        }
        String sanitized = code.replaceAll("[\\r\\n]", "").toUpperCase();
        log.info("[FONLAR] Fon investors AJAX isteniyor [code={}]", sanitized);
        return fonlarService.getFundInvestors(sanitized);
    }

    // ── Download Endpoints ─────────────────────────────────

    /**
     * Fon PDF raporunu indirir.
     *
     * <p>scyborsaApi'den fon PDF raporunu alir ve tarayiciya
     * attachment olarak sunar.</p>
     *
     * @param code TEFAS fon kodu (orn: "AAJ")
     * @return PDF dosyasi; bulunamazsa 404, gecersiz kodda 400
     */
    @GetMapping("/fonlar/{code}/pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable String code) {
        if (code == null || code.length() > 10 || !code.matches("[a-zA-Z0-9]+")) {
            return ResponseEntity.badRequest().build();
        }
        String sanitized = code.replaceAll("[\\r\\n]", "").toUpperCase();
        log.info("[FONLAR] Fon PDF indirme isteniyor [code={}]", sanitized);

        byte[] data = fonlarService.getFundPdf(sanitized);
        if (data == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + sanitized + "_report.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(data);
    }

    /**
     * Fon fiyat gecmisini CSV dosyasi olarak indirir.
     *
     * <p>scyborsaApi'den fon fiyat gecmisini CSV formatinda alir
     * ve tarayiciya attachment olarak sunar.</p>
     *
     * @param code TEFAS fon kodu (orn: "AAJ")
     * @return CSV dosyasi; bulunamazsa 404, gecersiz kodda 400
     */
    @GetMapping("/fonlar/{code}/history/csv")
    public ResponseEntity<byte[]> downloadCsv(@PathVariable String code) {
        if (code == null || code.length() > 10 || !code.matches("[a-zA-Z0-9]+")) {
            return ResponseEntity.badRequest().build();
        }
        String sanitized = code.replaceAll("[\\r\\n]", "").toUpperCase();
        log.info("[FONLAR] Fon CSV indirme isteniyor [code={}]", sanitized);

        byte[] data = fonlarService.getFundCsv(sanitized);
        if (data == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + sanitized + "_history.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(data);
    }
}
