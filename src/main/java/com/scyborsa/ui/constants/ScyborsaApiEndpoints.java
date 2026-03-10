package com.scyborsa.ui.constants;

/**
 * scyborsaApi REST endpoint sabit tanımları.
 *
 * <p>Tüm UI servislerinin kullandığı API endpoint yollarını merkezi olarak tanımlar.
 * WebClient base URL ({@code api.base-url}) ile birleştirilir.</p>
 */
public final class ScyborsaApiEndpoints {

    private ScyborsaApiEndpoints() {
        // Utility class — instance oluşturulamaz
    }

    /** Pine Screener veri endpoint'i. {@code {stockId}} path variable içerir. */
    public static final String PINE_SCREENER_DATA = "/api/v1/tw/pineScreenerData/{stockId}/VELZON_MA";

    /** Model portföy kurum listesi endpoint'i. */
    public static final String MODEL_PORTFOY_KURUMLAR = "/api/v1/model-portfoy/kurumlar";

    /** Aktif analist listesi endpoint'i. */
    public static final String ANALISTLER = "/api/v1/analistler";

    /** Canlı KAP haberleri endpoint'i. */
    public static final String KAP_NEWS = "/api/v1/kap/news";

    /** Canlı piyasa haberleri endpoint'i. */
    public static final String MARKET_NEWS = "/api/v1/kap/market-news";

    /** Canlı dünya haberleri endpoint'i. */
    public static final String WORLD_NEWS = "/api/v1/kap/world-news";

    /** Sektör hisse listesi endpoint'i. {@code {slug}} path variable içerir. */
    public static final String SECTOR_STOCKS = "/api/v1/sector/{slug}";

    /** Sektor ozet listesi endpoint'i. */
    public static final String SECTOR_SUMMARIES = "/api/v1/sector/summaries";

    // ── Backoffice ────────────────────────────────────────

    /** Backoffice dashboard KPI endpoint'i. */
    public static final String BACKOFFICE_DASHBOARD = "/api/v1/backoffice/dashboard";

    /** Backoffice hisse listesi endpoint'i. */
    public static final String BACKOFFICE_STOCKS = "/api/v1/backoffice/stocks";

    /** Backoffice hisse yasaklama endpoint'i. {@code {stockName}} path variable icerir. */
    public static final String BACKOFFICE_STOCK_BAN = "/api/v1/backoffice/stocks/{stockName}/yasak";

    /** Backoffice bugunun tarama sonuclari endpoint'i. */
    public static final String BACKOFFICE_SCREENER_TODAY = "/api/v1/backoffice/screener/today";

    /** Tum analistler (aktif + pasif) endpoint'i. */
    public static final String ANALISTLER_TUMU = "/api/v1/analistler/tumu";

    /** Analist ID'ye gore endpoint'i. {@code {id}} path variable icerir. */
    public static final String ANALISTLER_BY_ID = "/api/v1/analistler/{id}";

    /** Analist aktiflestirme endpoint'i. {@code {id}} path variable icerir. */
    public static final String ANALISTLER_AKTIF = "/api/v1/analistler/{id}/aktif";

    /** Tum kurumlar (aktif + pasif) endpoint'i. */
    public static final String KURUMLAR_TUMU = "/api/v1/model-portfoy/kurumlar/tumu";

    /** Kurum ID'ye gore endpoint'i. {@code {id}} path variable icerir. */
    public static final String KURUMLAR_BY_ID = "/api/v1/model-portfoy/kurumlar/{id}";

    /** Kurum aktiflestirme endpoint'i. {@code {id}} path variable icerir. */
    public static final String KURUMLAR_AKTIF = "/api/v1/model-portfoy/kurumlar/{id}/aktif";

    // ── Auth ──────────────────────────────────────────────

    /** Kullanici giris endpoint'i. */
    public static final String AUTH_LOGIN = "/api/v1/auth/login";

    // ── Kullanici CRUD ────────────────────────────────────

    /** Kullanici listesi endpoint'i. */
    public static final String USERS = "/api/v1/users";

    /** Kullanici ID'ye gore endpoint'i. {@code {id}} path variable icerir. */
    public static final String USERS_BY_ID = "/api/v1/users/{id}";

    /** Kullanici aktif toggle endpoint'i. {@code {id}} path variable icerir. */
    public static final String USERS_AKTIF = "/api/v1/users/{id}/aktif";

    /** Kullaniciyi e-posta adresine gore getiren endpoint'i. */
    public static final String USERS_BY_EMAIL = "/api/v1/users/by-email";

    /** Kullanici profil guncelleme endpoint'i. {@code {id}} path variable icerir. */
    public static final String USERS_PROFIL = "/api/v1/users/{id}/profil";

    // ── Dashboard ──────────────────────────────────────────

    /** Dashboard piyasa sentiment endpoint'i. */
    public static final String DASHBOARD_SENTIMENT = "/api/v1/dashboard/sentiment";

    /** Dashboard endeks performans endpoint'i. */
    public static final String DASHBOARD_INDEXES = "/api/v1/dashboard/indexes";

    // ── BIST Endeks ──────────────────────────────────────

    /** Tum BIST hisse listesi endpoint'i. */
    public static final String TUM_HISSELER = "/api/v1/tum-hisseler";

    /** BIST 100 endeks hisse listesi endpoint'i. */
    public static final String BIST100 = "/api/v1/bist100";

    /** BIST 50 endeks hisse listesi endpoint'i. */
    public static final String BIST50 = "/api/v1/bist50";

    /** BIST 30 endeks hisse listesi endpoint'i. */
    public static final String BIST30 = "/api/v1/bist30";

    // ── Haber Detay ─────────────────────────────────────

    /** Haber detay endpoint'i. {@code {newsId}} path variable icerir. */
    public static final String HABER_DETAY = "/api/v1/kap/haber/{newsId}";

    // ── Fonlar ────────────────────────────────────────────

    /** Tum aktif fonlar endpoint'i. */
    public static final String FUNDS = "/api/v1/funds";

    /** Fon arama endpoint'i. */
    public static final String FUNDS_SEARCH = "/api/v1/funds/search";

    /** Populer fonlar endpoint'i. */
    public static final String FUNDS_POPULAR = "/api/v1/funds/popular";

    /** Fon istatistikleri endpoint'i. */
    public static final String FUNDS_STATS = "/api/v1/funds/stats";

    /** Tek fon detay endpoint'i. */
    public static final String FUNDS_BY_CODE = "/api/v1/funds/{code}";

    /** Fon detay endpoint'i. {@code {code}} path variable icerir. */
    public static final String FUNDS_DETAIL = "/api/v1/funds/{code}/detail";

    /** Fon nakit akisi endpoint'i. {@code {code}} path variable icerir. */
    public static final String FUNDS_CASHFLOW = "/api/v1/funds/{code}/cashflow";

    /** Fon yatirimci sayisi gecmisi endpoint'i. {@code {code}} path variable icerir. */
    public static final String FUNDS_INVESTORS = "/api/v1/funds/{code}/investors";

    /** Fon PDF rapor endpoint'i. {@code {code}} path variable icerir. */
    public static final String FUNDS_PDF = "/api/v1/funds/{code}/pdf";

    /** Fon fiyat gecmisi CSV endpoint'i. {@code {code}} path variable icerir. */
    public static final String FUNDS_CSV = "/api/v1/funds/{code}/history/csv";

    // ── Analist Tavsiyeleri ─────────────────────────────────

    /** Analist tavsiye listesi endpoint'i. */
    public static final String ANALYST_RATINGS = "/api/v1/analyst-ratings";

    /** Hisse koduna gore analist tavsiye listesi endpoint'i. {@code {stockCode}} path variable icerir. */
    public static final String ANALYST_RATINGS_BY_CODE = "/api/v1/analyst-ratings/{stockCode}";

    // ── Hisse Logo ──────────────────────────────────────────

    /** Hisse logoid haritasi endpoint'i. */
    public static final String STOCK_LOGOS = "/api/v1/stock-logos";

    /** Hisse SVG logo proxy endpoint'i. {@code {logoid}} path variable icerir. */
    public static final String STOCK_LOGO_IMG = "/api/v1/stock-logos/img/{logoid}";

    // ── Araci Kurum Logo ──────────────────────────────────────

    /** Araci kurum logo proxy endpoint'i. */
    public static final String BROKERAGE_LOGOS = "/api/v1/brokerage-logos";

    /** Araci kurum logo proxy endpoint'i. {@code {filename}} path variable icerir. */
    public static final String BROKERAGE_LOGO_IMG = "/api/v1/brokerage-logos/img/{filename}";

    // ── AKD (Aracı Kurum Dağılımı) ──────────────────────────

    /** Hisse bazlı AKD (Aracı Kurum Dağılımı) endpoint'i. {@code {stockCode}} path variable içerir. */
    public static final String STOCK_AKD = "/api/v1/stock/{stockCode}/akd";

    // ── Takas (Saklama Dağılımı) ──────────────────────────

    /** Hisse bazlı Takas (Saklama Dağılımı) endpoint'i. {@code {stockCode}} path variable içerir. */
    public static final String STOCK_TAKAS = "/api/v1/stock/{stockCode}/takas";

}
