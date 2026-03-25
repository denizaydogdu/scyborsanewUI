package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.auth.LoginRequestDto;
import com.scyborsa.ui.dto.auth.LoginResponseDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

/**
 * Authentication servis sinifi.
 *
 * <p>scyborsaApi'deki {@code /api/v1/auth/login} endpoint'ini WebClient ile
 * cagirarak kullanici giris islemini gerceklestirir.</p>
 *
 * @see com.scyborsa.ui.config.ApiAuthenticationProvider
 */
@Slf4j
@Service
public class AuthService {

    /** API hata kodu — ApiAuthenticationProvider ile paylasilan sabit. */
    public static final String API_ERROR = "API_ERROR";

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public AuthService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Kullanici giris istegi gonderir.
     *
     * @param email     kullanicinin e-posta adresi
     * @param password  sifre (plain text)
     * @param ipAddress istemci IP adresi (nullable)
     * @param userAgent istemci user-agent bilgisi (nullable)
     * @return giris yaniti; API hatasi durumunda basarisiz yanit
     */
    public LoginResponseDto login(String email, String password, String ipAddress, String userAgent) {
        try {
            LoginRequestDto requestDto = new LoginRequestDto(email, password);
            requestDto.setIpAddress(ipAddress);
            requestDto.setUserAgent(userAgent);

            LoginResponseDto result = webClient.post()
                    .uri(ScyborsaApiEndpoints.AUTH_LOGIN)
                    .bodyValue(requestDto)
                    .exchangeToMono(response -> response.bodyToMono(LoginResponseDto.class))
                    .block(Duration.ofSeconds(10));
            return result != null ? result : failResponse(API_ERROR);
        } catch (Exception e) {
            log.error("[AUTH-UI] API bağlantı hatası", e);
            return failResponse(API_ERROR);
        }
    }

    /**
     * Basarisiz giris yaniti olusturur.
     *
     * @param message hata mesaji
     * @return basarisiz LoginResponseDto
     */
    private LoginResponseDto failResponse(String message) {
        return LoginResponseDto.builder()
                .success(false)
                .message(message)
                .build();
    }
}
