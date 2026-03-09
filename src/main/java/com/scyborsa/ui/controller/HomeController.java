package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.DashboardSentimentDto;
import com.scyborsa.ui.dto.IndexPerformanceDto;
import com.scyborsa.ui.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.security.Principal;
import java.util.List;

/**
 * Ana sayfa ve giris view controller'i.
 *
 * <p>Landing page ({@code /}), login sayfasi ({@code /login})
 * ve dashboard ({@code /dashboard}) yonlendirmelerini yonetir.
 * Dashboard sayfasi icin piyasa sentiment verilerini de saglar.</p>
 */
@Controller
@RequiredArgsConstructor
public class HomeController {

    private final DashboardService dashboardService;

    /**
     * Public landing page gorunumunu doner.
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /}</p>
     *
     * @return {@code "landing"} — public landing page
     */
    @GetMapping("/")
    public String landing() {
        return "landing";
    }

    /**
     * Login sayfasini goruntular.
     *
     * <p>Zaten giris yapmis kullanicilari dashboard'a yonlendirir.</p>
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /login}</p>
     *
     * @param principal mevcut kullanici (null ise giris yapilmamis)
     * @return login sayfasi veya dashboard redirect
     */
    @GetMapping("/login")
    public String login(Principal principal) {
        if (principal != null) {
            return "redirect:/dashboard";
        }
        return "auth/login";
    }

    /**
     * Ana sayfa (dashboard) gorunumunu doner.
     *
     * <p>Piyasa sentiment verilerini model'e ekleyerek Thymeleaf
     * template'ine aktarir.</p>
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /dashboard}</p>
     *
     * @param model Thymeleaf model nesnesi
     * @return {@code "index"} — mevcut ana sayfa
     */
    @GetMapping("/dashboard")
    public String dashboard(Model model) {
        model.addAttribute("sentiment", dashboardService.getSentiment());
        model.addAttribute("indexPerformances", dashboardService.getIndexPerformances());
        return "index";
    }

    /**
     * Sentiment verilerini JSON olarak doner (AJAX proxy).
     *
     * <p>Frontend'in periyodik olarak guncel sentiment verisi
     * cekmesi icin kullanilir. scyborsaApi'ye proxy yapar.</p>
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /ajax/dashboard/sentiment}</p>
     *
     * @return guncel sentiment verileri
     */
    @GetMapping("/ajax/dashboard/sentiment")
    @ResponseBody
    public DashboardSentimentDto getSentimentApi() {
        return dashboardService.getSentiment();
    }

    /**
     * Endeks performans verilerini JSON olarak doner (AJAX proxy).
     *
     * <p>Frontend'in periyodik olarak guncel endeks performans verisi
     * cekmesi icin kullanilir. scyborsaApi'ye proxy yapar.</p>
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /ajax/dashboard/indexes}</p>
     *
     * @return guncel endeks performans listesi
     */
    @GetMapping("/ajax/dashboard/indexes")
    @ResponseBody
    public List<IndexPerformanceDto> getIndexesApi() {
        return dashboardService.getIndexPerformances();
    }
}
