package com.scyborsa.ui.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Para akisi yanit DTO'su.
 *
 * <p>scyborsaApi'deki {@code /api/v1/money-flow} endpoint'inden
 * donen para girisi (inflow) ve para cikisi (outflow) hisse
 * listelerini tasir.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MoneyFlowResponse {

    /** Para girisi olan hisseler (hacim artisina gore siralanmis). */
    private List<MoneyFlowStockDto> inflow;

    /** Para cikisi olan hisseler (hacim dususune gore siralanmis). */
    private List<MoneyFlowStockDto> outflow;
}
