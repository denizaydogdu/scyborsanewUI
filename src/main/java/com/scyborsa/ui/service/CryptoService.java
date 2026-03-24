package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.VApiEndpoints;
import com.scyborsa.ui.dto.CryptoFearGreedDto;
import com.scyborsa.ui.dto.CryptoGlobalDto;
import com.scyborsa.ui.dto.CryptoMarketDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Kripto para pazar verilerini vApi'den ceken servis.
 *
 * <p>WebClient ile vApi (api.velzon.tr) backend'ine proxy gorevini gorur.
 * CoinGecko, Binance ve Fear/Greed verilerini tüketir.</p>
 *
 * @see VApiEndpoints
 */
@Service
@Slf4j
public class CryptoService {

    private final WebClient webClient;

    /**
     * Constructor — vApi WebClient.Builder inject eder.
     *
     * @param vApiWebClientBuilder vApi base URL ile yapilandirilmis WebClient builder
     */
    public CryptoService(@Qualifier("vApiWebClientBuilder") WebClient.Builder vApiWebClientBuilder) {
        this.webClient = vApiWebClientBuilder.build();
    }

    /**
     * Top 100 kripto para pazar verilerini getirir.
     *
     * @return kripto para listesi, hata durumunda bos liste
     */
    public List<CryptoMarketDto> getMarkets() {
        log.info("[KRIPTO-UI] Market verisi isteniyor");
        try {
            List<CryptoMarketDto> result = webClient.get()
                    .uri(VApiEndpoints.CRYPTO_MARKETS)
                    .retrieve()
                    .bodyToFlux(CryptoMarketDto.class)
                    .collectList()
                    .block(Duration.ofSeconds(15));
            log.info("[KRIPTO-UI] Market verisi alindi, {} coin", result != null ? result.size() : 0);
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.error("[KRIPTO-UI] Market verisi alinamadi: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * 7 gunluk sparkline verilerini getirir (her coin icin 168 saatlik kapanis fiyati).
     *
     * @return coin ID -&gt; fiyat listesi map'i, hata durumunda bos map
     */
    public Map<String, List<Double>> getSparklines() {
        try {
            Map<String, List<Double>> result = webClient.get()
                    .uri(VApiEndpoints.CRYPTO_SPARKLINES)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, List<Double>>>() {})
                    .block(Duration.ofSeconds(15));
            log.debug("[KRIPTO-UI] Sparkline verisi alindi, {} coin", result != null ? result.size() : 0);
            return result != null ? result : Collections.emptyMap();
        } catch (Exception e) {
            log.error("[KRIPTO-UI] Sparkline verisi alinamadi: {}", e.getMessage());
            return Collections.emptyMap();
        }
    }

    /**
     * Kuresel kripto pazar verilerini getirir (toplam market cap, BTC dominance vb.).
     *
     * @return global pazar verileri, hata durumunda bos DTO
     */
    public CryptoGlobalDto getGlobalData() {
        try {
            CryptoGlobalDto result = webClient.get()
                    .uri(VApiEndpoints.CRYPTO_GLOBAL)
                    .retrieve()
                    .bodyToMono(CryptoGlobalDto.class)
                    .block(Duration.ofSeconds(10));
            return result != null ? result : new CryptoGlobalDto();
        } catch (Exception e) {
            log.error("[KRIPTO-UI] Global veri alinamadi: {}", e.getMessage());
            return new CryptoGlobalDto();
        }
    }

    /**
     * Fear and Greed endeksini getirir.
     *
     * @return fear/greed degeri ve siniflandirmasi, hata durumunda bos DTO
     */
    public CryptoFearGreedDto getFearGreed() {
        try {
            CryptoFearGreedDto result = webClient.get()
                    .uri(VApiEndpoints.CRYPTO_FEAR_GREED)
                    .retrieve()
                    .bodyToMono(CryptoFearGreedDto.class)
                    .block(Duration.ofSeconds(10));
            return result != null ? result : new CryptoFearGreedDto();
        } catch (Exception e) {
            log.error("[KRIPTO-UI] Fear & Greed verisi alinamadi: {}", e.getMessage());
            return new CryptoFearGreedDto();
        }
    }
}
