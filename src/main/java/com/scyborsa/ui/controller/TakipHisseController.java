package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.TakipHisseDto;
import com.scyborsa.ui.service.TakipHisseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.List;

/**
 * Takip Hisseleri sayfa controller'i.
 *
 * <p>{@code /takip-hisseleri} adresinde takip hissesi listesi sayfasini sunar.
 * Tum takip hissesi verileri scyborsaApi uzerinden gelir.</p>
 *
 * @see TakipHisseService
 * @see TakipHisseDto
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class TakipHisseController {

    /** Takip hissesi verilerini saglayan servis. */
    private final TakipHisseService takipHisseService;

    /**
     * Takip hisseleri listesi sayfasini goruntular.
     *
     * <p>Aktif takip hisselerini scyborsaApi'den getirir.
     * Takip hissesi verisi Thymeleaf inline JS ile sayfaya JSON olarak embed edilir
     * (client-side filtreleme/siralama icin).</p>
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "takip-hisseleri/takip-hisseleri-list"} template adi
     */
    @GetMapping("/takip-hisseleri")
    public String takipHisseleriList(Model model) {
        log.info("[TAKIP-HISSE-UI] Takip hisseleri listesi sayfasi isteniyor");

        List<TakipHisseDto> takipHisseleri = takipHisseService.getAktifTakipHisseleri();

        log.info("[TAKIP-HISSE-UI] Takip hisseleri listesi yuklendi [count={}]", takipHisseleri.size());

        model.addAttribute("takipHisseleri", takipHisseleri);

        return "takip-hisseleri/takip-hisseleri-list";
    }

    /**
     * Aktif takip hisselerini JSON olarak döner (AJAX polling için).
     *
     * <p>30 saniye aralıklarla çağrılarak güncel fiyat ve getiri
     * bilgilerinin tazelenmesini sağlar.</p>
     *
     * @return aktif takip hissesi listesi JSON
     */
    @GetMapping("/ajax/takip-hisseleri")
    @ResponseBody
    public List<TakipHisseDto> getAktifTakipHisseleriAjax() {
        return takipHisseService.getAktifTakipHisseleri();
    }
}
