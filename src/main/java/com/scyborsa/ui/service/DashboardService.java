package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.DashboardSentimentDto;
import com.scyborsa.ui.dto.GlobalMarketDto;
import com.scyborsa.ui.dto.IndexPerformanceDto;
import com.scyborsa.ui.dto.MoneyFlowResponse;
import com.scyborsa.ui.dto.SectorSummaryDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Dashboard UI servis sinifi.
 *
 * <p>scyborsaApi'deki dashboard endpoint'lerini WebClient ile cagirarak
 * piyasa sentiment ve endeks performans verilerini getirir.</p>
 *
 * <p>Her endpoint icin volatile cache bulunur (30s TTL). SSR + hemen arkasindan
 * gelen AJAX isteklerinde double-fetch engeller. Locking yok — worst case
 * 2 concurrent fetch, zararsiz.</p>
 */
@Slf4j
@Service
public class DashboardService {

    /** UI-side cache TTL — 30 saniye. API cache'den kisa, SSR+AJAX double-fetch engeli. */
    private static final long UI_CACHE_TTL_MS = 30_000L;

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /** Sektor verilerini saglayan servis. */
    private final SectorService sectorService;

    // --- Volatile cache alanlari ---
    private volatile DashboardSentimentDto cachedSentiment;
    private volatile long sentimentCacheTs;
    private volatile List<IndexPerformanceDto> cachedIndexes;
    private volatile long indexesCacheTs;
    private volatile List<GlobalMarketDto> cachedGlobalMarkets;
    private volatile long globalMarketsCacheTs;
    private volatile List<SectorSummaryDto> cachedSectors;
    private volatile long sectorsCacheTs;

    /**
     * Constructor -- WebClient.Builder ve SectorService inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     * @param sectorService sektor verileri servisi
     */
    public DashboardService(WebClient.Builder webClientBuilder, SectorService sectorService) {
        this.webClient = webClientBuilder.build();
        this.sectorService = sectorService;
    }

    /**
     * Piyasa sentiment verilerini getirir.
     *
     * <p>scyborsaApi'deki {@code /api/v1/dashboard/sentiment} endpoint'ini
     * cagirarak kisa, orta ve uzun vadeli sentiment yuzde degerlerini doner.</p>
     *
     * @return sentiment verileri; hata durumunda tum degerleri 0.0 olan fallback DTO
     */
    public DashboardSentimentDto getSentiment() {
        long now = System.currentTimeMillis();
        if (cachedSentiment != null && (now - sentimentCacheTs) < UI_CACHE_TTL_MS) {
            log.debug("[DASHBOARD-UI] Sentiment cache hit");
            return cachedSentiment;
        }
        log.debug("[DASHBOARD-UI] Sentiment verileri isteniyor");
        try {
            DashboardSentimentDto result = webClient.get()
                    .uri(ScyborsaApiEndpoints.DASHBOARD_SENTIMENT)
                    .retrieve()
                    .bodyToMono(DashboardSentimentDto.class)
                    .block(Duration.ofSeconds(10));
            DashboardSentimentDto value = result != null ? result : emptySentiment();
            cachedSentiment = value;
            sentimentCacheTs = System.currentTimeMillis();
            return value;
        } catch (Exception e) {
            log.warn("[DASHBOARD-UI] Sentiment verileri alinamadi, fallback kullaniliyor", e);
            if (cachedSentiment != null) {
                sentimentCacheTs = System.currentTimeMillis();
                return cachedSentiment;
            }
            return emptySentiment();
        }
    }

    /**
     * Endeks performans verilerini getirir.
     *
     * <p>scyborsaApi'deki {@code /api/v1/dashboard/indexes} endpoint'ini
     * cagirarak BIST endekslerinin son fiyat ve periyodik degisim
     * yuzde degerlerini doner.</p>
     *
     * @return endeks performans listesi; hata durumunda bos liste
     */
    public List<IndexPerformanceDto> getIndexPerformances() {
        long now = System.currentTimeMillis();
        if (cachedIndexes != null && (now - indexesCacheTs) < UI_CACHE_TTL_MS) {
            log.debug("[DASHBOARD-UI] Index performance cache hit");
            return cachedIndexes;
        }
        log.debug("[DASHBOARD-UI] Index performance verileri isteniyor");
        try {
            List<IndexPerformanceDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.DASHBOARD_INDEXES)
                    .retrieve()
                    .bodyToFlux(IndexPerformanceDto.class)
                    .collectList()
                    .block(Duration.ofSeconds(10));
            List<IndexPerformanceDto> value = result != null ? result : Collections.emptyList();
            cachedIndexes = value;
            indexesCacheTs = System.currentTimeMillis();
            return value;
        } catch (Exception e) {
            log.warn("[DASHBOARD-UI] Index performance verileri alinamadi", e);
            if (cachedIndexes != null) {
                indexesCacheTs = System.currentTimeMillis();
                return cachedIndexes;
            }
            return Collections.emptyList();
        }
    }

    /**
     * Para akisi (money flow) verilerini getirir.
     *
     * <p>scyborsaApi'deki {@code /api/v1/money-flow} endpoint'ini
     * cagirarak para girisi ve cikisi olan hisse listelerini doner.</p>
     *
     * @return para akisi verileri; hata durumunda bos listeler iceren fallback DTO
     */
    public MoneyFlowResponse getMoneyFlow() {
        log.debug("[DASHBOARD-UI] Money flow verileri isteniyor");
        try {
            MoneyFlowResponse result = webClient.get()
                    .uri(ScyborsaApiEndpoints.MONEY_FLOW)
                    .retrieve()
                    .bodyToMono(MoneyFlowResponse.class)
                    .block(Duration.ofSeconds(10));
            return result != null ? result : emptyMoneyFlow();
        } catch (Exception e) {
            log.warn("[DASHBOARD-UI] Money flow verileri alinamadi, fallback kullaniliyor", e);
            return emptyMoneyFlow();
        }
    }

    /**
     * Global piyasa verilerini getirir.
     *
     * <p>scyborsaApi'deki {@code /api/v1/dashboard/global-markets} endpoint'ini
     * cagirarak dolar, euro, altin, petrol gibi global enstrumanlarin
     * guncel fiyat ve degisim bilgilerini doner.</p>
     *
     * @return global piyasa listesi; hata durumunda bos liste
     */
    public List<GlobalMarketDto> getGlobalMarkets() {
        long now = System.currentTimeMillis();
        if (cachedGlobalMarkets != null && (now - globalMarketsCacheTs) < UI_CACHE_TTL_MS) {
            log.debug("[DASHBOARD-UI] Global market cache hit");
            return cachedGlobalMarkets;
        }
        log.debug("[DASHBOARD-UI] Global market verileri isteniyor");
        try {
            List<GlobalMarketDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.DASHBOARD_GLOBAL_MARKETS)
                    .retrieve()
                    .bodyToFlux(GlobalMarketDto.class)
                    .collectList()
                    .block(Duration.ofSeconds(10));
            List<GlobalMarketDto> value = result != null ? result : Collections.emptyList();
            cachedGlobalMarkets = value;
            globalMarketsCacheTs = System.currentTimeMillis();
            return value;
        } catch (Exception e) {
            log.warn("[DASHBOARD-UI] Global market verileri alinamadi", e);
            if (cachedGlobalMarkets != null) {
                globalMarketsCacheTs = System.currentTimeMillis();
                return cachedGlobalMarkets;
            }
            return Collections.emptyList();
        }
    }

    /**
     * En iyi performans gosteren 5 sektoru getirir.
     *
     * <p>Tek API cagrisindan donen sektor listesini avgChangePercent'e gore
     * azalan sirada siralar ve ilk 5 tanesini doner.</p>
     *
     * @param allSectors onceden cekilmis sektor listesi
     * @return en iyi 5 sektor
     */
    public List<SectorSummaryDto> getTopSectors(List<SectorSummaryDto> allSectors) {
        return allSectors.stream()
                .sorted(Comparator.comparingDouble(SectorSummaryDto::getAvgChangePercent).reversed())
                .limit(5)
                .collect(Collectors.toList());
    }

    /**
     * En kotu performans gosteren 5 sektoru getirir.
     *
     * <p>Tek API cagrisindan donen sektor listesini avgChangePercent'e gore
     * artan sirada siralar ve ilk 5 tanesini doner.</p>
     *
     * @param allSectors onceden cekilmis sektor listesi
     * @return en kotu 5 sektor
     */
    public List<SectorSummaryDto> getBottomSectors(List<SectorSummaryDto> allSectors) {
        return allSectors.stream()
                .sorted(Comparator.comparingDouble(SectorSummaryDto::getAvgChangePercent))
                .limit(5)
                .collect(Collectors.toList());
    }

    /**
     * Tum sektor ozetlerini getirir (tek API cagrisi).
     *
     * @return sektor ozet listesi; hata durumunda bos liste
     */
    public List<SectorSummaryDto> getSectorSummaries() {
        long now = System.currentTimeMillis();
        if (cachedSectors != null && (now - sectorsCacheTs) < UI_CACHE_TTL_MS) {
            log.debug("[DASHBOARD-UI] Sektor ozetleri cache hit");
            return cachedSectors;
        }
        try {
            List<SectorSummaryDto> value = sectorService.getSectorSummaries();
            cachedSectors = value;
            sectorsCacheTs = System.currentTimeMillis();
            return value;
        } catch (Exception e) {
            log.warn("[DASHBOARD-UI] Sektor ozetleri alinamadi", e);
            if (cachedSectors != null) {
                sectorsCacheTs = System.currentTimeMillis();
                return cachedSectors;
            }
            return Collections.emptyList();
        }
    }

    /**
     * Bos sentiment DTO olusturur.
     *
     * <p>API erisim hatasi veya null yanit durumunda kullanilir.
     * Tum yuzde degerleri 0.0, toplam hisse 0 olarak doner.</p>
     *
     * @return tum degerleri sifir olan fallback sentiment DTO
     */
    private DashboardSentimentDto emptySentiment() {
        return DashboardSentimentDto.builder()
                .kisaVadeli(0.0)
                .ortaVadeli(0.0)
                .uzunVadeli(0.0)
                .toplamHisse(0)
                .timestamp("")
                .build();
    }

    /**
     * Bos money flow DTO olusturur.
     *
     * <p>API erisim hatasi veya null yanit durumunda kullanilir.
     * Inflow ve outflow listeleri bos olarak doner.</p>
     *
     * @return bos listeler iceren fallback money flow DTO
     */
    private MoneyFlowResponse emptyMoneyFlow() {
        return new MoneyFlowResponse(Collections.emptyList(), Collections.emptyList());
    }
}
