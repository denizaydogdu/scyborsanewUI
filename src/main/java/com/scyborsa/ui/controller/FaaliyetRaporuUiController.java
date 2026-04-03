package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.KapMcpHaberUiDto;
import com.scyborsa.ui.service.FaaliyetRaporuUiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Collections;
import java.util.List;

/**
 * Faaliyet raporları sayfası controller'ı.
 *
 * <p>KAP MCP üzerinden hisse bazlı faaliyet raporu arama işlemlerini
 * AJAX tabanlı olarak sunar. SSR sayfa boş yüklenir, JavaScript ile
 * arama yapılır.</p>
 *
 * @see FaaliyetRaporuUiService
 * @see KapMcpHaberUiDto
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class FaaliyetRaporuUiController {

    /** Hisse kodu doğrulama regex pattern (1-10 harf/rakam). */
    private static final String STOCK_CODE_PATTERN = "^[A-Za-z0-9]{1,10}$";

    /** Faaliyet raporu verilerini sağlayan servis. */
    private final FaaliyetRaporuUiService faaliyetRaporuUiService;

    /**
     * Faaliyet raporları listesi sayfasını görüntüler.
     *
     * <p>Boş sayfa döner, arama JavaScript ile AJAX üzerinden yapılır.</p>
     *
     * @return {@code "faaliyet-raporlari/faaliyet-raporlari-list"} template adı
     */
    @GetMapping("/faaliyet-raporlari")
    public String faaliyetRaporlariList() {
        return "faaliyet-raporlari/faaliyet-raporlari-list";
    }

    /**
     * Hisse koduna göre faaliyet raporlarını arar (AJAX).
     *
     * @param stockCode hisse kodu (örn. GARAN)
     * @return rapor listesi JSON
     */
    @GetMapping("/ajax/faaliyet-raporlari/search")
    @ResponseBody
    public ResponseEntity<List<KapMcpHaberUiDto>> searchFaaliyetRaporlari(
            @RequestParam String stockCode) {
        if (stockCode == null || !stockCode.matches(STOCK_CODE_PATTERN)) {
            log.warn("[FAALIYET] Geçersiz hisse kodu: {}", stockCode);
            return ResponseEntity.badRequest().body(Collections.emptyList());
        }
        String upperCode = stockCode.toUpperCase();
        log.debug("[FAALIYET] Arama: {}", upperCode);
        try {
            List<KapMcpHaberUiDto> results = faaliyetRaporuUiService.searchFaaliyetRaporlari(upperCode);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            log.warn("[FAALIYET] Arama hatası: {}", e.getMessage());
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    /**
     * Chunk ID'lerine göre rapor detay içeriğini getirir (AJAX).
     *
     * @param ids virgülle ayrılmış chunk ID listesi
     * @return detay içerik metni
     */
    @GetMapping("/ajax/faaliyet-raporlari/detay")
    @ResponseBody
    public ResponseEntity<String> getRaporDetay(@RequestParam String ids) {
        if (ids == null || ids.isBlank() || !ids.matches("^[0-9a-zA-Z,\\-_]{1,500}$")) {
            return ResponseEntity.badRequest().body("");
        }
        log.debug("[FAALIYET] Detay: {}", ids);
        try {
            String content = faaliyetRaporuUiService.getRaporDetay(ids);
            return ResponseEntity.ok(content != null ? content : "");
        } catch (Exception e) {
            log.warn("[FAALIYET] Detay hatası: {}", e.getMessage());
            return ResponseEntity.ok("");
        }
    }
}
