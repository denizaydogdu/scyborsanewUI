package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.HedefFiyatUiDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

/**
 * Hedef fiyat konsensüs UI servis sınıfı.
 *
 * <p>scyborsaApi'deki hedef fiyat endpoint'lerini WebClient ile çağırarak
 * aracı kurum hedef fiyat ve tavsiye verilerini getirir.</p>
 *
 * @see HedefFiyatUiDto
 * @see ScyborsaApiEndpoints
 */
@Slf4j
@Service
public class HedefFiyatUiService {

    /** API istekleri için timeout süresi. */
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    /** scyborsaApi'ye HTTP istekleri göndermek için kullanılan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor -- WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafından sağlanan WebClient builder
     */
    public HedefFiyatUiService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Belirtilen hisse koduna ait hedef fiyat listesini getirir.
     *
     * @param stockCode hisse kodu (örn. GARAN)
     * @return hedef fiyat listesi; hata durumunda boş liste
     */
    public List<HedefFiyatUiDto> getHisseHedefFiyatlar(String stockCode) {
        log.debug("[HEDEF-FIYAT-UI] Hisse hedef fiyat isteniyor: {}", stockCode);
        try {
            List<HedefFiyatUiDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.HEDEF_FIYAT_BY_CODE, stockCode)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<HedefFiyatUiDto>>() {})
                    .timeout(TIMEOUT)
                    .block();
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[HEDEF-FIYAT-UI] Hisse hedef fiyat alınamadı: {} - {}", stockCode, e.getMessage());
            return Collections.emptyList();
        }
    }
}
