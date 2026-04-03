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
 * Faaliyet raporu arama UI servis sınıfı.
 *
 * <p>scyborsaApi'deki KAP MCP endpoint'lerini WebClient ile çağırarak
 * hisse bazlı faaliyet raporu araması ve detay içerik getirme işlemlerini sağlar.</p>
 *
 * @see KapMcpHaberUiDto
 * @see ScyborsaApiEndpoints#KAP_MCP
 */
@Slf4j
@Service
public class FaaliyetRaporuUiService {

    /** MCP real-time çağrıları için timeout süresi (15 saniye). */
    private static final Duration TIMEOUT = Duration.ofSeconds(15);

    /** scyborsaApi'ye HTTP istekleri göndermek için kullanılan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafından sağlanan WebClient builder
     */
    public FaaliyetRaporuUiService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Belirtilen hisse koduna ait faaliyet raporlarını arar.
     *
     * @param stockCode hisse kodu (örn. GARAN)
     * @return rapor listesi; hata durumunda boş liste
     */
    public List<KapMcpHaberUiDto> searchFaaliyetRaporlari(String stockCode) {
        log.debug("[FAALIYET-UI] Faaliyet raporu araması: {}", stockCode);
        try {
            List<KapMcpHaberUiDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.KAP_MCP, stockCode)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<KapMcpHaberUiDto>>() {})
                    .timeout(TIMEOUT)
                    .block();
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[FAALIYET-UI] Faaliyet raporu araması başarısız: {} - {}", stockCode, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Belirtilen chunk ID'lerine ait rapor detay içeriğini getirir.
     *
     * @param ids virgülle ayrılmış chunk ID listesi
     * @return detay içerik metni; hata durumunda boş string
     */
    public String getRaporDetay(String ids) {
        log.debug("[FAALIYET-UI] Rapor detay isteniyor: {}", ids);
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
            log.warn("[FAALIYET-UI] Rapor detay alınamadı: {} - {}", ids, e.getMessage());
            return "";
        }
    }
}
