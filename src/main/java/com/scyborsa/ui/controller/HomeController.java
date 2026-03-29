package com.scyborsa.ui.controller;

import com.scyborsa.ui.dto.DashboardSentimentDto;
import com.scyborsa.ui.dto.GlobalMarketDto;
import com.scyborsa.ui.dto.IndexPerformanceDto;
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

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.security.core.Authentication;
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
    public String login(Principal principal, Authentication authentication) {
        if (principal != null) {
            boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            return isAdmin ? "redirect:/backoffice" : "redirect:/dashboard";
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
        model.addAttribute("globalMarkets", dashboardService.getGlobalMarkets());
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
     * Global piyasa verilerini JSON olarak doner (AJAX proxy).
     *
     * <p>Frontend'in periyodik olarak guncel global piyasa verisi
     * cekmesi icin kullanilir. scyborsaApi'ye proxy yapar.</p>
     *
     * <p><b>HTTP Method:</b> GET</p>
     * <p><b>Path:</b> {@code /ajax/dashboard/global-markets}</p>
     *
     * @return guncel global piyasa listesi
     */
    @GetMapping("/ajax/dashboard/global-markets")
    @ResponseBody
    public List<GlobalMarketDto> getGlobalMarketsApi() {
        return dashboardService.getGlobalMarkets();
    }

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

    /**
     * Nginx auth_request icin WebSocket session dogrulama endpoint'i.
     *
     * <p>Nginx, {@code /ws} WebSocket baglantisi oncesi bu endpoint'e
     * subrequest gonderir. Gecerli session varsa 200, yoksa 401 doner.
     * Bu sayede sadece login olmus kullanicilar WebSocket'e baglanabilir.</p>
     *
     * @param principal authenticated kullanici (null ise session yok)
     * @return 200 OK (authenticated) veya 401 Unauthorized
     */
    @GetMapping("/ws-auth-check")
    @ResponseBody
    public ResponseEntity<Void> wsAuthCheck(Principal principal) {
        if (principal != null) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    /**
     * Session gecerlilik kontrolu.
     *
     * <p>Session-guard.js tarafindan 60sn aralikla cagirilir. Authenticated endpoint
     * oldugu icin session suresi doldugunda Spring Security otomatik olarak /login'e
     * redirect yapar — client bu redirect'i yakalayip kullaniciyi login sayfasina yonlendirir.</p>
     *
     * @return 200 OK (session gecerli)
     */
    @GetMapping("/ajax/session-check")
    @ResponseBody
    public ResponseEntity<Void> sessionCheck() {
        return ResponseEntity.ok().build();
    }
}
