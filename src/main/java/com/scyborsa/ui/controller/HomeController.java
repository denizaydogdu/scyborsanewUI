package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.DashboardSentimentDto;
import com.scyborsa.ui.dto.IndexPerformanceDto;
import com.scyborsa.ui.dto.MoneyFlowResponse;
import com.scyborsa.ui.dto.SectorStockDto;
import com.scyborsa.ui.dto.SectorSummaryDto;
import com.scyborsa.ui.service.Bist100Service;
import com.scyborsa.ui.service.DashboardService;
import com.scyborsa.ui.service.DividendService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.security.Principal;
import java.util.List;
import java.util.Map;

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

    /** Dashboard verilerini saglayan servis. */
    private final DashboardService dashboardService;

    /** BIST hisse verilerini saglayan servis. */
    private final Bist100Service bist100Service;

    /** Temettu bilgilerini saglayan servis. */
    private final DividendService dividendService;

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
        List<SectorSummaryDto> allSectors = dashboardService.getSectorSummaries();
        model.addAttribute("topSectors", dashboardService.getTopSectors(allSectors));
        model.addAttribute("bottomSectors", dashboardService.getBottomSectors(allSectors));
        // TODO: Money flow gecici devre disi — veri kaynagi dogru degil, ileride tekrar aktif edilecek
        // model.addAttribute("moneyFlow", dashboardService.getMoneyFlow());
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

    /**
     * Para akisi verilerini JSON olarak doner (AJAX proxy).
     *
     * <p>Frontend'in periyodik olarak guncel para akisi verisi
     * cekmesi icin kullanilir. scyborsaApi'ye proxy yapar.</p>
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /ajax/dashboard/money-flow}</p>
     *
     * @return guncel para akisi verileri
     */
    // TODO: Money flow gecici devre disi — veri kaynagi dogru degil, ileride tekrar aktif edilecek
    // @GetMapping("/ajax/dashboard/money-flow")
    // @ResponseBody
    // public MoneyFlowResponse getMoneyFlowApi() {
    //     return dashboardService.getMoneyFlow();
    // }

    /**
     * Hisse arama icin tum hisse listesini JSON olarak doner (AJAX proxy).
     *
     * <p>Header search bar'daki autocomplete ozelligi icin kullanilir.
     * Client tarafinda cache'lenerek yerel filtreleme yapilir.</p>
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /ajax/stocks/search}</p>
     *
     * @return tum hisse listesi (ticker, description, logoid vb.)
     */
    @GetMapping("/ajax/stocks/search")
    @ResponseBody
    public List<SectorStockDto> getStocksForSearch() {
        return bist100Service.getAllStocks();
    }

    /**
     * Yaklasan temettu bilgilerini JSON olarak doner (AJAX proxy).
     *
     * <p>Frontend'in dashboard'da temettu bilgilerini gostermesi
     * icin kullanilir. scyborsaApi'ye proxy yapar.</p>
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /ajax/dashboard/dividends}</p>
     *
     * @return temettu verileri (dividends listesi + totalCount)
     */
    @GetMapping("/ajax/dashboard/dividends")
    @ResponseBody
    public Map<String, Object> getDividends() {
        return dividendService.getDividends();
    }
}
