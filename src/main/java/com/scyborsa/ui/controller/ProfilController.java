package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.UserDto;
import com.scyborsa.ui.service.ProfilService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.security.Principal;

/**
 * Kullanici profil sayfasi controller'i.
 *
 * <p>Giris yapmis kullanicinin kendi profil bilgilerini goruntulemesi ve
 * ad soyad / sifre guncellemesi islemlerini yonetir.</p>
 *
 * @see ProfilService
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class ProfilController {

    /** Kullanici profil islemlerini saglayan servis. */
    private final ProfilService profilService;

    /**
     * Profil sayfasini goruntular.
     *
     * <p>{@link Principal#getName()} ile giris yapan kullanicinin e-posta adresini alir,
     * API'den kullanici bilgilerini ceker ve template'e aktarir.</p>
     *
     * @param principal giris yapmis kullanici bilgisi
     * @param model Thymeleaf model nesnesi
     * @return {@code "profil"} template adi
     */
    @GetMapping("/profil")
    public String profil(Principal principal, Model model) {
        String email = principal.getName();
        log.info("[PROFIL-UI] Profil sayfasi: email={}", email);

        UserDto user = profilService.getByEmail(email);
        if (user == null) {
            log.warn("[PROFIL-UI] Kullanici bulunamadi: email={}", email);
            user = UserDto.builder().email(email).build();
        }

        model.addAttribute("user", user);
        return "profil/profil";
    }

    /**
     * Profil bilgilerini gunceller ve profil sayfasina yonlendirir.
     *
     * <p>Formdan gelen ad soyad ve sifre bilgilerini API'ye gonderir.
     * Basarili durumda success, hata durumunda error flash mesaji ekler.</p>
     *
     * @param adSoyad yeni ad soyad bilgisi
     * @param password yeni sifre (bos birakilabilir)
     * @param principal giris yapmis kullanici bilgisi
     * @param redirectAttributes flash mesaj icin
     * @return redirect URL
     */
    @PostMapping("/profil")
    public String updateProfil(@RequestParam String adSoyad,
                               @RequestParam(required = false) String password,
                               Principal principal,
                               RedirectAttributes redirectAttributes) {
        String email = principal.getName();
        log.info("[PROFIL-UI] Profil guncelleme istegi: email={}", email);

        try {
            // Oncelikle kullanici ID'sini almamiz gerekiyor
            UserDto user = profilService.getByEmail(email);
            if (user == null || user.getId() == null) {
                log.error("[PROFIL-UI] Kullanici bulunamadi, guncelleme yapilamiyor: email={}", email);
                redirectAttributes.addFlashAttribute("errorMsg",
                        "Kullanici bilgileri alinamadi. Lutfen tekrar deneyiniz.");
                return "redirect:/profil";
            }

            profilService.updateProfil(user.getId(), adSoyad, password);
            redirectAttributes.addFlashAttribute("successMsg", "Profil bilgileriniz basariyla guncellendi.");
        } catch (Exception e) {
            log.error("[PROFIL-UI] Profil guncelleme hatasi: email={}", email, e);
            String errorDetail = e.getMessage();
            if (errorDetail != null && errorDetail.contains("zorunludur")) {
                redirectAttributes.addFlashAttribute("errorMsg", errorDetail);
            } else {
                redirectAttributes.addFlashAttribute("errorMsg",
                        "Profil guncelleme isleminde bir hata olustu. Lutfen tekrar deneyiniz.");
            }
        }
        return "redirect:/profil";
    }
}
