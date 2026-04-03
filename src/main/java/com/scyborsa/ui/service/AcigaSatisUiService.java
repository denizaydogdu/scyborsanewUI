package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.AcigaSatisUiDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

/**
 * Açığa satış verileri UI servis sınıfı.
 *
 * <p>scyborsaApi'deki açığa satış endpoint'ini WebClient ile çağırarak
 * günlük açığa satış istatistiklerini getirir.</p>
 *
 * @see AcigaSatisUiDto
 * @see ScyborsaApiEndpoints
 */
@Slf4j
@Service
public class AcigaSatisUiService {

    /** API istekleri için timeout süresi. */
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    /** scyborsaApi'ye HTTP istekleri göndermek için kullanılan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafından sağlanan WebClient builder
     */
    public AcigaSatisUiService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Günlük açığa satış istatistiklerini getirir.
     *
     * @return açığa satış listesi; hata durumunda boş liste
     */
    public List<AcigaSatisUiDto> getGunlukAcigaSatislar() {
        log.debug("[ACIGA-SATIS-UI] Günlük açığa satışlar isteniyor");
        try {
            List<AcigaSatisUiDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.ACIGA_SATIS)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<AcigaSatisUiDto>>() {})
                    .timeout(TIMEOUT)
                    .block();
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[ACIGA-SATIS-UI] Açığa satış listesi alınamadı: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
