package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.HaberDetayDto;
import com.scyborsa.ui.dto.KapNewsResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

/**
 * KAP canli haber UI servis sinifi.
 *
 * <p>scyborsaApi'deki {@code /api/v1/kap/news}, {@code /api/v1/kap/market-news}
 * ve {@code /api/v1/kap/world-news} endpoint'lerini WebClient ile cagirarak haber verilerini getirir.</p>
 *
 * @see KapNewsResponseDto
 */
@Slf4j
@Service
public class KapNewsService {

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public KapNewsService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * scyborsaApi'den canli KAP haberlerini getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/kap/news} endpoint'ini cagirir.</p>
     *
     * @return KAP haber response; hata durumunda bos items listesi
     */
    public KapNewsResponseDto getKapNews() {
        return fetchFromApi(ScyborsaApiEndpoints.KAP_NEWS, "KAP-NEWS-UI");
    }

    /**
     * scyborsaApi'den piyasa haberlerini getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/kap/market-news} endpoint'ini cagirir.</p>
     *
     * @return piyasa haberleri response; hata durumunda bos items listesi
     */
    public KapNewsResponseDto getMarketNews() {
        return fetchFromApi(ScyborsaApiEndpoints.MARKET_NEWS, "MARKET-NEWS-UI");
    }

    /**
     * scyborsaApi'den dunya haberlerini getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/kap/world-news} endpoint'ini cagirir.</p>
     *
     * @return dunya haberleri response; hata durumunda bos items listesi
     */
    public KapNewsResponseDto getWorldNews() {
        return fetchFromApi(ScyborsaApiEndpoints.WORLD_NEWS, "WORLD-NEWS-UI");
    }

    /**
     * Haber detayini API'den ceker.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/kap/haber/{newsId}} endpoint'ini cagirir.
     * 404 veya baska hata durumunda {@code null} doner.</p>
     *
     * @param newsId TradingView haber kimligi
     * @return haber detayi veya {@code null} (bulunamadiysa)
     */
    public HaberDetayDto getHaberDetay(String newsId) {
        log.info("[HABER-DETAY-UI] Haber detay isteniyor [newsId={}]", newsId);
        try {
            return webClient.get()
                    .uri(ScyborsaApiEndpoints.HABER_DETAY, newsId)
                    .retrieve()
                    .bodyToMono(HaberDetayDto.class)
                    .block();
        } catch (Exception e) {
            log.warn("[HABER-DETAY-UI] Haber detay alinamadi [newsId={}]: {}", newsId, e.getMessage());
            return null;
        }
    }

    /**
     * scyborsaApi'deki haber endpoint'ini WebClient ile cagirir.
     *
     * <p>Ortak WebClient cagri, null guard ve hata yonetimi mantigi.</p>
     *
     * @param endpoint API endpoint yolu
     * @param logTag   log mesajlarinda kullanilacak etiket
     * @return haber response; hata durumunda bos items listesi
     */
    private KapNewsResponseDto fetchFromApi(String endpoint, String logTag) {
        log.info("[{}] Haberler isteniyor", logTag);
        try {
            KapNewsResponseDto result = webClient.get()
                    .uri(endpoint)
                    .retrieve()
                    .bodyToMono(KapNewsResponseDto.class)
                    .block();
            if (result == null || result.getItems() == null) {
                return emptyResponse();
            }
            return result;
        } catch (Exception e) {
            log.error("[{}] Haberler alinamadi", logTag, e);
            return emptyResponse();
        }
    }

    /**
     * Bos KAP haber response olusturur.
     *
     * @return items alani bos liste olan response
     */
    private KapNewsResponseDto emptyResponse() {
        KapNewsResponseDto empty = new KapNewsResponseDto();
        empty.setItems(List.of());
        return empty;
    }
}
