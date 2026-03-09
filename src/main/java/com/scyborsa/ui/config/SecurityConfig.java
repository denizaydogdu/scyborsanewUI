package com.scyborsa.ui.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

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
                .requestMatchers("/", "/login", "/assets/**", "/css/**", "/js/**", "/img/**",
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
            .sessionManagement(session -> session
                .sessionFixation().migrateSession()
            );
        return http.build();
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
}
