package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.TvScreenerResponseModel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.List;

/**
 * Hisse detay bilgilerini scyborsaApi üzerinden çeken servis.
 *
 * <p>Pine Screener verileri gibi TradingView kaynaklı analiz sonuçlarını
 * REST API aracılığıyla alır ve UI katmanına sunar.</p>
 *
 * <p>Bağımlılıklar:</p>
 * <ul>
 *   <li>{@link WebClient} - scyborsaApi'ye HTTP istekleri için</li>
 * </ul>
 *
 * @see TvScreenerResponseModel
 */
@Slf4j
@Service
public class StockDetailService {

    private final WebClient webClient;

    /**
     * WebClient.Builder üzerinden bir {@link WebClient} örneği oluşturur.
     *
     * @param webClientBuilder Spring tarafından enjekte edilen WebClient builder
     */
    public StockDetailService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Belirtilen hisse için Pine Screener (VELZON_MA stratejisi) verilerini getirir.
     *
     * <p>scyborsaApi'deki {@code /api/v1/tw/pineScreenerData/{stockId}/VELZON_MA}
     * endpoint'ini çağırır. API hatası durumunda boş liste döner.</p>
     *
     * @param stockId sorgulanacak hisse senedi kodu (ör. "THYAO")
     * @return Pine Screener analiz sonuçlarının listesi; hata durumunda boş liste
     */
    public List<TvScreenerResponseModel> getPineScreenerData(String stockId) {
        log.info("Pine Screener veri isteniyor: stockId={}", stockId);
        try {
            return webClient.get()
                    .uri(ScyborsaApiEndpoints.PINE_SCREENER_DATA, stockId)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<TvScreenerResponseModel>>() {})
                    .block();
        } catch (Exception e) {
            log.error("Pine Screener API cagrisi basarisiz: stockId={}", stockId, e);
            return List.of();
        }
    }
}
