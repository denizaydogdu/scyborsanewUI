package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.ModelPortfoyKurumDto;
import com.scyborsa.ui.service.ModelPortfoyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

/**
 * Model portföy sayfa controller'ı.
 *
 * <p>Aracı kurum model portföy kartlarını gösteren sayfanın
 * Thymeleaf template'ine veri sağlar.</p>
 *
 * @see ModelPortfoyService
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class ModelPortfoyController {

    /** Model portfoy verilerini saglayan servis. */
    private final ModelPortfoyService modelPortfoyService;

    /**
     * Model portföy sayfasını gösterir.
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /model-portfoy}</p>
     *
     * <h4>Model Attribute'ları</h4>
     * <ul>
     *   <li>{@code kurumlar} — Aktif aracı kurum listesi ({@link ModelPortfoyKurumDto})</li>
     * </ul>
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "modelPortfoy/model-portfoy"} — templates/modelPortfoy/model-portfoy.html olarak çözümlenir
     */
    @GetMapping("/model-portfoy")
    public String modelPortfoy(Model model) {
        log.info("[MODEL-PORTFOY-UI] Sayfa erişimi");
        List<ModelPortfoyKurumDto> kurumlar = modelPortfoyService.getAktifKurumlar();
        model.addAttribute("kurumlar", kurumlar);
        return "modelPortfoy/model-portfoy";
    }
}
