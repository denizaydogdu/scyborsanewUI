package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.SectorStockDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * BIST endeks hisse verileri UI servis sinifi.
 *
 * <p>scyborsaApi'deki BIST endeks endpoint'lerini WebClient ile cagirarak
 * BIST 100, BIST 50 ve BIST 30 hisse verilerini getirir.</p>
 *
 * @see SectorStockDto
 * @see ScyborsaApiEndpoints
 */
@Slf4j
@Service
public class Bist100Service {

    /**
     * UI tarafindaki cache TTL (milisaniye): 30 saniye.
     * API tarafinda seans disinda getDynamicOffhoursTTL ile uzun cache tutulur,
     * UI cache sadece ayni anda birden fazla SSR isteginde double-fetch engeller.
     */
    private static final long UI_CACHE_TTL_MS = 30_000L;

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    // ==================== Volatile Cache ====================
    private volatile List<SectorStockDto> cachedAllStocks;
    private volatile long allStocksCacheTs;
    private volatile List<SectorStockDto> cachedBist100;
    private volatile long bist100CacheTs;
    private volatile List<SectorStockDto> cachedBist50;
    private volatile long bist50CacheTs;
    private volatile List<SectorStockDto> cachedBist30;
    private volatile long bist30CacheTs;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public Bist100Service(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Tum BIST hisse verilerini getirir (30s UI cache + API dynamic cache).
     *
     * @return tum hisse listesi; hata durumunda bos liste
     */
    public List<SectorStockDto> getAllStocks() {
        long now = System.currentTimeMillis();
        if (cachedAllStocks != null && (now - allStocksCacheTs) < UI_CACHE_TTL_MS) {
            return cachedAllStocks;
        }
        try {
            List<SectorStockDto> result = fetchStocks(ScyborsaApiEndpoints.TUM_HISSELER, "TUM-HISSE");
            cachedAllStocks = result;
            allStocksCacheTs = System.currentTimeMillis();
            return result;
        } catch (Exception e) {
            log.warn("[TUM-HISSE-UI] Hisse listesi alinamadi, stale cache kullaniliyor", e);
            if (cachedAllStocks != null) allStocksCacheTs = System.currentTimeMillis();
            return cachedAllStocks != null ? cachedAllStocks : List.of();
        }
    }

    /**
     * BIST 100 endeksindeki hisse verilerini getirir (30s UI cache + API dynamic cache).
     *
     * @return BIST 100 hisse listesi; hata durumunda bos liste
     */
    public List<SectorStockDto> getBist100Stocks() {
        long now = System.currentTimeMillis();
        if (cachedBist100 != null && (now - bist100CacheTs) < UI_CACHE_TTL_MS) {
            return cachedBist100;
        }
        try {
            List<SectorStockDto> result = fetchStocks(ScyborsaApiEndpoints.BIST100, "BIST100");
            cachedBist100 = result;
            bist100CacheTs = System.currentTimeMillis();
            return result;
        } catch (Exception e) {
            log.warn("[BIST100-UI] Hisse listesi alinamadi, stale cache kullaniliyor", e);
            if (cachedBist100 != null) bist100CacheTs = System.currentTimeMillis();
            return cachedBist100 != null ? cachedBist100 : List.of();
        }
    }

    /**
     * BIST 50 endeksindeki hisse verilerini getirir (30s UI cache + API dynamic cache).
     *
     * @return BIST 50 hisse listesi; hata durumunda bos liste
     */
    public List<SectorStockDto> getBist50Stocks() {
        long now = System.currentTimeMillis();
        if (cachedBist50 != null && (now - bist50CacheTs) < UI_CACHE_TTL_MS) {
            return cachedBist50;
        }
        try {
            List<SectorStockDto> result = fetchStocks(ScyborsaApiEndpoints.BIST50, "BIST50");
            cachedBist50 = result;
            bist50CacheTs = System.currentTimeMillis();
            return result;
        } catch (Exception e) {
            log.warn("[BIST50-UI] Hisse listesi alinamadi, stale cache kullaniliyor", e);
            if (cachedBist50 != null) bist50CacheTs = System.currentTimeMillis();
            return cachedBist50 != null ? cachedBist50 : List.of();
        }
    }

    /**
     * BIST 30 endeksindeki hisse verilerini getirir (30s UI cache + API dynamic cache).
     *
     * @return BIST 30 hisse listesi; hata durumunda bos liste
     */
    public List<SectorStockDto> getBist30Stocks() {
        long now = System.currentTimeMillis();
        if (cachedBist30 != null && (now - bist30CacheTs) < UI_CACHE_TTL_MS) {
            return cachedBist30;
        }
        try {
            List<SectorStockDto> result = fetchStocks(ScyborsaApiEndpoints.BIST30, "BIST30");
            cachedBist30 = result;
            bist30CacheTs = System.currentTimeMillis();
            return result;
        } catch (Exception e) {
            log.warn("[BIST30-UI] Hisse listesi alinamadi, stale cache kullaniliyor", e);
            if (cachedBist30 != null) bist30CacheTs = System.currentTimeMillis();
            return cachedBist30 != null ? cachedBist30 : List.of();
        }
    }

    /**
     * Tum hisselerin logoid haritasini scyborsaApi'den getirir.
     *
     * <p>Ticker kodunu anahtar, TradingView logoid degerini value olarak iceren
     * bir harita doner. Hata durumunda bos harita doner.</p>
     *
     * @return ticker-logoid haritasi; hata durumunda bos harita
     */
    public Map<String, String> getStockLogos() {
        log.debug("[STOCK-LOGOS-UI] Hisse logoid haritasi isteniyor");
        try {
            Map<String, String> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.STOCK_LOGOS)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, String>>() {})
                    .block(Duration.ofSeconds(15));
            return result != null ? result : Collections.emptyMap();
        } catch (Exception e) {
            log.error("[STOCK-LOGOS-UI] Hisse logoid haritasi alinamadi", e);
            return Collections.emptyMap();
        }
    }

    /**
     * Belirtilen logoid'e ait SVG logo verisini scyborsaApi'den getirir.
     *
     * <p>API tarafinda ConcurrentHashMap cache vardir, dolayisiyla
     * CDN'e sadece ilk istek gider.</p>
     *
     * @param logoid TradingView logoid (orn. "turk-hava-yollari")
     * @return SVG byte dizisi veya null (hata durumunda)
     */
    public byte[] getStockLogoImage(String logoid) {
        try {
            return webClient.get()
                    .uri(ScyborsaApiEndpoints.STOCK_LOGO_IMG, logoid)
                    .retrieve()
                    .bodyToMono(byte[].class)
                    .block(Duration.ofSeconds(15));
        } catch (Exception e) {
            log.warn("[STOCK-LOGO-UI] Logo alinamadi: {} - {}", logoid, e.getMessage());
            return null;
        }
    }

    /**
     * Belirtilen dosya adina ait araci kurum logo verisini scyborsaApi'den getirir.
     *
     * <p>API tarafinda ConcurrentHashMap cache vardir, dolayisiyla
     * CDN'e sadece ilk istek gider.</p>
     *
     * @param filename logo dosya adi (orn. "alnus_yatirim_icon.png")
     * @return logo byte dizisi veya null (hata durumunda)
     */
    public byte[] getBrokerageLogoImage(String filename) {
        try {
            return webClient.get()
                    .uri(ScyborsaApiEndpoints.BROKERAGE_LOGO_IMG, filename)
                    .retrieve()
                    .bodyToMono(byte[].class)
                    .block(Duration.ofSeconds(15));
        } catch (Exception e) {
            log.warn("[BROKERAGE-LOGO-UI] Logo alinamadi: {} - {}", filename, e.getMessage());
            return null;
        }
    }

    /**
     * Belirtilen endpoint'ten hisse verilerini ceker.
     *
     * <p>Hata durumunda exception firlatir — caller'daki catch blogu
     * stale cache fallback ve timestamp bump yapar.</p>
     *
     * @param endpoint API endpoint yolu
     * @param logTag   log mesajlari icin etiket
     * @return hisse listesi (bos olabilir, null degildir)
     */
    private List<SectorStockDto> fetchStocks(String endpoint, String logTag) {
        log.debug("[{}-UI] Hisse listesi isteniyor", logTag);
        List<SectorStockDto> result = webClient.get()
                .uri(endpoint)
                .retrieve()
                .bodyToFlux(SectorStockDto.class)
                .collectList()
                .block(Duration.ofSeconds(15));
        return result != null ? result : List.of();
    }
}
