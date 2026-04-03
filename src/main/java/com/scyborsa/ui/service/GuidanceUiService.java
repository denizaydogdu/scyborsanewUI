package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.GuidanceUiDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

/**
 * Şirket beklentileri (guidance) UI servis sınıfı.
 *
 * <p>scyborsaApi'deki guidance endpoint'lerini WebClient ile çağırarak
 * şirket beklenti verilerini getirir.</p>
 *
 * @see GuidanceUiDto
 * @see ScyborsaApiEndpoints
 */
@Slf4j
@Service
public class GuidanceUiService {

    /** API istekleri için timeout süresi. */
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    /** scyborsaApi'ye HTTP istekleri göndermek için kullanılan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafından sağlanan WebClient builder
     */
    public GuidanceUiService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Tüm şirket beklentilerini getirir.
     *
     * @return beklenti listesi; hata durumunda boş liste
     */
    public List<GuidanceUiDto> getGuidancelar() {
        log.debug("[GUIDANCE-UI] Guidance listesi isteniyor");
        try {
            List<GuidanceUiDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.GUIDANCE)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<GuidanceUiDto>>() {})
                    .timeout(TIMEOUT)
                    .block();
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[GUIDANCE-UI] Guidance listesi alınamadı: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Belirtilen hisse koduna ait şirket beklentilerini getirir.
     *
     * @param stockCode hisse kodu (örn. GARAN)
     * @return hisse bazlı beklenti listesi; hata durumunda boş liste
     */
    public List<GuidanceUiDto> getHisseGuidance(String stockCode) {
        log.debug("[GUIDANCE-UI] Hisse guidance isteniyor: {}", stockCode);
        try {
            List<GuidanceUiDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.GUIDANCE_BY_CODE, stockCode)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<GuidanceUiDto>>() {})
                    .timeout(TIMEOUT)
                    .block();
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[GUIDANCE-UI] Hisse guidance alınamadı: {} - {}", stockCode, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Belirtilen hisse icin raw guidance (beklentiler) metnini getirir.
     *
     * <p>API'deki raw endpoint'i cagirir, ham markdown metnini dondurur.
     * UI tarafinda JS ile HTML tabloya donusturulur.</p>
     *
     * @param stockCode hisse kodu (orn. THYAO)
     * @return ham beklenti metni; hata durumunda null
     */
    public String getRawGuidance(String stockCode) {
        log.debug("[GUIDANCE-UI] Raw guidance isteniyor: {}", stockCode);
        try {
            String result = webClient.get()
                    .uri(ScyborsaApiEndpoints.GUIDANCE_RAW, stockCode)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(TIMEOUT)
                    .block();
            return result;
        } catch (Exception e) {
            log.warn("[GUIDANCE-UI] Raw guidance alinamadi: {} - {}", stockCode, e.getMessage());
            return null;
        }
    }
}
