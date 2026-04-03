package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.KapMcpHaberUiDto;
import com.scyborsa.ui.service.ArastirmaUiService;
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
 * Araştırma yazıları sayfası controller'ı.
 *
 * <p>KAP MCP üzerinden hisse bazlı araştırma ve haber arama işlemlerini
 * AJAX tabanlı olarak sunar. SSR sayfa boş yüklenir, JavaScript ile
 * arama yapılır.</p>
 *
 * @see ArastirmaUiService
 * @see KapMcpHaberUiDto
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class ArastirmaUiController {

    /** Hisse kodu doğrulama regex pattern (1-10 harf/rakam). */
    private static final String STOCK_CODE_PATTERN = "^[A-Za-z0-9]{1,10}$";

    /** Araştırma verilerini sağlayan servis. */
    private final ArastirmaUiService arastirmaUiService;

    /**
     * Araştırma yazıları listesi sayfasını görüntüler.
     *
     * <p>Boş sayfa döner, arama JavaScript ile AJAX üzerinden yapılır.</p>
     *
     * @return {@code "arastirmalar/arastirmalar-list"} template adı
     */
    @GetMapping("/arastirmalar")
    public String arastirmalarList() {
        return "arastirmalar/arastirmalar-list";
    }

    /**
     * Hisse koduna göre KAP haberlerini arar (AJAX).
     *
     * @param stockCode hisse kodu (örn. GARAN)
     * @return haber listesi JSON
     */
    @GetMapping("/ajax/arastirmalar/search")
    @ResponseBody
    public ResponseEntity<List<KapMcpHaberUiDto>> searchHaberleri(
            @RequestParam String stockCode) {
        if (stockCode == null || !stockCode.matches(STOCK_CODE_PATTERN)) {
            log.warn("[ARASTIRMA] Geçersiz hisse kodu: {}", stockCode);
            return ResponseEntity.badRequest().body(Collections.emptyList());
        }
        String upperCode = stockCode.toUpperCase();
        log.debug("[ARASTIRMA] Arama: {}", upperCode);
        try {
            List<KapMcpHaberUiDto> results = arastirmaUiService.searchHaberleri(upperCode);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            log.warn("[ARASTIRMA] Arama hatası: {}", e.getMessage());
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    /**
     * Chunk ID'lerine göre haber detay içeriğini getirir (AJAX).
     *
     * @param ids virgülle ayrılmış chunk ID listesi
     * @return detay içerik metni
     */
    @GetMapping("/ajax/arastirmalar/detay")
    @ResponseBody
    public ResponseEntity<String> getHaberDetay(@RequestParam String ids) {
        if (ids == null || ids.isBlank() || !ids.matches("^[0-9a-zA-Z,\\-_]{1,500}$")) {
            return ResponseEntity.badRequest().body("");
        }
        log.debug("[ARASTIRMA] Detay: {}", ids);
        try {
            String content = arastirmaUiService.getHaberDetay(ids);
            return ResponseEntity.ok(content != null ? content : "");
        } catch (Exception e) {
            log.warn("[ARASTIRMA] Detay hatası: {}", e.getMessage());
            return ResponseEntity.ok("");
        }
    }
}
