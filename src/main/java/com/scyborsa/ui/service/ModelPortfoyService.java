package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.ModelPortfoyKurumDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

/**
 * Model portföy UI servis sınıfı.
 *
 * <p>scyborsaApi'deki {@code /api/v1/model-portfoy} endpoint'lerini
 * WebClient ile çağırarak aracı kurum verilerini getirir.</p>
 *
 * @see ModelPortfoyKurumDto
 */
@Slf4j
@Service
public class ModelPortfoyService {

    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafından sağlanan WebClient builder
     */
    public ModelPortfoyService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Aktif aracı kurumları scyborsaApi'den getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/model-portfoy/kurumlar} endpoint'ini çağırır.</p>
     *
     * @return aktif kurum listesi; hata durumunda boş liste
     */
    public List<ModelPortfoyKurumDto> getAktifKurumlar() {
        log.info("[MODEL-PORTFOY-UI] Kurum listesi isteniyor");
        try {
            List<ModelPortfoyKurumDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.MODEL_PORTFOY_KURUMLAR)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<ModelPortfoyKurumDto>>() {})
                    .block();
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[MODEL-PORTFOY-UI] Kurum listesi alınamadı", e);
            return List.of();
        }
    }
}
