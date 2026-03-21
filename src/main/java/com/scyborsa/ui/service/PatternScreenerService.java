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
 * Formasyon tarama (Pattern Screener) UI servis sinifi.
 *
 * <p>scyborsaApi'deki formasyon tarama endpoint'ini WebClient ile cagirarak
 * tespit edilen formasyonlari getirir. Sonuc olarak formasyon listesi ve
 * toplam sayi iceren bir Map doner.</p>
 *
 * @see com.scyborsa.ui.dto.PatternFormationDto
 */
@Slf4j
@Service
public class PatternScreenerService {

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public PatternScreenerService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Formasyon tarama calistirir ve sonuclari doner.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/pattern-screener/scan} endpoint'ini cagirir.
     * 35 saniye timeout kullanilir; Django API 30 saniye request timeout'a sahip oldugu icin
     * yeterli marj birakarak toplam bekleme suresi 35 saniye olarak belirlenmistir.</p>
     *
     * @return formasyon tarama sonuclari (patterns listesi + totalCount); hata durumunda bos map
     */
    public Map<String, Object> scan() {
        log.info("[PATTERN-SCREENER-UI] Formasyon tarama isteniyor");
        try {
            Map<String, Object> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.PATTERN_SCREENER_SCAN)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block(Duration.ofSeconds(35));
            log.info("[PATTERN-SCREENER-UI] Formasyon tarama tamamlandi, sonuc: {}",
                    result != null ? result.getOrDefault("totalCount", 0) : 0);
            return result != null ? result : Collections.emptyMap();
        } catch (Exception e) {
            log.error("[PATTERN-SCREENER-UI] Formasyon tarama basarisiz", e);
            return Collections.emptyMap();
        }
    }
}
