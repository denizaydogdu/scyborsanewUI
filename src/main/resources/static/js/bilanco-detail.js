/**
 * Bilanco Detay Sayfasi JavaScript
 *
 * 9 sekmeli finansal detay sayfasi. Her sekme lazy-load ile
 * AJAX uzerinden veri ceker. Veri cache'lenir.
 *
 * Thymeleaf inline JS'den window global degiskenleri bekler:
 * - window.STOCK_SYMBOL (String)
 */
(function () {
    'use strict';

    var symbol = window.STOCK_SYMBOL || '';
    var cache = {};
    var loadedTabs = {};

    var tabHandlers = {
        'tab-ozet': loadOzetRapor,
        'tab-sirket': loadSirketBilgileri,
        'tab-bilanco': loadBilanco,
        'tab-gelir': loadGelirTablosu,
        'tab-nakit': loadNakitAkim,
        'tab-oranlar': loadOranAnalizi,
        'tab-carpanlar': loadPiyasaCarpanlari,
        'tab-skor': loadSkorKarti,
        'tab-karsilastir': loadKarsilastir
    };

    /**
     * Sayfa yuklendiginde calisir.
     */
    function init() {
        if (!symbol) return;

        // Tab degisim olaylarini dinle
        var tabLinks = document.querySelectorAll('[data-bs-toggle="tab"]');
        tabLinks.forEach(function (tab) {
            tab.addEventListener('shown.bs.tab', function (e) {
                var targetId = e.target.getAttribute('href').substring(1);
                if (!loadedTabs[targetId] && tabHandlers[targetId]) {
                    tabHandlers[targetId]();
                }
            });
        });

        // Tab tooltip'lerini baslat
        initTooltips();

        // Ilk sekmeyi yukle
        loadOzetRapor();
    }

    // =====================================================================
    // TAB LOADERS
    // =====================================================================

    /**
     * Ozet Rapor sekmesini yukler.
     */
    function loadOzetRapor() {
        var containerId = 'ozet-content';
        Promise.all([
            fetchData('/ajax/bilanco/' + encodeURIComponent(symbol) + '/rasyo'),
            fetchData('/ajax/bilanco/' + encodeURIComponent(symbol))
        ]).then(function (results) {
            var rasyo = (results[0] && results[0].data) || {};
            var bilanco = (results[1] && results[1].data) || {};

            var container = document.getElementById(containerId);
            if (!container) return;
            clearElement(container);

            // Sirket bilgi header
            var headerDiv = document.createElement('div');
            headerDiv.className = 'mb-4';
            var h5 = document.createElement('h5');
            h5.textContent = bilanco.title || symbol;
            headerDiv.appendChild(h5);

            var badgePeriod = document.createElement('span');
            badgePeriod.className = 'badge bg-info me-2';
            badgePeriod.textContent = bilanco.period || '';
            headerDiv.appendChild(badgePeriod);

            var badgeCons = document.createElement('span');
            badgeCons.className = 'badge bg-secondary';
            badgeCons.textContent = bilanco.consolidation === 'CS' ? 'Konsolide' : 'Solo';
            headerDiv.appendChild(badgeCons);

            if (isSafeUrl(bilanco.link)) {
                var kapLink = document.createElement('a');
                kapLink.href = bilanco.link;
                kapLink.target = '_blank';
                kapLink.className = 'ms-2';
                var kapIcon = document.createElement('i');
                kapIcon.className = 'ri-external-link-line';
                kapLink.appendChild(kapIcon);
                kapLink.appendChild(document.createTextNode(' KAP Bildirimi'));
                headerDiv.appendChild(kapLink);
            }
            container.appendChild(headerDiv);

            container.appendChild(createInfoCard('ozet-info', 'Özet Rapor Nedir?', [
                {icon: 'ri-dashboard-line', iconColor: 'text-primary', title: 'Finansal Özet', desc: 'Şirketin en önemli <strong>değerleme çarpanları</strong> ve borçluluk göstergeleri tek bakışta.'},
                {icon: 'ri-money-dollar-circle-line', iconColor: 'text-success', title: 'F/K ve PD/DD', desc: '<strong>F/K:</strong> Kâra göre fiyat. <strong>PD/DD:</strong> Defter değerine göre fiyat. Düşükse ucuz sinyali.'},
                {icon: 'ri-scales-3-line', iconColor: 'text-warning', title: 'Borçluluk', desc: '<strong>Kaldıraç Oranı:</strong> Varlıkların ne kadarı borçla finanse edilmiş. <strong>Borç/Özsermaye:</strong> Sermaye yapısı dengesi.'}
            ]));

            // Metrik kartlari
            var metrics = [
                {label: 'F/K', value: rasyo.fk, icon: 'ri-funds-line', tooltip: 'Fiyat/Kazanç oranı. Düşükse hisse görece ucuz.'},
                {label: 'PD/DD', value: rasyo.pddd, icon: 'ri-book-open-line', tooltip: 'Piyasa Değeri/Defter Değeri. 1\'in altı ucuz sayılır.'},
                {label: 'Temettü Verimi', value: rasyo.temettuVerimi, suffix: '%', icon: 'ri-percent-line', tooltip: 'Yıllık temettü ÷ hisse fiyatı. Yüksekse daha fazla kâr payı.'},
                {label: 'HBK', value: rasyo.hisseBasinaKar, icon: 'ri-money-dollar-circle-line', tooltip: 'Hisse Başına Kâr. Net kâr ÷ hisse adedi (TL).'},
                {label: 'Kaldıraç Oranı', value: rasyo.kaldiracOrani, icon: 'ri-scales-3-line', tooltip: 'Toplam borç ÷ toplam varlık (%). Yüksekse şirket borçlu.'},
                {label: 'Borç/Özsermaye', value: rasyo.borclarOzsemaye, icon: 'ri-bar-chart-grouped-line', tooltip: 'Toplam borç ÷ özkaynaklar. 1\'in üstü borçların özsermayeyi aştığını gösterir.'}
            ];

            var metricsRow = document.createElement('div');
            metricsRow.className = 'row';
            for (var i = 0; i < metrics.length; i++) {
                var m = metrics[i];
                var col = document.createElement('div');
                col.className = 'col-md-4 col-lg-2 mb-3';

                var card = document.createElement('div');
                card.className = 'card border shadow-none mb-0';

                var cardBody = document.createElement('div');
                cardBody.className = 'card-body text-center';

                var iconEl = document.createElement('i');
                iconEl.className = m.icon + ' fs-24 text-primary mb-2 d-block';
                cardBody.appendChild(iconEl);

                var valEl = document.createElement('h5');
                valEl.className = 'mb-1';
                valEl.textContent = m.value != null ? formatNumber(m.value) + (m.suffix || '') : '-';
                cardBody.appendChild(valEl);

                var labelEl = document.createElement('p');
                labelEl.className = 'text-muted mb-0 fs-12';
                labelEl.textContent = m.label;
                labelEl.appendChild(createInfoIcon(m.tooltip));
                cardBody.appendChild(labelEl);

                card.appendChild(cardBody);
                col.appendChild(card);
                metricsRow.appendChild(col);
            }
            container.appendChild(metricsRow);

            loadedTabs['tab-ozet'] = true;
            initTooltips();
        }).catch(function () {
            showError(containerId);
        });
    }

    /**
     * Sirket Bilgileri sekmesini yukler.
     */
    function loadSirketBilgileri() {
        var containerId = 'sirket-content';
        fetchData('/ajax/bilanco/' + encodeURIComponent(symbol)).then(function (res) {
            var data = (res && res.data) || {};
            var container = document.getElementById(containerId);
            if (!container) return;
            clearElement(container);

            var wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            var table = document.createElement('table');
            table.className = 'table table-bordered bilanco-table';

            var rows = [
                ['Şirket Adı', data.title || '-'],
                ['Hisse Kodu', symbol],
                ['Konsolidasyon', data.consolidation === 'CS' ? 'Konsolide' : (data.consolidation === 'NC' ? 'Solo (Non-Consolidated)' : (data.consolidation || '-'))],
                ['Raporlama Yılı', String(data.year || '-')],
                ['Dönem', data.period || '-'],
                ['Rapor Tipi', data.subject || '-']
            ];

            for (var i = 0; i < rows.length; i++) {
                var tr = document.createElement('tr');
                var tdLabel = document.createElement('td');
                tdLabel.className = 'fw-semibold';
                tdLabel.style.width = '200px';
                tdLabel.textContent = rows[i][0];
                var tdValue = document.createElement('td');
                tdValue.textContent = rows[i][1];
                tr.appendChild(tdLabel);
                tr.appendChild(tdValue);
                table.appendChild(tr);
            }

            if (isSafeUrl(data.link)) {
                var trLink = document.createElement('tr');
                var tdLinkLabel = document.createElement('td');
                tdLinkLabel.className = 'fw-semibold';
                tdLinkLabel.textContent = 'KAP Bildirimi';
                var tdLinkVal = document.createElement('td');
                var a = document.createElement('a');
                a.href = data.link;
                a.target = '_blank';
                a.textContent = data.link + ' ';
                var linkIcon = document.createElement('i');
                linkIcon.className = 'ri-external-link-line';
                a.appendChild(linkIcon);
                tdLinkVal.appendChild(a);
                trLink.appendChild(tdLinkLabel);
                trLink.appendChild(tdLinkVal);
                table.appendChild(trLink);
            }

            // Konsolidasyon satirina tooltip ekle
            var konsTds = table.querySelectorAll('td.fw-semibold');
            konsTds.forEach(function(td) {
                if (td.textContent === 'Konsolidasyon') {
                    td.appendChild(createInfoIcon('Konsolide: bağlı ortaklıklar dahil birleşik rapor. Solo: sadece ana şirket.'));
                }
            });

            wrapper.appendChild(table);
            container.appendChild(wrapper);
            initTooltips();
            loadedTabs['tab-sirket'] = true;
        }).catch(function () {
            showError(containerId);
        });
    }

    /**
     * Bilanco sekmesini yukler.
     */
    function loadBilanco() {
        loadFinancialTable('bilanco-content', '/ajax/bilanco/' + encodeURIComponent(symbol))
            .then(function() { loadedTabs['tab-bilanco'] = true; });
    }

    /**
     * Gelir Tablosu sekmesini yukler.
     */
    function loadGelirTablosu() {
        loadFinancialTable('gelir-content', '/ajax/bilanco/' + encodeURIComponent(symbol) + '/income')
            .then(function() { loadedTabs['tab-gelir'] = true; });
    }

    /**
     * Nakit Akim sekmesini yukler.
     */
    function loadNakitAkim() {
        loadFinancialTable('nakit-content', '/ajax/bilanco/' + encodeURIComponent(symbol) + '/cashflow')
            .then(function() { loadedTabs['tab-nakit'] = true; });
    }

    /**
     * Finansal tablo render eder (bilanco, gelir tablosu, nakit akim icin ortak).
     *
     * @param {string} containerId - Hedef container ID
     * @param {string} url - AJAX endpoint URL
     */
    function loadFinancialTable(containerId, url) {
        return fetchData(url).then(function (res) {
            var data = (res && res.data) || {};
            var tables = data.tables || {};
            var items = tables.tableItems || [];

            var container = document.getElementById(containerId);
            if (!container) return;
            clearElement(container);

            // Tab-specific info card
            var infoCards = {
                'bilanco-content': {
                    id: 'bilanco-info', title: 'Bilanço Nedir?',
                    items: [
                        {icon: 'ri-safe-2-line', iconColor: 'text-primary', title: 'Varlıklar', desc: 'Şirketin sahip olduğu <strong>nakit, alacak, stok, bina</strong> gibi değerler. Dönen varlıklar kısa vadeli, duran varlıklar uzun vadelidir.'},
                        {icon: 'ri-bank-line', iconColor: 'text-danger', title: 'Yükümlülükler (Borçlar)', desc: 'Şirketin <strong>kısa ve uzun vadeli borçları</strong>. Toplam varlıklardan borçlar çıkarılınca özkaynaklar kalır.'},
                        {icon: 'ri-shield-star-line', iconColor: 'text-success', title: 'Özkaynaklar', desc: 'Hissedarların şirketteki payı. <strong>Varlıklar = Borçlar + Özkaynaklar</strong> denklemi her zaman sağlanır.'}
                    ]
                },
                'gelir-content': {
                    id: 'gelir-info', title: 'Gelir Tablosu Nedir?',
                    items: [
                        {icon: 'ri-shopping-cart-line', iconColor: 'text-primary', title: 'Hasılat (Satış Geliri)', desc: 'Şirketin <strong>ana faaliyet geliri</strong>. Satılan mal/hizmet karşılığı elde edilen toplam tutar.'},
                        {icon: 'ri-subtract-line', iconColor: 'text-warning', title: 'Giderler ve Maliyetler', desc: '<strong>SMM</strong> (satılan malın maliyeti), faaliyet giderleri, finansman giderleri ve vergiler düşülür.'},
                        {icon: 'ri-coin-line', iconColor: 'text-success', title: 'Net Kâr / Zarar', desc: 'Tüm gelir ve giderler sonrası şirketin <strong>dönem sonu kâr veya zararı</strong>. Kırmızı ise zarar.'}
                    ]
                },
                'nakit-content': {
                    id: 'nakit-info', title: 'Nakit Akım Tablosu Nedir?',
                    items: [
                        {icon: 'ri-exchange-funds-line', iconColor: 'text-primary', title: 'İşletme Faaliyetleri', desc: 'Ana iş faaliyetlerinden giren/çıkan nakit. <strong>Pozitif olması</strong> operasyonel sağlık göstergesi.'},
                        {icon: 'ri-building-2-line', iconColor: 'text-warning', title: 'Yatırım Faaliyetleri', desc: 'Maddi duran varlık alım/satımı, yatırımlar. <strong>Genellikle negatiftir</strong> (şirket yatırım yapıyordur).'},
                        {icon: 'ri-bank-card-line', iconColor: 'text-info', title: 'Finansman Faaliyetleri', desc: 'Kredi alma/ödeme, sermaye artırımı, temettü ödemesi. Şirketin <strong>nasıl finanse edildiğini</strong> gösterir.'}
                    ]
                }
            };
            var infoConfig = infoCards[containerId];
            if (infoConfig) {
                container.appendChild(createInfoCard(infoConfig.id, infoConfig.title, infoConfig.items));
            }

            if (!items.length) {
                var alert = document.createElement('div');
                alert.className = 'alert alert-warning';
                var alertIcon = document.createElement('i');
                alertIcon.className = 'ri-information-line me-2';
                alert.appendChild(alertIcon);
                alert.appendChild(document.createTextNode('Veri bulunamadı.'));
                container.appendChild(alert);
                return;
            }

            var wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            var table = document.createElement('table');
            table.className = 'table table-sm table-hover align-middle bilanco-table';

            var thead = document.createElement('thead');
            thead.className = 'table-light';
            var theadTr = document.createElement('tr');
            var th1 = document.createElement('th');
            th1.textContent = 'Kalem';
            th1.appendChild(createInfoIcon('Finansal tablodaki satır kalemi. Kalın satırlar ana kategori, altındakiler alt kalemlerdir.'));
            var th2 = document.createElement('th');
            th2.className = 'text-end';
            th2.style.width = '200px';
            th2.textContent = 'Tutar (TL)';
            th2.appendChild(createInfoIcon('İlgili kalemin TL değeri. Kırmızı = negatif tutar.'));
            theadTr.appendChild(th1);
            theadTr.appendChild(th2);
            thead.appendChild(theadTr);
            table.appendChild(thead);

            var tbody = document.createElement('tbody');
            renderTableItemsDOM(tbody, items, 0);
            table.appendChild(tbody);

            wrapper.appendChild(table);
            container.appendChild(wrapper);
            initTooltips();
        }).catch(function (e) {
            showError(containerId);
            throw e;
        });
    }

    /**
     * Finansal tablo satirlarini recursive olarak DOM API ile render eder.
     *
     * @param {HTMLElement} tbody - Hedef tbody element
     * @param {Array} items - Tablo kalemleri
     * @param {number} level - Girintileme seviyesi
     */
    function renderTableItemsDOM(tbody, items, level) {
        if (level > 10) return;
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var isParent = item.tableItems && item.tableItems.length > 0;
            var hasValue = item.value && item.value.numericAmount != null;
            var isAbstract = item['abstract'] === true || item.isAbstract === true;

            var indent = level * 20;
            var fontWeight = (level === 0 || isAbstract) ? 'fw-bold' : (level === 1 ? 'fw-semibold' : '');
            var textSize = level >= 2 ? 'fs-13' : '';

            var tr = document.createElement('tr');
            if (level === 0) tr.className = 'table-light';

            var tdName = document.createElement('td');
            tdName.className = (fontWeight + ' ' + textSize).trim();
            tdName.style.paddingLeft = (16 + indent) + 'px';
            tdName.textContent = item.description || item.name || '';
            tr.appendChild(tdName);

            var tdVal = document.createElement('td');
            tdVal.className = ('text-end ' + fontWeight + ' ' + textSize).trim();
            if (hasValue) {
                var val = item.value.numericAmount;
                if (val < 0) tdVal.classList.add('text-danger');
                tdVal.textContent = formatCurrency(val);
            } else {
                tdVal.textContent = '-';
            }
            tr.appendChild(tdVal);

            tbody.appendChild(tr);

            if (isParent) {
                renderTableItemsDOM(tbody, item.tableItems, level + 1);
            }
        }
    }

    /**
     * Oran Analizi sekmesini yukler (4 alt sekme: Likidite, Mali Yapi, Faaliyet, Karlilik).
     */
    function loadOranAnalizi() {
        var containerId = 'oranlar-content';
        fetchData('/ajax/bilanco/' + encodeURIComponent(symbol) + '/rasyo').then(function (res) {
            var rasyo = (res && res.data) || {};

            var container = document.getElementById(containerId);
            if (!container) return;
            clearElement(container);

            container.appendChild(createInfoCard('oran-info', 'Oran Analizi Nedir? Nasıl Yorumlanır?', [
                {icon: 'ri-drop-line', iconColor: 'text-primary', title: 'Likidite Oranları', desc: 'Şirketin <strong>kısa vadeli borçlarını ödeme gücü</strong>. Cari oran 1,5 üstü, likit oran 1 üstü sağlıklı.'},
                {icon: 'ri-bank-line', iconColor: 'text-danger', title: 'Mali Yapı Oranları', desc: 'Borçlanma düzeyi ve <strong>sermaye yapısı dengesi</strong>. Kaldıraç %60 altı, borç/özsermaye 1,5 altı güvenli.'},
                {icon: 'ri-speed-line', iconColor: 'text-warning', title: 'Faaliyet Oranları', desc: 'Varlık ve sermayenin <strong>ne kadar verimli kullanıldığı</strong>. Devir hızı yüksekse verimlilik yüksek.'},
                {icon: 'ri-line-chart-line', iconColor: 'text-success', title: 'Karlılık Oranları', desc: '<strong>Kâr marjları</strong> ve sermaye getirisi. ROE %15+, net kâr marjı %10+ iyi kabul edilir.'}
            ], [
                {badge: '<i class="ri-checkbox-circle-line me-1"></i>Yeşil Kenarlık', badgeColor: 'success', desc: 'Oran sağlıklı eşik değerinin üstünde.'},
                {badge: '<i class="ri-close-circle-line me-1"></i>Kırmızı Kenarlık', badgeColor: 'danger', desc: 'Oran riskli bölgede, dikkat edilmeli.'},
                {badge: '<i class="ri-subtract-line me-1"></i>Gri Kenarlık', badgeColor: 'secondary', desc: 'Veri bulunamadı veya hesaplanamadı.'}
            ]));

            // 4 Alt sekme (pills) - belirgin stil
            var navUl = document.createElement('ul');
            navUl.className = 'nav nav-pills-custom mb-3';
            var pillNames = [
                {id: 'oran-likidite', label: 'Likidite', icon: 'ri-drop-line', active: true},
                {id: 'oran-mali', label: 'Mali Yapı', icon: 'ri-bank-line', active: false},
                {id: 'oran-faaliyet', label: 'Faaliyet Etkinlik', icon: 'ri-speed-line', active: false},
                {id: 'oran-karlilik', label: 'Karlılık', icon: 'ri-line-chart-line', active: false}
            ];
            for (var p = 0; p < pillNames.length; p++) {
                var li = document.createElement('li');
                li.className = 'nav-item';
                var a = document.createElement('a');
                a.className = 'nav-link' + (pillNames[p].active ? ' active' : '');
                a.setAttribute('data-bs-toggle', 'pill');
                a.href = '#' + pillNames[p].id;
                var pillIcon = document.createElement('i');
                pillIcon.className = pillNames[p].icon + ' me-1';
                a.appendChild(pillIcon);
                a.appendChild(document.createTextNode(pillNames[p].label));
                li.appendChild(a);
                navUl.appendChild(li);
            }
            container.appendChild(navUl);

            var tabContent = document.createElement('div');
            tabContent.className = 'tab-content';

            // Likidite
            var likiditePane = createTabPane('oran-likidite', true);
            appendRasyoCards(likiditePane, [
                {label: 'Cari Oran', value: rasyo.cariOran, desc: 'Dönen Varlıklar / KV Yükümlülükler', tooltip: 'Şirketin kısa vadeli borçlarını ödeme gücü. 1,5 üstü sağlıklı kabul edilir.', good: function (v) { return v >= 1.5; }},
                {label: 'Likit Oran (Asit-Test)', value: rasyo.likitOran, desc: '(DV - Stoklar) / KV Yükümlülükler', tooltip: 'Stoklar hariç likidite gücü. 1 üstü iyi kabul edilir.', good: function (v) { return v >= 1.0; }},
                {label: 'Nakit Oran', value: rasyo.nakitOran, desc: 'Nakit / KV Yükümlülükler', tooltip: 'En katı likidite ölçüsü. Sadece nakit ile borç ödeme gücü. 0,2 üstü yeterli.', good: function (v) { return v >= 0.2; }}
            ]);
            tabContent.appendChild(likiditePane);

            // Mali Yapi
            var maliPane = createTabPane('oran-mali', false);
            appendRasyoCards(maliPane, [
                {label: 'Kaldıraç Oranı', value: rasyo.kaldiracOrani, desc: 'Toplam Borç / Toplam Varlık', unit: '%', tooltip: 'Şirketin borçlanma düzeyi. %60 altı sağlıklı kabul edilir.', good: function (v) { return v < 60; }},
                {label: 'Borç/Özsermaye', value: rasyo.borclarOzsemaye, desc: 'Toplam Borç / Özkaynaklar', tooltip: 'Sermaye yapısı dengesi. 1,5 altı güvenli kabul edilir.', good: function (v) { return v < 1.5; }},
                {label: 'Toplam Borç/Varlık', value: rasyo.toplamBorcToplamVarlik, desc: 'Borçluluk düzeyi', tooltip: 'Varlıkların ne kadarının borçla finanse edildiği. 0,6 altı ideal.', good: function (v) { return v < 0.6; }},
                {label: 'Faaliyet Geliri/Faiz', value: rasyo.faaliyetGeliriFaizGideri, desc: 'Faiz karşılama oranı', tooltip: 'Faiz giderlerini karşılama gücü. 2 üstü güvenli kabul edilir.', good: function (v) { return v > 2; }}
            ]);
            tabContent.appendChild(maliPane);

            // Faaliyet Etkinlik
            var faaliyetPane = createTabPane('oran-faaliyet', false);
            appendRasyoCards(faaliyetPane, [
                {label: 'Aktif Devir Hızı', value: rasyo.aktifDevirHizi, desc: 'Hasılat / Toplam Varlık', unit: ' kez', tooltip: 'Varlıkların gelir yaratmadaki verimliliği. Yüksekse daha verimli.'},
                {label: 'Alacak Devir Hızı', value: rasyo.alacakDevirHizi, desc: 'Hasılat / Ticari Alacaklar', unit: ' kez', tooltip: 'Alacakların ne hızda tahsil edildiği. Yüksekse daha hızlı tahsilat.'},
                {label: 'Stok Devir Hızı', value: rasyo.stokDevirHizi, desc: 'SMM / Stoklar', unit: ' kez', tooltip: 'Stokların ne hızda satıldığı. Yüksekse stoklar daha hızlı eritiliyor.'},
                {label: 'Özkaynak Devir Hızı', value: rasyo.ozkaynakDevirHizi, desc: 'Hasılat / Özkaynaklar', unit: ' kez', tooltip: 'Sermayenin gelir yaratmadaki verimliliği.'}
            ]);
            tabContent.appendChild(faaliyetPane);

            // Karlilik
            var karlilikPane = createTabPane('oran-karlilik', false);
            appendRasyoCards(karlilikPane, [
                {label: 'Brüt Kâr Marjı', value: rasyo.brutKarMarji, desc: 'Brüt Kâr / Hasılat', unit: '%', tooltip: 'Üretim maliyeti sonrası kârlılık. %20 üstü iyi kabul edilir.', good: function (v) { return v > 20; }},
                {label: 'Net Kâr Marjı', value: rasyo.netKarMarji, desc: 'Net Kâr / Hasılat', unit: '%', tooltip: 'Tüm giderler sonrası kârlılık. %10 üstü iyi kabul edilir.', good: function (v) { return v > 10; }},
                {label: 'Faaliyet Kâr Marjı', value: rasyo.faaliyetKarMarji, desc: 'Esas Faaliyet Kârı / Hasılat', unit: '%', tooltip: 'Ana faaliyet kârlılığı. %15 üstü iyi kabul edilir.', good: function (v) { return v > 15; }},
                {label: 'ROA', value: rasyo.aktifKarlilikMarji, desc: 'Net Kâr / Toplam Varlık', unit: '%', tooltip: 'Varlık kârlılığı (Return on Assets). %5 üstü iyi kabul edilir.', good: function (v) { return v > 5; }},
                {label: 'ROE', value: rasyo.ozsermayeKarlilikMarji, desc: 'Net Kâr / Özkaynaklar', unit: '%', tooltip: 'Özsermaye kârlılığı (Return on Equity). %15 üstü iyi kabul edilir.', good: function (v) { return v > 15; }}
            ]);
            tabContent.appendChild(karlilikPane);

            container.appendChild(tabContent);
            loadedTabs['tab-oranlar'] = true;
            initTooltips();
        }).catch(function () {
            showError(containerId);
        });
    }

    /**
     * Tab pane div olusturur.
     *
     * @param {string} id - Pane ID
     * @param {boolean} active - Aktif mi
     * @return {HTMLElement} div element
     */
    function createTabPane(id, active) {
        var div = document.createElement('div');
        div.className = 'tab-pane fade' + (active ? ' show active' : '');
        div.id = id;
        return div;
    }

    /**
     * Rasyo kartlarini DOM API ile ekler.
     *
     * @param {HTMLElement} parent - Hedef parent element
     * @param {Array} ratios - Rasyo dizisi
     */
    function appendRasyoCards(parent, ratios) {
        var row = document.createElement('div');
        row.className = 'row';

        for (var i = 0; i < ratios.length; i++) {
            var r = ratios[i];
            var val = r.value;
            var displayVal = val != null ? formatNumber(val) + (r.unit || '') : '-';
            var borderColor = 'border-secondary';
            if (val != null && r.good) {
                borderColor = r.good(val) ? 'border-success' : 'border-danger';
            }

            var col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4 col-xl-3 mb-3';

            var card = document.createElement('div');
            card.className = 'card border ' + borderColor + ' shadow-none mb-0 h-100';

            var cardBody = document.createElement('div');
            cardBody.className = 'card-body';

            var labelEl = document.createElement('h6');
            labelEl.className = 'text-muted mb-1';
            labelEl.textContent = r.label;
            if (r.tooltip) {
                labelEl.appendChild(createInfoIcon(r.tooltip));
            }
            cardBody.appendChild(labelEl);

            var valEl = document.createElement('h4');
            valEl.className = 'mb-2';
            valEl.textContent = displayVal;
            cardBody.appendChild(valEl);

            var descEl = document.createElement('p');
            descEl.className = 'text-muted mb-0 fs-12';
            descEl.textContent = r.desc;
            cardBody.appendChild(descEl);

            card.appendChild(cardBody);
            col.appendChild(card);
            row.appendChild(col);
        }

        parent.appendChild(row);
    }

    /**
     * Piyasa Carpanlari sekmesini yukler.
     */
    function loadPiyasaCarpanlari() {
        var containerId = 'carpanlar-content';
        fetchData('/ajax/bilanco/' + encodeURIComponent(symbol) + '/rasyo').then(function (res) {
            var rasyo = (res && res.data) || {};
            var container = document.getElementById(containerId);
            if (!container) return;
            clearElement(container);

            container.appendChild(createInfoCard('carpan-info', 'Piyasa Çarpanları Nedir?', [
                {icon: 'ri-funds-line', iconColor: 'text-primary', title: 'Değerleme Çarpanları', desc: 'Hissenin <strong>pahalı mı ucuz mu</strong> olduğunu anlamak için kullanılır. Sektör ortalamasıyla karşılaştırılmalı.'},
                {icon: 'ri-percent-line', iconColor: 'text-success', title: 'Temettü ve HBK', desc: '<strong>Temettü verimi:</strong> Yıllık kâr payı getirisi. <strong>HBK:</strong> Hisse başına düşen net kâr (TL).'},
                {icon: 'ri-pulse-line', iconColor: 'text-warning', title: 'Beta ve Risk', desc: '<strong>Beta &gt; 1:</strong> Piyasadan daha volatil (riskli). <strong>Beta &lt; 1:</strong> Daha az dalgalı (defansif).'}
            ]));

            var carpanlar = [
                {label: 'F/K (P/E)', value: rasyo.fk, desc: 'Piyasa Değeri / Net Kâr', icon: 'ri-funds-line',
                 tooltip: 'Kârına göre ne kadar pahalı/ucuz olduğunu gösterir. Düşükse ucuz.'},
                {label: 'PD/DD (P/B)', value: rasyo.pddd, desc: 'Piyasa Değeri / Defter Değeri', icon: 'ri-book-open-line',
                 tooltip: 'Varlıklarına göre prim veya iskontolu işlem görüp görmediği.'},
                {label: 'FD/FAVÖK', value: rasyo.fdfavok, desc: 'Firma Değeri / FAVÖK', icon: 'ri-bar-chart-2-line',
                 tooltip: 'Sektör karşılaştırmasında en çok kullanılan çarpan. Düşükse ucuz.'},
                {label: 'Temettü Verimi', value: rasyo.temettuVerimi, unit: '%', desc: 'Yıllık Temettü / Hisse Fiyatı', icon: 'ri-percent-line',
                 tooltip: 'Yatırımcıya yıllık ne kadar temettü getirisi sağladığı.'},
                {label: 'HBK', value: rasyo.hisseBasinaKar, desc: 'Hisse Başına Kâr', unit: ' TL', icon: 'ri-money-dollar-circle-line',
                 tooltip: 'Şirketin net kârının hisse adedine bölümü. Yüksekse daha kârlı.'},
                {label: 'Defter Değeri', value: rasyo.hisseBasinaDefterDegeri, desc: 'Hisse Başına Defter Değeri', unit: ' TL', icon: 'ri-book-2-line',
                 tooltip: 'Şirketin varlıklarından borçları düşüldükten sonra hisse başına kalan değer.'},
                {label: 'Beta', value: rasyo.beta, desc: 'Piyasa riskine duyarlılık', icon: 'ri-pulse-line',
                 tooltip: '1\'den büyükse piyasadan daha volatil, küçükse daha az dalgalı.'},
                {label: 'FAVÖK', value: rasyo.favok, desc: 'Faiz, Amortisman ve Vergi Öncesi Kâr', icon: 'ri-bar-chart-box-line',
                 tooltip: 'Şirketin operasyonel nakit yaratma gücünü gösterir.'}
            ];

            var row = document.createElement('div');
            row.className = 'row';

            for (var i = 0; i < carpanlar.length; i++) {
                var c = carpanlar[i];
                var col = document.createElement('div');
                col.className = 'col-md-6 col-lg-4 col-xl-3 mb-3';

                var card = document.createElement('div');
                card.className = 'card border shadow-none mb-0 h-100';

                var cardBody = document.createElement('div');
                cardBody.className = 'card-body text-center';

                var iconEl = document.createElement('i');
                iconEl.className = c.icon + ' fs-28 text-primary mb-2 d-block';
                cardBody.appendChild(iconEl);

                var valEl = document.createElement('h4');
                valEl.className = 'mb-1';
                valEl.textContent = c.value != null ? formatNumber(c.value) + (c.unit || '') : '-';
                cardBody.appendChild(valEl);

                var labelEl = document.createElement('h6');
                labelEl.className = 'text-muted mb-1';
                labelEl.textContent = c.label;
                if (c.tooltip) {
                    labelEl.appendChild(createInfoIcon(c.tooltip));
                }
                cardBody.appendChild(labelEl);

                var descEl = document.createElement('p');
                descEl.className = 'text-muted mb-0 fs-12';
                descEl.textContent = c.desc;
                cardBody.appendChild(descEl);

                card.appendChild(cardBody);
                col.appendChild(card);
                row.appendChild(col);
            }

            container.appendChild(row);
            loadedTabs['tab-carpanlar'] = true;
            initTooltips();
        }).catch(function () {
            showError(containerId);
        });
    }

    /**
     * Skor Karti sekmesini yukler.
     */
    function loadSkorKarti() {
        var containerId = 'skor-content';
        fetchData('/ajax/bilanco/' + encodeURIComponent(symbol) + '/rasyo').then(function (res) {
            var rasyo = (res && res.data) || {};
            var container = document.getElementById(containerId);
            if (!container) return;
            clearElement(container);

            var categories = [
                {name: 'Likidite', score: scoreLikidite(rasyo), icon: 'ri-drop-line',
                 tooltip: 'Kısa vadeli borç ödeme gücü (cari, likit, nakit oran bileşimi).'},
                {name: 'Borçluluk', score: scoreBorcluluk(rasyo), icon: 'ri-bank-line',
                 tooltip: 'Borçlanma düzeyi sağlığı (kaldıraç oranı ve borç/özsermaye bileşimi).'},
                {name: 'Karlılık', score: scoreKarlilik(rasyo), icon: 'ri-line-chart-line',
                 tooltip: 'Kâr yaratma performansı (net kâr marjı, ROE, brüt kâr marjı bileşimi).'},
                {name: 'Değerleme', score: scoreDegerleme(rasyo), icon: 'ri-scales-3-line',
                 tooltip: 'Piyasa fiyatının makullüğü (F/K, PD/DD, temettü verimi bileşimi).'}
            ];

            // Tum kategoriler 50 (base) ise veri yetersiz demektir
            var hasData = categories.some(function(c) { return c.score !== 50; });
            if (!hasData) {
                container.innerHTML =
                    '<div class="alert alert-info"><i class="ri-information-line me-2"></i>Bu hisse için yeterli finansal oran verisi bulunamadı.</div>';
                loadedTabs['tab-skor'] = true;
                return;
            }

            container.appendChild(createInfoCard('skor-info', 'Skor Kartı Nasıl Hesaplanır?', [
                {icon: 'ri-calculator-line', iconColor: 'text-primary', title: 'Puanlama Sistemi', desc: '4 kategori 0-100 arası puanlanır. Her kategori <strong>eşik değerlerine</strong> göre artı/eksi puan alır. Ortalama genel skoru verir.'},
                {icon: 'ri-palette-line', iconColor: 'text-success', title: 'Renk Kodları', desc: '<strong class="text-success">60+:</strong> İyi (yeşil). <strong class="text-warning">40-59:</strong> Orta (sarı). <strong class="text-danger">40 altı:</strong> Zayıf (kırmızı).'}
            ]));

            var totalScore = 0;
            for (var c = 0; c < categories.length; c++) {
                totalScore += (categories[c].score || 0);
            }
            totalScore = Math.round(totalScore / categories.length);

            // Genel skor
            var scoreColor = totalScore >= 60 ? 'text-success' : (totalScore >= 40 ? 'text-warning' : 'text-danger');
            var scoreDiv = document.createElement('div');
            scoreDiv.className = 'text-center mb-4';
            var scoreH2 = document.createElement('h2');
            scoreH2.className = 'display-4 ' + scoreColor;
            scoreH2.textContent = totalScore;
            scoreDiv.appendChild(scoreH2);
            var scoreLabel = document.createElement('p');
            scoreLabel.className = 'text-muted';
            scoreLabel.textContent = 'Genel Skor (0-100)';
            scoreLabel.appendChild(createInfoIcon('4 kategorinin ortalaması. 60+ iyi (yeşil), 40-59 orta (sarı), 40 altı zayıf (kırmızı).'));
            scoreDiv.appendChild(scoreLabel);
            container.appendChild(scoreDiv);

            // Kategori kartlari
            var row = document.createElement('div');
            row.className = 'row';

            for (var i = 0; i < categories.length; i++) {
                var cat = categories[i];
                var color = cat.score >= 60 ? 'success' : (cat.score >= 40 ? 'warning' : 'danger');

                var col = document.createElement('div');
                col.className = 'col-md-6 col-lg-3 mb-3';

                var card = document.createElement('div');
                card.className = 'card border shadow-none mb-0 h-100';

                var cardBody = document.createElement('div');
                cardBody.className = 'card-body text-center';

                var iconEl = document.createElement('i');
                iconEl.className = cat.icon + ' fs-28 text-' + color + ' mb-2 d-block';
                cardBody.appendChild(iconEl);

                var valEl = document.createElement('h4');
                valEl.className = 'text-' + color;
                valEl.textContent = cat.score;
                cardBody.appendChild(valEl);

                var nameEl = document.createElement('p');
                nameEl.className = 'mb-0';
                nameEl.textContent = cat.name;
                if (cat.tooltip) {
                    nameEl.appendChild(createInfoIcon(cat.tooltip));
                }
                cardBody.appendChild(nameEl);

                var progressDiv = document.createElement('div');
                progressDiv.className = 'progress mt-2';
                progressDiv.style.height = '6px';
                var progressBar = document.createElement('div');
                progressBar.className = 'progress-bar bg-' + color;
                progressBar.style.width = cat.score + '%';
                progressDiv.appendChild(progressBar);
                cardBody.appendChild(progressDiv);

                card.appendChild(cardBody);
                col.appendChild(card);
                row.appendChild(col);
            }

            container.appendChild(row);
            loadedTabs['tab-skor'] = true;
            initTooltips();
        }).catch(function () {
            showError(containerId);
        });
    }

    // =====================================================================
    // SCORING FUNCTIONS
    // =====================================================================

    /**
     * Likidite skoru hesaplar (0-100).
     *
     * @param {Object} r - Rasyo verisi
     * @return {number} Skor
     */
    function scoreLikidite(r) {
        var s = 50;
        if (r.cariOran != null) s += r.cariOran >= 2 ? 25 : (r.cariOran >= 1 ? 10 : -15);
        if (r.likitOran != null) s += r.likitOran >= 1 ? 15 : (r.likitOran >= 0.5 ? 5 : -10);
        if (r.nakitOran != null) s += r.nakitOran >= 0.3 ? 10 : (r.nakitOran >= 0.1 ? 0 : -10);
        return Math.max(0, Math.min(100, s));
    }

    /**
     * Borcluluk skoru hesaplar (0-100).
     *
     * @param {Object} r - Rasyo verisi
     * @return {number} Skor
     */
    function scoreBorcluluk(r) {
        var s = 50;
        if (r.kaldiracOrani != null) s += r.kaldiracOrani < 50 ? 20 : (r.kaldiracOrani < 70 ? 0 : -20);
        if (r.borclarOzsemaye != null) s += r.borclarOzsemaye < 1 ? 15 : (r.borclarOzsemaye < 2 ? 0 : -15);
        return Math.max(0, Math.min(100, s));
    }

    /**
     * Karlilik skoru hesaplar (0-100).
     *
     * @param {Object} r - Rasyo verisi
     * @return {number} Skor
     */
    function scoreKarlilik(r) {
        var s = 50;
        if (r.netKarMarji != null) s += r.netKarMarji > 15 ? 20 : (r.netKarMarji > 5 ? 5 : -15);
        if (r.ozsermayeKarlilikMarji != null) s += r.ozsermayeKarlilikMarji > 20 ? 15 : (r.ozsermayeKarlilikMarji > 10 ? 5 : -10);
        if (r.brutKarMarji != null) s += r.brutKarMarji > 30 ? 15 : (r.brutKarMarji > 15 ? 5 : -10);
        return Math.max(0, Math.min(100, s));
    }

    /**
     * Degerleme skoru hesaplar (0-100).
     *
     * @param {Object} r - Rasyo verisi
     * @return {number} Skor
     */
    function scoreDegerleme(r) {
        var s = 50;
        if (r.fk != null && r.fk > 0) s += r.fk < 10 ? 20 : (r.fk < 20 ? 5 : -15);
        if (r.pddd != null) s += r.pddd < 1.5 ? 15 : (r.pddd < 3 ? 0 : -15);
        if (r.temettuVerimi != null) s += r.temettuVerimi > 5 ? 15 : (r.temettuVerimi > 2 ? 5 : -5);
        return Math.max(0, Math.min(100, s));
    }

    // =====================================================================
    // KARSILASTIR - AUTOCOMPLETE
    // =====================================================================

    var stockCache = null;
    var selectedChips = [];
    var MAX_CHIPS = 5;
    var MAX_SUGGESTIONS = 8;

    /**
     * Hisse listesini AJAX ile ceker ve cache'ler.
     *
     * @return {Promise} Hisse listesi promise'i
     */
    function fetchStockList() {
        if (stockCache) return Promise.resolve(stockCache);
        return fetch('/ajax/stocks/search').then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        }).then(function (data) {
            stockCache = data || [];
            return stockCache;
        });
    }

    /**
     * Chip (badge) ekler.
     *
     * @param {string} code - Hisse kodu
     * @param {HTMLElement} chipsContainer - Chip container
     */
    function addChip(code, chipsContainer) {
        var upper = code.toUpperCase().trim();
        if (!upper) return;
        if (selectedChips.indexOf(upper) !== -1) return;
        if (selectedChips.length >= MAX_CHIPS) return;

        selectedChips.push(upper);

        var badge = document.createElement('span');
        badge.className = 'badge bg-primary me-1 mb-1';
        badge.style.fontSize = '0.85rem';
        badge.textContent = upper + ' ';

        var closeIcon = document.createElement('i');
        closeIcon.className = 'ri-close-line ms-1';
        closeIcon.style.cursor = 'pointer';
        closeIcon.addEventListener('click', function () {
            var idx = selectedChips.indexOf(upper);
            if (idx !== -1) selectedChips.splice(idx, 1);
            badge.remove();
        });

        badge.appendChild(closeIcon);
        chipsContainer.appendChild(badge);
    }

    /**
     * Karşılaştır sekmesini yükler (autocomplete ile).
     */
    function loadKarsilastir() {
        var containerId = 'karsilastir-content';
        var container = document.getElementById(containerId);
        if (!container) return;
        clearElement(container);
        selectedChips = [];

        container.appendChild(createInfoCard('karsilastir-info', 'Hisse Karşılaştırma Nasıl Yapılır?', [
            {icon: 'ri-search-line', iconColor: 'text-primary', title: 'Hisse Seçimi', desc: 'Arama kutusuna hisse kodu yazın ve listeden seçin. <strong>En fazla 5 hisse</strong> karşılaştırabilirsiniz.'},
            {icon: 'ri-table-line', iconColor: 'text-success', title: 'Metrik Tablosu', desc: 'Seçilen hisselerin <strong>F/K, PD/DD, karlılık, borçluluk</strong> gibi 13 temel metriği yan yana gösterilir.'},
            {icon: 'ri-lightbulb-line', iconColor: 'text-warning', title: 'İpucu', desc: 'Aynı sektördeki hisseleri karşılaştırmak daha <strong>anlamlı sonuçlar</strong> verir. Farklı sektörler farklı ortalama değerlere sahiptir.'}
        ]));

        // Label
        var formDiv = document.createElement('div');
        formDiv.className = 'mb-3';

        var formLabel = document.createElement('label');
        formLabel.className = 'form-label';
        formLabel.textContent = 'Karşılaştırmak istediğiniz hisseleri seçin (maks. 5):';
        formDiv.appendChild(formLabel);

        // Chips container
        var chipsContainer = document.createElement('div');
        chipsContainer.id = 'compareChips';
        chipsContainer.className = 'mb-2';
        formDiv.appendChild(chipsContainer);

        // Autocomplete wrapper
        var acWrapper = document.createElement('div');
        acWrapper.className = 'position-relative';

        var input = document.createElement('input');
        input.type = 'text';
        input.id = 'compareAutocomplete';
        input.className = 'form-control';
        input.placeholder = 'Hisse kodu yazın...';
        input.setAttribute('autocomplete', 'off');
        acWrapper.appendChild(input);

        var dropdown = document.createElement('ul');
        dropdown.className = 'list-group position-absolute w-100';
        dropdown.style.zIndex = '1050';
        dropdown.style.maxHeight = '300px';
        dropdown.style.overflowY = 'auto';
        dropdown.style.display = 'none';
        dropdown.id = 'compareDropdown';
        acWrapper.appendChild(dropdown);

        formDiv.appendChild(acWrapper);

        // Karşılaştır butonu
        var btnDiv = document.createElement('div');
        btnDiv.className = 'mt-2';
        var btn = document.createElement('button');
        btn.className = 'btn btn-primary';
        btn.id = 'compareBtn';
        btn.textContent = 'Karşılaştır';
        btnDiv.appendChild(btn);
        formDiv.appendChild(btnDiv);

        container.appendChild(formDiv);

        var resultDiv = document.createElement('div');
        resultDiv.id = 'compareResult';
        container.appendChild(resultDiv);

        // Mevcut hisseyi chip olarak ekle
        addChip(symbol, chipsContainer);

        // Hisse listesini onceden cek
        fetchStockList();

        // Autocomplete keyup
        input.addEventListener('keyup', function () {
            var q = (input.value || '').toUpperCase().trim();
            if (q.length < 1) {
                dropdown.style.display = 'none';
                return;
            }
            if (selectedChips.length >= MAX_CHIPS) {
                dropdown.style.display = 'none';
                return;
            }

            fetchStockList().then(function (stocks) {
                var filtered = [];
                for (var i = 0; i < stocks.length && filtered.length < MAX_SUGGESTIONS; i++) {
                    var s = stocks[i];
                    var ticker = (s.ticker || '').toUpperCase();
                    var desc = (s.description || '').toUpperCase();
                    if (ticker.indexOf(q) !== -1 || desc.indexOf(q) !== -1) {
                        if (selectedChips.indexOf(ticker) === -1) {
                            filtered.push(s);
                        }
                    }
                }

                clearElement(dropdown);
                if (filtered.length === 0) {
                    dropdown.style.display = 'none';
                    return;
                }

                for (var j = 0; j < filtered.length; j++) {
                    (function (stock) {
                        var li = document.createElement('li');
                        li.className = 'list-group-item list-group-item-action';
                        li.style.cursor = 'pointer';

                        var strong = document.createElement('strong');
                        strong.textContent = stock.ticker || '';
                        li.appendChild(strong);

                        li.appendChild(document.createTextNode(' '));

                        var small = document.createElement('small');
                        small.className = 'text-muted';
                        small.textContent = stock.description || '';
                        li.appendChild(small);

                        li.addEventListener('click', function () {
                            addChip(stock.ticker, chipsContainer);
                            input.value = '';
                            dropdown.style.display = 'none';
                        });

                        dropdown.appendChild(li);
                    })(filtered[j]);
                }
                dropdown.style.display = 'block';
            });
        });

        // Dropdown dısına tıklanınca kapat
        document.addEventListener('click', function (e) {
            if (!acWrapper.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        btn.addEventListener('click', doCompare);
        loadedTabs['tab-karsilastir'] = true;
    }

    /**
     * Karşılaştırma işlemini yapar.
     */
    function doCompare() {
        var symbols = selectedChips.slice();
        if (!symbols.length) return;

        var resultDiv = document.getElementById('compareResult');
        if (!resultDiv) return;
        clearElement(resultDiv);

        var spinner = document.createElement('div');
        spinner.className = 'text-center py-3';
        var spinnerEl = document.createElement('div');
        spinnerEl.className = 'spinner-border text-primary';
        spinnerEl.setAttribute('role', 'status');
        spinner.appendChild(spinnerEl);
        resultDiv.appendChild(spinner);

        var promises = symbols.map(function (s) {
            return fetchData('/ajax/bilanco/' + encodeURIComponent(s) + '/rasyo').catch(function () { return null; });
        });

        Promise.all(promises).then(function (results) {
            clearElement(resultDiv);

            var metrikler = [
                {key: 'fk', label: 'F/K', tooltip: 'Fiyat/Kazanç oranı. Düşükse ucuz.'},
                {key: 'pddd', label: 'PD/DD', tooltip: 'Piyasa Değeri/Defter Değeri. 1 altı ucuz.'},
                {key: 'fdfavok', label: 'FD/FAVÖK', tooltip: 'Firma Değeri/FAVÖK. Düşükse ucuz.'},
                {key: 'temettuVerimi', label: 'Temettü Verimi (%)', tooltip: 'Yıllık temettü getirisi.'},
                {key: 'hisseBasinaKar', label: 'HBK (TL)', tooltip: 'Hisse başına net kâr.'},
                {key: 'cariOran', label: 'Cari Oran', tooltip: 'Kısa vadeli borç ödeme gücü. 1,5 üstü iyi.'},
                {key: 'kaldiracOrani', label: 'Kaldıraç Oranı (%)', tooltip: 'Borçlanma düzeyi. %60 altı sağlıklı.'},
                {key: 'borclarOzsemaye', label: 'Borç/Özsermaye', tooltip: 'Sermaye yapısı dengesi. 1,5 altı güvenli.'},
                {key: 'brutKarMarji', label: 'Brüt Kâr Marjı (%)', tooltip: 'Üretim maliyeti sonrası kârlılık.'},
                {key: 'netKarMarji', label: 'Net Kâr Marjı (%)', tooltip: 'Tüm giderler sonrası kârlılık.'},
                {key: 'aktifKarlilikMarji', label: 'ROA (%)', tooltip: 'Varlık kârlılığı (Return on Assets).'},
                {key: 'ozsermayeKarlilikMarji', label: 'ROE (%)', tooltip: 'Özsermaye kârlılığı (Return on Equity).'},
                {key: 'beta', label: 'Beta', tooltip: 'Piyasa riskine duyarlılık. 1 üstü daha volatil.'}
            ];

            var wrapper = document.createElement('div');
            wrapper.className = 'table-responsive';
            var table = document.createElement('table');
            table.className = 'table table-bordered table-hover bilanco-table';

            var thead = document.createElement('thead');
            thead.className = 'table-light';
            var headerRow = document.createElement('tr');
            var thMetrik = document.createElement('th');
            thMetrik.textContent = 'Metrik';
            headerRow.appendChild(thMetrik);

            for (var s = 0; s < symbols.length; s++) {
                var th = document.createElement('th');
                th.className = 'text-center';
                th.textContent = symbols[s];
                headerRow.appendChild(th);
            }
            thead.appendChild(headerRow);
            table.appendChild(thead);

            var tbody = document.createElement('tbody');
            for (var m = 0; m < metrikler.length; m++) {
                var met = metrikler[m];
                var tr = document.createElement('tr');
                var tdLabel = document.createElement('td');
                tdLabel.className = 'fw-semibold';
                tdLabel.textContent = met.label;
                if (met.tooltip) {
                    tdLabel.appendChild(createInfoIcon(met.tooltip));
                }
                tr.appendChild(tdLabel);

                for (var r = 0; r < results.length; r++) {
                    var val = results[r] && results[r].data ? results[r].data[met.key] : null;
                    var td = document.createElement('td');
                    td.className = 'text-center';
                    td.textContent = val != null ? formatNumber(val) : '-';
                    tr.appendChild(td);
                }
                tbody.appendChild(tr);
            }
            table.appendChild(tbody);
            wrapper.appendChild(table);
            resultDiv.appendChild(wrapper);
            initTooltips();
        }).catch(function () {
            clearElement(resultDiv);
            var alert = document.createElement('div');
            alert.className = 'alert alert-danger';
            var alertIcon = document.createElement('i');
            alertIcon.className = 'ri-error-warning-line me-2';
            alert.appendChild(alertIcon);
            alert.appendChild(document.createTextNode('Karşılaştırma verileri yüklenemedi.'));
            resultDiv.appendChild(alert);
        });
    }

    // =====================================================================
    // UTILITIES
    // =====================================================================

    /**
     * Tooltip bilgi ikonu olusturur.
     * @param {string} text - Tooltip metni
     * @return {HTMLElement} i element
     */
    function createInfoIcon(text) {
        var icon = document.createElement('i');
        icon.className = 'ri-information-line ms-1 text-muted fs-14';
        icon.setAttribute('data-bs-toggle', 'tooltip');
        icon.setAttribute('data-bs-placement', 'top');
        icon.setAttribute('title', text);
        return icon;
    }

    /**
     * Yeni eklenen tooltip elementlerini Bootstrap'e tanitir.
     */
    function initTooltips() {
        var els = document.querySelectorAll('[data-bs-toggle="tooltip"]:not(.tooltip-initialized)');
        els.forEach(function(el) {
            new bootstrap.Tooltip(el);
            el.classList.add('tooltip-initialized');
        });
    }

    /**
     * Aciklayici bilgi karti olusturur (collapse pattern).
     * @param {string} id - Collapse ID
     * @param {string} title - Kart basligi
     * @param {Array} items - [{icon, iconColor, title, desc}] aciklama ogeleri
     * @param {Array} [tips] - [{badge, badgeColor, desc}] ipucu ogeleri (opsiyonel)
     * @return {HTMLElement} card element
     */
    function createInfoCard(id, title, items, tips) {
        var card = document.createElement('div');
        card.className = 'card card-body border-info border-opacity-25 mb-3';

        var toggle = document.createElement('a');
        toggle.className = 'text-info fw-medium';
        toggle.setAttribute('data-bs-toggle', 'collapse');
        toggle.href = '#' + id;
        toggle.setAttribute('role', 'button');
        toggle.setAttribute('aria-expanded', 'true');

        var infoIcon = document.createElement('i');
        infoIcon.className = 'ri-information-line me-1';
        toggle.appendChild(infoIcon);
        toggle.appendChild(document.createTextNode(title));

        var arrowIcon = document.createElement('i');
        arrowIcon.className = 'ri-arrow-down-s-line float-end fs-16';
        toggle.appendChild(arrowIcon);
        card.appendChild(toggle);

        var collapseDiv = document.createElement('div');
        collapseDiv.className = 'collapse show mt-3';
        collapseDiv.id = id;

        // Items row
        var itemsRow = document.createElement('div');
        itemsRow.className = 'row g-3 mb-2';

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var col = document.createElement('div');
            col.className = items.length <= 3 ? 'col-md-4' : 'col-md-6 col-lg-3';

            var flex = document.createElement('div');
            flex.className = 'd-flex';

            var iconDiv = document.createElement('div');
            iconDiv.className = 'flex-shrink-0';
            var ic = document.createElement('i');
            ic.className = item.icon + ' ' + (item.iconColor || 'text-info') + ' fs-20 me-2';
            iconDiv.appendChild(ic);
            flex.appendChild(iconDiv);

            var textDiv = document.createElement('div');
            var h6 = document.createElement('h6');
            h6.className = 'mb-1';
            h6.textContent = item.title;
            textDiv.appendChild(h6);

            var p = document.createElement('p');
            p.className = 'text-muted mb-0 fs-12';
            p.innerHTML = item.desc; // HTML allowed for <strong> tags (hardcoded literals only)
            textDiv.appendChild(p);

            flex.appendChild(textDiv);
            col.appendChild(flex);
            itemsRow.appendChild(col);
        }
        collapseDiv.appendChild(itemsRow);

        // Tips row (optional)
        if (tips && tips.length > 0) {
            var hr = document.createElement('div');
            hr.className = 'border-top pt-2';

            var tipsRow = document.createElement('div');
            tipsRow.className = 'row g-2';

            for (var t = 0; t < tips.length; t++) {
                var tip = tips[t];
                var tipCol = document.createElement('div');
                tipCol.className = 'col-md-' + Math.floor(12 / tips.length);

                var tipBox = document.createElement('div');
                tipBox.className = 'border rounded p-2 bg-' + (tip.badgeColor || 'info') + '-subtle bg-opacity-10';

                var badge = document.createElement('span');
                badge.className = 'badge bg-' + (tip.badgeColor || 'info') + '-subtle text-' + (tip.badgeColor || 'info') + ' mb-1';
                badge.innerHTML = tip.badge; // icon + text (hardcoded literals only)
                tipBox.appendChild(badge);

                var tipP = document.createElement('p');
                tipP.className = 'text-muted mb-0 fs-11';
                tipP.innerHTML = tip.desc;
                tipBox.appendChild(tipP);

                tipCol.appendChild(tipBox);
                tipsRow.appendChild(tipCol);
            }
            hr.appendChild(tipsRow);
            collapseDiv.appendChild(hr);
        }

        card.appendChild(collapseDiv);
        return card;
    }

    /**
     * URL'nin guvenli bir protokol kullanip kullanmadigini kontrol eder.
     *
     * @param {string} url - Kontrol edilecek URL
     * @return {boolean} Guvenli ise true
     */
    function isSafeUrl(url) {
        return url && (url.startsWith('https://') || url.startsWith('http://'));
    }

    /**
     * AJAX veri ceker ve cache'ler.
     *
     * @param {string} url - Endpoint URL
     * @return {Promise} Veri promise'i
     */
    function fetchData(url) {
        if (cache[url]) {
            return Promise.resolve(cache[url]);
        }
        return fetch(url).then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        }).then(function (data) {
            cache[url] = data;
            return data;
        });
    }

    /**
     * Sayiyi Turkce formatlar.
     *
     * @param {number} val - Sayi degeri
     * @return {string} Formatli sayi
     */
    function formatNumber(val) {
        if (val == null) return '-';
        return new Intl.NumberFormat('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(val);
    }

    /**
     * Buyuk sayilari Turkce para birimi formatina donusturur (Milyar, Milyon, Bin).
     *
     * @param {number} val - Sayi degeri
     * @return {string} Formatli tutar
     */
    function formatCurrency(val) {
        if (val == null) return '-';
        var abs = Math.abs(val);
        var sign = val < 0 ? '-' : '';
        if (abs >= 1e9) return sign + formatNumber(abs / 1e9) + ' Milyar';
        if (abs >= 1e6) return sign + formatNumber(abs / 1e6) + ' Milyon';
        if (abs >= 1e3) return sign + formatNumber(abs / 1e3) + ' Bin';
        return sign + formatNumber(abs);
    }

    /**
     * Element icerigini temizler (DOM API ile).
     *
     * @param {HTMLElement} el - Hedef element
     */
    function clearElement(el) {
        while (el.firstChild) el.removeChild(el.firstChild);
    }

    /**
     * Hata mesaji gosterir.
     *
     * @param {string} containerId - Hedef container ID
     */
    function showError(containerId) {
        var el = document.getElementById(containerId);
        if (!el) return;
        clearElement(el);
        var alert = document.createElement('div');
        alert.className = 'alert alert-danger';
        var icon = document.createElement('i');
        icon.className = 'ri-error-warning-line me-2';
        alert.appendChild(icon);
        alert.appendChild(document.createTextNode('Veriler yüklenemedi. Lütfen daha sonra tekrar deneyin.'));
        el.appendChild(alert);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
