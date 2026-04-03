package com.scyborsa.ui.service;

import com.scyborsa.ui.dto.FinansalOranUiDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

/**
 * Temel analiz tarama UI servis sınıfı.
 *
 * <p>Finansal oran verilerini alarak temel analiz tarama sayfası için
 * veri sağlar. Hisse bazında F/K, PD/DD, ROE gibi oranları getirir.</p>
 *
 * @see FinansalOranUiService
 * @see FinansalOranUiDto
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TemelAnalizUiService {

    /** Finansal oran verilerini sağlayan servis. */
    private final FinansalOranUiService finansalOranUiService;

    /**
     * Tüm finansal oranları getirir.
     *
     * <p>Client-side'da hisse bazında pivot yapılarak filtre uygulanır.</p>
     *
     * @return finansal oran listesi; hata durumunda boş liste
     */
    public List<FinansalOranUiDto> getFinansalOranlar() {
        log.debug("[TEMEL-ANALIZ-UI] Finansal oranlar isteniyor");
        try {
            List<FinansalOranUiDto> result = finansalOranUiService.getFinansalOranlar();
            log.debug("[TEMEL-ANALIZ-UI] Finansal oranlar alındı, satır sayısı: {}", result.size());
            return result;
        } catch (Exception e) {
            log.warn("[TEMEL-ANALIZ-UI] Finansal oranlar alınamadı: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
