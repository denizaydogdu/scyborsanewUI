package com.scyborsa.ui.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * WebClient konfigürasyon sınıfı.
 * <p>
 * scyborsaApi backend servisine HTTP istekleri göndermek için kullanılan
 * {@link WebClient.Builder} bean'ini oluşturur. Base URL değeri
 * {@code api.base-url} application property'sinden okunur.
 * </p>
 *
 * @see org.springframework.web.reactive.function.client.WebClient
 */
@Configuration
public class WebClientConfig {

    /** Maksimum buffer boyutu (2 MB). Taramalar groupByStock gibi büyük JSON response'lar için gerekli. */
    private static final int MAX_BUFFER_SIZE = 2 * 1024 * 1024;

    /** scyborsaApi backend base URL'i (application.yml: api.base-url). */
    @Value("${api.base-url}")
    private String apiBaseUrl;

    /** vApi (Kripto API) base URL'i (application.yml: vapi.base-url). */
    @Value("${vapi.base-url}")
    private String vapiBaseUrl;

    /** vApi API key (application.yml: vapi.api-key). */
    @Value("${vapi.api-key:}")
    private String vapiApiKey;

    /**
     * Önceden yapılandırılmış bir {@link WebClient.Builder} bean'i oluşturur.
     * <p>
     * Builder, {@code api.base-url} property'sinden alınan base URL ile
     * konfigüre edilir. {@code maxInMemorySize} 2 MB olarak ayarlanır
     * (büyük JSON response'lar için, ör: groupByStock taramalar).
     * </p>
     *
     * @return base URL'i ve buffer limiti ayarlanmış {@link WebClient.Builder} örneği
     */
    @Bean
    @Primary
    public WebClient.Builder webClientBuilder() {
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(MAX_BUFFER_SIZE))
                .build();

        return WebClient.builder()
                .baseUrl(apiBaseUrl)
                .exchangeStrategies(strategies);
    }

    /**
     * vApi (Kripto API) için önceden yapılandırılmış bir {@link WebClient.Builder} bean'i oluşturur.
     * <p>
     * Builder, {@code vapi.base-url} property'sinden alınan base URL ile
     * konfigüre edilir. {@code maxInMemorySize} 2 MB olarak ayarlanır.
     * </p>
     *
     * @return base URL'i ve buffer limiti ayarlanmış {@link WebClient.Builder} örneği
     */
    @Bean
    @Qualifier("vApiWebClientBuilder")
    public WebClient.Builder vApiWebClientBuilder() {
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(MAX_BUFFER_SIZE))
                .build();

        WebClient.Builder builder = WebClient.builder()
                .baseUrl(vapiBaseUrl)
                .exchangeStrategies(strategies);
        if (vapiApiKey != null && !vapiApiKey.isEmpty()) {
            builder.defaultHeader("X-API-KEY", vapiApiKey);
        }
        return builder;
    }

}
