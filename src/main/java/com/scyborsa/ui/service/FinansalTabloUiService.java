package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.FinansalTabloUiDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

/**
 * Finansal tablo verileri UI servis sınıfı.
 *
 * <p>scyborsaApi'deki finansal tablo (bilanço/gelir/nakit akım) endpoint'lerini
 * WebClient ile çağırarak finansal tablo verilerini getirir.
 * Bilanço detay sayfasında trend grafik için kullanılır.</p>
 *
 * @see FinansalTabloUiDto
 * @see ScyborsaApiEndpoints
 */
@Slf4j
@Service
public class FinansalTabloUiService {

    /** API istekleri için timeout süresi. */
    private static final Duration TIMEOUT = Duration.ofSeconds(15);

    /** scyborsaApi'ye HTTP istekleri göndermek için kullanılan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafından sağlanan WebClient builder
     */
    public FinansalTabloUiService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Belirtilen hisse kodu için bilanço tablosu verilerini getirir.
     *
     * @param stockCode hisse kodu (örn. GARAN)
     * @return bilanço tablo verileri; hata durumunda boş liste
     */
    public List<FinansalTabloUiDto> getHisseBilanco(String stockCode) {
        log.debug("[FINANSAL-TABLO-UI] Bilanço tablo isteniyor: {}", stockCode);
        try {
            List<FinansalTabloUiDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.FINANSAL_TABLO_BILANCO, stockCode)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<FinansalTabloUiDto>>() {})
                    .timeout(TIMEOUT)
                    .block();
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[FINANSAL-TABLO-UI] Bilanço tablo alınamadı: {} - {}", stockCode, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Belirtilen hisse kodu için gelir tablosu verilerini getirir.
     *
     * @param stockCode hisse kodu (örn. GARAN)
     * @return gelir tablosu verileri; hata durumunda boş liste
     */
    public List<FinansalTabloUiDto> getHisseGelir(String stockCode) {
        log.debug("[FINANSAL-TABLO-UI] Gelir tablosu isteniyor: {}", stockCode);
        try {
            List<FinansalTabloUiDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.FINANSAL_TABLO_GELIR, stockCode)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<FinansalTabloUiDto>>() {})
                    .timeout(TIMEOUT)
                    .block();
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[FINANSAL-TABLO-UI] Gelir tablosu alınamadı: {} - {}", stockCode, e.getMessage());
            return Collections.emptyList();
        }
    }
}
