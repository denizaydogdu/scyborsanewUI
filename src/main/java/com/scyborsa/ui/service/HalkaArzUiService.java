package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.HalkaArzUiDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

/**
 * Halka arz takvimi UI servis sınıfı.
 *
 * <p>scyborsaApi'deki halka arz endpoint'lerini WebClient ile çağırarak
 * halka arz verilerini getirir.</p>
 *
 * @see HalkaArzUiDto
 * @see ScyborsaApiEndpoints
 */
@Slf4j
@Service
public class HalkaArzUiService {

    /** API istekleri için timeout süresi. */
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    /** scyborsaApi'ye HTTP istekleri göndermek için kullanılan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafından sağlanan WebClient builder
     */
    public HalkaArzUiService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Tüm halka arz listesini getirir.
     *
     * @return halka arz listesi; hata durumunda boş liste
     */
    public List<HalkaArzUiDto> getHalkaArzlar() {
        log.debug("[HALKA-ARZ-UI] Tüm halka arzlar isteniyor");
        try {
            List<HalkaArzUiDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.HALKA_ARZ)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<HalkaArzUiDto>>() {})
                    .timeout(TIMEOUT)
                    .block();
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[HALKA-ARZ-UI] Halka arz listesi alınamadı: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Aktif halka arz listesini getirir.
     *
     * @return aktif halka arz listesi; hata durumunda boş liste
     */
    public List<HalkaArzUiDto> getAktifHalkaArzlar() {
        log.debug("[HALKA-ARZ-UI] Aktif halka arzlar isteniyor");
        try {
            List<HalkaArzUiDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.HALKA_ARZ_AKTIF)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<HalkaArzUiDto>>() {})
                    .timeout(TIMEOUT)
                    .block();
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[HALKA-ARZ-UI] Aktif halka arz listesi alınamadı: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
