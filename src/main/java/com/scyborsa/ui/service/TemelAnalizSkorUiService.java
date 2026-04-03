package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.TemelAnalizSkorUiDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

/**
 * Temel analiz skoru UI servis sınıfı.
 *
 * <p>scyborsaApi'deki temel analiz skor endpoint'ini WebClient ile çağırarak
 * Piotroski F-Score, Altman Z-Score ve Graham marjı verilerini getirir.</p>
 *
 * @see TemelAnalizSkorUiDto
 * @see ScyborsaApiEndpoints
 */
@Slf4j
@Service
public class TemelAnalizSkorUiService {

    /** API istekleri için timeout süresi. */
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    /** scyborsaApi'ye HTTP istekleri göndermek için kullanılan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor -- WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafından sağlanan WebClient builder
     */
    public TemelAnalizSkorUiService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Belirtilen hisse koduna ait temel analiz skorlarını getirir.
     *
     * @param stockCode hisse kodu (örn. GARAN)
     * @return temel analiz skoru; hata durumunda boş DTO (tüm alanlar null), null dönmez
     */
    public TemelAnalizSkorUiDto getTemelAnalizSkor(String stockCode) {
        log.debug("[TEMEL-SKOR-UI] Temel analiz skor isteniyor: {}", stockCode);
        try {
            TemelAnalizSkorUiDto result = webClient.get()
                    .uri(ScyborsaApiEndpoints.TEMEL_ANALIZ_SKOR, stockCode)
                    .retrieve()
                    .bodyToMono(TemelAnalizSkorUiDto.class)
                    .timeout(TIMEOUT)
                    .block();
            return result != null ? result : new TemelAnalizSkorUiDto();
        } catch (Exception e) {
            log.warn("[TEMEL-SKOR-UI] Temel analiz skor alınamadı: {} - {}", stockCode, e.getMessage());
            return new TemelAnalizSkorUiDto();
        }
    }
}
