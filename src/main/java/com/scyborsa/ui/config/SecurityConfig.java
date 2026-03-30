package com.scyborsa.ui.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.savedrequest.HttpSessionRequestCache;
import org.springframework.security.web.session.HttpSessionEventPublisher;

/**
 * Spring Security yapilandirmasi.
 *
 * <p>Tum sayfalari authentication ile korur. Sadece landing page ({@code /}),
 * login sayfasi ({@code /login}) ve statik kaynaklar public erisime aciktir.
 * {@code /backoffice/**} endpoint'leri ADMIN rolu gerektirir.</p>
 *
 * <p>Authentication, {@link ApiAuthenticationProvider} uzerinden
 * scyborsaApi'ye WebClient ile yapilir (DB-backed).</p>
 *
 * @see ApiAuthenticationProvider
 * @see ScyborsaAuthSuccessHandler
 * @see ScyborsaAuthFailureHandler
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    /**
     * HTTP guvenlik filtre zincirini yapilandirir.
     *
     * @param http HttpSecurity builder
     * @param authProvider API tabanli authentication provider
     * @param successHandler basarili giris handler'i
     * @param failureHandler basarisiz giris handler'i
     * @return yapilandirilmis SecurityFilterChain
     * @throws Exception guvenlik yapilandirma hatasi
     */
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http,
            ApiAuthenticationProvider authProvider,
            ScyborsaAuthSuccessHandler successHandler,
            ScyborsaAuthFailureHandler failureHandler) throws Exception {
        http
            .authenticationProvider(authProvider)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/login", "/sifremi-unuttum", "/ajax/verify-identity", "/ajax/reset-password",
                                 "/ws-auth-check", "/robots.txt", "/assets/**", "/css/**", "/js/**", "/img/**",
                                 "/webjars/**", "/favicon.ico", "/error",
                                 "/.well-known/**").permitAll()
                .requestMatchers("/backoffice/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
                .loginProcessingUrl("/login")
                .usernameParameter("email")
                .successHandler(successHandler)
                .failureHandler(failureHandler)
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl("/login?logout=true")
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
                .permitAll()
            )
            .sessionManagement(session -> {
                session.sessionFixation().migrateSession();
                // maxSessionsPreventsLogin default false: yeni giris eskiyi kovar (tercih edilmis davranis)
                session.sessionConcurrency(concurrency -> concurrency
                    .maximumSessions(1)
                    .expiredUrl("/login?kicked=true")
                );
            })
            // HTTP guvenlik header'lari — clickjacking, MIME sniffing, referrer ve izin politikalari
            .headers(headers -> {
                headers.frameOptions(frame -> frame.sameOrigin());
                headers.contentTypeOptions(contentType -> {});
                headers.referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN));
                headers.permissionsPolicy(permissions -> permissions
                    .policy("camera=(), microphone=(), geolocation=()"));
                headers.contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'; "
                        + "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://cdn.lordicon.com https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://googleads.g.doubleclick.net; "
                        + "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
                        + "img-src 'self' data: https://s3-symbol-logo.tradingview.com https://storage.fintables.com https://coin-images.coingecko.com https://assets.coingecko.com https://*.coingecko.com https://bin.bnbstatic.com https://*.binance.com https://*.bnbstatic.com https://alternative.me https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://*.google.com; "
                        + "font-src 'self' data: https://fonts.gstatic.com; "
                        + "frame-src https://www.googletagmanager.com https://googleads.g.doubleclick.net https://td.doubleclick.net; "
                        + "connect-src 'self' wss: ws: https://cdn.jsdelivr.net https://cdn.lordicon.com https://www.google-analytics.com https://www.googletagmanager.com https://analytics.google.com https://stats.g.doubleclick.net https://googleads.g.doubleclick.net https://*.google-analytics.com https://*.analytics.google.com;"));
            })
            // AJAX endpoint'lerini saved request cache'den haric tut — login sonrasi beyaz sayfa onlemi
            .requestCache(cache -> cache.requestCache(httpSessionRequestCache()))
            // CSRF token expired (uzun sure acik kalmis login formu) → 403 yerine login'e yonlendir
            .exceptionHandling(ex -> ex
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    if (request.getUserPrincipal() == null) {
                        // Anonim kullanici — CSRF expired, login'e yonlendir
                        response.sendRedirect("/login");
                    } else {
                        // Authenticated kullanici — yetkisiz erisim
                        response.sendRedirect("/error");
                    }
                })
            );
        return http.build();
    }

    /**
     * Shared request cache bean'i — SecurityConfig ve ScyborsaAuthSuccessHandler
     * ayni instance'i kullanir. AJAX endpoint'lerinin saved request olarak
     * kaydedilmesini onler (session-guard.js polling sorunu).
     *
     * @return yapilandirilmis HttpSessionRequestCache instance
     */
    @Bean
    HttpSessionRequestCache httpSessionRequestCache() {
        var cache = new HttpSessionRequestCache();
        // AJAX ve statik kaynak isteklerini saved request olarak kaydetme —
        // session-guard.js polling'i ve diger AJAX cagrilari login sonrasi
        // beyaz sayfaya yonlendirme sorununu onler.
        // Sayfa istekleri (GET /bilancolar vb.) kayit edilir ve login sonrasi
        // kullaniciyi orijinal sayfaya yonlendirir.
        cache.setRequestMatcher(request -> {
            String uri = request.getRequestURI();
            // AJAX endpoint'leri, statik kaynaklar ve favicon'u haric tut
            if (uri.startsWith("/ajax/") || uri.startsWith("/img/") || uri.startsWith("/assets/")
                    || uri.startsWith("/css/") || uri.startsWith("/js/") || uri.startsWith("/webjars/")
                    || uri.equals("/favicon.ico")) {
                return false;
            }
            // Sadece GET isteklerini kaydet (POST/PUT/DELETE saved request olarak anlamsiz)
            return "GET".equals(request.getMethod());
        });
        return cache;
    }

    /**
     * BCrypt sifre encoder bean'i.
     *
     * @return BCryptPasswordEncoder instance
     */
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * HTTP session event publisher — concurrent session kontrolu icin gerekli.
     *
     * <p>Spring Security'nin {@code maximumSessions(1)} ozelliginin calisabilmesi icin
     * session olusturma/yok etme event'lerinin publish edilmesi gerekir.
     * Bu bean olmadan session registry guncel kalmaz ve concurrent session kontrolu calismaz.</p>
     *
     * @return HttpSessionEventPublisher instance
     */
    @Bean
    HttpSessionEventPublisher httpSessionEventPublisher() {
        return new HttpSessionEventPublisher();
    }
}
