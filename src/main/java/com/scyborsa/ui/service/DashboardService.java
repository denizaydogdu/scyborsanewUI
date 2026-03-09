package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.DashboardSentimentDto;
import com.scyborsa.ui.dto.IndexPerformanceDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Collections;
import java.util.List;

/**
 * Dashboard UI servis sinifi.
 *
 * <p>scyborsaApi'deki dashboard endpoint'lerini WebClient ile cagirarak
 * piyasa sentiment ve endeks performans verilerini getirir.</p>
 */
@Slf4j
@Service
public class DashboardService {

    private final WebClient webClient;

    /**
     * Constructor -- WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public DashboardService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
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
        log.debug("[DASHBOARD-UI] Sentiment verileri isteniyor");
        try {
            DashboardSentimentDto result = webClient.get()
                    .uri(ScyborsaApiEndpoints.DASHBOARD_SENTIMENT)
                    .retrieve()
                    .bodyToMono(DashboardSentimentDto.class)
                    .block();
            return result != null ? result : emptySentiment();
        } catch (Exception e) {
            log.warn("[DASHBOARD-UI] Sentiment verileri alinamadi, fallback kullaniliyor", e);
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
        log.debug("[DASHBOARD-UI] Index performance verileri isteniyor");
        try {
            List<IndexPerformanceDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.DASHBOARD_INDEXES)
                    .retrieve()
                    .bodyToFlux(IndexPerformanceDto.class)
                    .collectList()
                    .block();
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[DASHBOARD-UI] Index performance verileri alinamadi", e);
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
}
