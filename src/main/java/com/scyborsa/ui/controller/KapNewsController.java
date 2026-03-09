package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.HaberDetayDto;
import com.scyborsa.ui.dto.KapNewsResponseDto;
import com.scyborsa.ui.service.KapNewsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * KAP canli haber sayfa controller'i.
 *
 * <p>TradingView API'lerinden alinan canli KAP haberlerini, piyasa haberlerini
 * ve dunya haberlerini tablo formatinda gosteren sayfalarin Thymeleaf template'lerine veri saglar.</p>
 *
 * @see KapNewsService
 */
@Slf4j
@Controller
@RequiredArgsConstructor
public class KapNewsController {

    private final KapNewsService kapNewsService;

    /**
     * KAP haberleri sayfasini gosterir.
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /kap-news}</p>
     *
     * <h4>Model Attribute'lari</h4>
     * <ul>
     *   <li>{@code kapNewsResponse} — KAP haber response ({@link KapNewsResponseDto})</li>
     * </ul>
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "kapNews/kap-news"} — templates/kapNews/kap-news.html olarak cozumlenir
     */
    @GetMapping("/kap-news")
    public String kapNews(Model model) {
        log.info("[KAP-NEWS-UI] Sayfa erisimi");
        KapNewsResponseDto kapNewsResponse = kapNewsService.getKapNews();
        model.addAttribute("kapNewsResponse", kapNewsResponse);
        return "kapNews/kap-news";
    }

    /**
     * Piyasa haberleri sayfasini gosterir.
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /market-news}</p>
     *
     * <h4>Model Attribute'lari</h4>
     * <ul>
     *   <li>{@code marketNewsResponse} — Piyasa haberleri response ({@link KapNewsResponseDto})</li>
     * </ul>
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "kapNews/market-news"} — templates/kapNews/market-news.html olarak cozumlenir
     */
    @GetMapping("/market-news")
    public String marketNews(Model model) {
        log.info("[MARKET-NEWS-UI] Sayfa erisimi");
        KapNewsResponseDto marketNewsResponse = kapNewsService.getMarketNews();
        model.addAttribute("marketNewsResponse", marketNewsResponse);
        return "kapNews/market-news";
    }

    /**
     * Dunya haberleri sayfasini gosterir.
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /world-news}</p>
     *
     * <h4>Model Attribute'lari</h4>
     * <ul>
     *   <li>{@code worldNewsResponse} — Dunya haberleri response ({@link KapNewsResponseDto})</li>
     * </ul>
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "kapNews/world-news"} — templates/kapNews/world-news.html olarak cozumlenir
     */
    @GetMapping("/world-news")
    public String worldNews(Model model) {
        log.info("[WORLD-NEWS-UI] Sayfa erisimi");
        KapNewsResponseDto worldNewsResponse = kapNewsService.getWorldNews();
        model.addAttribute("worldNewsResponse", worldNewsResponse);
        return "kapNews/world-news";
    }

    /**
     * Haber detay sayfasini gosterir.
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /haber/{newsId}}</p>
     *
     * <p>scyborsaApi'deki haber detay endpoint'ini cagirarak haberin
     * baslik, icerik, saglayici ve tarih bilgilerini gosterir.
     * Haber bulunamazsa "Haber Bulunamadi" mesaji goruntulenir.</p>
     *
     * <h4>Model Attribute'lari</h4>
     * <ul>
     *   <li>{@code haber} — Haber detay bilgileri ({@link HaberDetayDto}), null olabilir</li>
     * </ul>
     *
     * @param newsId TradingView haber kimligi
     * @param model  Thymeleaf model nesnesi
     * @return {@code "kapNews/haber-detay"} — templates/kapNews/haber-detay.html olarak cozumlenir
     */
    @GetMapping("/haber/{newsId}")
    public String haberDetay(@PathVariable String newsId, Model model) {
        // newsId format dogrulama
        if (newsId == null || !newsId.matches("[a-zA-Z0-9_\\-:.]{1,200}")) {
            return "redirect:/market-news";
        }
        log.info("[HABER-DETAY-UI] Sayfa erisimi [newsId={}]", newsId);
        HaberDetayDto haber = kapNewsService.getHaberDetay(newsId);
        model.addAttribute("haber", haber);
        return "kapNews/haber-detay";
    }
}
