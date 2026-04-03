package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.VbtsTedbirDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

/**
 * VBTS tedbirli hisse verileri UI servis sınıfı.
 *
 * <p>scyborsaApi'deki VBTS endpoint'lerini WebClient ile çağırarak
 * aktif tedbirli hisse verilerini getirir.</p>
 *
 * @see VbtsTedbirDto
 * @see ScyborsaApiEndpoints
 */
@Slf4j
@Service
public class VbtsTedbirUiService {

    /** API istekleri için timeout süresi. */
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    /** scyborsaApi'ye HTTP istekleri göndermek için kullanılan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafından sağlanan WebClient builder
     */
    public VbtsTedbirUiService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Aktif VBTS tedbirli hisse listesini getirir.
     *
     * @return aktif tedbir listesi; hata durumunda boş liste
     */
    public List<VbtsTedbirDto> getAktifTedbirler() {
        log.debug("[VBTS-UI] Aktif tedbirler isteniyor");
        try {
            List<VbtsTedbirDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.VBTS)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<VbtsTedbirDto>>() {})
                    .timeout(TIMEOUT)
                    .block();
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[VBTS-UI] Tedbirli hisse listesi alınamadı: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Belirtilen hisse kodunun VBTS tedbirli olup olmadığını kontrol eder.
     *
     * @param stockCode hisse kodu (örn. GARAN)
     * @return tedbirli ise true, değilse veya hata durumunda false
     */
    public boolean isTedbirli(String stockCode) {
        log.debug("[VBTS-UI] Tedbir kontrolü: {}", stockCode);
        try {
            Boolean result = webClient.get()
                    .uri(ScyborsaApiEndpoints.VBTS_CHECK, stockCode)
                    .retrieve()
                    .bodyToMono(Boolean.class)
                    .timeout(TIMEOUT)
                    .block();
            return Boolean.TRUE.equals(result);
        } catch (Exception e) {
            log.warn("[VBTS-UI] Tedbir kontrolü başarısız: {} - {}", stockCode, e.getMessage());
            return false;
        }
    }
}
