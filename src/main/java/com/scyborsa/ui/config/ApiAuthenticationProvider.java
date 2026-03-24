package com.scyborsa.ui.config;

import com.scyborsa.ui.dto.auth.LoginResponseDto;
import com.scyborsa.ui.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AccountExpiredException;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * API tabanli authentication provider.
 *
 * <p>Spring Security'nin standart {@code UserDetailsService} yerine
 * scyborsaApi'ye WebClient uzerinden giris istegi gonderir.
 * API'den donen yanita gore authentication basarili veya basarisiz olur.</p>
 *
 * <p>Hata turleri:</p>
 * <ul>
 *   <li>{@link AccountExpiredException} — uyeligin suresi dolmus</li>
 *   <li>{@link LockedException} — hesap henuz aktif degil (validFrom baslamadi)</li>
 *   <li>{@link DisabledException} — hesap devre disi birakilmis</li>
 *   <li>{@link AuthenticationServiceException} — API baglanti/sistem hatasi</li>
 *   <li>{@link BadCredentialsException} — hatali e-posta veya sifre</li>
 * </ul>
 *
 * @see AuthService
 * @see SecurityConfig
 */
@Component
@RequiredArgsConstructor
public class ApiAuthenticationProvider implements AuthenticationProvider {

    /** scyborsaApi'ye login istegi gonderen servis. */
    private final AuthService authService;

    /**
     * Kullanici kimlik dogrulamasi yapar.
     *
     * <p>Login formundan gelen e-posta ve sifre bilgisi ile scyborsaApi'ye
     * authentication istegi gonderir. {@code authentication.getName()} deger olarak
     * login formundaki {@code email} parametresini dondurur
     * ({@code .usernameParameter("email")} yapılandirmasi sayesinde).</p>
     *
     * @param authentication e-posta ve password iceren token
     * @return dogrulanmis authentication token (basarili ise)
     * @throws AuthenticationException dogrulama basarisiz ise
     */
    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        String email = authentication.getName();
        String password = authentication.getCredentials().toString();

        LoginResponseDto resp = authService.login(email, password);

        if (!resp.isSuccess()) {
            String msg = resp.getMessage();
            if ("EXPIRED".equals(msg)) {
                throw new AccountExpiredException("Üyeliğiniz bitmiştir");
            }
            if ("DISABLED".equals(msg)) {
                throw new DisabledException("Hesabınız devre dışı");
            }
            if ("NOT_YET_ACTIVE".equals(msg)) {
                throw new LockedException("Hesabınız henüz aktif değil");
            }
            if (AuthService.API_ERROR.equals(msg)) {
                throw new AuthenticationServiceException("Sistem hatası");
            }
            throw new BadCredentialsException("Hatalı e-posta veya şifre");
        }

        String role = resp.getRole();
        if (role == null || (!role.equals("ADMIN") && !role.equals("USER"))) {
            throw new BadCredentialsException("Gecersiz rol bilgisi");
        }
        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
        var token = new UsernamePasswordAuthenticationToken(email, null, authorities);
        token.setDetails(Map.of(
                "adSoyad", resp.getAdSoyad() != null ? resp.getAdSoyad() : "",
                "role", role
        ));
        return token;
    }

    /**
     * Bu provider'in UsernamePasswordAuthenticationToken destekleyip desteklemedigini bildirir.
     *
     * @param authentication kontrol edilecek authentication sinifi
     * @return UsernamePasswordAuthenticationToken ise true
     */
    @Override
    public boolean supports(Class<?> authentication) {
        return UsernamePasswordAuthenticationToken.class.isAssignableFrom(authentication);
    }
}
