package com.scyborsa.ui.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

/**
 * Giris istegi DTO sinifi.
 *
 * <p>API'ye gonderilecek e-posta ve sifre bilgisini tasir.</p>
 */
@Data
@NoArgsConstructor
public class LoginRequestDto {

    /** E-posta adresi. */
    private String email;

    /** Sifre (plain text). */
    @ToString.Exclude
    private String password;

    /** Istemci IP adresi. */
    private String ipAddress;

    /** Istemci user-agent bilgisi. */
    private String userAgent;

    /**
     * E-posta ve sifre ile LoginRequestDto olusturur (geriye uyumluluk).
     *
     * @param email    e-posta adresi
     * @param password sifre
     */
    public LoginRequestDto(String email, String password) {
        this.email = email;
        this.password = password;
    }
}
