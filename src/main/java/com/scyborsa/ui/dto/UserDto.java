package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Kullanici DTO sinifi.
 *
 * <p>Backoffice kullanici yonetimi icin API mirror DTO.
 * Sifre alani sadece create/update isteklerinde kullanilir.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDto {

    /** Kullanici ID'si. */
    private Long id;

    /** Kullanici adi. */
    private String username;

    /** Kullanicinin e-posta adresi. */
    private String email;

    /** Kullanicinin ad soyad bilgisi. */
    private String adSoyad;

    /** Kullanici rolu (ADMIN veya USER). */
    private String role;

    /** Erisim baslangic tarihi. */
    private LocalDate validFrom;

    /** Erisim bitis tarihi. */
    private LocalDate validTo;

    /** Aktif/pasif durumu. */
    private Boolean aktif;

    /** Kayit olusturma zamani. */
    private LocalDateTime createTime;

    /** Sifre (sadece create/update icin). */
    @ToString.Exclude
    private String password;
}
