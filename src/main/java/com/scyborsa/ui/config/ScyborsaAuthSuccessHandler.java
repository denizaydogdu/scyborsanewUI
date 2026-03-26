package com.scyborsa.ui.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;
import org.springframework.security.web.savedrequest.HttpSessionRequestCache;
import org.springframework.security.web.savedrequest.SavedRequest;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

/**
 * Basarili giris sonrasi yonlendirme handler'i.
 *
 * <p>Onceki kayitli istek varsa (kullanici korunmus sayfaya erismeye calismissa)
 * oraya yonlendirir. Yoksa role gore varsayilan sayfaya gider:</p>
 * <ul>
 *   <li>ADMIN → {@code /backoffice}</li>
 *   <li>USER → {@code /dashboard}</li>
 * </ul>
 *
 * <p>AJAX endpoint'leri ({@code /ajax/*}) saved request olarak kaydedilmisse temizler —
 * session-guard.js polling'i beyaz sayfaya yonlendirme sorununu onler.</p>
 *
 * @see SecurityConfig
 */
@Component
public class ScyborsaAuthSuccessHandler extends SavedRequestAwareAuthenticationSuccessHandler {

    /** Shared request cache — SecurityConfig ile ayni bean. */
    private final HttpSessionRequestCache requestCache;

    /**
     * Constructor — shared request cache inject edilir.
     *
     * @param requestCache yapilandirilmis HttpSessionRequestCache bean
     */
    public ScyborsaAuthSuccessHandler(HttpSessionRequestCache requestCache) {
        this.requestCache = requestCache;
        setRequestCache(requestCache);
    }

    /**
     * Basarili giris sonrasi yonlendirme yapar.
     *
     * @param request HTTP istegi
     * @param response HTTP yaniti
     * @param authentication dogrulanmis kullanici bilgisi
     * @throws IOException I/O hatasi
     * @throws ServletException servlet hatasi
     */
    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
            Authentication authentication) throws IOException, ServletException {
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        setDefaultTargetUrl(isAdmin ? "/backoffice" : "/dashboard");

        // Kullanici bilgilerini session'a kaydet (topbar icin)
        HttpSession session = request.getSession();
        Object details = authentication.getDetails();
        if (details instanceof Map<?, ?> detailsMap) {
            Object adSoyad = detailsMap.get("adSoyad");
            Object role = detailsMap.get("role");
            session.setAttribute("userAdSoyad", adSoyad != null ? adSoyad.toString() : "");
            session.setAttribute("userRole", role != null ? role.toString() : "");
            session.setAttribute("userEmail", authentication.getName());
        }

        // AJAX endpoint'leri saved request olarak kaydedilmisse temizle —
        // session-guard.js /ajax/session-check cagriyor, session expired oldugunda
        // Spring Security bunu saved request olarak kaydediyor. Login sonrasi
        // kullaniciyi beyaz sayfaya yonlendirmesini onle.
        SavedRequest savedRequest = requestCache.getRequest(request, response);
        if (savedRequest != null && savedRequest.getRedirectUrl().contains("/ajax/")) {
            requestCache.removeRequest(request, response);
        }

        super.onAuthenticationSuccess(request, response, authentication);
    }
}
