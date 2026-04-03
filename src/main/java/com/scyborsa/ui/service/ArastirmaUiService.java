package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.KapMcpHaberUiDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.List;

/**
 * Araştırma yazıları UI servis sınıfı.
 *
 * <p>scyborsaApi'deki KAP MCP endpoint'lerini WebClient ile çağırarak
 * hisse bazlı KAP haber araması ve detay içerik getirme işlemlerini sağlar.</p>
 *
 * @see KapMcpHaberUiDto
 * @see ScyborsaApiEndpoints#KAP_MCP
 */
@Slf4j
@Service
public class ArastirmaUiService {

    /** MCP real-time çağrıları için timeout süresi (15 saniye). */
    private static final Duration TIMEOUT = Duration.ofSeconds(15);

    /** scyborsaApi'ye HTTP istekleri göndermek için kullanılan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafından sağlanan WebClient builder
     */
    public ArastirmaUiService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Belirtilen hisse koduna ait KAP haberlerini arar.
     *
     * @param stockCode hisse kodu (örn. GARAN)
     * @return haber listesi; hata durumunda boş liste
     */
    public List<KapMcpHaberUiDto> searchHaberleri(String stockCode) {
        log.debug("[ARASTIRMA-UI] KAP haber araması: {}", stockCode);
        try {
            List<KapMcpHaberUiDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.KAP_MCP, stockCode)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<KapMcpHaberUiDto>>() {})
                    .timeout(TIMEOUT)
                    .block();
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[ARASTIRMA-UI] KAP haber araması başarısız: {} - {}", stockCode, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Belirtilen chunk ID'lerine ait detay içeriği getirir.
     *
     * @param ids virgülle ayrılmış chunk ID listesi
     * @return detay içerik metni; hata durumunda boş string
     */
    public String getHaberDetay(String ids) {
        log.debug("[ARASTIRMA-UI] Haber detay isteniyor: {}", ids);
        try {
            String result = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.KAP_MCP_DETAY)
                            .queryParam("ids", ids)
                            .build())
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(TIMEOUT)
                    .block();
            return result != null ? result : "";
        } catch (Exception e) {
            log.warn("[ARASTIRMA-UI] Haber detay alınamadı: {} - {}", ids, e.getMessage());
            return "";
        }
    }
}
