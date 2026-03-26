package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.AnalistDto;
import com.scyborsa.ui.dto.BackofficeDashboardDto;
import com.scyborsa.ui.dto.ModelPortfoyKurumDto;
import com.scyborsa.ui.dto.ScreenerResultSummaryDto;
import com.scyborsa.ui.dto.StockDto;
import com.scyborsa.ui.dto.UserDto;
import com.scyborsa.ui.service.BackofficeService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;

/**
 * Backoffice yonetim paneli SSR controller'i.
 *
 * <p>5 sayfa sunar: Dashboard, Hisse Yonetimi, Analistler, Kurumlar, Taramalar.
 * Tum endpoint'ler {@code /backoffice} prefix'i altindadir.</p>
 *
 * @see BackofficeService
 */
@Slf4j
@Controller
@RequestMapping("/backoffice")
@RequiredArgsConstructor
public class BackofficeController {

    /** Backoffice yonetim islemlerini saglayan servis. */
    private final BackofficeService backofficeService;

    // ── Dashboard ────────────────────────────────────────

    /**
     * Dashboard sayfasini goruntular.
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "backoffice/dashboard"} template adi
     */
    @GetMapping({"", "/"})
    public String dashboard(Model model) {
        BackofficeDashboardDto stats = backofficeService.getDashboardStats();
        model.addAttribute("stats", stats);
        return "backoffice/dashboard";
    }

    // ── Hisse Yonetimi ───────────────────────────────────

    /**
     * Hisse yonetimi sayfasini goruntular.
     *
     * @param filtre hisse filtresi ("all", "aktif", "yasakli")
     * @param model Thymeleaf model nesnesi
     * @return {@code "backoffice/hisseler"} template adi
     */
    @GetMapping("/hisseler")
    public String hisseler(@RequestParam(defaultValue = "all") String filtre, Model model) {
        List<StockDto> hisseler = backofficeService.getStocks(filtre);
        model.addAttribute("hisseler", hisseler);
        model.addAttribute("aktifFilter", filtre);
        return "backoffice/hisseler";
    }

    /**
     * Hisseyi yasaklar ve hisse sayfasina yonlendirir.
     *
     * @param stockName yasaklanacak hisse kodu
     * @param neden yasaklama nedeni
     * @param redirectAttributes flash mesaj icin
     * @return redirect URL
     */
    @PostMapping("/hisseler/{stockName}/yasakla")
    public String yasakla(@PathVariable String stockName,
                          @RequestParam String neden,
                          RedirectAttributes redirectAttributes) {
        try {
            backofficeService.yasaklaStock(stockName, neden);
            redirectAttributes.addFlashAttribute("successMsg", stockName + " hissesi yasaklandi.");
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Yasaklama hatasi: {}", stockName, e);
            redirectAttributes.addFlashAttribute("errorMsg", "Hisse yasaklama isleminde bir hata olustu. Lutfen tekrar deneyiniz.");
        }
        return "redirect:/backoffice/hisseler";
    }

    /**
     * Hissenin yasagini kaldirir ve hisse sayfasina yonlendirir.
     *
     * @param stockName yasagi kaldirilacak hisse kodu
     * @param redirectAttributes flash mesaj icin
     * @return redirect URL
     */
    @PostMapping("/hisseler/{stockName}/yasakkaldir")
    public String yasakKaldir(@PathVariable String stockName,
                              RedirectAttributes redirectAttributes) {
        try {
            backofficeService.yasakKaldirStock(stockName);
            redirectAttributes.addFlashAttribute("successMsg", stockName + " hissesinin yasagi kaldirildi.");
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Yasak kaldirma hatasi: {}", stockName, e);
            redirectAttributes.addFlashAttribute("errorMsg", "Yasak kaldirma isleminde bir hata olustu. Lutfen tekrar deneyiniz.");
        }
        return "redirect:/backoffice/hisseler";
    }

    // ── Analistler ───────────────────────────────────────

    /**
     * Analist yonetimi sayfasini goruntular.
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "backoffice/analistler"} template adi
     */
    @GetMapping("/analistler")
    public String analistler(Model model) {
        List<AnalistDto> analistler = backofficeService.getTumAnalistler();
        model.addAttribute("analistler", analistler);
        return "backoffice/analistler";
    }

    /**
     * Yeni analist olusturur.
     *
     * @param dto analist bilgileri
     * @param redirectAttributes flash mesaj icin
     * @return redirect URL
     */
    @PostMapping("/analistler")
    public String createAnalist(@ModelAttribute AnalistDto dto,
                                RedirectAttributes redirectAttributes) {
        try {
            backofficeService.createAnalist(dto);
            redirectAttributes.addFlashAttribute("successMsg", dto.getAd() + " analist olusturuldu.");
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Analist olusturma hatasi", e);
            redirectAttributes.addFlashAttribute("errorMsg", "Analist olusturma isleminde bir hata olustu. Lutfen tekrar deneyiniz.");
        }
        return "redirect:/backoffice/analistler";
    }

    /**
     * Mevcut analisti gunceller.
     *
     * @param id analist ID'si
     * @param dto yeni analist bilgileri
     * @param redirectAttributes flash mesaj icin
     * @return redirect URL
     */
    @PostMapping("/analistler/{id}")
    public String updateAnalist(@PathVariable Long id,
                                @ModelAttribute AnalistDto dto,
                                RedirectAttributes redirectAttributes) {
        try {
            backofficeService.updateAnalist(id, dto);
            redirectAttributes.addFlashAttribute("successMsg", "Analist guncellendi.");
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Analist guncelleme hatasi: id={}", id, e);
            redirectAttributes.addFlashAttribute("errorMsg", "Analist guncelleme isleminde bir hata olustu. Lutfen tekrar deneyiniz.");
        }
        return "redirect:/backoffice/analistler";
    }

    /**
     * Analisti siler (soft delete).
     *
     * @param id analist ID'si
     * @param redirectAttributes flash mesaj icin
     * @return redirect URL
     */
    @PostMapping("/analistler/{id}/sil")
    public String deleteAnalist(@PathVariable Long id,
                                RedirectAttributes redirectAttributes) {
        try {
            backofficeService.deleteAnalist(id);
            redirectAttributes.addFlashAttribute("successMsg", "Analist pasife alindi.");
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Analist silme hatasi: id={}", id, e);
            redirectAttributes.addFlashAttribute("errorMsg", "Analist silme isleminde bir hata olustu. Lutfen tekrar deneyiniz.");
        }
        return "redirect:/backoffice/analistler";
    }

    /**
     * Pasif analisti aktiflestirir.
     *
     * @param id analist ID'si
     * @param redirectAttributes flash mesaj icin
     * @return redirect URL
     */
    @PostMapping("/analistler/{id}/aktif")
    public String activateAnalist(@PathVariable Long id,
                                  RedirectAttributes redirectAttributes) {
        try {
            backofficeService.activateAnalist(id);
            redirectAttributes.addFlashAttribute("successMsg", "Analist aktiflestirildi.");
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Analist aktiflestirme hatasi: id={}", id, e);
            redirectAttributes.addFlashAttribute("errorMsg", "Analist aktiflestirme isleminde bir hata olustu. Lutfen tekrar deneyiniz.");
        }
        return "redirect:/backoffice/analistler";
    }

    // ── Kurumlar ─────────────────────────────────────────

    /**
     * Kurum yonetimi sayfasini goruntular.
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "backoffice/kurumlar"} template adi
     */
    @GetMapping("/kurumlar")
    public String kurumlar(Model model) {
        List<ModelPortfoyKurumDto> kurumlar = backofficeService.getTumKurumlar();
        model.addAttribute("kurumlar", kurumlar);
        return "backoffice/kurumlar";
    }

    /**
     * Yeni kurum olusturur.
     *
     * @param dto kurum bilgileri
     * @param redirectAttributes flash mesaj icin
     * @return redirect URL
     */
    @PostMapping("/kurumlar")
    public String createKurum(@ModelAttribute ModelPortfoyKurumDto dto,
                              RedirectAttributes redirectAttributes) {
        try {
            backofficeService.createKurum(dto);
            redirectAttributes.addFlashAttribute("successMsg", dto.getKurumAdi() + " kurum olusturuldu.");
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Kurum olusturma hatasi", e);
            redirectAttributes.addFlashAttribute("errorMsg", "Kurum olusturma isleminde bir hata olustu. Lutfen tekrar deneyiniz.");
        }
        return "redirect:/backoffice/kurumlar";
    }

    /**
     * Mevcut kurumu gunceller.
     *
     * @param id kurum ID'si
     * @param dto yeni kurum bilgileri
     * @param redirectAttributes flash mesaj icin
     * @return redirect URL
     */
    @PostMapping("/kurumlar/{id}")
    public String updateKurum(@PathVariable Long id,
                              @ModelAttribute ModelPortfoyKurumDto dto,
                              RedirectAttributes redirectAttributes) {
        try {
            backofficeService.updateKurum(id, dto);
            redirectAttributes.addFlashAttribute("successMsg", "Kurum guncellendi.");
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Kurum guncelleme hatasi: id={}", id, e);
            redirectAttributes.addFlashAttribute("errorMsg", "Kurum guncelleme isleminde bir hata olustu. Lutfen tekrar deneyiniz.");
        }
        return "redirect:/backoffice/kurumlar";
    }

    /**
     * Kurumu siler (soft delete).
     *
     * @param id kurum ID'si
     * @param redirectAttributes flash mesaj icin
     * @return redirect URL
     */
    @PostMapping("/kurumlar/{id}/sil")
    public String deleteKurum(@PathVariable Long id,
                              RedirectAttributes redirectAttributes) {
        try {
            backofficeService.deleteKurum(id);
            redirectAttributes.addFlashAttribute("successMsg", "Kurum pasife alindi.");
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Kurum silme hatasi: id={}", id, e);
            redirectAttributes.addFlashAttribute("errorMsg", "Kurum silme isleminde bir hata olustu. Lutfen tekrar deneyiniz.");
        }
        return "redirect:/backoffice/kurumlar";
    }

    /**
     * Pasif kurumu aktiflestirir.
     *
     * @param id kurum ID'si
     * @param redirectAttributes flash mesaj icin
     * @return redirect URL
     */
    @PostMapping("/kurumlar/{id}/aktif")
    public String activateKurum(@PathVariable Long id,
                                RedirectAttributes redirectAttributes) {
        try {
            backofficeService.activateKurum(id);
            redirectAttributes.addFlashAttribute("successMsg", "Kurum aktiflestirildi.");
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Kurum aktiflestirme hatasi: id={}", id, e);
            redirectAttributes.addFlashAttribute("errorMsg", "Kurum aktiflestirme isleminde bir hata olustu. Lutfen tekrar deneyiniz.");
        }
        return "redirect:/backoffice/kurumlar";
    }

    // ── Taramalar ────────────────────────────────────────

    /**
     * Tarama izleme sayfasini goruntular.
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "backoffice/taramalar"} template adi
     */
    @GetMapping("/taramalar")
    public String taramalar(Model model) {
        BackofficeDashboardDto stats = backofficeService.getDashboardStats();
        List<ScreenerResultSummaryDto> taramalar = backofficeService.getTodayScreenerResults();
        model.addAttribute("stats", stats);
        model.addAttribute("taramalar", taramalar);
        return "backoffice/taramalar";
    }

    // ── Kullanicilar ──────────────────────────────────────

    /**
     * Kullanici yonetimi sayfasini goruntular.
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "backoffice/kullanicilar"} template adi
     */
    @GetMapping("/kullanicilar")
    public String kullanicilar(Model model) {
        List<UserDto> kullanicilar = backofficeService.getTumKullanicilar();
        model.addAttribute("kullanicilar", kullanicilar);
        return "backoffice/kullanicilar";
    }

    /**
     * Yeni kullanici olusturur.
     *
     * @param dto kullanici bilgileri
     * @param redirectAttributes flash mesaj icin
     * @return redirect URL
     */
    @PostMapping("/kullanicilar")
    public String createKullanici(@ModelAttribute UserDto dto,
                                  RedirectAttributes redirectAttributes) {
        try {
            backofficeService.createKullanici(dto);
            String identifier = (dto.getEmail() != null && !dto.getEmail().isBlank())
                    ? dto.getEmail() : dto.getUsername();
            redirectAttributes.addFlashAttribute("successMsg", identifier + " kullanıcı oluşturuldu.");
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Kullanici olusturma hatasi", e);
            String errorDetail = e.getMessage();
            if (errorDetail != null && (errorDetail.contains("zaten mevcut")
                    || errorDetail.contains("zaten kullanılıyor")
                    || errorDetail.contains("zorunludur")
                    || errorDetail.contains("Gecersiz rol"))) {
                redirectAttributes.addFlashAttribute("errorMsg", errorDetail);
            } else {
                redirectAttributes.addFlashAttribute("errorMsg",
                        "Kullanıcı oluşturma işleminde bir hata oluştu. Lütfen tekrar deneyiniz.");
            }
        }
        return "redirect:/backoffice/kullanicilar";
    }

    /**
     * Mevcut kullaniciyi gunceller.
     *
     * @param id kullanici ID'si
     * @param dto yeni kullanici bilgileri
     * @param redirectAttributes flash mesaj icin
     * @return redirect URL
     */
    @PostMapping("/kullanicilar/{id}")
    public String updateKullanici(@PathVariable Long id,
                                  @ModelAttribute UserDto dto,
                                  RedirectAttributes redirectAttributes) {
        try {
            backofficeService.updateKullanici(id, dto);
            redirectAttributes.addFlashAttribute("successMsg", "Kullanıcı güncellendi.");
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Kullanici guncelleme hatasi: id={}", id, e);
            String errorDetail = e.getMessage();
            if (errorDetail != null && (errorDetail.contains("zaten mevcut")
                    || errorDetail.contains("zaten kullanılıyor")
                    || errorDetail.contains("zorunludur")
                    || errorDetail.contains("Gecersiz rol"))) {
                redirectAttributes.addFlashAttribute("errorMsg", errorDetail);
            } else {
                redirectAttributes.addFlashAttribute("errorMsg",
                        "Kullanıcı güncelleme işleminde bir hata oluştu. Lütfen tekrar deneyiniz.");
            }
        }
        return "redirect:/backoffice/kullanicilar";
    }

    /**
     * Kullanici aktif/pasif durumunu degistirir.
     *
     * @param id kullanici ID'si
     * @param redirectAttributes flash mesaj icin
     * @return redirect URL
     */
    @PostMapping("/kullanicilar/{id}/aktif")
    public String toggleKullaniciAktif(@PathVariable Long id,
                                       RedirectAttributes redirectAttributes) {
        try {
            backofficeService.toggleKullaniciAktif(id);
            redirectAttributes.addFlashAttribute("successMsg", "Kullanıcı durumu değiştirildi.");
        } catch (Exception e) {
            log.error("[BACKOFFICE-UI] Kullanici aktif toggle hatasi: id={}", id, e);
            redirectAttributes.addFlashAttribute("errorMsg", "Kullanici durum degistirme isleminde bir hata olustu. Lutfen tekrar deneyiniz.");
        }
        return "redirect:/backoffice/kullanicilar";
    }
}
