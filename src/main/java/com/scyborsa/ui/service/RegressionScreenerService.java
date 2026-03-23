package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.Map;

/**
 * Regresyon kanali tarama (Regression Screener) UI servis sinifi.
 *
 * <p>scyborsaApi'deki regresyon kanali tarama endpoint'ini WebClient ile cagirarak
 * tespit edilen regresyon kanali verilerini getirir. Sonuc olarak regresyon listesi
 * ve toplam sayi iceren bir Map doner.</p>
 *
 * @see com.scyborsa.ui.dto.RegressionChannelDto
 */
@Slf4j
@Service
public class RegressionScreenerService {

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public RegressionScreenerService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Regresyon kanali tarama calistirir ve sonuclari doner.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/regression-screener/scan} endpoint'ini cagirir.
     * 20 saniye timeout kullanilir; regresyon verisi backend'de on-hesaplanmis (pre-computed)
     * oldugu icin daha kisa bir timeout yeterlidir.</p>
     *
     * @return regresyon kanali tarama sonuclari (regressions listesi + totalCount); hata durumunda bos map
     */
    public Map<String, Object> scan() {
        log.info("[REGRESSION-SCREENER-UI] Regresyon kanali tarama isteniyor");
        try {
            Map<String, Object> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.REGRESSION_SCREENER_SCAN)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block(Duration.ofSeconds(20));
            log.info("[REGRESSION-SCREENER-UI] Regresyon kanali tarama tamamlandi, sonuc: {}",
                    result != null ? result.getOrDefault("totalCount", 0) : 0);
            return result != null ? result : Collections.emptyMap();
        } catch (Exception e) {
            log.error("[REGRESSION-SCREENER-UI] Regresyon kanali tarama basarisiz", e);
            return Collections.emptyMap();
        }
    }
}
