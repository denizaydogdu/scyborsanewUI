package com.scyborsa.ui.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.List;
import java.util.Set;

/**
 * Katılım Endeksi üyelik kontrolü sağlayan UI servis sınıfı.
 *
 * <p>Uygulama başlatıldığında {@code katilim-endeksi.json} dosyasından
 * katılım endeksine dahil hisse kodlarını yükler ve bellekte tutar.</p>
 */
@Slf4j
@Service
public class KatilimEndeksiService {

    /** Katılım endeksi hisse kodları (immutable). */
    private volatile Set<String> katilimCodes = Set.of();

    /**
     * Uygulama başlatıldığında JSON dosyasını okur.
     */
    @PostConstruct
    public void init() {
        try (InputStream is = getClass().getResourceAsStream("/katilim-endeksi.json")) {
            if (is == null) {
                log.error("katilim-endeksi.json dosyası bulunamadı");
                return;
            }
            ObjectMapper mapper = new ObjectMapper();
            List<String> codes = mapper.readValue(is, new TypeReference<List<String>>() {});
            katilimCodes = Set.copyOf(codes);
            log.info("Katılım Endeksi: {} hisse yüklendi", katilimCodes.size());
        } catch (Exception e) {
            log.error("Katılım endeksi JSON yüklenemedi", e);
        }
    }

    /**
     * Belirtilen hisse kodunun katılım endeksinde olup olmadığını kontrol eder.
     *
     * @param stockCode hisse borsa kodu (örn. "THYAO", "ASELS")
     * @return katılım endeksinde ise {@code true}
     */
    public boolean isKatilim(String stockCode) {
        if (stockCode == null) return false;
        return katilimCodes.contains(stockCode);
    }

    /**
     * Katılım endeksindeki tüm hisse kodlarını döndürür.
     *
     * @return katılım endeksi hisse kodları (immutable set)
     */
    public Set<String> getKatilimCodes() {
        return katilimCodes;
    }
}
