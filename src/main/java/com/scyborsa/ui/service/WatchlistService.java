package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.watchlist.WatchlistDto;
import com.scyborsa.ui.dto.watchlist.WatchlistStockDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Takip listesi UI servis sinifi.
 *
 * <p>scyborsaApi'deki watchlist endpoint'lerini WebClient ile cagirarak
 * takip listesi CRUD islemlerini ve hisse yonetim islemlerini yapar.</p>
 */
@Slf4j
@Service
public class WatchlistService {

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public WatchlistService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Kullanicinin tum takip listelerini getirir.
     *
     * @param userEmail kullanici email adresi
     * @return takip listesi listesi, hata durumunda bos liste
     */
    public List<WatchlistDto> getWatchlists(String userEmail) {
        try {
            List<WatchlistDto> result = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.WATCHLISTS)
                            .queryParam("email", userEmail)
                            .build())
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<WatchlistDto>>() {})
                    .block(Duration.ofSeconds(10));
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[WATCHLIST-UI] Takip listeleri alinamadi: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Yeni takip listesi olusturur.
     *
     * @param name        liste adi
     * @param description liste aciklamasi (opsiyonel)
     * @param userEmail   kullanici email adresi
     * @return olusturulan takip listesi DTO, hata durumunda null
     */
    public WatchlistDto createWatchlist(String name, String description, String userEmail) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("name", name);
            requestBody.put("description", description);

            return webClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.WATCHLISTS)
                            .queryParam("email", userEmail)
                            .build())
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(WatchlistDto.class)
                    .block(Duration.ofSeconds(10));
        } catch (Exception e) {
            log.warn("[WATCHLIST-UI] Takip listesi olusturulamadi (name={}, email={}): {}",
                    name, userEmail, e.getMessage());
            return null;
        }
    }

    /**
     * Mevcut bir takip listesini gunceller.
     *
     * @param id          takip listesi ID
     * @param name        yeni liste adi
     * @param description yeni liste aciklamasi (opsiyonel)
     * @param userEmail   kullanici email adresi
     * @return guncellenmis takip listesi DTO, hata durumunda null
     */
    public WatchlistDto updateWatchlist(Long id, String name, String description, String userEmail) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("name", name);
            requestBody.put("description", description);

            return webClient.put()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.WATCHLISTS + "/" + id)
                            .queryParam("email", userEmail)
                            .build())
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(WatchlistDto.class)
                    .block(Duration.ofSeconds(10));
        } catch (Exception e) {
            log.warn("[WATCHLIST-UI] Takip listesi guncellenemedi (id={}, email={}): {}",
                    id, userEmail, e.getMessage());
            return null;
        }
    }

    /**
     * Belirtilen takip listesini siler (soft delete).
     *
     * @param id        takip listesi ID
     * @param userEmail kullanici email adresi
     */
    public void deleteWatchlist(Long id, String userEmail) {
        try {
            webClient.delete()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.WATCHLISTS + "/" + id)
                            .queryParam("email", userEmail)
                            .build())
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block(Duration.ofSeconds(10));
        } catch (Exception e) {
            log.warn("[WATCHLIST-UI] Takip listesi silinemedi (id={}, email={}): {}",
                    id, userEmail, e.getMessage());
        }
    }

    /**
     * Belirtilen takip listesindeki hisseleri getirir.
     *
     * @param watchlistId takip listesi ID
     * @param userEmail   kullanici email adresi
     * @return hisse listesi, hata durumunda bos liste
     */
    public List<WatchlistStockDto> getWatchlistStocks(Long watchlistId, String userEmail) {
        try {
            List<WatchlistStockDto> result = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.WATCHLIST_STOCKS
                                    .replace("{id}", watchlistId.toString()))
                            .queryParam("email", userEmail)
                            .build())
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<WatchlistStockDto>>() {})
                    .block(Duration.ofSeconds(10));
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[WATCHLIST-UI] Takip listesi hisseleri alinamadi (watchlistId={}, email={}): {}",
                    watchlistId, userEmail, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Takip listesine yeni hisse ekler.
     *
     * @param watchlistId takip listesi ID
     * @param stockCode   hisse borsa kodu (orn: THYAO)
     * @param stockName   hisse adi
     * @param userEmail   kullanici email adresi
     * @return eklenen hisse DTO, hata durumunda null
     */
    public WatchlistStockDto addStock(Long watchlistId, String stockCode, String stockName, String userEmail) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("stockCode", stockCode);
            requestBody.put("stockName", stockName);

            return webClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.WATCHLIST_STOCKS
                                    .replace("{id}", watchlistId.toString()))
                            .queryParam("email", userEmail)
                            .build())
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(WatchlistStockDto.class)
                    .block(Duration.ofSeconds(10));
        } catch (Exception e) {
            log.warn("[WATCHLIST-UI] Hisse eklenemedi (watchlistId={}, stockCode={}, email={}): {}",
                    watchlistId, stockCode, userEmail, e.getMessage());
            return null;
        }
    }

    /**
     * Takip listesinden hisse cikarir.
     *
     * @param watchlistId takip listesi ID
     * @param stockCode   cikarilacak hisse borsa kodu
     * @param userEmail   kullanici email adresi
     */
    public void removeStock(Long watchlistId, String stockCode, String userEmail) {
        try {
            webClient.delete()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.WATCHLIST_STOCKS
                                    .replace("{id}", watchlistId.toString()) + "/" + stockCode)
                            .queryParam("email", userEmail)
                            .build())
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block(Duration.ofSeconds(10));
        } catch (Exception e) {
            log.warn("[WATCHLIST-UI] Hisse cikarilAmadi (watchlistId={}, stockCode={}, email={}): {}",
                    watchlistId, stockCode, userEmail, e.getMessage());
        }
    }

    /**
     * Takip listesindeki hisselerin siralamasini gunceller.
     *
     * @param watchlistId takip listesi ID
     * @param itemIds     yeni siradaki hisse ID listesi
     * @param userEmail   kullanici email adresi
     */
    public void reorderStocks(Long watchlistId, List<Long> itemIds, String userEmail) {
        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("itemIds", itemIds);

            webClient.put()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.WATCHLIST_STOCKS_REORDER
                                    .replace("{id}", watchlistId.toString()))
                            .queryParam("email", userEmail)
                            .build())
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block(Duration.ofSeconds(10));
        } catch (Exception e) {
            log.warn("[WATCHLIST-UI] Hisse siralanamadi (watchlistId={}, email={}): {}",
                    watchlistId, userEmail, e.getMessage());
        }
    }
}
