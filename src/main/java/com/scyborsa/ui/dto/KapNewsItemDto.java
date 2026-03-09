package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

/**
 * Tek bir KAP haber ogesini temsil eden DTO.
 *
 * <p>Template'in ihtiyaci olan minimum alanlari tasir.
 * {@code formattedPublished} alani API tarafindan formatlanmis olarak gelir.</p>
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class KapNewsItemDto {

    /** Haberin benzersiz kimligi. */
    private String id;

    /** Haber basligi. */
    private String title;

    /** Formatlanmis yayinlanma zamani (orn: "03 Mart 2026 14:30"). */
    private String formattedPublished;

    /** Haber detay yolu. KAP haber sayfasına yönlendirme için kullanılır. */
    private String storyPath;
}
