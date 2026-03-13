package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.SectorStockDto;
import com.scyborsa.ui.dto.SectorSummaryDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

/**
 * Sektor hisse verileri UI servis sinifi.
 *
 * <p>scyborsaApi'deki {@code /api/v1/sector/{slug}} endpoint'ini WebClient ile
 * cagirarak sektor hisse verilerini getirir.</p>
 *
 * @see SectorStockDto
 * @see SectorSummaryDto
 */
@Slf4j
@Service
public class SectorService {

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public SectorService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Belirtilen sektore ait hisse verilerini scyborsaApi'den getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/sector/{slug}} endpoint'ini cagirir.</p>
     *
     * @param slug sektor slug degeri (or. "banks")
     * @return sektor hisse listesi; hata durumunda bos liste
     */
    public List<SectorStockDto> getSectorStocks(String slug) {
        String safeSlug = slug != null ? slug.replaceAll("[\\r\\n]", "_") : "null";
        log.info("[SECTOR-UI] Sektor hisseleri isteniyor: {}", safeSlug);
        try {
            List<SectorStockDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.SECTOR_STOCKS, slug)
                    .retrieve()
                    .bodyToFlux(SectorStockDto.class)
                    .collectList()
                    .block();
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[SECTOR-UI] Sektor hisseleri alinamadi: {}", safeSlug, e);
            return List.of();
        }
    }

    /**
     * Tum sektorlerin ozet istatistiklerini scyborsaApi'den getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/sector/summaries} endpoint'ini cagirir.
     * API tarafinda 120 saniye TTL cache vardir.</p>
     *
     * @return sektor ozet listesi; hata durumunda bos liste
     */
    public List<SectorSummaryDto> getSectorSummaries() {
        log.info("[SECTOR-UI] Sektor ozetleri isteniyor");
        try {
            List<SectorSummaryDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.SECTOR_SUMMARIES)
                    .retrieve()
                    .bodyToFlux(SectorSummaryDto.class)
                    .collectList()
                    .block();
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[SECTOR-UI] Sektor ozetleri alinamadi", e);
            return List.of();
        }
    }
}
