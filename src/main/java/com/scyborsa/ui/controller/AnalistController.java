package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.AnalistDto;
import com.scyborsa.ui.service.AnalistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

/**
 * Analistler sayfa controller'i.
 *
 * <p>Analist kartlarini gosteren sayfanin
 * Thymeleaf template'ine veri saglar.</p>
 *
 * @see AnalistService
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class AnalistController {

    private final AnalistService analistService;

    /**
     * Analistler sayfasini gosterir.
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /analistler}</p>
     *
     * <h4>Model Attribute'lari</h4>
     * <ul>
     *   <li>{@code analistler} — Aktif analist listesi ({@link AnalistDto})</li>
     * </ul>
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "analist/analistler"} — templates/analist/analistler.html olarak cozumlenir
     */
    @GetMapping("/analistler")
    public String analistler(Model model) {
        log.info("[ANALIST-UI] Sayfa erisimi");
        List<AnalistDto> analistler = analistService.getAktifAnalistler();
        model.addAttribute("analistler", analistler);
        return "analist/analistler";
    }
}
