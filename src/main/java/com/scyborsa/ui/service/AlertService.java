package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.alert.PriceAlertDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Fiyat alarmi UI servis sinifi.
 *
 * <p>scyborsaApi'deki alarm endpoint'lerini WebClient ile cagirarak
 * alarm CRUD islemlerini ve bildirim sayisi sorgusunu yapar.</p>
 */
@Slf4j
@Service
public class AlertService {

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public AlertService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Okunmamis alarm sayisini getirir.
     *
     * @param userEmail kullanici email adresi
     * @return okunmamis alarm sayisi iceren Map (count alani)
     */
    public Map<String, Object> getUnreadCount(String userEmail) {
        try {
            Map<String, Object> result = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.ALERTS_UNREAD_COUNT)
                            .queryParam("email", userEmail)
                            .build())
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block(Duration.ofSeconds(5));
            return result != null ? result : Map.of("count", 0);
        } catch (Exception e) {
            log.warn("[ALERT-UI] Okunmamis alarm sayisi alinamadi: {}", e.getMessage());
            return Map.of("count", 0);
        }
    }

    /**
     * Yeni fiyat alarmi olusturur.
     *
     * @param alertDto alarm bilgileri
     * @param userEmail kullanici email adresi
     * @return olusturulan alarm DTO
     */
    public PriceAlertDto createAlert(PriceAlertDto alertDto, String userEmail) {
        try {
            return webClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.ALERTS)
                            .queryParam("email", userEmail)
                            .build())
                    .bodyValue(alertDto)
                    .retrieve()
                    .bodyToMono(PriceAlertDto.class)
                    .block(Duration.ofSeconds(10));
        } catch (Exception e) {
            log.warn("[ALERT-UI] Alarm olusturulamadi (stock={}, email={}): {}",
                    alertDto.getStockCode(), userEmail, e.getMessage());
            throw e;
        }
    }

    /**
     * Mevcut bir fiyat alarmini gunceller.
     *
     * @param alertId   alarm ID
     * @param alertDto  guncel alarm bilgileri
     * @param userEmail kullanici email adresi
     * @return guncellenmis alarm DTO
     */
    public PriceAlertDto updateAlert(Long alertId, PriceAlertDto alertDto, String userEmail) {
        try {
            return webClient.put()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.ALERTS + "/" + alertId)
                            .queryParam("email", userEmail)
                            .build())
                    .bodyValue(alertDto)
                    .retrieve()
                    .bodyToMono(PriceAlertDto.class)
                    .block(Duration.ofSeconds(10));
        } catch (Exception e) {
            log.warn("[ALERT-UI] Alarm guncellenemedi (id={}): {}", alertId, e.getMessage());
            throw e;
        }
    }

    /**
     * Tum alarmlari okundu olarak isaretler.
     *
     * @param userEmail kullanici email adresi
     */
    public void markAllRead(String userEmail) {
        try {
            webClient.put()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.ALERTS_READ_ALL)
                            .queryParam("email", userEmail)
                            .build())
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block(Duration.ofSeconds(5));
        } catch (Exception e) {
            log.warn("[ALERT-UI] Alarmlar okundu isaretlenemedi: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * Kullanicinin tum alarmlarini getirir.
     *
     * @param userEmail kullanici email adresi
     * @return alarm listesi
     */
    public List<PriceAlertDto> getAlerts(String userEmail) {
        return getAlerts(userEmail, null);
    }

    /**
     * Kullanicinin alarmlarini durum filtresine gore getirir.
     *
     * @param userEmail kullanici email adresi
     * @param status    opsiyonel durum filtresi (ACTIVE, TRIGGERED vb.)
     * @return alarm listesi
     */
    public List<PriceAlertDto> getAlerts(String userEmail, String status) {
        try {
            List<PriceAlertDto> result = webClient.get()
                    .uri(uriBuilder -> {
                        var b = uriBuilder.path(ScyborsaApiEndpoints.ALERTS)
                                .queryParam("email", userEmail);
                        if (status != null && !status.isBlank()) {
                            b.queryParam("status", status);
                        }
                        return b.build();
                    })
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<PriceAlertDto>>() {})
                    .block(Duration.ofSeconds(10));
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.warn("[ALERT-UI] Alarm listesi alinamadi: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Belirtilen alarmi iptal eder.
     *
     * @param alertId alarm ID
     * @param userEmail kullanici email adresi
     */
    public void cancelAlert(Long alertId, String userEmail) {
        try {
            webClient.delete()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.ALERTS + "/" + alertId)
                            .queryParam("email", userEmail)
                            .build())
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block(Duration.ofSeconds(5));
        } catch (Exception e) {
            log.warn("[ALERT-UI] Alarm iptal edilemedi (id={}): {}", alertId, e.getMessage());
            throw e;
        }
    }
}
