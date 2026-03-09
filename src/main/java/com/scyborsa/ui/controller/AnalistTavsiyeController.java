package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.AnalistTavsiyeDto;
import com.scyborsa.ui.service.AnalistTavsiyeService;
import com.scyborsa.ui.service.Bist100Service;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Analist tavsiyeleri sayfa controller'i.
 *
 * <p>{@code /analist-tavsiyeleri} URL'inde analist tavsiye listesi sayfasini sunar.</p>
 *
 * @see AnalistTavsiyeService
 * @see Bist100Service
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class AnalistTavsiyeController {

    private final AnalistTavsiyeService analistTavsiyeService;
    /** Hisse logoid haritasi icin BIST servis bagimliligi. */
    private final Bist100Service bist100Service;

    /**
     * Analist tavsiyeleri listeleme sayfasi.
     *
     * @param model Thymeleaf model
     * @return template adi
     */
    @GetMapping("/analist-tavsiyeleri")
    public String analistTavsiyeleri(Model model) {
        log.info("[TAVSIYE-UI] Analist tavsiyeleri sayfasi istendi");
        List<AnalistTavsiyeDto> tavsiyeler = analistTavsiyeService.getAnalistTavsiyeleri();

        // Distinct brokerage listesi (dropdown icin)
        List<String> brokerages = tavsiyeler.stream()
                .filter(t -> t.getBrokerage() != null && t.getBrokerage().getShortTitle() != null)
                .map(t -> t.getBrokerage().getShortTitle())
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        model.addAttribute("tavsiyeler", tavsiyeler);
        model.addAttribute("brokerages", brokerages);
        model.addAttribute("stockLogos", bist100Service.getStockLogos());
        return "analist-tavsiyeleri/analist-tavsiyeleri-list";
    }

    /**
     * Belirli bir hisse koduna ait analist tavsiye detay sayfasi.
     *
     * <p>Hisse kodu buyuk harfe donusturulur ve format kontrol edilir.
     * Gecersiz kod veya bos sonuc durumunda liste sayfasina yonlendirir.</p>
     *
     * @param stockCode hisse kodu (BIST ticker, ornek: PETKM)
     * @param model Thymeleaf model
     * @return template adi veya redirect
     */
    @GetMapping("/analist-tavsiyeleri/{stockCode}")
    public String analistTavsiyeDetay(@PathVariable String stockCode, Model model) {
        // Null/blank kontrol
        if (stockCode == null || stockCode.isBlank()) {
            log.warn("[TAVSIYE-UI] Gecersiz stockCode: bos veya null");
            return "redirect:/analist-tavsiyeleri";
        }

        // Uppercase + regex kontrol
        String code = stockCode.trim().toUpperCase();
        if (code.length() > 10 || !code.matches("[A-Z0-9]+")) {
            log.warn("[TAVSIYE-UI] Gecersiz stockCode formati: {}", code);
            return "redirect:/analist-tavsiyeleri";
        }

        try {
            log.info("[TAVSIYE-UI] Analist tavsiye detay sayfasi istendi: {}", code);
            List<AnalistTavsiyeDto> tavsiyeler = analistTavsiyeService.getAnalistTavsiyeleriByCode(code);

            // Bos sonuc — liste sayfasina yonlendir
            if (tavsiyeler == null || tavsiyeler.isEmpty()) {
                log.info("[TAVSIYE-UI] {} icin tavsiye bulunamadi, listeye yonlendiriliyor", code);
                return "redirect:/analist-tavsiyeleri";
            }

            // KPI ozet hesaplama
            Map<String, Object> ozet = new HashMap<>();
            ozet.put("toplamTavsiye", tavsiyeler.size());

            long alSayisi = tavsiyeler.stream()
                    .filter(t -> t.getRatingType() != null && "al".equalsIgnoreCase(t.getRatingType()))
                    .count();
            ozet.put("alSayisi", alSayisi);

            double ortalamaHedefFiyat = tavsiyeler.stream()
                    .filter(t -> t.getTargetPrice() != null && t.getTargetPrice() > 0)
                    .mapToDouble(AnalistTavsiyeDto::getTargetPrice)
                    .average()
                    .orElse(0.0);
            ozet.put("ortalamaHedefFiyat", ortalamaHedefFiyat);

            String sonGuncelleme = tavsiyeler.stream()
                    .map(AnalistTavsiyeDto::getDate)
                    .filter(d -> d != null && d.length() >= 10)
                    .max(String::compareTo)
                    .orElse(null);
            ozet.put("sonGuncelleme", sonGuncelleme);

            model.addAttribute("stockCode", code);
            model.addAttribute("tavsiyeler", tavsiyeler);
            model.addAttribute("ozet", ozet);

            return "analist-tavsiyeleri/analist-tavsiyeleri-detail";
        } catch (WebClientResponseException e) {
            log.error("[TAVSIYE-UI] API hatasi ({} {}): {}", e.getStatusCode(), code, e.getMessage());
            return "redirect:/analist-tavsiyeleri";
        } catch (Exception e) {
            log.error("[TAVSIYE-UI] Beklenmeyen hata ({}): {}", code, e.getMessage());
            return "redirect:/analist-tavsiyeleri";
        }
    }
}
