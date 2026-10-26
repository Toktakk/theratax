import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { messageOf, request } from '../api.ts';
import { FormError } from '../FormError.tsx';
import { expenseMethodLabel, formatPounds } from '../format.ts';
export function TaxSummaryPage() {
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
        let cancelled = false;
        request('/tax/summary')
            .then((body) => {
            if (!cancelled) {
                setSummary(body);
            }
        })
            .catch((caught) => {
            if (!cancelled) {
                setError(messageOf(caught));
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);
    if (error !== '') {
        return (_jsxs("div", { className: "stack", children: [_jsx("h2", { children: "Tax summary" }), _jsx(FormError, { message: error })] }));
    }
    if (summary === null) {
        return (_jsxs("div", { className: "stack", children: [_jsx("h2", { children: "Tax summary" }), _jsx("p", { className: "muted", children: "Loading tax summary\u2026" })] }));
    }
    return (_jsxs("div", { className: "stack", children: [_jsxs("div", { children: [_jsx("h2", { children: "Tax summary" }), _jsx("p", { className: "muted", children: summary.taxYear })] }), _jsxs("dl", { className: "figures card", children: [_jsxs("div", { children: [_jsx("dt", { children: "Period" }), _jsxs("dd", { children: [summary.periodStart, " to ", summary.periodEnd] })] }), _jsxs("div", { children: [_jsx("dt", { children: "Vehicle method" }), _jsx("dd", { children: expenseMethodLabel(summary.expenseMethod) })] }), _jsxs("div", { children: [_jsx("dt", { children: "Income" }), _jsx("dd", { children: formatPounds(summary.incomePence) })] }), _jsxs("div", { children: [_jsx("dt", { children: "Allowable expenses" }), _jsx("dd", { children: formatPounds(summary.allowableExpensesPence) })] }), _jsxs("div", { children: [_jsx("dt", { children: "Net profit" }), _jsx("dd", { children: formatPounds(summary.netProfitPence) })] }), _jsxs("div", { children: [_jsx("dt", { children: "Estimated tax" }), _jsx("dd", { children: formatPounds(summary.estimatedTaxOwedPence) })] })] }), _jsx("p", { children: summary.class2.treatedAsPaid
                    ? 'Class 2 National Insurance is treated as paid.'
                    : `Voluntary Class 2 is ${formatPounds(summary.class2.voluntaryWeeklyPence)} a week. This is not included in estimated tax.` }), _jsxs("section", { className: "stack", children: [_jsx("h3", { children: "Assumptions" }), _jsx("ol", { children: summary.assumptions.map((assumption) => (_jsx("li", { children: assumption }, assumption))) })] }), _jsx("p", { className: "disclaimer", children: summary.disclaimer })] }));
}
