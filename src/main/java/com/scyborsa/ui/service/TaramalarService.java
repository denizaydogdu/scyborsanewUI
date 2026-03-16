package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.TaramalarResponseDto;
import com.scyborsa.ui.dto.TaramaOzetDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;

/**
 * Taramalar (Screener sonuçları) UI servis sınıfı.
 *
 * <p>scyborsaApi'deki taramalar endpoint'ini WebClient ile çağırarak
 * tarama sonuçlarını, özet istatistikleri ve filtre seçeneklerini getirir.</p>
 *
 * @see TaramalarResponseDto
 */
@Slf4j
@Service
public class TaramalarService {

    /** scyborsaApi'ye HTTP istekleri göndermek için kullanılan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafından sağlanan WebClient builder
     */
    public TaramalarService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * API'den tarama sonuçlarını getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/taramalar} endpoint'ini çağırır.
     * Tarih aralığı, tarama adı ve hisse kodu filtre parametreleri desteklenir.</p>
     *
     * @param startDate başlangıç tarihi (YYYY-MM-DD formatında)
     * @param endDate   bitiş tarihi (YYYY-MM-DD formatında)
     * @param screener  tarama adı filtresi (opsiyonel)
     * @param stock     hisse kodu filtresi (opsiyonel)
     * @return tarama sonuçları; hata durumunda boş DTO
     */
    public TaramalarResponseDto getTaramalar(String startDate, String endDate, String screener, String stock) {
        log.debug("[TARAMALAR-UI] Taramalar isteniyor, startDate={}, endDate={}, screener={}, stock={}",
                startDate, endDate, screener, stock);
        try {
            TaramalarResponseDto result = webClient.get()
                    .uri(uriBuilder -> {
                        uriBuilder.path(ScyborsaApiEndpoints.TARAMALAR);
                        if (startDate != null && !startDate.isBlank()) {
                            uriBuilder.queryParam("startDate", startDate);
                        }
                        if (endDate != null && !endDate.isBlank()) {
                            uriBuilder.queryParam("endDate", endDate);
                        }
                        if (screener != null && !screener.isBlank()) {
                            uriBuilder.queryParam("screener", screener);
                        }
                        if (stock != null && !stock.isBlank()) {
                            uriBuilder.queryParam("stock", stock);
                        }
                        return uriBuilder.build();
                    })
                    .retrieve()
                    .bodyToMono(TaramalarResponseDto.class)
                    .block(Duration.ofSeconds(10));
            log.info("[TARAMALAR-UI] Taramalar alındı, sonuç sayısı: {}",
                    result != null && result.getTaramalar() != null ? result.getTaramalar().size() : 0);
            return result != null ? result : buildEmptyResponse();
        } catch (Exception e) {
            log.error("[TARAMALAR-UI] Taramalar alınamadı", e);
            return buildEmptyResponse();
        }
    }

    /**
     * Boş yanıt DTO'su oluşturur (hata durumu fallback).
     *
     * @return boş taramalar yanıtı
     */
    private TaramalarResponseDto buildEmptyResponse() {
        TaramalarResponseDto empty = new TaramalarResponseDto();
        empty.setTaramalar(Collections.emptyList());
        empty.setOzet(new TaramaOzetDto());
        empty.setScreenerNames(Collections.emptyList());
        empty.setToplamKart(0);
        return empty;
    }
}
