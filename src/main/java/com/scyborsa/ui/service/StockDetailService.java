package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.AkdResponseDto;
import com.scyborsa.ui.dto.OrderbookResponseDto;
import com.scyborsa.ui.dto.TakasResponseDto;
import com.scyborsa.ui.dto.TvScreenerResponseModel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;

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

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
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
                    .block(Duration.ofSeconds(15));
        } catch (Exception e) {
            log.error("Pine Screener API cagrisi basarisiz: stockId={}", stockId, e);
            return List.of();
        }
    }

    /**
     * Hisse bazlı AKD (Aracı Kurum Dağılımı) verilerini API'den getirir.
     *
     * @param stockCode hisse kodu (ör: "GARAN")
     * @return AKD dağılımı veya hata durumunda null
     */
    public AkdResponseDto getAkdData(String stockCode) {
        try {
            return webClient.get()
                    .uri(ScyborsaApiEndpoints.STOCK_AKD, stockCode)
                    .retrieve()
                    .bodyToMono(AkdResponseDto.class)
                    .block(Duration.ofSeconds(15));
        } catch (Exception e) {
            log.error("AKD verisi alınamadı: {} - {}", stockCode, e.getMessage());
            AkdResponseDto empty = new AkdResponseDto();
            empty.setAlicilar(List.of());
            empty.setSaticilar(List.of());
            empty.setToplam(List.of());
            return empty;
        }
    }

    /**
     * Hisse bazli Takas (Saklama Dagilimi) verilerini API'den getirir.
     *
     * @param stockCode hisse kodu (or: "GARAN")
     * @return Takas dagilimi veya hata durumunda bos response
     */
    public TakasResponseDto getTakasData(String stockCode) {
        try {
            return webClient.get()
                    .uri(ScyborsaApiEndpoints.STOCK_TAKAS, stockCode)
                    .retrieve()
                    .bodyToMono(TakasResponseDto.class)
                    .block(Duration.ofSeconds(15));
        } catch (Exception e) {
            log.error("Takas verisi alinamadi: {} - {}", stockCode, e.getMessage());
            TakasResponseDto empty = new TakasResponseDto();
            empty.setCustodians(List.of());
            return empty;
        }
    }

    /**
     * Hisse bazlı emir defteri (orderbook) verilerini API'den getirir.
     *
     * @param stockCode hisse kodu (ör: "GARAN")
     * @return emir defteri verileri veya hata durumunda boş response
     */
    public OrderbookResponseDto getOrderbookData(String stockCode) {
        try {
            return webClient.get()
                    .uri(ScyborsaApiEndpoints.STOCK_ORDERBOOK, stockCode)
                    .retrieve()
                    .bodyToMono(OrderbookResponseDto.class)
                    .block(Duration.ofSeconds(15));
        } catch (Exception e) {
            log.error("Orderbook verisi alınamadı: {} - {}", stockCode, e.getMessage());
            OrderbookResponseDto empty = new OrderbookResponseDto();
            empty.setTransactions(List.of());
            empty.setTotalCount(0);
            return empty;
        }
    }

    /**
     * Hisse bazlı AI teknik analiz yorumunu API'den getirir.
     *
     * <p>API tarafında günlük cache uygulanır; aynı hisse için gün içinde
     * tekrar AI çağrısı yapılmaz.</p>
     *
     * @param stockCode hisse kodu (ör: "GARAN")
     * @return AI yorum verisi (stockCode + comment) veya hata durumunda null
     */
    public Map<String, Object> getAiComment(String stockCode) {
        try {
            return webClient.get()
                    .uri(ScyborsaApiEndpoints.AI_COMMENT, stockCode)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .timeout(Duration.ofSeconds(30))
                    .block();
        } catch (Exception e) {
            log.error("AI yorum verisi alınamadı: {} - {}", stockCode, e.getMessage());
            return null;
        }
    }
}
