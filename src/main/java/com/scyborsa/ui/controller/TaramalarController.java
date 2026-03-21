package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.TaramalarResponseDto;
import com.scyborsa.ui.service.TaramalarService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/**
 * Taramalar (Screener sonuçları) sayfası controller'ı.
 *
 * <p>{@code /taramalar} URL'inde tarama sonuçlarını tarih aralığı,
 * tarama adı ve hisse kodu filtrelerine göre listeleyen sayfayı sunar.</p>
 *
 * @see TaramalarService
 * @see TaramalarResponseDto
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class TaramalarController {

    /** Tarama verilerini sağlayan servis. */
    private final TaramalarService taramalarService;

    /**
     * Taramalar sayfasını gösterir.
     *
     * <p>Tarih aralığı varsayılan olarak bugünün tarihini kullanır.
     * Opsiyonel tarama adı ve hisse kodu filtreleri desteklenir.</p>
     *
     * @param startDate başlangıç tarihi (YYYY-MM-DD, opsiyonel — varsayılan bugün)
     * @param endDate   bitiş tarihi (YYYY-MM-DD, opsiyonel — varsayılan bugün)
     * @param screener  tarama adı filtresi (opsiyonel)
     * @param stock        hisse kodu filtresi (opsiyonel)
     * @param groupByStock hisse bazlı gruplama (opsiyonel, varsayılan false)
     * @param model        Thymeleaf model
     * @return template adı
     */
    @GetMapping("/taramalar")
    public String taramalar(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String screener,
            @RequestParam(required = false) String stock,
            @RequestParam(required = false, defaultValue = "false") boolean groupByStock,
            Model model) {

        String today = LocalDate.now(ZoneId.of("Europe/Istanbul")).toString();
        if (startDate == null || startDate.isBlank()) startDate = today;
        if (endDate == null || endDate.isBlank()) endDate = today;

        // Tarih formatı doğrulama (log injection önlemi)
        if (startDate != null && !startDate.matches("\\d{4}-\\d{2}-\\d{2}")) {
            log.warn("[TARAMALAR-UI] Geçersiz startDate formatı, yok sayılıyor");
            startDate = today;
        }
        if (endDate != null && !endDate.matches("\\d{4}-\\d{2}-\\d{2}")) {
            log.warn("[TARAMALAR-UI] Geçersiz endDate formatı, yok sayılıyor");
            endDate = today;
        }

        // Metin parametrelerini sanitize et (max 50 karakter, kontrol karakterleri temizle)
        if (stock != null) {
            stock = stock.length() > 50 ? stock.substring(0, 50) : stock;
            stock = stock.replaceAll("[\\p{Cntrl}]", "");
        }
        if (screener != null) {
            screener = screener.length() > 50 ? screener.substring(0, 50) : screener;
            screener = screener.replaceAll("[\\p{Cntrl}]", "");
        }

        log.info("[TARAMALAR-UI] Taramalar sayfası istendi, startDate={}, endDate={}, screener={}, stock={}, groupByStock={}",
                startDate, endDate, screener, stock, groupByStock);

        TaramalarResponseDto response = taramalarService.getTaramalar(startDate, endDate, screener, stock, groupByStock);

        model.addAttribute("taramalar", response.getTaramalar() != null ? response.getTaramalar() : List.of());
        model.addAttribute("ozet", response.getOzet());
        model.addAttribute("screenerNames", response.getScreenerNames() != null ? response.getScreenerNames() : List.of());
        model.addAttribute("startDate", startDate);
        model.addAttribute("endDate", endDate);
        model.addAttribute("selectedScreener", screener != null ? screener : "");
        model.addAttribute("selectedStock", stock != null ? stock : "");
        model.addAttribute("toplamKart", response.getToplamKart());
        model.addAttribute("today", today);
        model.addAttribute("groupByStock", groupByStock);
        model.addAttribute("stockGroups", response.getStockGroups() != null ? response.getStockGroups() : List.of());

        return "taramalar/taramalar-list";
    }
}
