package com.scyborsa.ui.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

/**
 * Tum sayfalara ortak model attribute'lari ekleyen global advice.
 *
 * <p>Thymeleaf 3.1+ surumunde {@code #httpServletRequest} utility nesnesi
 * kaldirilmistir. Bu sinif, template'lerde ihtiyac duyulan request bilgilerini
 * model attribute olarak saglar.</p>
 */
@ControllerAdvice
public class GlobalModelAdvice {

    @Value("${api.public-url:${api.base-url}}")
    private String apiBaseUrl;

    /**
     * Mevcut istegin URI'sini model'e ekler.
     *
     * <p>Sidebar aktif durum kontrolu gibi template ifadelerinde
     * {@code ${requestURI}} olarak kullanilir.</p>
     *
     * @param request HTTP istegi
     * @return istek URI'si (orn: "/dashboard", "/araci-kurumlar")
     */
    @ModelAttribute("requestURI")
    public String requestURI(HttpServletRequest request) {
        return request.getRequestURI();
    }

    /**
     * API base URL'ini model'e ekler.
     *
     * <p>JavaScript dosyalarinin API isteklerini dogru adrese yonlendirmesi icin
     * template'lerde {@code ${apiBaseUrl}} olarak kullanilir.</p>
     *
     * @return API base URL (orn: "http://localhost:8081")
     */
    @ModelAttribute("apiBaseUrl")
    public String apiBaseUrl() {
        return apiBaseUrl;
    }

    /**
     * Oturum acmis kullanicinin email adresini model'e ekler.
     *
     * <p>Topbar bildirim sistemi ve STOMP baglantisi icin
     * template'lerde {@code ${userEmail}} olarak kullanilir.</p>
     *
     * @return kullanici email adresi veya bos string
     */
    @ModelAttribute("userEmail")
    public String userEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            return auth.getName();
        }
        return "";
    }
}
