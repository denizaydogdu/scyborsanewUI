package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.SectorStockDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.reactive.function.client.WebClient;

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

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public Bist100Service(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Tum BIST hisse verilerini scyborsaApi'den getirir.
     *
     * @return tum hisse listesi; hata durumunda bos liste
     */
    public List<SectorStockDto> getAllStocks() {
        return fetchStocks(ScyborsaApiEndpoints.TUM_HISSELER, "TUM-HISSE");
    }

    /**
     * BIST 100 endeksindeki hisse verilerini scyborsaApi'den getirir.
     *
     * @return BIST 100 hisse listesi; hata durumunda bos liste
     */
    public List<SectorStockDto> getBist100Stocks() {
        return fetchStocks(ScyborsaApiEndpoints.BIST100, "BIST100");
    }

    /**
     * BIST 50 endeksindeki hisse verilerini scyborsaApi'den getirir.
     *
     * @return BIST 50 hisse listesi; hata durumunda bos liste
     */
    public List<SectorStockDto> getBist50Stocks() {
        return fetchStocks(ScyborsaApiEndpoints.BIST50, "BIST50");
    }

    /**
     * BIST 30 endeksindeki hisse verilerini scyborsaApi'den getirir.
     *
     * @return BIST 30 hisse listesi; hata durumunda bos liste
     */
    public List<SectorStockDto> getBist30Stocks() {
        return fetchStocks(ScyborsaApiEndpoints.BIST30, "BIST30");
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
                    .block();
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
                    .block();
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
                    .block();
        } catch (Exception e) {
            log.warn("[BROKERAGE-LOGO-UI] Logo alinamadi: {} - {}", filename, e.getMessage());
            return null;
        }
    }

    /**
     * Belirtilen endpoint'ten hisse verilerini ceker.
     *
     * @param endpoint API endpoint yolu
     * @param logTag   log mesajlari icin etiket
     * @return hisse listesi; hata durumunda bos liste
     */
    private List<SectorStockDto> fetchStocks(String endpoint, String logTag) {
        log.info("[{}-UI] Hisse listesi isteniyor", logTag);
        try {
            List<SectorStockDto> result = webClient.get()
                    .uri(endpoint)
                    .retrieve()
                    .bodyToFlux(SectorStockDto.class)
                    .collectList()
                    .block();
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[{}-UI] Hisse listesi alinamadi", logTag, e);
            return List.of();
        }
    }
}
