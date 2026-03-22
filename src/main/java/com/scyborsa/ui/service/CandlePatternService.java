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
 * Mum formasyonu tarama UI servis sinifi.
 *
 * <p>scyborsaApi'deki mum formasyonu tarama endpoint'ini WebClient ile cagirarak
 * tespit edilen mum formasyonlarini getirir. Sonuc olarak hisse listesi ve
 * toplam sayi iceren bir Map doner.</p>
 *
 * @see com.scyborsa.ui.dto.CandlePatternStockDto
 */
@Slf4j
@Service
public class CandlePatternService {

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public CandlePatternService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Belirtilen periyot icin mum formasyonu tarama calistirir ve sonuclari doner.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/candle-patterns/scan?period=...} endpoint'ini cagirir.
     * 30 saniye timeout kullanilir; API tarafindaki tarama suresiyle eslestirilmistir.</p>
     *
     * @param period tarama periyodu (ornegin: 1D, 1H, 4H)
     * @return mum formasyonu tarama sonuclari (stocks listesi + totalCount + period); hata durumunda bos map
     */
    public Map<String, Object> scan(String period) {
        String safePeriod = period != null ? period.replaceAll("[\\r\\n]", "_") : "null";
        log.info("[CANDLE-PATTERN-UI] Mum formasyonu tarama isteniyor, periyot: {}", safePeriod);
        try {
            Map<String, Object> result = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.CANDLE_PATTERNS_SCAN)
                            .queryParam("period", period)
                            .build())
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block(Duration.ofSeconds(30));

            if (result != null) {
                Object totalCount = result.getOrDefault("totalCount", 0);
                log.info("[CANDLE-PATTERN-UI] Mum formasyonu tarama tamamlandi, sonuc: {}", totalCount);
            } else {
                log.warn("[CANDLE-PATTERN-UI] Mum formasyonu tarama bos sonuc dondu");
            }

            return result != null ? result : Collections.emptyMap();
        } catch (Exception e) {
            log.error("[CANDLE-PATTERN-UI] Mum formasyonu tarama basarisiz", e);
            return Collections.emptyMap();
        }
    }
}
