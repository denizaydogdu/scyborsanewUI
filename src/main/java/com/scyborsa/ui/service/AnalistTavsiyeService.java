package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.AnalistTavsiyeDto;
import com.scyborsa.ui.dto.AraciKurumTahminUiDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

/**
 * Analist tavsiye verileri UI servis sinifi.
 *
 * <p>scyborsaApi'deki analist tavsiye endpoint'ini WebClient ile cagirarak
 * tavsiye verilerini getirir.</p>
 *
 * @see AnalistTavsiyeDto
 */
@Slf4j
@Service
public class AnalistTavsiyeService {

    /** API istekleri için timeout süresi. */
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public AnalistTavsiyeService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * scyborsaApi'den tum analist tavsiyelerini getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/analyst-ratings} endpoint'ini cagirir.</p>
     *
     * @return analist tavsiye listesi; hata durumunda bos liste
     */
    public List<AnalistTavsiyeDto> getAnalistTavsiyeleri() {
        log.debug("[TAVSIYE-UI] Analist tavsiyeleri isteniyor");
        try {
            List<AnalistTavsiyeDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.ANALYST_RATINGS)
                    .retrieve()
                    .bodyToFlux(AnalistTavsiyeDto.class)
                    .collectList()
                    .block();
            log.info("[TAVSIYE-UI] {} tavsiye alindi", result != null ? result.size() : 0);
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[TAVSIYE-UI] Analist tavsiye getirme basarisiz: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Belirli bir hisse koduna ait analist tavsiyelerini getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/analyst-ratings/{stockCode}} endpoint'ini cagirir.</p>
     *
     * @param stockCode hisse kodu (BIST ticker, ornek: PETKM)
     * @return tavsiye listesi; hata durumunda bos liste
     */
    public List<AnalistTavsiyeDto> getAnalistTavsiyeleriByCode(String stockCode) {
        log.debug("[TAVSIYE-UI] Hisse kodu ile tavsiye isteniyor: {}", stockCode);
        try {
            List<AnalistTavsiyeDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.ANALYST_RATINGS_BY_CODE, stockCode)
                    .retrieve()
                    .bodyToFlux(AnalistTavsiyeDto.class)
                    .collectList()
                    .block();
            log.info("[TAVSIYE-UI] {} icin {} tavsiye alindi", stockCode, result != null ? result.size() : 0);
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[TAVSIYE-UI] Hisse tavsiye getirme basarisiz ({}): {}", stockCode, e.getMessage());
            return List.of();
        }
    }

    /**
     * Belirli bir hisse koduna ait aracı kurum tahminlerini (hedef fiyat) getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/hedef-fiyat/{stockCode}} endpoint'ini çağırır.</p>
     *
     * @param stockCode hisse kodu (BIST ticker, örnek: PETKM)
     * @return tahmin listesi; hata durumunda boş liste
     */
    public List<AraciKurumTahminUiDto> getTahminler(String stockCode) {
        log.debug("[TAVSIYE-UI] Tahminler isteniyor: {}", stockCode);
        try {
            List<AraciKurumTahminUiDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.HEDEF_FIYAT_BY_CODE, stockCode)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<AraciKurumTahminUiDto>>() {})
                    .timeout(TIMEOUT)
                    .block();
            log.info("[TAVSIYE-UI] {} icin {} tahmin alindi", stockCode, result != null ? result.size() : 0);
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[TAVSIYE-UI] Tahmin getirme basarisiz ({}): {}", stockCode, e.getMessage());
            return Collections.emptyList();
        }
    }
}
