package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.Map;

/**
 * Bilanco verileri UI servis sinifi.
 *
 * <p>scyborsaApi'deki bilanco endpoint'lerini WebClient ile cagirarak
 * finansal tablo verilerini getirir. Tum metodlar graceful degradation
 * uygular ve hata durumunda bos map doner.</p>
 *
 * @see com.scyborsa.ui.dto.bilanco.BilancoDataDto
 * @see com.scyborsa.ui.dto.bilanco.SonBilancoRaporDto
 * @see com.scyborsa.ui.dto.bilanco.RasyoDetayDto
 */
@Slf4j
@Service
public class BilancoService {

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public BilancoService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Tum semboller icin son bilanco rapor metadata listesini getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/bilanco/son} endpoint'ini cagirir.
     * 15 saniye timeout kullanilir. Hata durumunda bos map doner
     * (graceful degradation).</p>
     *
     * @return rapor listesi (raporlar + totalCount); hata durumunda bos map
     */
    public Map<String, Object> getSonRaporlar() {
        log.info("[BILANCO-UI] Son rapor listesi isteniyor");
        try {
            Map<String, Object> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.BILANCO_SON)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block(Duration.ofSeconds(15));
            log.info("[BILANCO-UI] Son rapor listesi alindi, sayi: {}",
                    result != null ? result.getOrDefault("totalCount", 0) : 0);
            return result != null ? result : Collections.emptyMap();
        } catch (Exception e) {
            log.error("[BILANCO-UI] Son rapor listesi alinamadi", e);
            return Collections.emptyMap();
        }
    }

    /**
     * Tek sembol icin bilanco (mali durum tablosu) verisini getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/bilanco/{symbol}} endpoint'ini cagirir.
     * 15 saniye timeout kullanilir.</p>
     *
     * @param symbol hisse kodu (orn. GARAN)
     * @return bilanco verisi; hata durumunda bos map
     */
    public Map<String, Object> getBilanco(String symbol) {
        log.info("[BILANCO-UI] Bilanco verisi isteniyor [symbol={}]", symbol);
        try {
            Map<String, Object> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.BILANCO_DATA, symbol)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block(Duration.ofSeconds(15));
            log.info("[BILANCO-UI] Bilanco verisi alindi [symbol={}]", symbol);
            return result != null ? result : Collections.emptyMap();
        } catch (Exception e) {
            log.error("[BILANCO-UI] Bilanco verisi alinamadi [symbol={}]", symbol, e);
            return Collections.emptyMap();
        }
    }

    /**
     * Tek sembol icin gelir tablosu verisini getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/bilanco/{symbol}/income} endpoint'ini cagirir.
     * 15 saniye timeout kullanilir.</p>
     *
     * @param symbol hisse kodu (orn. GARAN)
     * @return gelir tablosu verisi; hata durumunda bos map
     */
    public Map<String, Object> getGelirTablosu(String symbol) {
        log.info("[BILANCO-UI] Gelir tablosu isteniyor [symbol={}]", symbol);
        try {
            Map<String, Object> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.BILANCO_INCOME, symbol)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block(Duration.ofSeconds(15));
            log.info("[BILANCO-UI] Gelir tablosu alindi [symbol={}]", symbol);
            return result != null ? result : Collections.emptyMap();
        } catch (Exception e) {
            log.error("[BILANCO-UI] Gelir tablosu alinamadi [symbol={}]", symbol, e);
            return Collections.emptyMap();
        }
    }

    /**
     * Tek sembol icin nakit akim tablosu verisini getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/bilanco/{symbol}/cashflow} endpoint'ini cagirir.
     * 15 saniye timeout kullanilir.</p>
     *
     * @param symbol hisse kodu (orn. GARAN)
     * @return nakit akim verisi; hata durumunda bos map
     */
    public Map<String, Object> getNakitAkim(String symbol) {
        log.info("[BILANCO-UI] Nakit akim tablosu isteniyor [symbol={}]", symbol);
        try {
            Map<String, Object> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.BILANCO_CASHFLOW, symbol)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block(Duration.ofSeconds(15));
            log.info("[BILANCO-UI] Nakit akim tablosu alindi [symbol={}]", symbol);
            return result != null ? result : Collections.emptyMap();
        } catch (Exception e) {
            log.error("[BILANCO-UI] Nakit akim tablosu alinamadi [symbol={}]", symbol, e);
            return Collections.emptyMap();
        }
    }

    /**
     * Tek sembol icin tum finansal tablolari (bilanco + gelir + nakit) getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/bilanco/{symbol}/all} endpoint'ini cagirir.
     * 20 saniye timeout kullanilir (3 rapor birlesik — buyuk payload).</p>
     *
     * @param symbol hisse kodu (orn. GARAN)
     * @return tum finansal tablolar; hata durumunda bos map
     */
    public Map<String, Object> getAllReports(String symbol) {
        log.info("[BILANCO-UI] Tum finansal tablolar isteniyor [symbol={}]", symbol);
        try {
            Map<String, Object> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.BILANCO_ALL, symbol)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block(Duration.ofSeconds(20));
            log.info("[BILANCO-UI] Tum finansal tablolar alindi [symbol={}]", symbol);
            return result != null ? result : Collections.emptyMap();
        } catch (Exception e) {
            log.error("[BILANCO-UI] Tum finansal tablolar alinamadi [symbol={}]", symbol, e);
            return Collections.emptyMap();
        }
    }

    /**
     * Tek sembol icin finansal oranlari (rasyolari) getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/bilanco/{symbol}/rasyo} endpoint'ini cagirir.
     * 10 saniye timeout kullanilir.</p>
     *
     * @param symbol hisse kodu (orn. GARAN)
     * @return finansal oranlar; hata durumunda bos map
     */
    public Map<String, Object> getRasyo(String symbol) {
        log.info("[BILANCO-UI] Finansal oranlar isteniyor [symbol={}]", symbol);
        try {
            Map<String, Object> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.BILANCO_RASYO, symbol)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block(Duration.ofSeconds(10));
            log.info("[BILANCO-UI] Finansal oranlar alindi [symbol={}]", symbol);
            return result != null ? result : Collections.emptyMap();
        } catch (Exception e) {
            log.error("[BILANCO-UI] Finansal oranlar alinamadi [symbol={}]", symbol, e);
            return Collections.emptyMap();
        }
    }
}
