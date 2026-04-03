package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.VbtsTedbirDto;
import com.scyborsa.ui.service.VbtsTedbirUiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.Collections;
import java.util.List;

/**
 * VBTS tedbirli hisseler sayfası controller'ı.
 *
 * <p>Borsa İstanbul VBTS tedbirli hisse verilerini server-side render ederek
 * kullanıcıya sunar.</p>
 *
 * @see VbtsTedbirUiService
 * @see VbtsTedbirDto
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class VbtsTedbirUiController {

    /** VBTS tedbir verilerini sağlayan servis. */
    private final VbtsTedbirUiService vbtsTedbirUiService;

    /**
     * VBTS tedbirli hisseler listesi sayfasını görüntüler.
     *
     * <p>Aktif tedbirleri API'den alır, KPI hesaplar (toplam, brüt takas,
     * tek fiyat, diğer) ve template'e iletir.</p>
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "vbts-tedbirli/vbts-tedbirli-list"} template adı
     */
    @GetMapping("/vbts-tedbirli")
    public String vbtsTedbirliList(Model model) {
        List<VbtsTedbirDto> tedbirler;
        try {
            tedbirler = vbtsTedbirUiService.getAktifTedbirler();
        } catch (Exception e) {
            log.warn("[VBTS-TEDBIR-UI] Veriler alınamadı: {}", e.getMessage());
            tedbirler = Collections.emptyList();
        }

        long brutTakas = tedbirler.stream()
                .filter(t -> "brut_takas".equalsIgnoreCase(t.getTedbirTipi()))
                .count();
        long tekFiyat = tedbirler.stream()
                .filter(t -> "tek_fiyat".equalsIgnoreCase(t.getTedbirTipi()))
                .count();
        long diger = tedbirler.stream()
                .filter(t -> !"brut_takas".equalsIgnoreCase(t.getTedbirTipi())
                        && !"tek_fiyat".equalsIgnoreCase(t.getTedbirTipi()))
                .count();

        model.addAttribute("tedbirler", tedbirler);
        model.addAttribute("toplam", tedbirler.size());
        model.addAttribute("brutTakas", brutTakas);
        model.addAttribute("tekFiyat", tekFiyat);
        model.addAttribute("diger", diger);

        return "vbts-tedbirli/vbts-tedbirli-list";
    }
}
