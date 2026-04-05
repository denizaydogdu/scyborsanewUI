(function() {
    'use strict';

    /* ========== Constants ========== */

    var PAGE_SIZE = 20;
    var allStocks = [];
    var filteredStocks = [];
    var currentPage = 1;
    var sortColumn = 'patternCount';
    var sortOrder = 'desc';
    var currentPeriod = '1D';
    var currentController = null;
    var selectedPatterns = new Set();

    /**
     * 27 mum formasyonu registry.
     * category: bullish | bearish | neutral
     * reliability: Dusuk | Orta | Yuksek | Cok Yuksek
     * type: Donus | Devam | Kararsizlik
     */
    var CANDLE_PATTERNS = {
        'Hammer':               { tr: 'Çekiç', category: 'bullish', desc: 'Uzun alt gölge, küçük gövde. Düşüş sonrası güçlü yükseliş sinyali.', reliability: 'Yüksek', type: 'Dönüş', action: 'Düşüş trendinde çekiç görürseniz, bir sonraki mumun yeşil kapanışını bekleyin. Hacim artışı ile teyit alın.', warning: 'Yatay piyasada güvenilirliği düşer. Mutlaka trend bağlamında değerlendirin.' },
        'InvertedHammer':       { tr: 'Ters Çekiç', category: 'bullish', desc: 'Uzun üst gölge, küçük gövde. Düşüş trendinde potansiyel dönüş.', reliability: 'Orta', type: 'Dönüş', action: 'Düşüş trendinde oluşursa, sonraki mumun yukarı açılışı teyit sinyalidir.', warning: 'Tek başına zayıf sinyaldir, mutlaka teyit bekleyin.' },
        'Engulfing.Bullish':    { tr: 'Boğa Yutan', category: 'bullish', desc: 'Yeşil mum önceki kırmızı mumu tamamen kapsar. Güçlü yükseliş.', reliability: 'Yüksek', type: 'Dönüş', action: 'Destek bölgesinde oluşursa güçlü alım fırsatı. Hacim ile teyit alın.', warning: 'Yükseliş trendinin ortasında oluşursa sinyal gücü azalır.' },
        'Harami.Bullish':       { tr: 'Boğa Harami', category: 'bullish', desc: 'Küçük yeşil mum önceki büyük kırmızı mumun içinde.', reliability: 'Orta', type: 'Dönüş', action: 'Teyit için sonraki mumun yeşil kapanmasını bekleyin.', warning: 'Zayıf sinyal — tek başına işlem açmayın, ek göstergeler kullanın.' },
        'MorningStar':          { tr: 'Sabah Yıldızı', category: 'bullish', desc: 'Üç mumlu dönüş formasyonu. Büyük kırmızı, küçük gövde, büyük yeşil.', reliability: 'Yüksek', type: 'Dönüş', action: 'Güçlü dönüş sinyali. Üçüncü mumun hacmi önemli — yüksek hacim sinyali güçlendirir.', warning: 'Üçüncü mum birinci mumun orta noktasını geçmelidir.' },
        '3WhiteSoldiers':       { tr: 'Üç Beyaz Asker', category: 'bullish', desc: 'Üst üste üç güçlü yeşil mum. Kararlı yükseliş teyidi.', reliability: 'Yüksek', type: 'Devam', action: 'Güçlü yükseliş teyidi. Mevcut pozisyonu koruyun veya ekleme yapın.', warning: 'Aşırı alım bölgesinde oluşursa dikkatli olun — RSI kontrolü yapın.' },
        'Marubozu.White':       { tr: 'Beyaz Marubozu', category: 'bullish', desc: 'Gölgesiz büyük yeşil mum. Alıcıların tam kontrolü.', reliability: 'Orta', type: 'Devam', action: 'Güçlü alım baskısı var. Trend devamı beklenir.', warning: 'Tek mumlu sinyal — sonraki mumların teyidi önemli.' },
        'AbandonedBaby.Bullish':{ tr: 'Terk Edilmiş Bebek (Boğa)', category: 'bullish', desc: 'Gap ile ayrılmış doji, ardından yükseliş. Nadir ama güçlü.', reliability: 'Çok Yüksek', type: 'Dönüş', action: 'Çok nadir ve güçlü dönüş sinyali. Gap teyidi ile pozisyon açılabilir.', warning: 'Nadiren oluşur — yanlış algılama riski var.' },
        'Kicking.Bullish':      { tr: 'Tekme (Boğa)', category: 'bullish', desc: 'Kırmızı marubozu ardından gap ile yeşil marubozu.', reliability: 'Çok Yüksek', type: 'Dönüş', action: 'En güçlü boğa sinyallerinden. Gap kapanmadığı sürece pozisyon korunur.', warning: 'Gap dolma riski her zaman mevcuttur.' },
        'TriStar.Bullish':      { tr: 'Üç Yıldız (Boğa)', category: 'bullish', desc: 'Üst üste üç doji. Trend yorgunluğu ve potansiyel dönüş.', reliability: 'Orta', type: 'Dönüş', action: 'Üç doji arka arkaya geldiğinde trend yorgunluğu. Dönüş beklenebilir.', warning: 'Çok nadir oluşur, yanlış pozitif riski yüksek.' },

        'ShootingStar':         { tr: 'Kayan Yıldız', category: 'bearish', desc: 'Uzun üst gölge, küçük gövde. Yükseliş sonrası düşüş sinyali.', reliability: 'Yüksek', type: 'Dönüş', action: 'Yükseliş sonrası oluşursa, stop-loss sıkılaştırın veya kâr realizasyonu yapın.', warning: 'Yatay piyasada güvenilirliği düşer.' },
        'HangingMan':           { tr: 'Asılan Adam', category: 'bearish', desc: 'Çekiçe benzer ama yükseliş trendinde. Potansiyel düşüş.', reliability: 'Orta', type: 'Dönüş', action: 'Yükseliş trendinde oluşursa dikkat — sonraki mum kırmızı kapanırsa satış sinyali.', warning: 'Tek başına zayıf sinyaldir, hacim ile teyit gerekli.' },
        'Engulfing.Bearish':    { tr: 'Ayı Yutan', category: 'bearish', desc: 'Kırmızı mum önceki yeşil mumu tamamen kapsar. Güçlü düşüş.', reliability: 'Yüksek', type: 'Dönüş', action: 'Direnç bölgesinde oluşursa güçlü satış sinyali. Kâr al veya kısa pozisyon düşünün.', warning: 'Düşüş trendinin ortasında gücü azalır.' },
        'Harami.Bearish':       { tr: 'Ayı Harami', category: 'bearish', desc: 'Küçük kırmızı mum önceki büyük yeşil mumun içinde.', reliability: 'Orta', type: 'Dönüş', action: 'Teyit için sonraki mumun kırmızı kapanmasını bekleyin.', warning: 'Zayıf sinyal — tek başına işlem açmayın.' },
        'EveningStar':          { tr: 'Akşam Yıldızı', category: 'bearish', desc: 'Üç mumlu dönüş formasyonu. Büyük yeşil, küçük gövde, büyük kırmızı.', reliability: 'Yüksek', type: 'Dönüş', action: 'Güçlü dönüş sinyali. Üçüncü mumun hacmi yüksekse sinyal güçlüdür. Pozisyon azaltın.', warning: 'Üçüncü mum birinci mumun orta noktasının altına inmeli.' },
        '3BlackCrows':          { tr: 'Üç Kara Karga', category: 'bearish', desc: 'Üst üste üç güçlü kırmızı mum. Kararlı düşüş teyidi.', reliability: 'Yüksek', type: 'Devam', action: 'Güçlü düşüş teyidi. Pozisyonları kapatın veya hedge edin.', warning: 'Aşırı satım bölgesinde oluşursa toparlanma riski var.' },
        'Marubozu.Black':       { tr: 'Siyah Marubozu', category: 'bearish', desc: 'Gölgesiz büyük kırmızı mum. Satıcıların tam kontrolü.', reliability: 'Orta', type: 'Devam', action: 'Güçlü satış baskısı. Destek seviyesine kadar düşüş beklenebilir.', warning: 'Tek mumlu sinyal — panik satışı olabilir, teyit bekleyin.' },
        'AbandonedBaby.Bearish':{ tr: 'Terk Edilmiş Bebek (Ayı)', category: 'bearish', desc: 'Gap ile ayrılmış doji, ardından düşüş. Nadir ama güçlü.', reliability: 'Çok Yüksek', type: 'Dönüş', action: 'Çok nadir ve güçlü düşüş sinyali. Pozisyonları kapatın.', warning: 'Nadiren oluşur — yanlış algılama riski var.' },
        'Kicking.Bearish':      { tr: 'Tekme (Ayı)', category: 'bearish', desc: 'Yeşil marubozu ardından gap ile kırmızı marubozu.', reliability: 'Çok Yüksek', type: 'Dönüş', action: 'En güçlü ayı sinyallerinden. Gap kapanmadığı sürece düşüş devam eder.', warning: 'Gap dolma riski mevcuttur.' },
        'TriStar.Bearish':      { tr: 'Üç Yıldız (Ayı)', category: 'bearish', desc: 'Üst üste üç doji yükseliş trendinde. Potansiyel dönüş.', reliability: 'Orta', type: 'Dönüş', action: 'Trend yorgunluğu sinyali. Mevcut pozisyonları gözden geçirin.', warning: 'Çok nadir, yanlış pozitif riski yüksek.' },

        'Doji':                 { tr: 'Doji', category: 'neutral', desc: 'Açılış ve kapanış hemen hemen aynı. Kararsızlık ve potansiyel dönüş.', reliability: 'Orta', type: 'Kararsızlık', action: 'Mevcut trendin zayıfladığını gösterir. Sonraki mumun yönü kritik — bekleyin.', warning: 'Tek başına sinyal değil, bağlam çok önemli.' },
        'Doji.Dragonfly':       { tr: 'Yusufçuk Doji', category: 'neutral', desc: 'Uzun alt gölge, gövde yok. Destekte yükseliş sinyali olabilir.', reliability: 'Orta', type: 'Kararsızlık', action: 'Destek bölgesinde oluşursa alım fırsatı olabilir. Sonraki mum teyidi bekleyin.', warning: 'Dirençte oluşursa sinyal geçersiz olabilir.' },
        'Doji.Gravestone':      { tr: 'Mezar Taşı Doji', category: 'neutral', desc: 'Uzun üst gölge, gövde yok. Dirençte düşüş sinyali olabilir.', reliability: 'Orta', type: 'Kararsızlık', action: 'Direnç bölgesinde oluşursa satış sinyali olabilir. Sonraki mum teyidi bekleyin.', warning: 'Destekte oluşursa sinyal geçersiz olabilir.' },
        'SpinningTop.White':    { tr: 'Beyaz Topaç', category: 'neutral', desc: 'Küçük yeşil gövde, uzun gölgeler. Piyasada kararsızlık.', reliability: 'Düşük', type: 'Kararsızlık', action: 'Kararsızlık var — yeni pozisyon açmayın, mevcut pozisyonları sıkılaştırın.', warning: 'Çok zayıf sinyal, tek başına kullanmayın.' },
        'SpinningTop.Black':    { tr: 'Siyah Topaç', category: 'neutral', desc: 'Küçük kırmızı gövde, uzun gölgeler. Piyasada kararsızlık.', reliability: 'Düşük', type: 'Kararsızlık', action: 'Kararsızlık var — yeni pozisyon açmayın, mevcut pozisyonları sıkılaştırın.', warning: 'Çok zayıf sinyal, tek başına kullanmayın.' },
        'LongShadow.Upper':     { tr: 'Uzun Üst Gölge', category: 'neutral', desc: 'Uzun üst gölge satış baskısına işaret eder.', reliability: 'Düşük', type: 'Kararsızlık', action: 'Üst seviyelerden satış baskısı var. Direnç olarak not edin.', warning: 'Tek mum — trend dönüşü anlamına gelmez.' },
        'LongShadow.Lower':     { tr: 'Uzun Alt Gölge', category: 'neutral', desc: 'Uzun alt gölge alış ilgisine işaret eder.', reliability: 'Düşük', type: 'Kararsızlık', action: 'Alt seviyelerden alış ilgisi var. Destek olarak not edin.', warning: 'Tek mum — trend dönüşü anlamına gelmez.' }
    };

    /**
     * 4 gap reversal formasyonu registry.
     * category: gap
     * reliability: Orta | Yuksek
     * type: Donus
     */
    var GAP_PATTERNS = {
        'GDR': {
            tr: 'Gap Aşağı Dönüş',
            category: 'gap',
            desc: 'Hisse gap aşağı açıldı ama yeşil mum olarak kapandı. Alıcıların geri geldiğini ve dibin oluşabileceğini gösterir.',
            reliability: 'Orta',
            type: 'Dönüş',
            action: 'Destek bölgesinde oluşursa güçlü alım fırsatı olabilir. Hacim artışı ile teyit alın.',
            warning: 'Yatay piyasada güvenilirliği düşer. Gap kapanmadan işlem açmayın.'
        },
        'GDR-Strong': {
            tr: 'Gap Aşağı Dönüş (Güçlü)',
            category: 'gap',
            desc: 'Hisse gap aşağı açıldı ve dünkü kapanışın üstünde kapandı. Gap tamamen kapatıldı — çok güçlü alıcı tepkisi.',
            reliability: 'Yüksek',
            type: 'Dönüş',
            action: 'Güçlü dönüş sinyali. Gap kapatılması trend dönüşünün teyidi olabilir.',
            warning: 'Hacim düşükse sinyal güvenilirliği azalır.'
        },
        'GUR': {
            tr: 'Gap Yukarı Dönüş',
            category: 'gap',
            desc: 'Hisse gap yukarı açıldı ama kırmızı mum olarak kapandı. Satıcıların baskısını ve tepenin oluşabileceğini gösterir.',
            reliability: 'Orta',
            type: 'Dönüş',
            action: 'Direnç bölgesinde oluşursa satış sinyali olabilir. Kâr realizasyonu düşünün.',
            warning: 'Yatay piyasada güvenilirliği düşer. Gap kapanmadan short açmayın.'
        },
        'GUR-Strong': {
            tr: 'Gap Yukarı Dönüş (Güçlü)',
            category: 'gap',
            desc: 'Hisse gap yukarı açıldı ve dünkü kapanışın altında kapandı. Gap tamamen kapatıldı — çok güçlü satıcı tepkisi.',
            reliability: 'Yüksek',
            type: 'Dönüş',
            action: 'Güçlü düşüş sinyali. Pozisyonları kapatın veya hedge edin.',
            warning: 'Hacim düşükse tuzak olabilir, teyit bekleyin.'
        }
    };

    /**
     * 27 mum formasyonu icin basit inline SVG ikonlari (48x28).
     * Renkler: #0ab39c (yesil/bullish), #f06548 (kirmizi/bearish), #f7b84b (neutral)
     */
    var CANDLE_SVGS = {
        // ===== BULLISH =====
        'Hammer':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<line x1="24" y1="4" x2="24" y2="8" stroke="#0ab39c" stroke-width="1"/>' +
            '<rect x="20" y="4" width="8" height="6" rx="1" fill="#0ab39c"/>' +
            '<line x1="24" y1="10" x2="24" y2="26" stroke="#0ab39c" stroke-width="1.5"/>' +
            '</svg>',
        'InvertedHammer':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<line x1="24" y1="2" x2="24" y2="18" stroke="#0ab39c" stroke-width="1.5"/>' +
            '<rect x="20" y="18" width="8" height="6" rx="1" fill="#0ab39c"/>' +
            '<line x1="24" y1="24" x2="24" y2="26" stroke="#0ab39c" stroke-width="1"/>' +
            '</svg>',
        'Engulfing.Bullish':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<rect x="14" y="8" width="6" height="10" rx="1" fill="#f06548"/>' +
            '<line x1="17" y1="6" x2="17" y2="8" stroke="#f06548" stroke-width="1"/>' +
            '<line x1="17" y1="18" x2="17" y2="22" stroke="#f06548" stroke-width="1"/>' +
            '<rect x="24" y="4" width="10" height="18" rx="1" fill="#0ab39c"/>' +
            '<line x1="29" y1="2" x2="29" y2="4" stroke="#0ab39c" stroke-width="1"/>' +
            '<line x1="29" y1="22" x2="29" y2="26" stroke="#0ab39c" stroke-width="1"/>' +
            '</svg>',
        'Harami.Bullish':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<rect x="12" y="4" width="10" height="18" rx="1" fill="#f06548"/>' +
            '<line x1="17" y1="2" x2="17" y2="4" stroke="#f06548" stroke-width="1"/>' +
            '<line x1="17" y1="22" x2="17" y2="26" stroke="#f06548" stroke-width="1"/>' +
            '<rect x="26" y="10" width="6" height="8" rx="1" fill="#0ab39c"/>' +
            '<line x1="29" y1="8" x2="29" y2="10" stroke="#0ab39c" stroke-width="1"/>' +
            '<line x1="29" y1="18" x2="29" y2="20" stroke="#0ab39c" stroke-width="1"/>' +
            '</svg>',
        'MorningStar':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<rect x="4" y="4" width="8" height="14" rx="1" fill="#f06548"/>' +
            '<line x1="8" y1="2" x2="8" y2="4" stroke="#f06548" stroke-width="1"/>' +
            '<line x1="8" y1="18" x2="8" y2="22" stroke="#f06548" stroke-width="1"/>' +
            '<rect x="18" y="16" width="6" height="4" rx="1" fill="#f7b84b"/>' +
            '<line x1="21" y1="14" x2="21" y2="16" stroke="#f7b84b" stroke-width="1"/>' +
            '<line x1="21" y1="20" x2="21" y2="24" stroke="#f7b84b" stroke-width="1"/>' +
            '<rect x="30" y="6" width="8" height="14" rx="1" fill="#0ab39c"/>' +
            '<line x1="34" y1="2" x2="34" y2="6" stroke="#0ab39c" stroke-width="1"/>' +
            '<line x1="34" y1="20" x2="34" y2="22" stroke="#0ab39c" stroke-width="1"/>' +
            '</svg>',
        '3WhiteSoldiers':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<rect x="4" y="16" width="8" height="8" rx="1" fill="#0ab39c"/>' +
            '<line x1="8" y1="14" x2="8" y2="16" stroke="#0ab39c" stroke-width="1"/>' +
            '<line x1="8" y1="24" x2="8" y2="26" stroke="#0ab39c" stroke-width="1"/>' +
            '<rect x="16" y="10" width="8" height="8" rx="1" fill="#0ab39c"/>' +
            '<line x1="20" y1="8" x2="20" y2="10" stroke="#0ab39c" stroke-width="1"/>' +
            '<line x1="20" y1="18" x2="20" y2="20" stroke="#0ab39c" stroke-width="1"/>' +
            '<rect x="28" y="4" width="8" height="8" rx="1" fill="#0ab39c"/>' +
            '<line x1="32" y1="2" x2="32" y2="4" stroke="#0ab39c" stroke-width="1"/>' +
            '<line x1="32" y1="12" x2="32" y2="14" stroke="#0ab39c" stroke-width="1"/>' +
            '</svg>',
        'Marubozu.White':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<rect x="16" y="4" width="16" height="20" rx="1" fill="#0ab39c"/>' +
            '</svg>',
        'AbandonedBaby.Bullish':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<rect x="4" y="4" width="7" height="12" rx="1" fill="#f06548"/>' +
            '<line x1="7" y1="2" x2="7" y2="4" stroke="#f06548" stroke-width="1"/>' +
            '<line x1="7" y1="16" x2="7" y2="18" stroke="#f06548" stroke-width="1"/>' +
            '<line x1="21" y1="18" x2="21" y2="24" stroke="#f7b84b" stroke-width="1.5"/>' +
            '<circle cx="21" cy="21" r="1.5" fill="#f7b84b"/>' +
            '<rect x="32" y="6" width="7" height="12" rx="1" fill="#0ab39c"/>' +
            '<line x1="35" y1="2" x2="35" y2="6" stroke="#0ab39c" stroke-width="1"/>' +
            '<line x1="35" y1="18" x2="35" y2="20" stroke="#0ab39c" stroke-width="1"/>' +
            '</svg>',
        'Kicking.Bullish':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<rect x="6" y="6" width="12" height="16" rx="1" fill="#f06548"/>' +
            '<rect x="26" y="6" width="12" height="16" rx="1" fill="#0ab39c"/>' +
            '<line x1="20" y1="14" x2="24" y2="14" stroke="#999" stroke-width="1" stroke-dasharray="2,2"/>' +
            '</svg>',
        'TriStar.Bullish':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<line x1="10" y1="8" x2="10" y2="20" stroke="#0ab39c" stroke-width="1.5"/>' +
            '<line x1="6" y1="14" x2="14" y2="14" stroke="#0ab39c" stroke-width="2"/>' +
            '<line x1="22" y1="10" x2="22" y2="22" stroke="#0ab39c" stroke-width="1.5"/>' +
            '<line x1="18" y1="16" x2="26" y2="16" stroke="#0ab39c" stroke-width="2"/>' +
            '<line x1="34" y1="6" x2="34" y2="18" stroke="#0ab39c" stroke-width="1.5"/>' +
            '<line x1="30" y1="12" x2="38" y2="12" stroke="#0ab39c" stroke-width="2"/>' +
            '</svg>',

        // ===== BEARISH =====
        'ShootingStar':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<line x1="24" y1="2" x2="24" y2="18" stroke="#f06548" stroke-width="1.5"/>' +
            '<rect x="20" y="18" width="8" height="6" rx="1" fill="#f06548"/>' +
            '<line x1="24" y1="24" x2="24" y2="26" stroke="#f06548" stroke-width="1"/>' +
            '</svg>',
        'HangingMan':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<line x1="24" y1="2" x2="24" y2="6" stroke="#f06548" stroke-width="1"/>' +
            '<rect x="20" y="2" width="8" height="6" rx="1" fill="#f06548"/>' +
            '<line x1="24" y1="8" x2="24" y2="26" stroke="#f06548" stroke-width="1.5"/>' +
            '</svg>',
        'Engulfing.Bearish':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<rect x="14" y="8" width="6" height="10" rx="1" fill="#0ab39c"/>' +
            '<line x1="17" y1="6" x2="17" y2="8" stroke="#0ab39c" stroke-width="1"/>' +
            '<line x1="17" y1="18" x2="17" y2="22" stroke="#0ab39c" stroke-width="1"/>' +
            '<rect x="24" y="4" width="10" height="18" rx="1" fill="#f06548"/>' +
            '<line x1="29" y1="2" x2="29" y2="4" stroke="#f06548" stroke-width="1"/>' +
            '<line x1="29" y1="22" x2="29" y2="26" stroke="#f06548" stroke-width="1"/>' +
            '</svg>',
        'Harami.Bearish':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<rect x="12" y="4" width="10" height="18" rx="1" fill="#0ab39c"/>' +
            '<line x1="17" y1="2" x2="17" y2="4" stroke="#0ab39c" stroke-width="1"/>' +
            '<line x1="17" y1="22" x2="17" y2="26" stroke="#0ab39c" stroke-width="1"/>' +
            '<rect x="26" y="10" width="6" height="8" rx="1" fill="#f06548"/>' +
            '<line x1="29" y1="8" x2="29" y2="10" stroke="#f06548" stroke-width="1"/>' +
            '<line x1="29" y1="18" x2="29" y2="20" stroke="#f06548" stroke-width="1"/>' +
            '</svg>',
        'EveningStar':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<rect x="4" y="8" width="8" height="14" rx="1" fill="#0ab39c"/>' +
            '<line x1="8" y1="4" x2="8" y2="8" stroke="#0ab39c" stroke-width="1"/>' +
            '<line x1="8" y1="22" x2="8" y2="24" stroke="#0ab39c" stroke-width="1"/>' +
            '<rect x="18" y="4" width="6" height="4" rx="1" fill="#f7b84b"/>' +
            '<line x1="21" y1="2" x2="21" y2="4" stroke="#f7b84b" stroke-width="1"/>' +
            '<line x1="21" y1="8" x2="21" y2="12" stroke="#f7b84b" stroke-width="1"/>' +
            '<rect x="30" y="6" width="8" height="14" rx="1" fill="#f06548"/>' +
            '<line x1="34" y1="4" x2="34" y2="6" stroke="#f06548" stroke-width="1"/>' +
            '<line x1="34" y1="20" x2="34" y2="24" stroke="#f06548" stroke-width="1"/>' +
            '</svg>',
        '3BlackCrows':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<rect x="4" y="4" width="8" height="8" rx="1" fill="#f06548"/>' +
            '<line x1="8" y1="2" x2="8" y2="4" stroke="#f06548" stroke-width="1"/>' +
            '<line x1="8" y1="12" x2="8" y2="14" stroke="#f06548" stroke-width="1"/>' +
            '<rect x="16" y="10" width="8" height="8" rx="1" fill="#f06548"/>' +
            '<line x1="20" y1="8" x2="20" y2="10" stroke="#f06548" stroke-width="1"/>' +
            '<line x1="20" y1="18" x2="20" y2="20" stroke="#f06548" stroke-width="1"/>' +
            '<rect x="28" y="16" width="8" height="8" rx="1" fill="#f06548"/>' +
            '<line x1="32" y1="14" x2="32" y2="16" stroke="#f06548" stroke-width="1"/>' +
            '<line x1="32" y1="24" x2="32" y2="26" stroke="#f06548" stroke-width="1"/>' +
            '</svg>',
        'Marubozu.Black':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<rect x="16" y="4" width="16" height="20" rx="1" fill="#f06548"/>' +
            '</svg>',
        'AbandonedBaby.Bearish':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<rect x="4" y="10" width="7" height="12" rx="1" fill="#0ab39c"/>' +
            '<line x1="7" y1="6" x2="7" y2="10" stroke="#0ab39c" stroke-width="1"/>' +
            '<line x1="7" y1="22" x2="7" y2="24" stroke="#0ab39c" stroke-width="1"/>' +
            '<line x1="21" y1="4" x2="21" y2="10" stroke="#f7b84b" stroke-width="1.5"/>' +
            '<circle cx="21" cy="7" r="1.5" fill="#f7b84b"/>' +
            '<rect x="32" y="10" width="7" height="12" rx="1" fill="#f06548"/>' +
            '<line x1="35" y1="6" x2="35" y2="10" stroke="#f06548" stroke-width="1"/>' +
            '<line x1="35" y1="22" x2="35" y2="26" stroke="#f06548" stroke-width="1"/>' +
            '</svg>',
        'Kicking.Bearish':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<rect x="6" y="6" width="12" height="16" rx="1" fill="#0ab39c"/>' +
            '<rect x="26" y="6" width="12" height="16" rx="1" fill="#f06548"/>' +
            '<line x1="20" y1="14" x2="24" y2="14" stroke="#999" stroke-width="1" stroke-dasharray="2,2"/>' +
            '</svg>',
        'TriStar.Bearish':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<line x1="10" y1="8" x2="10" y2="20" stroke="#f06548" stroke-width="1.5"/>' +
            '<line x1="6" y1="14" x2="14" y2="14" stroke="#f06548" stroke-width="2"/>' +
            '<line x1="22" y1="6" x2="22" y2="18" stroke="#f06548" stroke-width="1.5"/>' +
            '<line x1="18" y1="12" x2="26" y2="12" stroke="#f06548" stroke-width="2"/>' +
            '<line x1="34" y1="10" x2="34" y2="22" stroke="#f06548" stroke-width="1.5"/>' +
            '<line x1="30" y1="16" x2="38" y2="16" stroke="#f06548" stroke-width="2"/>' +
            '</svg>',

        // ===== NEUTRAL =====
        'Doji':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<line x1="24" y1="4" x2="24" y2="24" stroke="#f7b84b" stroke-width="1.5"/>' +
            '<line x1="18" y1="14" x2="30" y2="14" stroke="#f7b84b" stroke-width="2"/>' +
            '</svg>',
        'Doji.Dragonfly':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<line x1="18" y1="6" x2="30" y2="6" stroke="#f7b84b" stroke-width="2"/>' +
            '<line x1="24" y1="6" x2="24" y2="26" stroke="#f7b84b" stroke-width="1.5"/>' +
            '</svg>',
        'Doji.Gravestone':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<line x1="24" y1="2" x2="24" y2="22" stroke="#f7b84b" stroke-width="1.5"/>' +
            '<line x1="18" y1="22" x2="30" y2="22" stroke="#f7b84b" stroke-width="2"/>' +
            '</svg>',
        'SpinningTop.White':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<line x1="24" y1="2" x2="24" y2="10" stroke="#f7b84b" stroke-width="1"/>' +
            '<rect x="20" y="10" width="8" height="6" rx="1" fill="#0ab39c" opacity="0.7"/>' +
            '<line x1="24" y1="16" x2="24" y2="26" stroke="#f7b84b" stroke-width="1"/>' +
            '</svg>',
        'SpinningTop.Black':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<line x1="24" y1="2" x2="24" y2="10" stroke="#f7b84b" stroke-width="1"/>' +
            '<rect x="20" y="10" width="8" height="6" rx="1" fill="#f06548" opacity="0.7"/>' +
            '<line x1="24" y1="16" x2="24" y2="26" stroke="#f7b84b" stroke-width="1"/>' +
            '</svg>',
        'LongShadow.Upper':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<line x1="24" y1="2" x2="24" y2="16" stroke="#f7b84b" stroke-width="1.5"/>' +
            '<rect x="20" y="16" width="8" height="8" rx="1" fill="#f7b84b" opacity="0.6"/>' +
            '<line x1="24" y1="24" x2="24" y2="26" stroke="#f7b84b" stroke-width="1"/>' +
            '</svg>',
        'LongShadow.Lower':
            '<svg width="48" height="28" viewBox="0 0 48 28">' +
            '<line x1="24" y1="2" x2="24" y2="4" stroke="#f7b84b" stroke-width="1"/>' +
            '<rect x="20" y="4" width="8" height="8" rx="1" fill="#f7b84b" opacity="0.6"/>' +
            '<line x1="24" y1="12" x2="24" y2="26" stroke="#f7b84b" stroke-width="1.5"/>' +
            '</svg>'
    };

    /**
     * 4 gap formasyonu icin basit inline SVG ikonlari (48x28).
     * Renkler: #0ab39c (yesil), #f06548 (kirmizi), #299cdb (info/gap)
     */
    var GAP_SVGS = {
        'GDR': '<svg width="48" height="28" viewBox="0 0 48 28"><rect x="8" y="2" width="6" height="12" fill="#f06548" rx="1"/><line x1="11" y1="0" x2="11" y2="2" stroke="#f06548" stroke-width="1"/><line x1="11" y1="14" x2="11" y2="16" stroke="#f06548" stroke-width="1"/><line x1="18" y1="10" x2="22" y2="10" stroke="#299cdb" stroke-width="1" stroke-dasharray="2"/><rect x="26" y="10" width="6" height="14" fill="#0ab39c" rx="1"/><line x1="29" y1="8" x2="29" y2="10" stroke="#0ab39c" stroke-width="1"/><line x1="29" y1="24" x2="29" y2="26" stroke="#0ab39c" stroke-width="1"/><path d="M36,16 L42,10" stroke="#0ab39c" stroke-width="1.5" fill="none" marker-end="url(#arrowG)"/><defs><marker id="arrowG" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#0ab39c"/></marker></defs></svg>',
        'GDR-Strong': '<svg width="48" height="28" viewBox="0 0 48 28"><rect x="8" y="2" width="6" height="12" fill="#f06548" rx="1"/><line x1="11" y1="0" x2="11" y2="2" stroke="#f06548" stroke-width="1"/><line x1="11" y1="14" x2="11" y2="16" stroke="#f06548" stroke-width="1"/><line x1="2" y1="14" x2="46" y2="14" stroke="#299cdb" stroke-width="0.5" stroke-dasharray="3"/><rect x="26" y="4" width="6" height="20" fill="#0ab39c" rx="1"/><line x1="29" y1="2" x2="29" y2="4" stroke="#0ab39c" stroke-width="1"/><line x1="29" y1="24" x2="29" y2="26" stroke="#0ab39c" stroke-width="1"/><path d="M36,14 L42,6" stroke="#0ab39c" stroke-width="2" fill="none" marker-end="url(#arrowGS)"/><defs><marker id="arrowGS" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#0ab39c"/></marker></defs></svg>',
        'GUR': '<svg width="48" height="28" viewBox="0 0 48 28"><rect x="8" y="14" width="6" height="12" fill="#0ab39c" rx="1"/><line x1="11" y1="12" x2="11" y2="14" stroke="#0ab39c" stroke-width="1"/><line x1="11" y1="26" x2="11" y2="28" stroke="#0ab39c" stroke-width="1"/><line x1="18" y1="18" x2="22" y2="18" stroke="#299cdb" stroke-width="1" stroke-dasharray="2"/><rect x="26" y="4" width="6" height="14" fill="#f06548" rx="1"/><line x1="29" y1="2" x2="29" y2="4" stroke="#f06548" stroke-width="1"/><line x1="29" y1="18" x2="29" y2="20" stroke="#f06548" stroke-width="1"/><path d="M36,12 L42,18" stroke="#f06548" stroke-width="1.5" fill="none" marker-end="url(#arrowR)"/><defs><marker id="arrowR" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#f06548"/></marker></defs></svg>',
        'GUR-Strong': '<svg width="48" height="28" viewBox="0 0 48 28"><rect x="8" y="14" width="6" height="12" fill="#0ab39c" rx="1"/><line x1="11" y1="12" x2="11" y2="14" stroke="#0ab39c" stroke-width="1"/><line x1="11" y1="26" x2="11" y2="28" stroke="#0ab39c" stroke-width="1"/><line x1="2" y1="14" x2="46" y2="14" stroke="#299cdb" stroke-width="0.5" stroke-dasharray="3"/><rect x="26" y="4" width="6" height="20" fill="#f06548" rx="1"/><line x1="29" y1="2" x2="29" y2="4" stroke="#f06548" stroke-width="1"/><line x1="29" y1="24" x2="29" y2="26" stroke="#f06548" stroke-width="1"/><path d="M36,14 L42,22" stroke="#f06548" stroke-width="2" fill="none" marker-end="url(#arrowRS)"/><defs><marker id="arrowRS" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="#f06548"/></marker></defs></svg>'
    };

    /* ========== Utility Functions ========== */

    /**
     * XSS koruması icin HTML escape.
     * @param {string} s
     * @returns {string}
     */
    function escHtml(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /**
     * Pattern key'den kategori Bootstrap renk sinifini dondurur.
     * @param {string} patternKey - CANDLE_PATTERNS key
     * @returns {string} 'success' | 'danger' | 'warning'
     */
    function getCategoryColor(patternKey) {
        var info = getPatternInfo(patternKey);
        if (!info) return 'warning';
        if (info.category === 'bullish') return 'success';
        if (info.category === 'bearish') return 'danger';
        if (info.category === 'gap') return 'info';
        return 'warning';
    }

    /**
     * Birlesik pattern bilgi arama — CANDLE_PATTERNS ve GAP_PATTERNS'ten arar.
     * @param {string} pKey - Pattern key
     * @returns {Object|null}
     */
    function getPatternInfo(pKey) {
        return CANDLE_PATTERNS[pKey] || GAP_PATTERNS[pKey] || null;
    }

    /**
     * Kategori kodunu Turkce etiket olarak dondurur.
     * @param {string} cat - 'bullish' | 'bearish' | 'neutral'
     * @returns {string}
     */
    function getCategoryLabel(cat) {
        if (cat === 'bullish') return 'Boğa';
        if (cat === 'bearish') return 'Ayı';
        if (cat === 'gap') return 'Gap';
        return 'Kararsız';
    }

    /**
     * Hissenin pattern listesinden baskın kategoriyi belirler.
     * @param {Object} stock - patterns array iceren stock nesnesi
     * @returns {string} 'bullish' | 'bearish' | 'neutral'
     */
    function getDominantCategory(stock) {
        var counts = { bullish: 0, bearish: 0, neutral: 0, gap: 0 };
        (stock.patterns || []).forEach(function(pKey) {
            var info = getPatternInfo(pKey);
            if (info && counts[info.category] !== undefined) counts[info.category]++;
        });
        // Gap-only stocks first (no candle patterns)
        if (counts.gap > 0 && counts.bullish === 0 && counts.bearish === 0 && counts.neutral === 0) return 'gap';
        // Then compare candle categories (require > 0 to avoid 0 >= 0 tiebreak)
        if (counts.bullish > 0 && counts.bullish >= counts.bearish && counts.bullish >= counts.neutral) return 'bullish';
        if (counts.bearish > 0 && counts.bearish >= counts.bullish && counts.bearish >= counts.neutral) return 'bearish';
        if (counts.neutral > 0) return 'neutral';
        if (counts.gap > 0) return 'gap';
        return 'neutral';
    }

    /**
     * Kategori icin sol border rengini dondurur.
     * @param {string} cat - 'bullish' | 'bearish' | 'neutral'
     * @returns {string} HEX renk
     */
    function getCategoryBorder(cat) {
        if (cat === 'bullish') return '#0ab39c';
        if (cat === 'bearish') return '#f06548';
        if (cat === 'gap') return '#299cdb';
        return '#f7b84b';
    }

    /**
     * SVG ikon getirir. Boyut degistirebilir.
     * @param {string} patternKey
     * @param {number} [width]
     * @param {number} [height]
     * @returns {string} SVG HTML
     */
    function getCandleSvg(patternKey, width, height) {
        var svg = CANDLE_SVGS[patternKey] || GAP_SVGS[patternKey] || '';
        if (width && height && svg) {
            svg = svg.replace('width="48"', 'width="' + width + '"').replace('height="28"', 'height="' + height + '"');
        }
        return svg;
    }

    /* ========== DOM References (DOMContentLoaded icinde doldurulur) ========== */

    var csPeriodSelect, csCategorySelect, csMinCountSelect, btnCsScan;
    var csReliabilitySelect, csTypeSelect, btnCsReset;
    var btnCsAllBullish, btnCsAllBearish, btnCsAllNeutral, btnCsAllGap, btnCsClearPatterns;
    var csPatternPanel, csPatternCounter, csFilterChips;
    var csLoading, csError, csErrorText, csResults, csCountBadge;
    var csTableBody, csEmpty, csPagination, csPaginationInfo, csPaginationNav;
    var csKpiCards, csKpiTotal, csKpiBullish, csKpiBearish, csKpiNeutral, csKpiGap;

    function initDomReferences() {
        csPeriodSelect       = document.getElementById('csPeriodSelect');
        csCategorySelect     = document.getElementById('csCategorySelect');
        csMinCountSelect     = document.getElementById('csMinCountSelect');
        csReliabilitySelect  = document.getElementById('csReliabilitySelect');
        csTypeSelect         = document.getElementById('csTypeSelect');
        btnCsScan            = document.getElementById('btnCsScan');
        btnCsReset           = document.getElementById('btnCsReset');
        btnCsAllBullish      = document.getElementById('btnCsAllBullish');
        btnCsAllBearish      = document.getElementById('btnCsAllBearish');
        btnCsAllNeutral      = document.getElementById('btnCsAllNeutral');
        btnCsAllGap          = document.getElementById('btnCsAllGap');
        btnCsClearPatterns   = document.getElementById('btnCsClearPatterns');
        csPatternPanel       = document.getElementById('csPatternPanel');
        csPatternCounter     = document.getElementById('csPatternCounter');
        csFilterChips        = document.getElementById('csFilterChips');
        csLoading            = document.getElementById('csLoading');
        csError              = document.getElementById('csError');
        csErrorText          = document.getElementById('csErrorText');
        csResults            = document.getElementById('csResults');
        csCountBadge         = document.getElementById('csCountBadge');
        csTableBody          = document.getElementById('csTableBody');
        csEmpty              = document.getElementById('csEmpty');
        csPagination         = document.getElementById('csPagination');
        csPaginationInfo     = document.getElementById('csPaginationInfo');
        csPaginationNav      = document.getElementById('csPaginationNav');
        csKpiCards           = document.getElementById('csKpiCards');
        csKpiTotal           = document.getElementById('csKpiTotal');
        csKpiBullish         = document.getElementById('csKpiBullish');
        csKpiBearish         = document.getElementById('csKpiBearish');
        csKpiNeutral         = document.getElementById('csKpiNeutral');
        csKpiGap             = document.getElementById('csKpiGap');
    }

    /* ========== Core Functions ========== */

    function hideAll() {
        if (csLoading) csLoading.style.display = 'none';
        if (csError) csError.style.display = 'none';
        if (csResults) csResults.style.display = 'none';
        if (csKpiCards) csKpiCards.style.display = 'none';
    }

    /**
     * AJAX ile mum formasyonu verilerini getirir.
     * @param {string} period - '1D', '1W', '4H' vb.
     */
    function fetchData(period) {
        if (currentController) currentController.abort();
        currentController = new AbortController();

        hideAll();
        if (csLoading) csLoading.style.display = '';
        if (btnCsScan) btnCsScan.disabled = true;
        currentPeriod = period || '1D';

        var timeoutId = setTimeout(function() { currentController.abort(); }, 30000);

        fetch('/ajax/hazir-taramalar/candle-scan?period=' + encodeURIComponent(currentPeriod), { signal: currentController.signal })
            .then(function(response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(function(data) {
                clearTimeout(timeoutId);
                if (btnCsScan) btnCsScan.disabled = false;
                allStocks = data.stocks || data || [];

                // Gap formasyonu hesaplama (client-side)
                allStocks.forEach(function(stock) {
                    if (!stock.open || !stock.price || stock.changePercent == null) return;
                    var pc = stock.price / (1 + stock.changePercent / 100);
                    if (isNaN(pc) || !isFinite(pc) || pc <= 0) return;
                    var gapAdded = 0;
                    // GDR: open < previousClose && close > open (yeşil mum)
                    if (stock.open < pc && stock.price > stock.open) {
                        if (!stock.patterns) stock.patterns = [];
                        stock.patterns.push('GDR'); gapAdded++;
                        if (stock.price > pc) { stock.patterns.push('GDR-Strong'); gapAdded++; }
                    }
                    // GUR: open > previousClose && close < open (kırmızı mum)
                    if (stock.open > pc && stock.price < stock.open) {
                        if (!stock.patterns) stock.patterns = [];
                        stock.patterns.push('GUR'); gapAdded++;
                        if (stock.price < pc) { stock.patterns.push('GUR-Strong'); gapAdded++; }
                    }
                    if (gapAdded > 0) {
                        stock.patternCount = (stock.patternCount != null ? stock.patternCount : 0) + gapAdded;
                    }
                });

                applyFilters();
                renderResults();
            })
            .catch(function(err) {
                clearTimeout(timeoutId);
                if (btnCsScan) btnCsScan.disabled = false;
                if (err.name === 'AbortError') { hideAll(); return; }
                hideAll();
                if (csErrorText) csErrorText.textContent = 'Mum formasyonu verileri alınamadı: ' + err.message;
                if (csError) csError.style.display = '';
            });
    }

    /**
     * Filtreleri uygular ve filteredStocks'u gunceller.
     * Kategori, min sayi, coklu formasyon, guvenilirlik ve tip filtreleri destekler.
     */
    var csKatilimFilter = null;

    function applyFilters() {
        var categoryVal = csCategorySelect ? csCategorySelect.value : 'all';
        var minCountVal = csMinCountSelect ? parseInt(csMinCountSelect.value, 10) : 1;
        var reliabilityVal = csReliabilitySelect ? csReliabilitySelect.value : 'all';
        var typeVal = csTypeSelect ? csTypeSelect.value : 'all';
        var katilimOnly = csKatilimFilter && csKatilimFilter.checked;

        filteredStocks = allStocks.filter(function(stock) {
            if (katilimOnly && !stock.katilim) return false;
            var patterns = stock.patterns || [];

            // Min count filter
            var actualCount = stock.patternCount != null ? stock.patternCount : (stock.patterns || []).length;
            if (actualCount < minCountVal) return false;

            // Category filter (stock must have at least one pattern from selected category)
            if (categoryVal !== 'all') {
                var hasCat = patterns.some(function(pKey) {
                    var info = getPatternInfo(pKey);
                    return info && info.category === categoryVal;
                });
                if (!hasCat) return false;
            }

            // Multi-pattern filter (OR — at least one selected pattern must exist)
            if (selectedPatterns.size > 0) {
                var hasPattern = patterns.some(function(p) { return selectedPatterns.has(p); });
                if (!hasPattern) return false;
            }

            // Reliability filter
            if (reliabilityVal !== 'all') {
                var hasReliability = patterns.some(function(pKey) {
                    var info = getPatternInfo(pKey);
                    return info && info.reliability === reliabilityVal;
                });
                if (!hasReliability) return false;
            }

            // Type filter
            if (typeVal !== 'all') {
                var hasType = patterns.some(function(pKey) {
                    var info = getPatternInfo(pKey);
                    return info && info.type === typeVal;
                });
                if (!hasType) return false;
            }

            return true;
        });

        currentPage = 1;
        sortData();
    }

    /**
     * filteredStocks'u sortColumn/sortOrder'a gore siralar.
     * symbol, price, changePercent, volume, patternCount destekler.
     */
    function sortData() {
        filteredStocks.sort(function(a, b) {
            var valA, valB;
            if (sortColumn === 'symbol') {
                valA = (a.symbol || '').toLocaleLowerCase('tr');
                valB = (b.symbol || '').toLocaleLowerCase('tr');
            } else if (sortColumn === 'price') {
                valA = a.price || 0;
                valB = b.price || 0;
            } else if (sortColumn === 'changePercent') {
                valA = a.changePercent || 0;
                valB = b.changePercent || 0;
            } else {
                // patternCount (default)
                valA = a.patternCount || 0;
                valB = b.patternCount || 0;
            }

            if (sortColumn === 'symbol') {
                return sortOrder === 'asc' ? valA.localeCompare(valB, 'tr') : valB.localeCompare(valA, 'tr');
            }
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        });
    }

    /**
     * Sonuclari render eder (KPI, tablo, sayfalama).
     */
    function renderResults() {
        hideAll();

        if (filteredStocks.length === 0) {
            if (csResults) csResults.style.display = '';
            if (csEmpty) csEmpty.style.display = '';
            if (csTableBody) csTableBody.textContent = '';
            if (csCountBadge) csCountBadge.textContent = '0 Hisse';
            if (csPagination) csPagination.style.display = 'none';
            renderKpiCards();
            return;
        }

        if (csResults) csResults.style.display = '';
        if (csEmpty) csEmpty.style.display = 'none';
        if (csCountBadge) csCountBadge.textContent = filteredStocks.length + ' Hisse';

        renderKpiCards();
        renderTable();
        renderPagination();
    }

    /**
     * KPI kartlarini hesaplar ve gunceller.
     */
    function renderKpiCards() {
        if (!csKpiCards) return;
        var totalStocks = filteredStocks.length;
        var bullishCount = 0;
        var bearishCount = 0;
        var neutralCount = 0;
        var gapCount = 0;

        filteredStocks.forEach(function(stock) {
            (stock.patterns || []).forEach(function(pKey) {
                var info = getPatternInfo(pKey);
                if (!info) return;
                if (info.category === 'bullish') bullishCount++;
                else if (info.category === 'bearish') bearishCount++;
                else if (info.category === 'gap') gapCount++;
                else neutralCount++;
            });
        });

        if (csKpiTotal) csKpiTotal.textContent = totalStocks;
        if (csKpiBullish) csKpiBullish.textContent = bullishCount;
        if (csKpiBearish) csKpiBearish.textContent = bearishCount;
        if (csKpiNeutral) csKpiNeutral.textContent = neutralCount;
        if (csKpiGap) csKpiGap.textContent = gapCount;
        csKpiCards.style.display = '';
    }

    /**
     * Tek bir tablo satiri olusturur (DOM-safe).
     * @param {Object} stock - { symbol, logoid, patterns, patternCount }
     * @param {number} rowNum
     * @returns {HTMLTableRowElement}
     */
    function buildRow(stock, rowNum) {
        var dominantCat = getDominantCategory(stock);
        var borderColor = getCategoryBorder(dominantCat);
        var patterns = stock.patterns || [];

        var tr = document.createElement('tr');
        tr.style.borderLeft = '3px solid ' + borderColor;
        tr.style.cursor = 'pointer';
        tr.setAttribute('data-symbol', stock.symbol || '');

        tr.addEventListener('click', function(e) {
            if (e.target.closest('a')) return;
            showDetailModal(stock);
        });

        // #1 — Row number
        var tdNum = document.createElement('td');
        tdNum.textContent = rowNum;
        tr.appendChild(tdNum);

        // #2 — Stock avatar + code link
        var tdSymbol = document.createElement('td');
        var divFlex = document.createElement('div');
        divFlex.className = 'd-flex align-items-center';

        var divAvatar = document.createElement('div');
        divAvatar.className = 'avatar-xs me-2';

        var img = document.createElement('img');
        if (stock.logoid) img.src = '/img/stock-logos/' + encodeURIComponent(stock.logoid);
        img.alt = '';
        img.className = 'rounded-circle';
        img.style.cssText = 'width:32px;height:32px;object-fit:cover;';

        var divFallback = document.createElement('div');
        divFallback.className = 'avatar-title rounded-circle bg-primary-subtle text-primary';
        divFallback.style.cssText = 'display:none;width:32px;height:32px;font-size:12px;';
        divFallback.textContent = (stock.symbol || '??').substring(0, 2);

        img.onerror = function() {
            this.style.display = 'none';
            divFallback.style.display = 'flex';
        };

        divAvatar.appendChild(img);
        divAvatar.appendChild(divFallback);

        var link = document.createElement('a');
        link.href = '/stock/detail/' + encodeURIComponent(stock.symbol);
        link.className = 'text-reset fw-medium';
        link.textContent = stock.symbol;

        divFlex.appendChild(divAvatar);
        divFlex.appendChild(link);
        if (stock.katilim) {
            var kBadge = document.createElement('span');
            kBadge.className = 'badge bg-success bg-opacity-25 text-success ms-1';
            kBadge.style.cssText = 'font-size:0.65rem;padding:1px 4px;';
            kBadge.title = 'Katılım Endeksi';
            kBadge.textContent = 'K';
            divFlex.appendChild(kBadge);
        }
        tdSymbol.appendChild(divFlex);
        tr.appendChild(tdSymbol);

        // #3 — Price
        var tdPrice = document.createElement('td');
        tdPrice.className = 'text-end';
        tdPrice.textContent = formatPriceTr(stock.price);
        tr.appendChild(tdPrice);

        // #4 — Change %
        var tdChange = document.createElement('td');
        tdChange.className = 'text-end';
        if (stock.changePercent != null) {
            var changeSpan = document.createElement('span');
            var isPos = stock.changePercent >= 0;
            changeSpan.className = 'fw-medium text-' + (isPos ? 'success' : 'danger');
            changeSpan.textContent = (isPos ? '+' : '') + stock.changePercent.toFixed(2) + '%';
            tdChange.appendChild(changeSpan);
        } else {
            tdChange.textContent = '-';
        }
        tr.appendChild(tdChange);



        // #5 — Pattern count badge
        var tdCount = document.createElement('td');
        tdCount.className = 'text-center';
        var countBadge = document.createElement('span');
        countBadge.className = 'badge bg-primary';
        countBadge.textContent = stock.patternCount != null ? stock.patternCount : patterns.length;
        tdCount.appendChild(countBadge);
        tr.appendChild(tdCount);

        // #6 — Pattern badges (max 5 visible + overflow)
        var tdPatterns = document.createElement('td');
        var badgeWrap = document.createElement('div');
        badgeWrap.className = 'd-flex flex-wrap gap-1';

        var maxVisible = 5;
        var visiblePatterns = patterns.slice(0, maxVisible);
        var overflowCount = patterns.length - maxVisible;

        visiblePatterns.forEach(function(pKey) {
            var info = getPatternInfo(pKey);
            var color = getCategoryColor(pKey);
            var badge = document.createElement('span');
            badge.className = 'badge bg-' + color + '-subtle text-' + color + ' fs-10';

            // Mini SVG ikon
            var svgHtml = getCandleSvg(pKey);
            if (svgHtml) {
                var svgSpan = document.createElement('span');
                svgSpan.className = 'me-1';
                svgSpan.style.verticalAlign = 'middle';
                // DOM-safe: SVG trusted internal constant, not user input
                svgSpan.innerHTML = svgHtml.replace('width="48"', 'width="20"').replace('height="28"', 'height="12"');
                badge.appendChild(svgSpan);
            }

            badge.appendChild(document.createTextNode(info ? info.tr : pKey));
            badge.style.cursor = 'pointer';
            badge.addEventListener('click', (function(key) {
                return function(e) {
                    e.stopPropagation(); // Don't trigger row click (showDetailModal)
                    showPatternInfo(key);
                };
            })(pKey));
            badgeWrap.appendChild(badge);
        });

        if (overflowCount > 0) {
            var overBadge = document.createElement('span');
            overBadge.className = 'badge bg-secondary-subtle text-secondary fs-10';
            overBadge.textContent = '+' + overflowCount + ' daha';
            badgeWrap.appendChild(overBadge);
        }

        tdPatterns.appendChild(badgeWrap);
        tr.appendChild(tdPatterns);

        // #7 — Period badge
        var tdPeriod = document.createElement('td');
        tdPeriod.className = 'text-center';
        var periodBadge = document.createElement('span');
        var periodLabel = currentPeriod === '1W' ? 'Haftalık'
            : currentPeriod === '4H' ? '4 Saatlik'
            : currentPeriod === '1H' ? '1 Saatlik'
            : currentPeriod === '15' ? '15 Dak'
            : 'Günlük';
        var periodClass = (currentPeriod === '1W' || currentPeriod === '15') ? 'badge bg-info-subtle text-info' : 'badge bg-primary-subtle text-primary';
        periodBadge.className = periodClass;
        periodBadge.textContent = periodLabel;
        tdPeriod.appendChild(periodBadge);
        tr.appendChild(tdPeriod);

        return tr;
    }

    /**
     * Tabloyu render eder (mevcut sayfa dilimi).
     */
    function renderTable() {
        if (!csTableBody) return;
        var start = (currentPage - 1) * PAGE_SIZE;
        var end = Math.min(start + PAGE_SIZE, filteredStocks.length);
        var pageData = filteredStocks.slice(start, end);

        // Clear table body
        while (csTableBody.firstChild) {
            csTableBody.removeChild(csTableBody.firstChild);
        }

        var fragment = document.createDocumentFragment();
        pageData.forEach(function(stock, idx) {
            fragment.appendChild(buildRow(stock, start + idx + 1));
        });
        csTableBody.appendChild(fragment);

        // Bootstrap tooltip init
        var tooltipTriggerList = csTableBody.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipTriggerList.forEach(function(el) {
            new bootstrap.Tooltip(el);
        });
    }

    /**
     * Sayfalama kontrollerini render eder (max 7 gorunen sayfa).
     */
    function renderPagination() {
        if (!csPaginationNav) return;
        var totalPages = Math.ceil(filteredStocks.length / PAGE_SIZE);

        if (totalPages <= 1) {
            if (csPagination) csPagination.style.display = 'none';
            if (csPaginationInfo) csPaginationInfo.textContent = filteredStocks.length + ' hisse';
            // Nav'i temizle (onceki render'dan kalan linkler)
            while (csPaginationNav.firstChild) {
                csPaginationNav.removeChild(csPaginationNav.firstChild);
            }
            return;
        }

        if (csPagination) csPagination.style.display = '';
        var start = (currentPage - 1) * PAGE_SIZE + 1;
        var end = Math.min(currentPage * PAGE_SIZE, filteredStocks.length);
        if (csPaginationInfo) csPaginationInfo.textContent = start + '-' + end + ' / ' + filteredStocks.length + ' hisse';

        // Clear pagination nav
        while (csPaginationNav.firstChild) {
            csPaginationNav.removeChild(csPaginationNav.firstChild);
        }

        var maxVisible = 7;
        var startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        var endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        function createPageItem(page, content, disabled, active) {
            var li = document.createElement('li');
            li.className = 'page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '');
            var a = document.createElement('a');
            a.className = 'page-link';
            a.href = '#';
            if (typeof content === 'string' && content.startsWith('ri-')) {
                var icon = document.createElement('i');
                icon.className = content;
                a.appendChild(icon);
            } else {
                a.textContent = content;
            }
            a.addEventListener('click', function(e) {
                e.preventDefault();
                if (page >= 1 && page <= totalPages && page !== currentPage) {
                    currentPage = page;
                    renderTable();
                    renderPagination();
                }
            });
            li.appendChild(a);
            return li;
        }

        // Previous
        csPaginationNav.appendChild(
            createPageItem(currentPage - 1, 'ri-arrow-left-s-line', currentPage === 1, false)
        );

        // Page numbers
        for (var i = startPage; i <= endPage; i++) {
            csPaginationNav.appendChild(
                createPageItem(i, String(i), false, i === currentPage)
            );
        }

        // Next
        csPaginationNav.appendChild(
            createPageItem(currentPage + 1, 'ri-arrow-right-s-line', currentPage === totalPages, false)
        );
    }

    /**
     * Pattern checkbox panelini kategori bazli olusturur.
     * 3 kategori (Boga/Ayi/Kararsizlik) icinde checkbox grid.
     */
    function populatePatternCheckboxPanel() {
        if (!csPatternPanel) return;
        csPatternPanel.textContent = '';

        var categories = [
            { key: 'bullish', label: 'Boğa Formasyonları', color: 'success', icon: 'ri-arrow-up-circle-line' },
            { key: 'bearish', label: 'Ayı Formasyonları', color: 'danger', icon: 'ri-arrow-down-circle-line' },
            { key: 'neutral', label: 'Kararsızlık Formasyonları', color: 'warning', icon: 'ri-arrow-left-right-line' },
            { key: 'gap', label: 'Gap Formasyonları', color: 'info', icon: 'ri-split-cells-vertical' }
        ];

        // Birlesik pattern listesi
        var allPatterns = {};
        Object.keys(CANDLE_PATTERNS).forEach(function(k) { allPatterns[k] = CANDLE_PATTERNS[k]; });
        Object.keys(GAP_PATTERNS).forEach(function(k) { allPatterns[k] = GAP_PATTERNS[k]; });

        categories.forEach(function(cat) {
            // Category header
            var header = document.createElement('div');
            header.className = 'fw-medium small text-' + cat.color + ' mb-1' + (cat.key !== 'bullish' ? ' mt-2' : '');
            var icon = document.createElement('i');
            icon.className = cat.icon + ' me-1';
            header.appendChild(icon);
            header.appendChild(document.createTextNode(cat.label));
            csPatternPanel.appendChild(header);

            // Checkbox grid (visible checkboxes, no scroll)
            var grid = document.createElement('div');
            grid.className = 'row g-1 mb-2';

            Object.keys(allPatterns).forEach(function(pKey) {
                var info = allPatterns[pKey];
                if (info.category !== cat.key) return;

                var col = document.createElement('div');
                col.className = 'col-lg-3 col-md-4 col-sm-6';

                var wrapper = document.createElement('div');
                wrapper.className = 'form-check';

                var input = document.createElement('input');
                input.type = 'checkbox';
                input.className = 'form-check-input cs-pattern-cb';
                input.id = 'csCb_' + pKey;
                input.value = pKey;
                input.checked = selectedPatterns.has(pKey);

                var label = document.createElement('label');
                label.className = 'form-check-label small text-' + cat.color;
                label.htmlFor = 'csCb_' + pKey;
                label.textContent = info.tr;

                input.addEventListener('change', function() {
                    if (this.checked) {
                        selectedPatterns.add(pKey);
                    } else {
                        selectedPatterns.delete(pKey);
                    }
                    updateFilterCounter();
                    renderFilterChips();
                    if (allStocks.length > 0) {
                        applyFilters();
                        renderResults();
                    }
                });

                wrapper.appendChild(input);
                wrapper.appendChild(label);
                col.appendChild(wrapper);
                grid.appendChild(col);

            });

            csPatternPanel.appendChild(grid);
        });
    }

    /**
     * Belirtilen kategorideki tum formasyonlari secer.
     * @param {string} cat - 'bullish' | 'bearish' | 'neutral'
     */
    function selectAllCategory(cat) {
        Object.keys(CANDLE_PATTERNS).forEach(function(pKey) {
            if (CANDLE_PATTERNS[pKey].category === cat) {
                selectedPatterns.add(pKey);
                var cb = document.getElementById('csCb_' + pKey);
                if (cb) {
                    cb.checked = true;
                }
            }
        });
        Object.keys(GAP_PATTERNS).forEach(function(pKey) {
            if (GAP_PATTERNS[pKey].category === cat) {
                selectedPatterns.add(pKey);
                var cb = document.getElementById('csCb_' + pKey);
                if (cb) {
                    cb.checked = true;
                }
            }
        });
        updateFilterCounter();
        renderFilterChips();
        if (allStocks.length > 0) { applyFilters(); renderResults(); }
    }

    /**
     * Tum formasyon secimlerini temizler.
     */
    function clearAllPatterns() {
        selectedPatterns.clear();
        if (csPatternPanel) {
            csPatternPanel.querySelectorAll('.cs-pattern-cb').forEach(function(cb) {
                cb.checked = false;
            });
        }
        updateFilterCounter();
        renderFilterChips();
        if (allStocks.length > 0) { applyFilters(); renderResults(); }
    }

    /**
     * Secili formasyon sayacini gunceller.
     */
    function updateFilterCounter() {
        if (!csPatternCounter) return;
        if (selectedPatterns.size > 0) {
            csPatternCounter.textContent = selectedPatterns.size + ' seçili';
            csPatternCounter.style.display = '';
        } else {
            csPatternCounter.style.display = 'none';
        }
    }

    /**
     * Secili formasyonlari chip olarak render eder.
     */
    function renderFilterChips() {
        if (!csFilterChips) return;
        csFilterChips.textContent = '';

        selectedPatterns.forEach(function(pKey) {
            var info = getPatternInfo(pKey);
            if (!info) return;
            var color = getCategoryColor(pKey);
            var chip = document.createElement('span');
            chip.className = 'badge bg-' + color + '-subtle text-' + color + ' d-inline-flex align-items-center gap-1';
            chip.appendChild(document.createTextNode(info.tr));

            var closeBtn = document.createElement('i');
            closeBtn.className = 'ri-close-line fs-12';
            closeBtn.style.cursor = 'pointer';
            closeBtn.addEventListener('click', function() {
                selectedPatterns.delete(pKey);
                var cb = document.getElementById('csCb_' + pKey);
                if (cb) cb.checked = false;
                updateFilterCounter();
                renderFilterChips();
                if (allStocks.length > 0) { applyFilters(); renderResults(); }
            });
            chip.appendChild(closeBtn);
            csFilterChips.appendChild(chip);
        });
    }

    /**
     * Tum filtreleri sifirlar ve veriyi yeniden getirir.
     */
    function resetAllFilters() {
        // Reset dropdowns
        if (csPeriodSelect) csPeriodSelect.value = '1D';
        if (csCategorySelect) csCategorySelect.value = 'all';
        if (csMinCountSelect) csMinCountSelect.value = '1';
        if (csReliabilitySelect) csReliabilitySelect.value = 'all';
        if (csTypeSelect) csTypeSelect.value = 'all';
        // Reset sort state
        sortColumn = 'patternCount';
        sortOrder = 'desc';
        // Clear pattern selection without triggering re-filter (avoid double render)
        selectedPatterns.clear();
        if (csPatternPanel) {
            csPatternPanel.querySelectorAll('.cs-pattern-cb').forEach(function(cb) {
                cb.checked = false;
            });
        }
        updateFilterCounter();
        renderFilterChips();
        // Re-fetch data (this will trigger applyFilters + renderResults)
        fetchData('1D');
    }

    /**
     * Fiyati Turkce formatla gosterir.
     * @param {number|null} price
     * @returns {string}
     */
    function formatPriceTr(price) {
        if (price == null || isNaN(price)) return '-';
        price = Number(price);
        return price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }


    /**
     * Hisse detay modalini gosterir.
     * Modal body icerigi trusted constant + escHtml ile sanitize edilmis veri kullanir.
     * @param {Object} stock - { symbol, logoid, patterns }
     */
    function showDetailModal(stock) {
        var modalEl = document.getElementById('csDetailModal');
        if (!modalEl) return;

        var modalTitle = document.getElementById('csDetailModalTitle');
        var modalBody  = document.getElementById('csDetailModalBody');
        if (!modalTitle || !modalBody) return;

        var patterns = stock.patterns || [];

        // Header: sembol + logo
        modalTitle.textContent = stock.symbol + ' \u2014 Mum Formasyonlar\u0131';

        // Build modal body using DOM methods for safety
        // Clear existing content
        while (modalBody.firstChild) {
            modalBody.removeChild(modalBody.firstChild);
        }

        // Logo + sembol header
        var headerDiv = document.createElement('div');
        headerDiv.className = 'd-flex align-items-center mb-3';

        var avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar-sm me-3';

        var headerImg = document.createElement('img');
        if (stock.logoid) headerImg.src = '/img/stock-logos/' + encodeURIComponent(stock.logoid);
        headerImg.alt = '';
        headerImg.className = 'rounded-circle';
        headerImg.style.cssText = 'width:40px;height:40px;object-fit:cover;';

        var headerFallback = document.createElement('div');
        headerFallback.className = 'avatar-title rounded-circle bg-primary-subtle text-primary';
        headerFallback.style.cssText = 'display:none;width:40px;height:40px;font-size:14px;';
        headerFallback.textContent = (stock.symbol || '??').substring(0, 2);

        headerImg.onerror = function() {
            this.style.display = 'none';
            headerFallback.style.display = 'flex';
        };

        avatarDiv.appendChild(headerImg);
        avatarDiv.appendChild(headerFallback);

        var infoDiv = document.createElement('div');
        var h5 = document.createElement('h5');
        h5.className = 'mb-0';
        h5.textContent = stock.symbol;
        var small = document.createElement('small');
        small.className = 'text-muted';
        small.textContent = patterns.length + ' formasyon tespit edildi';
        infoDiv.appendChild(h5);
        infoDiv.appendChild(small);

        headerDiv.appendChild(avatarDiv);
        headerDiv.appendChild(infoDiv);
        modalBody.appendChild(headerDiv);

        // Each pattern as a card
        patterns.forEach(function(pKey) {
            var info = getPatternInfo(pKey) || {};
            var color = getCategoryColor(pKey);
            var catLabel = getCategoryLabel(info.category || 'neutral');
            var largeSvg = getCandleSvg(pKey, 80, 46);

            var card = document.createElement('div');
            card.className = 'card border mb-2';
            var cardBody = document.createElement('div');
            cardBody.className = 'card-body py-2 px-3';
            var flexRow = document.createElement('div');
            flexRow.className = 'd-flex align-items-center';

            // SVG icon
            if (largeSvg) {
                var svgCol = document.createElement('div');
                svgCol.className = 'me-3 text-center';
                svgCol.style.minWidth = '84px';
                var svgInner = document.createElement('div');
                svgInner.className = 'bg-light rounded p-1 d-inline-block';
                // Trusted internal SVG constant
                svgInner.innerHTML = largeSvg;
                svgCol.appendChild(svgInner);
                flexRow.appendChild(svgCol);
            }

            // Info section
            var infoCol = document.createElement('div');
            infoCol.className = 'flex-grow-1';

            var title = document.createElement('h6');
            title.className = 'mb-1 fs-13';
            title.textContent = (info.tr || pKey) + ' ';
            var titleSmall = document.createElement('small');
            titleSmall.className = 'text-muted';
            titleSmall.textContent = '(' + pKey + ')';
            title.appendChild(titleSmall);

            var desc = document.createElement('p');
            desc.className = 'text-muted fs-12 mb-2';
            desc.textContent = info.desc || '';

            var badgesDiv = document.createElement('div');
            badgesDiv.className = 'd-flex gap-1 flex-wrap';

            // Category badge
            var catBadge = document.createElement('span');
            catBadge.className = 'badge bg-' + color + '-subtle text-' + color;
            catBadge.textContent = catLabel;
            badgesDiv.appendChild(catBadge);

            // Reliability badge
            var relColor = 'secondary';
            if (info.reliability === '\u00c7ok Y\u00fcksek') relColor = 'success';
            else if (info.reliability === 'Y\u00fcksek') relColor = 'info';
            else if (info.reliability === 'Orta') relColor = 'warning';
            var relBadge = document.createElement('span');
            relBadge.className = 'badge bg-' + relColor + '-subtle text-' + relColor;
            relBadge.textContent = info.reliability || '-';
            badgesDiv.appendChild(relBadge);

            // Type badge
            var typeColor = 'primary';
            if (info.type === 'Devam') typeColor = 'info';
            else if (info.type === 'Karars\u0131zl\u0131k') typeColor = 'warning';
            var typeBadge = document.createElement('span');
            typeBadge.className = 'badge bg-' + typeColor + '-subtle text-' + typeColor;
            typeBadge.textContent = info.type || '-';
            badgesDiv.appendChild(typeBadge);

            infoCol.appendChild(title);
            infoCol.appendChild(desc);
            infoCol.appendChild(badgesDiv);

            flexRow.appendChild(infoCol);
            cardBody.appendChild(flexRow);
            card.appendChild(cardBody);
            modalBody.appendChild(card);
        });

        // Summary: X Boga | Y Ayi | Z Kararsiz
        var bullish = 0, bearish = 0, neutral = 0, gapCount = 0;
        patterns.forEach(function(pKey) {
            var info = getPatternInfo(pKey);
            if (!info) return;
            if (info.category === 'bullish') bullish++;
            else if (info.category === 'bearish') bearish++;
            else if (info.category === 'gap') gapCount++;
            else neutral++;
        });

        var summaryDiv = document.createElement('div');
        summaryDiv.className = 'd-flex justify-content-center gap-3 mt-3 mb-3';

        if (bullish > 0) {
            var bBadge = document.createElement('span');
            bBadge.className = 'badge bg-success-subtle text-success fs-12';
            var bIcon = document.createElement('i');
            bIcon.className = 'ri-arrow-up-line me-1';
            bBadge.appendChild(bIcon);
            bBadge.appendChild(document.createTextNode(bullish + ' Bo\u011fa'));
            summaryDiv.appendChild(bBadge);
        }
        if (bearish > 0) {
            var aBadge = document.createElement('span');
            aBadge.className = 'badge bg-danger-subtle text-danger fs-12';
            var aIcon = document.createElement('i');
            aIcon.className = 'ri-arrow-down-line me-1';
            aBadge.appendChild(aIcon);
            aBadge.appendChild(document.createTextNode(bearish + ' Ay\u0131'));
            summaryDiv.appendChild(aBadge);
        }
        if (neutral > 0) {
            var nBadge = document.createElement('span');
            nBadge.className = 'badge bg-warning-subtle text-warning fs-12';
            var nIcon = document.createElement('i');
            nIcon.className = 'ri-arrow-left-right-line me-1';
            nBadge.appendChild(nIcon);
            nBadge.appendChild(document.createTextNode(neutral + ' Karars\u0131z'));
            summaryDiv.appendChild(nBadge);
        }
        if (gapCount > 0) {
            var gBadge = document.createElement('span');
            gBadge.className = 'badge bg-info-subtle text-info fs-12';
            var gIcon = document.createElement('i');
            gIcon.className = 'ri-split-cells-vertical me-1';
            gBadge.appendChild(gIcon);
            gBadge.appendChild(document.createTextNode(gapCount + ' Gap'));
            summaryDiv.appendChild(gBadge);
        }

        modalBody.appendChild(summaryDiv);

        // Stock detail link
        var linkDiv = document.createElement('div');
        linkDiv.className = 'text-center';
        var detailLink = document.createElement('a');
        detailLink.href = '/stock/detail/' + encodeURIComponent(stock.symbol);
        detailLink.className = 'btn btn-sm btn-primary';
        var linkIcon = document.createElement('i');
        linkIcon.className = 'ri-line-chart-line me-1';
        detailLink.appendChild(linkIcon);
        detailLink.appendChild(document.createTextNode('Hisse Detay\u0131na Git'));
        linkDiv.appendChild(detailLink);
        modalBody.appendChild(linkDiv);

        var modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    }

    /**
     * Tek bir formasyon icin detay popup'i acar.
     * csDetailModal'i yeniden kullanir — icerigini formasyon bilgileriyle doldurur.
     * @param {string} pKey - CANDLE_PATTERNS key
     */
    function showPatternInfo(pKey) {
        var modalEl = document.getElementById('csDetailModal');
        if (!modalEl) return;

        var modalTitle = document.getElementById('csDetailModalTitle');
        var modalBody  = document.getElementById('csDetailModalBody');
        if (!modalTitle || !modalBody) return;

        var info = getPatternInfo(pKey) || {};
        var color = getCategoryColor(pKey);
        var catLabel = getCategoryLabel(info.category || 'neutral');

        // Title
        modalTitle.textContent = 'Formasyon Detay\u0131 \u2014 ' + (info.tr || pKey);

        // Clear existing content
        while (modalBody.firstChild) {
            modalBody.removeChild(modalBody.firstChild);
        }

        // 1. Large SVG centered
        var largeSvg = getCandleSvg(pKey, 280, 160);
        if (largeSvg) {
            var svgWrap = document.createElement('div');
            svgWrap.className = 'bg-light rounded p-3 text-center mb-3';
            // Trusted internal SVG constant
            svgWrap.innerHTML = largeSvg;
            modalBody.appendChild(svgWrap);
        }

        // 2. Info cards row (4 cards)
        var cardsRow = document.createElement('div');
        cardsRow.className = 'row g-2 mb-3';

        var cardData = [
            { label: 'Y\u00f6n', value: catLabel, badgeClass: 'bg-' + color + '-subtle text-' + color },
            { label: 'G\u00fcvenilirlik', value: info.reliability || '-', badgeClass: 'bg-' + (info.reliability === '\u00c7ok Y\u00fcksek' ? 'success' : info.reliability === 'Y\u00fcksek' ? 'info' : info.reliability === 'Orta' ? 'warning' : 'secondary') + '-subtle text-' + (info.reliability === '\u00c7ok Y\u00fcksek' ? 'success' : info.reliability === 'Y\u00fcksek' ? 'info' : info.reliability === 'Orta' ? 'warning' : 'secondary') },
            { label: 'Tip', value: info.type || '-', badgeClass: 'bg-' + (info.type === 'D\u00f6n\u00fc\u015f' ? 'primary' : info.type === 'Devam' ? 'info' : 'warning') + '-subtle text-' + (info.type === 'D\u00f6n\u00fc\u015f' ? 'primary' : info.type === 'Devam' ? 'info' : 'warning') },
            { label: 'Kategori', value: catLabel, badgeClass: 'bg-' + color + '-subtle text-' + color }
        ];

        cardData.forEach(function(cd) {
            var col = document.createElement('div');
            col.className = 'col-6 col-md-3';
            var card = document.createElement('div');
            card.className = 'card border mb-0';
            var cardBody = document.createElement('div');
            cardBody.className = 'card-body p-2 text-center';
            var labelEl = document.createElement('div');
            labelEl.className = 'text-muted fs-11 mb-1';
            labelEl.textContent = cd.label;
            var badge = document.createElement('span');
            badge.className = 'badge ' + cd.badgeClass;
            badge.textContent = cd.value;
            cardBody.appendChild(labelEl);
            cardBody.appendChild(badge);
            card.appendChild(cardBody);
            col.appendChild(card);
            cardsRow.appendChild(col);
        });

        modalBody.appendChild(cardsRow);

        // 3. "Formasyon Hakkinda" section
        var aboutH6 = document.createElement('h6');
        aboutH6.className = 'mb-2';
        var aboutIcon = document.createElement('i');
        aboutIcon.className = 'ri-book-line me-1 align-middle';
        aboutH6.appendChild(aboutIcon);
        aboutH6.appendChild(document.createTextNode('Formasyon Hakk\u0131nda'));
        modalBody.appendChild(aboutH6);

        var descP = document.createElement('p');
        descP.className = 'text-muted fs-13 mb-3';
        descP.textContent = info.desc || '';
        modalBody.appendChild(descP);

        // 4. "Ne Yapilmali?" section
        if (info.action) {
            var actionH6 = document.createElement('h6');
            actionH6.className = 'mb-2';
            var actionIcon = document.createElement('i');
            actionIcon.className = 'ri-lightbulb-line me-1 align-middle';
            actionH6.appendChild(actionIcon);
            actionH6.appendChild(document.createTextNode('Ne Yap\u0131lmal\u0131?'));
            modalBody.appendChild(actionH6);

            var actionP = document.createElement('p');
            actionP.className = 'text-muted fs-13 mb-3';
            actionP.textContent = info.action;
            modalBody.appendChild(actionP);
        }

        // 5. Warning alert
        if (info.warning) {
            var alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-warning d-flex align-items-start mb-3';
            var warnIcon = document.createElement('i');
            warnIcon.className = 'ri-error-warning-line me-2 fs-16 flex-shrink-0';
            warnIcon.style.marginTop = '2px';
            var warnText = document.createElement('div');
            warnText.className = 'fs-13';
            warnText.textContent = info.warning;
            alertDiv.appendChild(warnIcon);
            alertDiv.appendChild(warnText);
            modalBody.appendChild(alertDiv);
        }

        // 6. Bottom badge: type badge
        var bottomDiv = document.createElement('div');
        bottomDiv.className = 'text-center';
        var typeColor = 'primary';
        if (info.type === 'Devam') typeColor = 'info';
        else if (info.type === 'Karars\u0131zl\u0131k') typeColor = 'warning';
        var typeBadge = document.createElement('span');
        typeBadge.className = 'badge bg-' + typeColor + '-subtle text-' + typeColor + ' fs-12';
        typeBadge.textContent = info.type || '-';
        bottomDiv.appendChild(typeBadge);
        modalBody.appendChild(bottomDiv);

        var modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    }

    /**
     * Siralama gostergelerini gunceller.
     */
    function updateSortIndicators() {
        var sortableHeaders = document.querySelectorAll('.cs-sortable');
        if (!sortableHeaders || sortableHeaders.length === 0) return;
        sortableHeaders.forEach(function(th) {
            var col = th.getAttribute('data-col');
            var iconEl = th.querySelector('.cs-sort-icon');
            if (!iconEl) {
                iconEl = document.createElement('i');
                iconEl.className = 'cs-sort-icon ms-1';
                th.appendChild(iconEl);
            }
            if (col === sortColumn) {
                iconEl.className = 'cs-sort-icon ms-1 ri-arrow-' + (sortOrder === 'asc' ? 'up' : 'down') + '-s-fill text-primary';
            } else {
                iconEl.className = 'cs-sort-icon ms-1 ri-arrow-up-down-line text-muted opacity-50';
            }
        });
    }

    /* ========== Event Binding ========== */

    document.addEventListener('DOMContentLoaded', function() {

        // DOM referanslarını al (elementler artık DOM'da mevcut)
        initDomReferences();

        // Katılım filtre checkbox
        csKatilimFilter = document.getElementById('csKatilimFilter');
        if (csKatilimFilter) {
            csKatilimFilter.addEventListener('change', function() {
                if (allStocks.length > 0) { applyFilters(); renderResults(); }
            });
        }

        // Scan button
        if (btnCsScan) {
            btnCsScan.addEventListener('click', function() {
                var period = csPeriodSelect ? csPeriodSelect.value : '1D';
                fetchData(period);
            });
        }

        // Category filter -> re-filter
        if (csCategorySelect) {
            csCategorySelect.addEventListener('change', function() {
                if (allStocks.length > 0) {
                    applyFilters();
                    renderResults();
                }
            });
        }

        // Min count filter
        if (csMinCountSelect) {
            csMinCountSelect.addEventListener('change', function() {
                if (allStocks.length > 0) {
                    applyFilters();
                    renderResults();
                }
            });
        }

        // Reliability filter
        if (csReliabilitySelect) {
            csReliabilitySelect.addEventListener('change', function() {
                if (allStocks.length > 0) { applyFilters(); renderResults(); }
            });
        }

        // Type filter
        if (csTypeSelect) {
            csTypeSelect.addEventListener('change', function() {
                if (allStocks.length > 0) { applyFilters(); renderResults(); }
            });
        }

        // Quick select buttons
        if (btnCsAllBullish) btnCsAllBullish.addEventListener('click', function() { selectAllCategory('bullish'); });
        if (btnCsAllBearish) btnCsAllBearish.addEventListener('click', function() { selectAllCategory('bearish'); });
        if (btnCsAllNeutral) btnCsAllNeutral.addEventListener('click', function() { selectAllCategory('neutral'); });
        if (btnCsAllGap) btnCsAllGap.addEventListener('click', function() { selectAllCategory('gap'); });
        if (btnCsClearPatterns) btnCsClearPatterns.addEventListener('click', clearAllPatterns);

        // Reset button
        if (btnCsReset) btnCsReset.addEventListener('click', resetAllFilters);

        // Sort headers
        document.querySelectorAll('.cs-sortable').forEach(function(th) {
            th.style.cursor = 'pointer';
            th.addEventListener('click', function() {
                var col = this.getAttribute('data-col');
                if (sortColumn === col) {
                    sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
                } else {
                    sortColumn = col;
                    sortOrder = col === 'symbol' ? 'asc' : 'desc';
                }
                sortData();
                renderTable();
                renderPagination();
                updateSortIndicators();
            });
        });

        // Populate pattern checkbox panel initially
        populatePatternCheckboxPanel();

        // Tooltip init (thead + reset button vb.)
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function(el) {
            new bootstrap.Tooltip(el);
        });

        // Auto-fetch 1D data on page load
        fetchData('1D');
    });

})();
