package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.SectorStockDto;
import com.scyborsa.ui.dto.SectorSummaryDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

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

    /**
     * UI tarafindaki cache TTL (milisaniye): 30 saniye.
     * API tarafinda 120 saniye TTL cache vardir,
     * UI cache sadece ayni anda birden fazla SSR isteginde double-fetch engeller.
     */
    private static final long UI_CACHE_TTL_MS = 30_000L;

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    // ==================== Volatile Cache: Summaries ====================
    private volatile List<SectorSummaryDto> cachedSummaries;
    private volatile long summariesCacheTs;

    // ==================== Volatile Cache: Stocks (per-slug) ====================
    private final ConcurrentHashMap<String, List<SectorStockDto>> cachedStocks = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> stocksCacheTs = new ConcurrentHashMap<>();

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public SectorService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Belirtilen sektore ait hisse verilerini scyborsaApi'den getirir (30s UI cache).
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/sector/{slug}} endpoint'ini cagirir.
     * Per-slug ConcurrentHashMap cache kullanir.</p>
     *
     * @param slug sektor slug degeri (or. "banks")
     * @return sektor hisse listesi; hata durumunda stale cache veya bos liste
     */
    public List<SectorStockDto> getSectorStocks(String slug) {
        String safeSlug = slug != null ? slug.replaceAll("[\\r\\n]", "_") : "null";
        long now = System.currentTimeMillis();
        Long ts = stocksCacheTs.get(safeSlug);
        List<SectorStockDto> cached = cachedStocks.get(safeSlug);
        if (cached != null && ts != null && (now - ts) < UI_CACHE_TTL_MS) {
            return cached;
        }
        try {
            List<SectorStockDto> result = fetchStocks(slug, safeSlug);
            cachedStocks.put(safeSlug, result);
            stocksCacheTs.put(safeSlug, System.currentTimeMillis());
            return result;
        } catch (Exception e) {
            log.warn("[SECTOR-UI] Sektor hisseleri alinamadi, stale cache kullaniliyor: {}", safeSlug, e);
            if (cached != null) {
                stocksCacheTs.put(safeSlug, System.currentTimeMillis());
                return cached;
            }
            return List.of();
        }
    }

    /**
     * Tum sektorlerin ozet istatistiklerini scyborsaApi'den getirir (30s UI cache).
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/sector/summaries} endpoint'ini cagirir.
     * API tarafinda 120 saniye TTL cache vardir.</p>
     *
     * @return sektor ozet listesi; hata durumunda stale cache veya bos liste
     */
    public List<SectorSummaryDto> getSectorSummaries() {
        long now = System.currentTimeMillis();
        if (cachedSummaries != null && (now - summariesCacheTs) < UI_CACHE_TTL_MS) {
            return cachedSummaries;
        }
        try {
            List<SectorSummaryDto> result = fetchSummaries();
            cachedSummaries = result;
            summariesCacheTs = System.currentTimeMillis();
            return result;
        } catch (Exception e) {
            log.warn("[SECTOR-UI] Sektor ozetleri alinamadi, stale cache kullaniliyor", e);
            if (cachedSummaries != null) {
                summariesCacheTs = System.currentTimeMillis();
                return cachedSummaries;
            }
            return List.of();
        }
    }

    /**
     * Belirtilen slug'a ait sektor hisselerini API'den ceker.
     *
     * <p>Hata durumunda exception firlatir — caller'daki catch blogu
     * stale cache fallback ve timestamp bump yapar.</p>
     *
     * @param slug    sektor slug degeri
     * @param logTag  log mesajlari icin sanitize edilmis etiket
     * @return sektor hisse listesi (bos olabilir, null degildir)
     */
    private List<SectorStockDto> fetchStocks(String slug, String logTag) {
        log.debug("[SECTOR-UI] Sektor hisseleri isteniyor: {}", logTag);
        List<SectorStockDto> result = webClient.get()
                .uri(ScyborsaApiEndpoints.SECTOR_STOCKS, slug)
                .retrieve()
                .bodyToFlux(SectorStockDto.class)
                .collectList()
                .block(Duration.ofSeconds(15));
        return result != null ? result : List.of();
    }

    /**
     * Sektor ozetlerini API'den ceker.
     *
     * <p>Hata durumunda exception firlatir — caller'daki catch blogu
     * stale cache fallback ve timestamp bump yapar.</p>
     *
     * @return sektor ozet listesi (bos olabilir, null degildir)
     */
    private List<SectorSummaryDto> fetchSummaries() {
        log.debug("[SECTOR-UI] Sektor ozetleri isteniyor");
        List<SectorSummaryDto> result = webClient.get()
                .uri(ScyborsaApiEndpoints.SECTOR_SUMMARIES)
                .retrieve()
                .bodyToFlux(SectorSummaryDto.class)
                .collectList()
                .block(Duration.ofSeconds(10));
        return result != null ? result : List.of();
    }
}
