package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.UserDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Map;

/**
 * Kullanici profil UI servis sinifi.
 *
 * <p>scyborsaApi'deki profil endpoint'lerini WebClient ile cagirarak
 * kullanicinin kendi profil bilgilerini goruntuleme ve guncelleme
 * islemlerini yonetir.</p>
 *
 * @see UserDto
 */
@Slf4j
@Service
public class ProfilService {

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public ProfilService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * E-posta adresine gore kullanici bilgilerini getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/users/by-email?email=...} endpoint'ini cagirir.</p>
     *
     * @param email kullanicinin e-posta adresi
     * @return kullanici bilgileri; hata durumunda null
     */
    public UserDto getByEmail(String email) {
        log.info("[PROFIL-UI] Kullanici bilgileri isteniyor: email={}", email);
        try {
            UserDto result = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.USERS_BY_EMAIL)
                            .queryParam("email", email)
                            .build())
                    .retrieve()
                    .bodyToMono(UserDto.class)
                    .block();
            return result;
        } catch (Exception e) {
            log.error("[PROFIL-UI] Kullanici bilgileri alinamadi: email={}", email, e);
            return null;
        }
    }

    /**
     * Kullanici profil bilgilerini gunceller (ad soyad ve/veya sifre).
     *
     * <p>scyborsaApi'deki {@code PUT /api/v1/users/{id}/profil} endpoint'ini cagirir.
     * Sadece adSoyad ve password alanlari gonderilir.</p>
     *
     * @param id guncellenecek kullanici ID'si
     * @param adSoyad yeni ad soyad bilgisi
     * @param password yeni sifre (bos ise gonderilmez)
     * @throws RuntimeException API hatasi durumunda
     */
    public void updateProfil(Long id, String adSoyad, String password,
                             String telegramUsername, String phoneNumber) {
        log.info("[PROFIL-UI] Profil guncelleme: id={}", id);
        try {
            Map<String, String> body = new java.util.HashMap<>();
            body.put("adSoyad", adSoyad);
            if (password != null && !password.isBlank()) {
                body.put("password", password);
            }
            body.put("telegramUsername", telegramUsername);
            body.put("phoneNumber", phoneNumber);

            webClient.put()
                    .uri(ScyborsaApiEndpoints.USERS_PROFIL, id)
                    .bodyValue(body)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (WebClientResponseException e) {
            log.error("[PROFIL-UI] Profil guncelleme hatasi: id={}, mesaj={}", id, e.getResponseBodyAsString(), e);
            throw new RuntimeException(e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            log.error("[PROFIL-UI] Profil guncelleme hatasi: id={}", id, e);
            throw new RuntimeException("Profil guncellenemedi", e);
        }
    }
}
