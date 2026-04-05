package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.alert.PriceAlertDto;
import com.scyborsa.ui.service.AlertService;
import com.scyborsa.ui.service.Bist100Service;
import com.scyborsa.ui.service.KatilimEndeksiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import lombok.extern.slf4j.Slf4j;

import java.security.Principal;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Fiyat alarmi controller sinifi.
 *
 * <p>Alarm AJAX proxy endpoint'leri ve alarm listesi sayfasi icin
 * view controller islevlerini icerir. Tum istekler kullanicinin
 * email adresi ile API'ye proxy edilir.</p>
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class AlertController {

    /** Alarm islemlerini yapan servis. */
    private final AlertService alertService;

    /** Hisse logo verilerini saglayan servis. */
    private final Bist100Service bist100Service;

    /** Katilim endeksi kontrol servisi. */
    private final KatilimEndeksiService katilimEndeksiService;

    /**
     * Alarm listesi sayfasini goruntular.
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /alarmlar}</p>
     *
     * @param model Thymeleaf model nesnesi
     * @param principal oturum acmis kullanici
     * @return {@code "alert/alarm-list"} view
     */
    @GetMapping("/alarmlar")
    public String alarmListPage(Model model, Principal principal) {
        if (principal == null) return "redirect:/login";
        try {
            List<PriceAlertDto> alerts = alertService.getAlerts(principal.getName());
            model.addAttribute("alerts", alerts);
        } catch (Exception e) {
            log.warn("[ALERT-UI] Alarm listesi yuklenemedi: {}", e.getMessage());
            model.addAttribute("alerts", Collections.emptyList());
        }

        // Logo haritasi ve katilim endeksi
        try {
            model.addAttribute("stockLogos", bist100Service.getStockLogos());
        } catch (Exception e) {
            log.warn("[ALERT-UI] Logo haritasi alinamadi: {}", e.getMessage());
            model.addAttribute("stockLogos", Collections.emptyMap());
        }
        model.addAttribute("katilimCodes", katilimEndeksiService.getKatilimCodes());

        return "alert/alarm-list";
    }

    /**
     * Kullanicinin alarmlarini JSON olarak doner (AJAX proxy).
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /ajax/alerts}</p>
     *
     * @param status    opsiyonel durum filtresi
     * @param principal oturum acmis kullanici
     * @return alarm listesi
     */
    @GetMapping("/ajax/alerts")
    @ResponseBody
    public List<PriceAlertDto> getAlertsAjax(@RequestParam(required = false) String status,
                                              Principal principal) {
        if (principal == null) return Collections.emptyList();
        try {
            return alertService.getAlerts(principal.getName(), status);
        } catch (Exception e) {
            log.warn("[ALERT-UI] Alarm listesi alinamadi: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Okunmamis alarm sayisini JSON olarak doner (AJAX proxy).
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /ajax/alerts/unread-count}</p>
     *
     * @param principal oturum acmis kullanici
     * @return okunmamis alarm sayisi iceren Map ({@code count} alani)
     */
    @GetMapping("/ajax/alerts/unread-count")
    @ResponseBody
    public Map<String, Object> getUnreadCount(Principal principal) {
        if (principal == null) return Map.of("count", 0);
        try {
            return alertService.getUnreadCount(principal.getName());
        } catch (Exception e) {
            log.warn("[ALERT-UI] Okunmamis alarm sayisi alinamadi: {}", e.getMessage());
            return Map.of("count", 0);
        }
    }

    /**
     * Yeni fiyat alarmi olusturur (AJAX proxy).
     *
     * <p><b>HTTP Method:</b> POST</p>
     * <p><b>Path:</b> {@code /ajax/alerts}</p>
     *
     * @param alertDto alarm bilgileri
     * @param principal oturum acmis kullanici
     * @return olusturulan alarm DTO
     */
    @PostMapping("/ajax/alerts")
    @ResponseBody
    public ResponseEntity<PriceAlertDto> createAlert(@RequestBody PriceAlertDto alertDto,
                                                      Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            PriceAlertDto created = alertService.createAlert(alertDto, principal.getName());
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            log.warn("[ALERT-UI] Alarm olusturulamadi: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Mevcut bir fiyat alarmini gunceller (AJAX proxy).
     *
     * <p><b>HTTP Method:</b> PUT</p>
     * <p><b>Path:</b> {@code /ajax/alerts/{id}}</p>
     *
     * @param id        alarm ID
     * @param alertDto  guncel alarm bilgileri
     * @param principal oturum acmis kullanici
     * @return guncellenmis alarm DTO
     */
    @PutMapping("/ajax/alerts/{id}")
    @ResponseBody
    public ResponseEntity<PriceAlertDto> updateAlert(@PathVariable Long id,
                                                     @RequestBody PriceAlertDto alertDto,
                                                     Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        try {
            PriceAlertDto updated = alertService.updateAlert(id, alertDto, principal.getName());
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.warn("[ALERT-UI] Alarm guncellenemedi (id={}): {}", id, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Tum alarmlari okundu olarak isaretler (AJAX proxy).
     *
     * <p><b>HTTP Method:</b> PUT</p>
     * <p><b>Path:</b> {@code /ajax/alerts/read-all}</p>
     *
     * @param principal oturum acmis kullanici
     * @return 200 OK
     */
    @PutMapping("/ajax/alerts/read-all")
    @ResponseBody
    public ResponseEntity<Void> markAllRead(Principal principal) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            alertService.markAllRead(principal.getName());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.warn("[ALERT-UI] Alarmlar okundu isaretlenemedi: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Belirtilen alarmi iptal eder (AJAX proxy).
     *
     * <p><b>HTTP Method:</b> DELETE</p>
     * <p><b>Path:</b> {@code /ajax/alerts/{id}}</p>
     *
     * @param id alarm ID
     * @param principal oturum acmis kullanici
     * @return 200 OK
     */
    @DeleteMapping("/ajax/alerts/{id}")
    @ResponseBody
    public ResponseEntity<Void> cancelAlert(@PathVariable Long id, Principal principal) {
        if (principal == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        try {
            alertService.cancelAlert(id, principal.getName());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.warn("[ALERT-UI] Alarm iptal edilemedi (id={}): {}", id, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}
