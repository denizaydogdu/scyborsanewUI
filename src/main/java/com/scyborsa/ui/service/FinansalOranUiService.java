package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.FinansalOranUiDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

/**
 * Finansal oran verileri UI servis sınıfı.
 *
 * <p>scyborsaApi'deki finansal oran endpoint'ini WebClient ile çağırarak
 * temel analiz verilerini getirir. Hazır taramalar 5. bölümde kullanılır.</p>
 *
 * @see FinansalOranUiDto
 * @see ScyborsaApiEndpoints
 */
@Slf4j
@Service
public class FinansalOranUiService {

    /** API istekleri için timeout süresi. */
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    /** scyborsaApi'ye HTTP istekleri göndermek için kullanılan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafından sağlanan WebClient builder
     */
    public FinansalOranUiService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Tüm finansal oranları getirir.
     *
     * @return finansal oran listesi; hata durumunda boş liste
     */
    public List<FinansalOranUiDto> getFinansalOranlar() {
        log.debug("[FINANSAL-ORAN-UI] Finansal oranlar isteniyor");
        try {
            List<FinansalOranUiDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.FINANSAL_ORAN)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<FinansalOranUiDto>>() {})
                    .timeout(TIMEOUT)
                    .block();
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[FINANSAL-ORAN-UI] Finansal oranlar alınamadı: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
