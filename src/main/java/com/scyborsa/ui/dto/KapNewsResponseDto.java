package com.scyborsa.ui.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;

/**
 * KAP canli haber API response DTO'su.
 *
 * <p>scyborsaApi'den gelen KAP haber verilerinin deserialize edilmesinde kullanilir.
 * UI tarafinda sadece {@code items} alani kullanilir.</p>
 *
 * @see KapNewsItemDto
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class KapNewsResponseDto {

    /** Haber ogeleri listesi. */
    private List<KapNewsItemDto> items;
}
