package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.FinansalOranUiDto;
import com.scyborsa.ui.service.TemelAnalizUiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Collections;
import java.util.List;

/**
 * Temel Analiz Tarama sayfa controller'ı.
 *
 * <p>{@code /temel-analiz} adresinde temel analiz tarama sayfasını sunar.
 * AJAX endpoint'i ile tüm finansal oranları döndürür, client-side'da
 * hisse bazında pivot ve filtre uygulanır.</p>
 *
 * @see TemelAnalizUiService
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class TemelAnalizUiController {

    /** Temel analiz verilerini sağlayan servis. */
    private final TemelAnalizUiService temelAnalizUiService;

    /**
     * Temel analiz tarama sayfasını görüntüler.
     *
     * <p>Boş sayfa döner, veriler AJAX ile yüklenir.</p>
     *
     * @return {@code "temel-analiz/temel-analiz-list"} template adı
     */
    @GetMapping("/temel-analiz")
    public String temelAnalizList() {
        log.info("[TEMEL-ANALIZ-UI] Temel analiz tarama sayfası isteniyor");
        return "temel-analiz/temel-analiz-list";
    }

    /**
     * Tüm finansal oranları JSON olarak döner.
     *
     * <p>Client-side'da hisse bazında pivot yapılarak F/K, PD/DD, ROE
     * gibi oranlar filtrelenir ve sıralanır.</p>
     *
     * @return finansal oran listesi; hata durumunda boş liste
     */
    @GetMapping("/ajax/temel-analiz/scan")
    @ResponseBody
    public ResponseEntity<List<FinansalOranUiDto>> ajaxTemelAnalizScan() {
        log.info("[TEMEL-ANALIZ-UI] Temel analiz tarama AJAX isteniyor");
        try {
            List<FinansalOranUiDto> result = temelAnalizUiService.getFinansalOranlar();
            log.info("[TEMEL-ANALIZ-UI] Temel analiz tarama sonucu: {} satır", result.size());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("[TEMEL-ANALIZ-UI] Temel analiz tarama hatası", e);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }
}
