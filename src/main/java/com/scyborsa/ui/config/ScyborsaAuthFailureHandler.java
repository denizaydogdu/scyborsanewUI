package com.scyborsa.ui.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AccountExpiredException;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Basarisiz giris sonrasi hata yonlendirme handler'i.
 *
 * <p>Farkli hata turlerine gore farkli query parametreleri ile
 * login sayfasina yonlendirir:</p>
 * <ul>
 *   <li>{@link AccountExpiredException} → {@code /login?error=expired}</li>
 *   <li>{@link LockedException} → {@code /login?error=notyet}</li>
 *   <li>{@link DisabledException} → {@code /login?error=disabled}</li>
 *   <li>{@link AuthenticationServiceException} → {@code /login?error=apierror}</li>
 *   <li>Diger hatalar → {@code /login?error=true}</li>
 * </ul>
 *
 * @see SecurityConfig
 */
@Component
public class ScyborsaAuthFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    /**
     * Basarisiz giris sonrasi hata tipine gore yonlendirme yapar.
     *
     * @param request HTTP istegi
     * @param response HTTP yaniti
     * @param exception authentication hatasi
     * @throws IOException I/O hatasi
     * @throws ServletException servlet hatasi
     */
    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException exception) throws IOException, ServletException {

        String errorParam = "error=true";
        if (exception instanceof AccountExpiredException) {
            errorParam = "error=expired";
        } else if (exception instanceof LockedException) {
            errorParam = "error=notyet";
        } else if (exception instanceof DisabledException) {
            errorParam = "error=disabled";
        } else if (exception instanceof AuthenticationServiceException) {
            errorParam = "error=apierror";
        }

        getRedirectStrategy().sendRedirect(request, response, "/login?" + errorParam);
    }
}
