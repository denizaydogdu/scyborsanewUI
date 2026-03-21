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
 * Temettu bilgileri UI servis sinifi.
 *
 * <p>scyborsaApi'deki temettu endpoint'ini WebClient ile cagirarak
 * yaklasan temettu odemelerini getirir. Sonuc olarak temettu listesi
 * ve toplam sayi iceren bir Map doner.</p>
 *
 * @see com.scyborsa.ui.dto.DividendDto
 */
@Slf4j
@Service
public class DividendService {

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public DividendService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Yaklasan temettu bilgilerini getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/dividends} endpoint'ini cagirir.
     * 10 saniye timeout kullanilir. Hata durumunda bos map doner
     * (graceful degradation).</p>
     *
     * @return temettu verileri (dividends listesi + totalCount); hata durumunda bos map
     */
    public Map<String, Object> getDividends() {
        log.info("[DIVIDEND-UI] Temettu bilgileri isteniyor");
        try {
            Map<String, Object> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.DIVIDENDS)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block(Duration.ofSeconds(10));
            log.info("[DIVIDEND-UI] Temettu bilgileri alindi, sayi: {}",
                    result != null ? result.getOrDefault("totalCount", 0) : 0);
            return result != null ? result : Collections.emptyMap();
        } catch (Exception e) {
            log.error("[DIVIDEND-UI] Temettu bilgileri alinamadi", e);
            return Collections.emptyMap();
        }
    }
}
