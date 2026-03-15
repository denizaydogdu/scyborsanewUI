package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.SectorStockDto;
import com.scyborsa.ui.dto.SectorSummaryDto;
import com.scyborsa.ui.service.SectorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

/**
 * Sektor sayfasi controller'i.
 *
 * <p>Iki sayfa sunar:</p>
 * <ul>
 *   <li>{@code /sektorler} -- Tum sektorlerin kart grid gorunumu</li>
 *   <li>{@code /sector/{slug}} -- Belirli bir sektorun hisse detay tablosu</li>
 * </ul>
 *
 * @see SectorService
 * @see SectorSummaryDto
 * @see SectorStockDto
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class SectorController {

    /** Sektor verilerini saglayan servis. */
    private final SectorService sectorService;

    /**
     * Sektor listeleme sayfasini goruntular.
     *
     * <p>44 sektorun kart grid goruntusunu saglar.
     * Her kart: icon, displayName, stockCount, avgChangePercent, description.</p>
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "sector/sector-list"} template adi
     */
    @GetMapping("/sektorler")
    public String sectorList(Model model) {
        List<SectorSummaryDto> sectors = sectorService.getSectorSummaries();
        model.addAttribute("sectors", sectors);
        return "sector/sector-list";
    }

    /**
     * Sektor detay sayfasini goruntular.
     *
     * <p>Belirtilen sektore ait hisse senetlerini tablo formatinda gosterir.
     * Slug dogrulama API tarafinda yapilir; gecersiz slug bos listeye neden olur.</p>
     *
     * @param slug  sektor slug degeri (orn. "bankacilik")
     * @param model Thymeleaf model nesnesi
     * @return {@code "sector/sector-detail"} template adi; gecersiz slug icin ana sayfaya yonlendirir
     */
    @GetMapping("/sector/{slug}")
    public String sectorDetail(@PathVariable String slug, Model model) {
        if (slug == null || slug.length() > 50) {
            return "redirect:/";
        }

        // Slug'i sanitize et (log injection onleme)
        String safeSlug = slug.replaceAll("[^a-z0-9\\-]", "");
        if (safeSlug.isEmpty()) {
            return "redirect:/";
        }

        List<SectorStockDto> stocks = sectorService.getSectorStocks(safeSlug);

        // Sektor bilgisini bulmak icin summary listesinden kontrol et
        List<SectorSummaryDto> summaries = sectorService.getSectorSummaries();
        SectorSummaryDto sectorInfo = summaries.stream()
                .filter(s -> s.getSlug().equals(safeSlug))
                .findFirst()
                .orElse(null);

        String sectorName = sectorInfo != null ? sectorInfo.getDisplayName() : safeSlug;

        model.addAttribute("sectorName", sectorName);
        model.addAttribute("sectorSlug", safeSlug);
        model.addAttribute("stocks", stocks);
        model.addAttribute("sectorInfo", sectorInfo);
        return "sector/sector-detail";
    }
}
