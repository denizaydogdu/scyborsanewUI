package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.HazirTaramalarResponseDto;
import com.scyborsa.ui.dto.PresetStrategyDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

/**
 * Hazir Taramalar (Preset Screener) UI servis sinifi.
 *
 * <p>scyborsaApi'deki hazir taramalar endpoint'lerini WebClient ile cagirarak
 * strateji listesi ve tarama sonuclarini getirir.</p>
 *
 * @see HazirTaramalarResponseDto
 * @see PresetStrategyDto
 */
@Slf4j
@Service
public class HazirTaramalarService {

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public HazirTaramalarService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Mevcut hazir tarama stratejilerinin listesini getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/hazir-taramalar/strategies} endpoint'ini cagirir.
     * 10 saniye timeout kullanilir; strateji listesi hafif bir JSON dizisidir ve
     * sunucu tarafinda filtreleme gerektirmez, bu nedenle kisa timeout yeterlidir.</p>
     *
     * @return strateji listesi; hata durumunda bos liste
     */
    public List<PresetStrategyDto> getStrategies() {
        log.info("[HAZIR-TARAMALAR-UI] Strateji listesi isteniyor");
        try {
            List<PresetStrategyDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.HAZIR_TARAMALAR_STRATEGIES)
                    .retrieve()
                    .bodyToFlux(PresetStrategyDto.class)
                    .collectList()
                    .block(Duration.ofSeconds(10));
            log.info("[HAZIR-TARAMALAR-UI] Strateji listesi alindi, sayi: {}",
                    result != null ? result.size() : 0);
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.error("[HAZIR-TARAMALAR-UI] Strateji listesi alinamadi", e);
            return Collections.emptyList();
        }
    }

    /**
     * Belirtilen strateji icin tarama calistirir ve sonuclari doner.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/hazir-taramalar/scan?strategy=...} endpoint'ini cagirir.
     * 15 saniye timeout kullanilir; tarama istegi sunucu tarafinda TradingView Scanner API
     * cagrisi + sonuc filtreleme + DTO donusumu icerdiginden strateji listesine gore
     * daha fazla isleme suresi gerektirir.</p>
     *
     * @param strategyCode strateji kodu (or. "volume_breakout")
     * @return tarama sonuclari; hata durumunda bos DTO
     */
    public HazirTaramalarResponseDto scan(String strategyCode) {
        String safeCode = strategyCode != null ? strategyCode.replaceAll("[\\r\\n]", "_") : "null";
        log.info("[HAZIR-TARAMALAR-UI] Tarama isteniyor, strateji={}", safeCode);
        try {
            HazirTaramalarResponseDto result = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.HAZIR_TARAMALAR_SCAN)
                            .queryParam("strategy", strategyCode)
                            .build())
                    .retrieve()
                    .bodyToMono(HazirTaramalarResponseDto.class)
                    .block(Duration.ofSeconds(15));
            log.info("[HAZIR-TARAMALAR-UI] Tarama tamamlandi, strateji={}, sonuc={}",
                    safeCode, result != null ? result.getTotalCount() : 0);
            return result != null ? result : buildEmptyResponse();
        } catch (Exception e) {
            log.error("[HAZIR-TARAMALAR-UI] Tarama basarisiz, strateji={}", safeCode, e);
            return buildEmptyResponse();
        }
    }

    /**
     * Bos yanit DTO'su olusturur (hata durumu fallback).
     *
     * @return bos hazir taramalar yaniti
     */
    private HazirTaramalarResponseDto buildEmptyResponse() {
        HazirTaramalarResponseDto empty = new HazirTaramalarResponseDto();
        empty.setStocks(Collections.emptyList());
        empty.setTotalCount(0);
        return empty;
    }
}
