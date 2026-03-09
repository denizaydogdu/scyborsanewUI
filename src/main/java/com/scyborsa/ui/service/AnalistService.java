package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.AnalistDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

/**
 * Analist UI servis sinifi.
 *
 * <p>scyborsaApi'deki {@code /api/v1/analistler} endpoint'ini
 * WebClient ile cagirarak analist verilerini getirir.</p>
 *
 * @see AnalistDto
 */
@Slf4j
@Service
public class AnalistService {

    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public AnalistService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Aktif analistleri scyborsaApi'den getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/analistler} endpoint'ini cagirir.</p>
     *
     * @return aktif analist listesi; hata durumunda bos liste
     */
    public List<AnalistDto> getAktifAnalistler() {
        log.info("[ANALIST-UI] Analist listesi isteniyor");
        try {
            List<AnalistDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.ANALISTLER)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<AnalistDto>>() {})
                    .block();
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[ANALIST-UI] Analist listesi alinamadi", e);
            return List.of();
        }
    }
}
