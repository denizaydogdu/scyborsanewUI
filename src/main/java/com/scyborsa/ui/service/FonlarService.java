package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.FundDetailDto;
import com.scyborsa.ui.dto.FundDto;
import com.scyborsa.ui.dto.FundStatsDto;
import com.scyborsa.ui.dto.FundTimeSeriesDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;

/**
 * TEFAS fon verileri UI servis sinifi.
 *
 * <p>scyborsaApi'deki fon endpoint'lerini WebClient ile cagirarak
 * fon verilerini getirir.</p>
 *
 * @see FundDto
 * @see FundStatsDto
 */
@Slf4j
@Service
public class FonlarService {

    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public FonlarService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * scyborsaApi'den tum aktif fonlari getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/funds} endpoint'ini cagirir.</p>
     *
     * @return fon listesi; hata durumunda bos liste
     */
    public List<FundDto> getAllFunds() {
        log.info("[FONLAR-UI] Tum fonlar isteniyor");
        return fetchFundList(ScyborsaApiEndpoints.FUNDS, "FONLAR-UI");
    }

    /**
     * scyborsaApi'den fon arama yapar.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/funds/search?query=X} endpoint'ini cagirir.</p>
     *
     * @param query arama terimi
     * @return eslesen fon listesi; hata durumunda bos liste
     */
    public List<FundDto> searchFunds(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        String sanitized = query.replaceAll("[\\r\\n]", "");
        log.info("[FONLAR-UI] Fon araniyor [query={}]", sanitized);
        try {
            List<FundDto> result = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.FUNDS_SEARCH)
                            .queryParam("query", sanitized)
                            .build())
                    .retrieve()
                    .bodyToFlux(FundDto.class)
                    .collectList()
                    .block();
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[FONLAR-UI] Fon arama basarisiz: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * scyborsaApi'den populer fonlari getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/funds/popular} endpoint'ini cagirir.</p>
     *
     * @return populer fon listesi; hata durumunda bos liste
     */
    public List<FundDto> getPopularFunds() {
        log.info("[FONLAR-UI] Populer fonlar isteniyor");
        return fetchFundList(ScyborsaApiEndpoints.FUNDS_POPULAR, "FONLAR-UI");
    }

    /**
     * Verilen endpoint'ten fon listesi getirir.
     *
     * @param uri endpoint URI
     * @param logTag log etiketi
     * @return fon listesi; hata durumunda bos liste
     */
    private List<FundDto> fetchFundList(String uri, String logTag) {
        try {
            List<FundDto> result = webClient.get()
                    .uri(uri)
                    .retrieve()
                    .bodyToFlux(FundDto.class)
                    .collectList()
                    .block();
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[{}] Fon verileri alinamadi: {}", logTag, e.getMessage());
            return List.of();
        }
    }

    /**
     * scyborsaApi'den fon istatistiklerini getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/funds/stats} endpoint'ini cagirir.</p>
     *
     * @return fon istatistikleri; hata durumunda bos istatistik
     */
    public FundStatsDto getFundStats() {
        log.info("[FONLAR-UI] Fon istatistikleri isteniyor");
        try {
            FundStatsDto result = webClient.get()
                    .uri(ScyborsaApiEndpoints.FUNDS_STATS)
                    .retrieve()
                    .bodyToMono(FundStatsDto.class)
                    .block();
            return result != null ? result : emptyStats();
        } catch (Exception e) {
            log.error("[FONLAR-UI] Fon istatistikleri alinamadi", e);
            return emptyStats();
        }
    }

    /**
     * Tek fon bilgisini API'den getirir.
     *
     * @param code TEFAS fon kodu (örn: "AAJ")
     * @return Fon bilgisi veya null (hata durumunda)
     */
    public FundDto getFundByCode(String code) {
        String sanitized = code.replaceAll("[\\r\\n]", "");
        log.info("[FONLAR-UI] Fon detay isteniyor [code={}]", sanitized);
        try {
            return webClient.get()
                    .uri(ScyborsaApiEndpoints.FUNDS_BY_CODE, sanitized)
                    .retrieve()
                    .bodyToMono(FundDto.class)
                    .block();
        } catch (WebClientResponseException.NotFound e) {
            log.warn("[FONLAR-UI] Fon bulunamadi [code={}]", sanitized);
            return null;
        } catch (Exception e) {
            log.error("[FONLAR-UI] Fon detay alinamadi [code={}]: {}", sanitized, e.getMessage());
            return null;
        }
    }

    /**
     * Zenginlestirilmis fon detay bilgisini API'den getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/funds/{code}/detail} endpoint'ini cagirir.
     * Varlik dagilimi, holdingler, benzer fonlar ve fiyat gecmisi icerir.</p>
     *
     * @param code TEFAS fon kodu (orn: "AAJ")
     * @return zenginlestirilmis fon detayi veya null (hata/bulunamadi durumunda)
     */
    public FundDetailDto getFundDetail(String code) {
        String sanitized = code.replaceAll("[\\r\\n]", "");
        log.info("[FONLAR-UI] Fon detay isteniyor [code={}]", sanitized);
        try {
            return webClient.get()
                    .uri(ScyborsaApiEndpoints.FUNDS_DETAIL, sanitized)
                    .retrieve()
                    .bodyToMono(FundDetailDto.class)
                    .block();
        } catch (WebClientResponseException.NotFound e) {
            log.warn("[FONLAR-UI] Fon bulunamadi [code={}]", sanitized);
            return null;
        } catch (Exception e) {
            log.error("[FONLAR-UI] Fon detay alinamadi [code={}]: {}", sanitized, e.getMessage());
            return null;
        }
    }

    /**
     * Fon nakit akisi gecmisini API'den getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/funds/{code}/cashflow} endpoint'ini cagirir.</p>
     *
     * @param code TEFAS fon kodu (orn: "AAJ")
     * @return nakit akisi zaman serisi; hata durumunda bos liste
     */
    public List<FundTimeSeriesDto> getFundCashflow(String code) {
        String sanitized = code.replaceAll("[\\r\\n]", "");
        log.info("[FONLAR-UI] Fon nakit akisi isteniyor [code={}]", sanitized);
        try {
            List<FundTimeSeriesDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.FUNDS_CASHFLOW, sanitized)
                    .retrieve()
                    .bodyToFlux(FundTimeSeriesDto.class)
                    .collectList()
                    .block();
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[FONLAR-UI] Fon nakit akisi alinamadi [code={}]: {}", sanitized, e.getMessage());
            return List.of();
        }
    }

    /**
     * Fon yatirimci sayisi gecmisini API'den getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/funds/{code}/investors} endpoint'ini cagirir.</p>
     *
     * @param code TEFAS fon kodu (orn: "AAJ")
     * @return yatirimci sayisi zaman serisi; hata durumunda bos liste
     */
    public List<FundTimeSeriesDto> getFundInvestors(String code) {
        String sanitized = code.replaceAll("[\\r\\n]", "");
        log.info("[FONLAR-UI] Fon yatirimci gecmisi isteniyor [code={}]", sanitized);
        try {
            List<FundTimeSeriesDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.FUNDS_INVESTORS, sanitized)
                    .retrieve()
                    .bodyToFlux(FundTimeSeriesDto.class)
                    .collectList()
                    .block();
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[FONLAR-UI] Fon yatirimci gecmisi alinamadi [code={}]: {}", sanitized, e.getMessage());
            return List.of();
        }
    }

    /**
     * Fon PDF raporunu API'den indirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/funds/{code}/pdf} endpoint'ini cagirir.</p>
     *
     * @param code TEFAS fon kodu (orn: "AAJ")
     * @return PDF icerik byte dizisi veya null (hata durumunda)
     */
    public byte[] getFundPdf(String code) {
        String sanitized = code.replaceAll("[\\r\\n]", "");
        log.info("[FONLAR-UI] Fon PDF raporu isteniyor [code={}]", sanitized);
        try {
            return webClient.get()
                    .uri(ScyborsaApiEndpoints.FUNDS_PDF, sanitized)
                    .retrieve()
                    .bodyToMono(byte[].class)
                    .block();
        } catch (Exception e) {
            log.error("[FONLAR-UI] Fon PDF alinamadi [code={}]: {}", sanitized, e.getMessage());
            return null;
        }
    }

    /**
     * Fon fiyat gecmisini CSV formatinda API'den indirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/funds/{code}/history/csv} endpoint'ini cagirir.</p>
     *
     * @param code TEFAS fon kodu (orn: "AAJ")
     * @return CSV icerik byte dizisi veya null (hata durumunda)
     */
    public byte[] getFundCsv(String code) {
        String sanitized = code.replaceAll("[\\r\\n]", "");
        log.info("[FONLAR-UI] Fon CSV gecmisi isteniyor [code={}]", sanitized);
        try {
            return webClient.get()
                    .uri(ScyborsaApiEndpoints.FUNDS_CSV, sanitized)
                    .retrieve()
                    .bodyToMono(byte[].class)
                    .block();
        } catch (Exception e) {
            log.error("[FONLAR-UI] Fon CSV alinamadi [code={}]: {}", sanitized, e.getMessage());
            return null;
        }
    }

    /**
     * Bos fon istatistikleri olusturur.
     *
     * @return tum degerleri sifir olan FundStatsDto
     */
    private FundStatsDto emptyStats() {
        return FundStatsDto.builder()
                .totalActiveFunds(0)
                .totalInvestors(0)
                .totalPortfolioSize(0)
                .yatFundCount(0)
                .emkFundCount(0)
                .byfFundCount(0)
                .build();
    }
}
