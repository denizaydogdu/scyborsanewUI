package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.SektorelKarsilastirmaUiDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

/**
 * Sektörel karşılaştırma UI servis sınıfı.
 *
 * <p>scyborsaApi'deki sektörel karşılaştırma endpoint'ini WebClient ile çağırarak
 * şirket vs sektör ortalaması/medyanı karşılaştırma verilerini getirir.
 * Bilanço detay sayfasında sektörel karşılaştırma kartı için kullanılır.</p>
 *
 * @see SektorelKarsilastirmaUiDto
 * @see ScyborsaApiEndpoints
 */
@Slf4j
@Service
public class SektorelKarsilastirmaUiService {

    /** API istekleri için timeout süresi. */
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    /** scyborsaApi'ye HTTP istekleri göndermek için kullanılan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafından sağlanan WebClient builder
     */
    public SektorelKarsilastirmaUiService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Belirtilen hisse kodu için sektörel karşılaştırma verisini getirir.
     *
     * @param stockCode hisse kodu (örn. GARAN)
     * @return sektörel karşılaştırma verisi; hata durumunda boş DTO
     */
    public SektorelKarsilastirmaUiDto getKarsilastirma(String stockCode) {
        log.debug("[SEKTOREL-UI] Sektörel karşılaştırma isteniyor: {}", stockCode);
        try {
            SektorelKarsilastirmaUiDto result = webClient.get()
                    .uri(ScyborsaApiEndpoints.SEKTOREL_KARSILASTIRMA, stockCode)
                    .retrieve()
                    .bodyToMono(SektorelKarsilastirmaUiDto.class)
                    .timeout(TIMEOUT)
                    .block();
            return result != null ? result : new SektorelKarsilastirmaUiDto();
        } catch (Exception e) {
            log.warn("[SEKTOREL-UI] Sektörel karşılaştırma alınamadı: {} - {}", stockCode, e.getMessage());
            return new SektorelKarsilastirmaUiDto();
        }
    }
}
