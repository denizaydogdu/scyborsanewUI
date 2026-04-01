package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.TakipHisseDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;

/**
 * Takip hissesi verileri UI servis sinifi.
 *
 * <p>scyborsaApi'deki takip hissesi endpoint'lerini WebClient ile cagirarak
 * takip hissesi verilerini getirir ve CRUD islemlerini gerceklestirir.</p>
 *
 * @see TakipHisseDto
 */
@Slf4j
@Service
public class TakipHisseService {

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public TakipHisseService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * scyborsaApi'den aktif takip hisselerini getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/takip-hisseleri} endpoint'ini cagirir.</p>
     *
     * @return aktif takip hissesi listesi; hata durumunda bos liste
     */
    public List<TakipHisseDto> getAktifTakipHisseleri() {
        log.debug("[TAKIP-HISSE-UI] Aktif takip hisseleri isteniyor");
        try {
            List<TakipHisseDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.TAKIP_HISSELERI)
                    .retrieve()
                    .bodyToFlux(TakipHisseDto.class)
                    .collectList()
                    .block(Duration.ofSeconds(10));
            log.info("[TAKIP-HISSE-UI] {} aktif takip hissesi alindi", result != null ? result.size() : 0);
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[TAKIP-HISSE-UI] Aktif takip hissesi getirme basarisiz: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * scyborsaApi'den tum takip hisselerini (aktif + pasif) getirir.
     *
     * <p>scyborsaApi'deki {@code GET /api/v1/takip-hisseleri/tumu} endpoint'ini cagirir.</p>
     *
     * @return tum takip hissesi listesi; hata durumunda bos liste
     */
    public List<TakipHisseDto> getTumTakipHisseleri() {
        log.debug("[TAKIP-HISSE-UI] Tum takip hisseleri isteniyor");
        try {
            List<TakipHisseDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.TAKIP_HISSELERI_TUMU)
                    .retrieve()
                    .bodyToFlux(TakipHisseDto.class)
                    .collectList()
                    .block(Duration.ofSeconds(10));
            log.info("[TAKIP-HISSE-UI] {} takip hissesi alindi (tumu)", result != null ? result.size() : 0);
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[TAKIP-HISSE-UI] Tum takip hissesi getirme basarisiz: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * scyborsaApi'ye yeni takip hissesi olusturma istegi gonderir.
     *
     * <p>scyborsaApi'deki {@code POST /api/v1/takip-hisseleri} endpoint'ini cagirir.</p>
     *
     * @param dto olusturulacak takip hissesi bilgileri
     */
    public void createTakipHisse(TakipHisseDto dto) {
        log.debug("[TAKIP-HISSE-UI] Takip hissesi oluşturuluyor: {}", dto.getHisseKodu());
        try {
            webClient.post()
                    .uri(ScyborsaApiEndpoints.TAKIP_HISSELERI)
                    .bodyValue(dto)
                    .retrieve()
                    .toBodilessEntity()
                    .block(Duration.ofSeconds(10));
            log.info("[TAKIP-HISSE-UI] Takip hissesi oluşturuldu: {}", dto.getHisseKodu());
        } catch (Exception e) {
            log.error("[TAKIP-HISSE-UI] Takip hissesi oluşturma başarısız: {}", dto.getHisseKodu(), e);
            throw new RuntimeException("Takip hissesi oluşturulamadı", e);
        }
    }

    /**
     * scyborsaApi'ye takip hissesi guncelleme istegi gonderir.
     *
     * <p>scyborsaApi'deki {@code PUT /api/v1/takip-hisseleri/{id}} endpoint'ini cagirir.</p>
     *
     * @param id guncellenecek takip hissesi ID'si
     * @param dto yeni takip hissesi bilgileri
     */
    public void updateTakipHisse(Long id, TakipHisseDto dto) {
        log.debug("[TAKIP-HISSE-UI] Takip hissesi güncelleniyor: id={}", id);
        try {
            webClient.put()
                    .uri(ScyborsaApiEndpoints.TAKIP_HISSELERI_BY_ID, id)
                    .bodyValue(dto)
                    .retrieve()
                    .toBodilessEntity()
                    .block(Duration.ofSeconds(10));
            log.info("[TAKIP-HISSE-UI] Takip hissesi güncellendi: id={}", id);
        } catch (Exception e) {
            log.error("[TAKIP-HISSE-UI] Takip hissesi güncelleme başarısız: id={}", id, e);
            throw new RuntimeException("Takip hissesi güncellenemedi", e);
        }
    }

    /**
     * scyborsaApi'ye takip hissesi silme istegi gonderir (soft delete).
     *
     * <p>scyborsaApi'deki {@code DELETE /api/v1/takip-hisseleri/{id}} endpoint'ini cagirir.</p>
     *
     * @param id silinecek takip hissesi ID'si
     */
    public void deleteTakipHisse(Long id) {
        log.debug("[TAKIP-HISSE-UI] Takip hissesi siliniyor: id={}", id);
        try {
            webClient.delete()
                    .uri(ScyborsaApiEndpoints.TAKIP_HISSELERI_BY_ID, id)
                    .retrieve()
                    .toBodilessEntity()
                    .block(Duration.ofSeconds(10));
            log.info("[TAKIP-HISSE-UI] Takip hissesi silindi: id={}", id);
        } catch (Exception e) {
            log.error("[TAKIP-HISSE-UI] Takip hissesi silme başarısız: id={}", id, e);
            throw new RuntimeException("Takip hissesi silinemedi", e);
        }
    }

    /**
     * scyborsaApi'ye takip hissesi aktiflestirme istegi gonderir.
     *
     * <p>scyborsaApi'deki {@code PATCH /api/v1/takip-hisseleri/{id}/aktif} endpoint'ini çağırır.</p>
     *
     * @param id aktifleştirilecek takip hissesi ID'si
     */
    public void activateTakipHisse(Long id) {
        log.debug("[TAKIP-HISSE-UI] Takip hissesi aktifleştiriliyor: id={}", id);
        try {
            webClient.patch()
                    .uri(ScyborsaApiEndpoints.TAKIP_HISSELERI_AKTIF, id)
                    .retrieve()
                    .toBodilessEntity()
                    .block(Duration.ofSeconds(10));
            log.info("[TAKIP-HISSE-UI] Takip hissesi aktifleştirildi: id={}", id);
        } catch (Exception e) {
            log.error("[TAKIP-HISSE-UI] Takip hissesi aktifleştirme başarısız: id={}", id, e);
            throw new RuntimeException("Takip hissesi aktifleştirilemedi", e);
        }
    }
}
