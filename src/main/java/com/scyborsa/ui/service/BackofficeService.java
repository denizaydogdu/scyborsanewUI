package com.scyborsa.ui.service;

import com.scyborsa.ui.constants.ScyborsaApiEndpoints;
import com.scyborsa.ui.dto.AnalistDto;
import com.scyborsa.ui.dto.BackofficeDashboardDto;
import com.scyborsa.ui.dto.ModelPortfoyKurumDto;
import com.scyborsa.ui.dto.ScreenerResultSummaryDto;
import com.scyborsa.ui.dto.StockDto;
import com.scyborsa.ui.dto.UserDto;
import com.scyborsa.ui.dto.alert.PriceAlertDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;
import java.util.Map;

/**
 * Backoffice UI servis sinifi.
 *
 * <p>scyborsaApi'deki backoffice endpoint'lerini WebClient ile cagirarak
 * dashboard, hisse yonetimi, analist/kurum CRUD ve tarama izleme
 * islemlerini yonetir.</p>
 */
@Slf4j
@Service
public class BackofficeService {

    /** scyborsaApi'ye HTTP istekleri gondermek icin kullanilan WebClient. */
    private final WebClient webClient;

    /**
     * Constructor — WebClient.Builder inject eder.
     *
     * @param webClientBuilder Spring tarafindan saglanan WebClient builder
     */
    public BackofficeService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    // ── Dashboard ────────────────────────────────────────

    /**
     * Dashboard KPI verilerini getirir.
     *
     * @return dashboard istatistikleri; hata durumunda null
     */
    public BackofficeDashboardDto getDashboardStats() {
        log.info("[BACKOFFICE-UI] Dashboard verileri isteniyor");
        try {
            BackofficeDashboardDto result = webClient.get()
                    .uri(ScyborsaApiEndpoints.BACKOFFICE_DASHBOARD)
                    .retrieve()
                    .bodyToMono(BackofficeDashboardDto.class)
                    .block();
            return result != null ? result : emptyDashboard();
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Dashboard verileri alinamadi", e);
            return emptyDashboard();
        }
    }

    // ── Hisse Yonetimi ───────────────────────────────────

    /**
     * Hisse listesini filtreye gore getirir.
     *
     * @param filtre "all", "aktif" veya "yasakli"
     * @return filtrelenmis hisse listesi; hata durumunda bos liste
     */
    public List<StockDto> getStocks(String filtre) {
        log.info("[BACKOFFICE-UI] Hisse listesi isteniyor: filtre={}", filtre);
        try {
            List<StockDto> result = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(ScyborsaApiEndpoints.BACKOFFICE_STOCKS)
                            .queryParam("filtre", filtre)
                            .build())
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<StockDto>>() {})
                    .block();
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Hisse listesi alinamadi", e);
            return List.of();
        }
    }

    /**
     * Hisseyi yasaklar.
     *
     * @param stockName yasaklanacak hisse kodu
     * @param neden yasaklama nedeni
     */
    public void yasaklaStock(String stockName, String neden) {
        log.info("[BACKOFFICE-UI] Hisse yasaklama: {} — neden: {}", stockName, neden);
        try {
            webClient.post()
                    .uri(ScyborsaApiEndpoints.BACKOFFICE_STOCK_BAN, stockName)
                    .bodyValue(Map.of("neden", neden))
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Hisse yasaklama hatasi: {}", stockName, e);
            throw new RuntimeException("Hisse yasaklanamadi: " + stockName, e);
        }
    }

    /**
     * Hissenin yasagini kaldirir.
     *
     * @param stockName yasagi kaldirilacak hisse kodu
     */
    public void yasakKaldirStock(String stockName) {
        log.info("[BACKOFFICE-UI] Yasak kaldirma: {}", stockName);
        try {
            webClient.delete()
                    .uri(ScyborsaApiEndpoints.BACKOFFICE_STOCK_BAN, stockName)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Yasak kaldirma hatasi: {}", stockName, e);
            throw new RuntimeException("Yasak kaldirilamadi: " + stockName, e);
        }
    }

    // ── Analist CRUD ─────────────────────────────────────

    /**
     * Tum analistleri (aktif + pasif) getirir.
     *
     * @return tum analist listesi; hata durumunda bos liste
     */
    public List<AnalistDto> getTumAnalistler() {
        log.info("[BACKOFFICE-UI] Tum analistler isteniyor");
        try {
            List<AnalistDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.ANALISTLER_TUMU)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<AnalistDto>>() {})
                    .block();
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Analist listesi alinamadi", e);
            return List.of();
        }
    }

    /**
     * Yeni analist olusturur.
     *
     * @param dto olusturulacak analist bilgileri
     */
    public void createAnalist(AnalistDto dto) {
        log.info("[BACKOFFICE-UI] Analist olusturma: {}", dto.getAd());
        try {
            webClient.post()
                    .uri(ScyborsaApiEndpoints.ANALISTLER)
                    .bodyValue(dto)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Analist olusturma hatasi", e);
            throw new RuntimeException("Analist olusturulamadi", e);
        }
    }

    /**
     * Mevcut analisti gunceller.
     *
     * @param id guncellenecek analist ID'si
     * @param dto yeni analist bilgileri
     */
    public void updateAnalist(Long id, AnalistDto dto) {
        log.info("[BACKOFFICE-UI] Analist guncelleme: id={}", id);
        try {
            webClient.put()
                    .uri(ScyborsaApiEndpoints.ANALISTLER_BY_ID, id)
                    .bodyValue(dto)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Analist guncelleme hatasi: id={}", id, e);
            throw new RuntimeException("Analist guncellenemedi", e);
        }
    }

    /**
     * Analisti siler (soft delete).
     *
     * @param id silinecek analist ID'si
     */
    public void deleteAnalist(Long id) {
        log.info("[BACKOFFICE-UI] Analist silme: id={}", id);
        try {
            webClient.delete()
                    .uri(ScyborsaApiEndpoints.ANALISTLER_BY_ID, id)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Analist silme hatasi: id={}", id, e);
            throw new RuntimeException("Analist silinemedi", e);
        }
    }

    /**
     * Pasif analisti tekrar aktiflestirir.
     *
     * @param id aktiflestirilecek analist ID'si
     */
    public void activateAnalist(Long id) {
        log.info("[BACKOFFICE-UI] Analist aktiflestirme: id={}", id);
        try {
            webClient.patch()
                    .uri(ScyborsaApiEndpoints.ANALISTLER_AKTIF, id)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Analist aktiflestirme hatasi: id={}", id, e);
            throw new RuntimeException("Analist aktiflestirilmedi", e);
        }
    }

    // ── Kurum CRUD ───────────────────────────────────────

    /**
     * Tum kurumlari (aktif + pasif) getirir.
     *
     * @return tum kurum listesi; hata durumunda bos liste
     */
    public List<ModelPortfoyKurumDto> getTumKurumlar() {
        log.info("[BACKOFFICE-UI] Tum kurumlar isteniyor");
        try {
            List<ModelPortfoyKurumDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.KURUMLAR_TUMU)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<ModelPortfoyKurumDto>>() {})
                    .block();
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Kurum listesi alinamadi", e);
            return List.of();
        }
    }

    /**
     * Yeni kurum olusturur.
     *
     * @param dto olusturulacak kurum bilgileri
     */
    public void createKurum(ModelPortfoyKurumDto dto) {
        log.info("[BACKOFFICE-UI] Kurum olusturma: {}", dto.getKurumAdi());
        try {
            webClient.post()
                    .uri(ScyborsaApiEndpoints.MODEL_PORTFOY_KURUMLAR)
                    .bodyValue(dto)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Kurum olusturma hatasi", e);
            throw new RuntimeException("Kurum olusturulamadi", e);
        }
    }

    /**
     * Mevcut kurumu gunceller.
     *
     * @param id guncellenecek kurum ID'si
     * @param dto yeni kurum bilgileri
     */
    public void updateKurum(Long id, ModelPortfoyKurumDto dto) {
        log.info("[BACKOFFICE-UI] Kurum guncelleme: id={}", id);
        try {
            webClient.put()
                    .uri(ScyborsaApiEndpoints.KURUMLAR_BY_ID, id)
                    .bodyValue(dto)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Kurum guncelleme hatasi: id={}", id, e);
            throw new RuntimeException("Kurum guncellenemedi", e);
        }
    }

    /**
     * Kurumu siler (soft delete).
     *
     * @param id silinecek kurum ID'si
     */
    public void deleteKurum(Long id) {
        log.info("[BACKOFFICE-UI] Kurum silme: id={}", id);
        try {
            webClient.delete()
                    .uri(ScyborsaApiEndpoints.KURUMLAR_BY_ID, id)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Kurum silme hatasi: id={}", id, e);
            throw new RuntimeException("Kurum silinemedi", e);
        }
    }

    /**
     * Pasif kurumu tekrar aktiflestirir.
     *
     * @param id aktiflestirilecek kurum ID'si
     */
    public void activateKurum(Long id) {
        log.info("[BACKOFFICE-UI] Kurum aktiflestirme: id={}", id);
        try {
            webClient.patch()
                    .uri(ScyborsaApiEndpoints.KURUMLAR_AKTIF, id)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Kurum aktiflestirme hatasi: id={}", id, e);
            throw new RuntimeException("Kurum aktiflestirilmedi", e);
        }
    }

    // ── Tarama ───────────────────────────────────────────

    /**
     * Bugunun tarama sonuclarini getirir.
     *
     * @return bugunun tarama sonuclari; hata durumunda bos liste
     */
    public List<ScreenerResultSummaryDto> getTodayScreenerResults() {
        log.info("[BACKOFFICE-UI] Bugunun tarama sonuclari isteniyor");
        try {
            List<ScreenerResultSummaryDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.BACKOFFICE_SCREENER_TODAY)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<ScreenerResultSummaryDto>>() {})
                    .block();
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Tarama sonuclari alinamadi", e);
            return List.of();
        }
    }

    // ── Kullanici CRUD ────────────────────────────────────

    /**
     * Tum kullanicilari getirir.
     *
     * @return tum kullanici listesi; hata durumunda bos liste
     */
    public List<UserDto> getTumKullanicilar() {
        log.info("[BACKOFFICE-UI] Tum kullanicilar isteniyor");
        try {
            List<UserDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.USERS)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<UserDto>>() {})
                    .block();
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Kullanici listesi alinamadi", e);
            return List.of();
        }
    }

    /**
     * Yeni kullanici olusturur.
     *
     * @param dto olusturulacak kullanici bilgileri
     */
    public void createKullanici(UserDto dto) {
        log.info("[BACKOFFICE-UI] Kullanici olusturma: {}",
                dto.getEmail() != null ? dto.getEmail() : dto.getUsername());
        try {
            webClient.post()
                    .uri(ScyborsaApiEndpoints.USERS)
                    .bodyValue(dto)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (WebClientResponseException e) {
            log.error("[BACKOFFICE-UI] Kullanici olusturma hatasi: {}", e.getResponseBodyAsString(), e);
            throw new RuntimeException(e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Kullanici olusturma hatasi", e);
            throw new RuntimeException("Kullanıcı oluşturulamadı", e);
        }
    }

    /**
     * Mevcut kullaniciyi gunceller.
     *
     * @param id guncellenecek kullanici ID'si
     * @param dto yeni kullanici bilgileri
     */
    public void updateKullanici(Long id, UserDto dto) {
        log.info("[BACKOFFICE-UI] Kullanici guncelleme: id={}", id);
        try {
            webClient.put()
                    .uri(ScyborsaApiEndpoints.USERS_BY_ID, id)
                    .bodyValue(dto)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (WebClientResponseException e) {
            log.error("[BACKOFFICE-UI] Kullanici guncelleme hatasi: id={}, mesaj={}", id, e.getResponseBodyAsString(), e);
            throw new RuntimeException(e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Kullanici guncelleme hatasi: id={}", id, e);
            throw new RuntimeException("Kullanıcı güncellenemedi", e);
        }
    }

    /**
     * Kullanici aktif/pasif durumunu degistirir.
     *
     * @param id kullanici ID'si
     */
    public void toggleKullaniciAktif(Long id) {
        log.info("[BACKOFFICE-UI] Kullanici aktif toggle: id={}", id);
        try {
            webClient.patch()
                    .uri(ScyborsaApiEndpoints.USERS_AKTIF, id)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Kullanici aktif toggle hatasi: id={}", id, e);
            throw new RuntimeException("Kullanici durumu degistirilemedi", e);
        }
    }

    // ── Alarm Yonetimi ──────────────────────────────────

    /**
     * Tum kullanicilarin alarmlarini getirir (admin panel icin).
     *
     * @return tum alarm listesi; hata durumunda bos liste
     */
    public List<PriceAlertDto> getAllAlarms() {
        log.info("[BACKOFFICE-UI] Tum alarmlar isteniyor");
        try {
            List<PriceAlertDto> result = webClient.get()
                    .uri(ScyborsaApiEndpoints.ALERTS_ADMIN_ALL)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<PriceAlertDto>>() {})
                    .block();
            return result != null ? result : List.of();
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Alarm listesi alinamadi", e);
            return List.of();
        }
    }

    /**
     * Bos dashboard DTO olusturur.
     *
     * <p>API erisim hatasi veya null yanit durumunda kullanilir.</p>
     *
     * @return bos degerlerle dolu dashboard DTO
     */
    private BackofficeDashboardDto emptyDashboard() {
        return BackofficeDashboardDto.builder()
                .stocks(BackofficeDashboardDto.StockStats.builder().build())
                .content(BackofficeDashboardDto.ContentStats.builder().build())
                .screener(BackofficeDashboardDto.ScreenerStats.builder().build())
                .system(BackofficeDashboardDto.SystemSummary.builder().build())
                .build();
    }
}
