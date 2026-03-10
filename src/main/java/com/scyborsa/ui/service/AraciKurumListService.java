package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.AraciKurumAkdListDto;
import com.scyborsa.ui.dto.AraciKurumDetailDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;

/**
 * Aracı kurum AKD dağılım listesi UI servis sınıfı.
 *
 * <p>scyborsaApi'deki aracı kurum AKD endpoint'ini WebClient ile çağırarak
 * piyasa geneli aracı kurum dağılım verilerini getirir.</p>
 *
 * @see AraciKurumAkdListDto
 * @see AraciKurumDetailDto
 */
@Slf4j
@Service
public class AraciKurumListService {

    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafından sağlanan WebClient builder
     */
    public AraciKurumListService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * API'den aracı kurum AKD dağılım listesini getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/araci-kurumlar/akd-list} endpoint'ini çağırır.
     * Opsiyonel tarih parametresi ile geçmiş tarih verisi sorgulanabilir.</p>
     *
     * @param date tarih (YYYY-MM-DD formatında, opsiyonel — null ise güncel veri)
     * @return aracı kurum AKD dağılım listesi; hata durumunda boş DTO
     */
    public AraciKurumAkdListDto getAraciKurumAkdList(String date) {
        log.debug("[ARACI-KURUM-UI] AKD listesi isteniyor, date={}", date);
        try {
            AraciKurumAkdListDto result = webClient.get()
                    .uri(uriBuilder -> {
                        uriBuilder.path(ScyborsaApiEndpoints.ARACI_KURUMLAR_AKD_LIST);
                        if (date != null && !date.isBlank()) {
                            uriBuilder.queryParam("date", date);
                        }
                        return uriBuilder.build();
                    })
                    .retrieve()
                    .bodyToMono(AraciKurumAkdListDto.class)
                    .block(Duration.ofSeconds(10));
            log.info("[ARACI-KURUM-UI] AKD listesi alındı, kurum sayısı: {}",
                    result != null ? result.getTotalCount() : 0);
            return result;
        } catch (Exception e) {
            log.error("[ARACI-KURUM-UI] Aracı kurum AKD listesi alınamadı", e);
            AraciKurumAkdListDto empty = new AraciKurumAkdListDto();
            empty.setItems(Collections.emptyList());
            empty.setTotalCount(0);
            return empty;
        }
    }

    /**
     * Belirli bir aracı kurumun hisse bazlı AKD detayını getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/araci-kurumlar/{code}/akd-detail} endpoint'ini çağırır.
     * Opsiyonel tarih parametresi ile geçmiş tarih verisi sorgulanabilir.</p>
     *
     * @param code kurum kodu (MLB, YKR vb.)
     * @param date opsiyonel tarih (YYYY-MM-DD)
     * @return hisse bazlı AKD dağılım verisi; hata durumunda boş DTO (asla null dönmez)
     */
    public AraciKurumDetailDto getAraciKurumDetail(String code, String date) {
        log.debug("[ARACI-KURUM-UI] AKD detay isteniyor, code={}, date={}", code, date);
        try {
            String path = ScyborsaApiEndpoints.ARACI_KURUM_AKD_DETAIL.replace("{code}", code);
            AraciKurumDetailDto result = webClient.get()
                    .uri(uriBuilder -> {
                        uriBuilder.path(path);
                        if (date != null && !date.isBlank()) {
                            uriBuilder.queryParam("date", date);
                        }
                        return uriBuilder.build();
                    })
                    .retrieve()
                    .bodyToMono(AraciKurumDetailDto.class)
                    .block(Duration.ofSeconds(10));
            log.info("[ARACI-KURUM-UI] AKD detay alındı, code={}, hisse sayısı: {}",
                    code, result != null ? result.getStockCount() : 0);
            return result;
        } catch (Exception e) {
            log.error("[ARACI-KURUM-UI] Detay alınamadı (code={})", code, e);
            AraciKurumDetailDto empty = new AraciKurumDetailDto();
            empty.setItems(Collections.emptyList());
            empty.setStockCount(0);
            return empty;
        }
    }
}
