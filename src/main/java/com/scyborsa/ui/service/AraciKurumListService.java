package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.AraciKurumAkdListDto;
import com.scyborsa.ui.dto.AraciKurumDetailDto;
import com.scyborsa.ui.dto.BrokerageTakasListDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Aracı kurum AKD dağılım listesi UI servis sınıfı.
 *
 * <p>scyborsaApi'deki aracı kurum AKD endpoint'ini WebClient ile çağırarak
 * piyasa geneli aracı kurum dağılım verilerini getirir.</p>
 *
 * @see AraciKurumAkdListDto
 * @see AraciKurumDetailDto
 */
@Slf4j
@Service
public class AraciKurumListService {

    /** UI cache süresi — 30 saniye. */
    private static final long UI_CACHE_TTL_MS = 30_000L;

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /* ---------- AKD Liste volatile cache ---------- */
    private volatile AraciKurumAkdListDto cachedList;
    private volatile long listCacheTs;
    private volatile String cachedDate;

    /* ---------- Takas Liste volatile cache ---------- */
    private volatile BrokerageTakasListDto cachedTakasList;
    private volatile long takasListCacheTs;

    /* ---------- AKD Detay per-key volatile cache ---------- */
    private final ConcurrentHashMap<String, AraciKurumDetailDto> detailCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> detailCacheTs = new ConcurrentHashMap<>();

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafından sağlanan WebClient builder
     */
    public AraciKurumListService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * API'den aracı kurum AKD dağılım listesini getirir (30s volatile cache).
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/araci-kurumlar/akd-list} endpoint'ini çağırır.
     * Opsiyonel tarih parametresi ile geçmiş tarih verisi sorgulanabilir.
     * Cache hit durumunda API çağrısı yapılmaz; hata durumunda stale cache döner.</p>
     *
     * @param date tarih (YYYY-MM-DD formatında, opsiyonel — null ise güncel veri)
     * @return aracı kurum AKD dağılım listesi; hata durumunda stale cache veya boş DTO
     */
    public AraciKurumAkdListDto getAraciKurumAkdList(String date) {
        long now = System.currentTimeMillis();
        String dateKey = date != null ? date : "";

        // Cache hit
        if (cachedList != null && dateKey.equals(cachedDate) && (now - listCacheTs) < UI_CACHE_TTL_MS) {
            log.debug("[ARACI-KURUM-UI] AKD listesi cache hit, date={}", date);
            return cachedList;
        }

        log.debug("[ARACI-KURUM-UI] AKD listesi isteniyor, date={}", date);
        try {
            AraciKurumAkdListDto result = fetchAkdList(date);
            // Update cache
            cachedList = result;
            cachedDate = dateKey;
            listCacheTs = System.currentTimeMillis();
            log.info("[ARACI-KURUM-UI] AKD listesi alındı, kurum sayısı: {}",
                    result != null ? result.getTotalCount() : 0);
            return result;
        } catch (Exception e) {
            log.error("[ARACI-KURUM-UI] Aracı kurum AKD listesi alınamadı", e);
            // Stale cache fallback — timestamp güncellenmez, TTL doğal expire olup retry tetikler
            if (cachedList != null) {
                log.warn("[ARACI-KURUM-UI] Stale cache döndürülüyor (liste)");
                return cachedList;
            }
            AraciKurumAkdListDto empty = new AraciKurumAkdListDto();
            empty.setItems(Collections.emptyList());
            empty.setTotalCount(0);
            return empty;
        }
    }

    /**
     * Belirli bir aracı kurumun hisse bazlı AKD detayını getirir (30s volatile cache).
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/araci-kurumlar/{code}/akd-detail} endpoint'ini çağırır.
     * Opsiyonel tarih parametresi ile geçmiş tarih verisi sorgulanabilir.
     * Cache hit durumunda API çağrısı yapılmaz; hata durumunda stale cache döner.</p>
     *
     * @param code kurum kodu (MLB, YKR vb.)
     * @param date opsiyonel tarih (YYYY-MM-DD)
     * @return hisse bazlı AKD dağılım verisi; hata durumunda stale cache veya boş DTO (asla null dönmez)
     */
    public AraciKurumDetailDto getAraciKurumDetail(String code, String date) {
        long now = System.currentTimeMillis();
        String cacheKey = code + "_" + (date != null ? date : "latest");

        // Cache hit
        Long ts = detailCacheTs.get(cacheKey);
        AraciKurumDetailDto cached = detailCache.get(cacheKey);
        if (cached != null && ts != null && (now - ts) < UI_CACHE_TTL_MS) {
            log.debug("[ARACI-KURUM-UI] AKD detay cache hit, key={}", cacheKey);
            return cached;
        }

        log.debug("[ARACI-KURUM-UI] AKD detay isteniyor, code={}, date={}", code, date);
        try {
            AraciKurumDetailDto result = fetchAkdDetail(code, date);
            // Update cache
            detailCache.put(cacheKey, result);
            detailCacheTs.put(cacheKey, System.currentTimeMillis());
            log.info("[ARACI-KURUM-UI] AKD detay alındı, code={}, hisse sayısı: {}",
                    code, result != null ? result.getStockCount() : 0);
            return result;
        } catch (Exception e) {
            log.error("[ARACI-KURUM-UI] Detay alınamadı (code={})", code, e);
            // Stale cache fallback — timestamp güncellenmez, TTL doğal expire olup retry tetikler
            if (cached != null) {
                log.warn("[ARACI-KURUM-UI] Stale cache döndürülüyor (detay, key={})", cacheKey);
                return cached;
            }
            AraciKurumDetailDto empty = new AraciKurumDetailDto();
            empty.setItems(Collections.emptyList());
            empty.setStockCount(0);
            return empty;
        }
    }

    /**
     * API'den araci kurum takas dagilim listesini getirir (30s volatile cache).
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/araci-kurumlar/takas-list} endpoint'ini cagirir.
     * Cache hit durumunda API cagrisi yapilmaz; hata durumunda stale cache doner.</p>
     *
     * @return araci kurum takas dagilim listesi; hata durumunda stale cache veya bos DTO
     */
    public BrokerageTakasListDto getTakasListesi() {
        long now = System.currentTimeMillis();

        // Cache hit
        if (cachedTakasList != null && (now - takasListCacheTs) < UI_CACHE_TTL_MS) {
            log.debug("[ARACI-KURUM-UI] Takas listesi cache hit");
            return cachedTakasList;
        }

        log.debug("[ARACI-KURUM-UI] Takas listesi isteniyor");
        try {
            BrokerageTakasListDto result = fetchTakasListesi();
            cachedTakasList = result;
            takasListCacheTs = System.currentTimeMillis();
            log.info("[ARACI-KURUM-UI] Takas listesi alindi, kurum sayisi: {}",
                    result != null ? result.getTotalCount() : 0);
            return result;
        } catch (Exception e) {
            log.error("[ARACI-KURUM-UI] Takas listesi alinamadi", e);
            // Stale cache fallback — timestamp güncellenmez, TTL doğal expire olup retry tetikler
            if (cachedTakasList != null) {
                log.warn("[ARACI-KURUM-UI] Stale cache donduruluyor (takas listesi)");
                return cachedTakasList;
            }
            BrokerageTakasListDto empty = new BrokerageTakasListDto();
            empty.setItems(Collections.emptyList());
            empty.setTotalCount(0);
            return empty;
        }
    }

    // ==================== Private fetch methods ====================

    /**
     * API'den aracı kurum AKD listesini çeker.
     *
     * @param date opsiyonel tarih
     * @return API yanıtı
     */
    private AraciKurumAkdListDto fetchAkdList(String date) {
        return webClient.get()
                .uri(uriBuilder -> {
                    uriBuilder.path(ScyborsaApiEndpoints.ARACI_KURUMLAR_AKD_LIST);
                    if (date != null && !date.isBlank()) {
                        uriBuilder.queryParam("date", date);
                    }
                    return uriBuilder.build();
                })
                .retrieve()
                .bodyToMono(AraciKurumAkdListDto.class)
                .block(Duration.ofSeconds(10));
    }

    /**
     * API'den araci kurum takas listesini ceker.
     *
     * @return API yaniti
     */
    private BrokerageTakasListDto fetchTakasListesi() {
        return webClient.get()
                .uri(ScyborsaApiEndpoints.ARACI_KURUMLAR_TAKAS_LIST)
                .retrieve()
                .bodyToMono(BrokerageTakasListDto.class)
                .block(Duration.ofSeconds(10));
    }

    /**
     * API'den aracı kurum AKD detayını çeker.
     *
     * @param code kurum kodu
     * @param date opsiyonel tarih
     * @return API yanıtı
     */
    private AraciKurumDetailDto fetchAkdDetail(String code, String date) {
        String path = ScyborsaApiEndpoints.ARACI_KURUM_AKD_DETAIL.replace("{code}", code);
        return webClient.get()
                .uri(uriBuilder -> {
                    uriBuilder.path(path);
                    if (date != null && !date.isBlank()) {
                        uriBuilder.queryParam("date", date);
                    }
                    return uriBuilder.build();
                })
                .retrieve()
                .bodyToMono(AraciKurumDetailDto.class)
                .block(Duration.ofSeconds(10));
    }
}
