import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { downloadFile, messageOf, request } from '../api.ts';
import { FormError } from '../FormError.tsx';
import { civilDateFromInput, formatPounds, readAmountPence } from '../format.ts';
export function InvoicePage() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [clientName, setClientName] = useState('');
    const [service, setService] = useState('');
    const [pounds, setPounds] = useState('');
    const [pence, setPence] = useState('');
    const [issuedOn, setIssuedOn] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const [payingId, setPayingId] = useState(null);
    const [pdfId, setPdfId] = useState(null);
    const [rowError, setRowError] = useState(null);
    useEffect(() => {
        let cancelled = false;
        request('/invoices?limit=100')
            .then((body) => {
            if (!cancelled) {
                setInvoices(body.items);
                setPageError('');
            }
        })
            .catch((error) => {
            if (!cancelled) {
                setPageError(messageOf(error));
            }
        })
            .finally(() => {
            if (!cancelled) {
                setLoading(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [reloadKey]);
    async function onSubmit(event) {
        event.preventDefault();
        setFormError('');
        const money = readAmountPence(pounds, pence);
        if (!money.ok) {
            setFormError(money.message);
            return;
        }
        const payload = {
            clientName: clientName.trim(),
            service: service.trim(),
        };
        if (money.amountPence > 0) {
            payload.amountPence = money.amountPence;
        }
        const civil = civilDateFromInput(issuedOn);
        if (civil !== undefined) {
            payload.issuedOn = civil;
        }
        setSaving(true);
        try {
            await request('/invoices', { method: 'POST', json: payload });
            setClientName('');
            setService('');
            setPounds('');
            setPence('');
            setIssuedOn('');
            setReloadKey((value) => value + 1);
        }
        catch (error) {
            setFormError(messageOf(error));
        }
        finally {
            setSaving(false);
        }
    }
    async function pay(invoice) {
        setPayingId(invoice.id);
        setRowError(null);
        try {
            const updated = await request(`/invoices/${invoice.id}`, {
                method: 'PATCH',
                json: { status: 'paid' },
            });
            setInvoices((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        }
        catch (error) {
            setRowError({ id: invoice.id, message: messageOf(error) });
        }
        finally {
            setPayingId(null);
        }
    }
    async function download(invoice) {
        setPdfId(invoice.id);
        setRowError(null);
        try {
            await downloadFile(`/invoices/${invoice.id}/pdf`, `${invoice.number}.pdf`);
        }
        catch (error) {
            setRowError({ id: invoice.id, message: messageOf(error) });
        }
        finally {
            setPdfId(null);
        }
    }
    return (_jsxs("div", { className: "stack", children: [_jsx("h2", { children: "Invoices" }), _jsxs("form", { className: "card stack", onSubmit: onSubmit, children: [_jsxs("label", { className: "field", children: ["Client name", _jsx("input", { value: clientName, maxLength: 200, onChange: (event) => {
                                    setClientName(event.target.value);
                                } })] }), _jsxs("label", { className: "field", children: ["Service", _jsx("input", { value: service, maxLength: 200, onChange: (event) => {
                                    setService(event.target.value);
                                } })] }), _jsxs("div", { className: "money-fields", children: [_jsxs("label", { className: "field", children: ["Pounds", _jsx("input", { inputMode: "numeric", value: pounds, onChange: (event) => {
                                            setPounds(event.target.value);
                                        } })] }), _jsxs("label", { className: "field", children: ["Pence", _jsx("input", { inputMode: "numeric", maxLength: 2, value: pence, onChange: (event) => {
                                            setPence(event.target.value);
                                        } })] })] }), _jsxs("label", { className: "field", children: ["Issue date", _jsx("input", { type: "date", value: issuedOn, onChange: (event) => {
                                    setIssuedOn(event.target.value);
                                } }), _jsx("span", { className: "muted", children: "Leave blank for today." })] }), _jsx(FormError, { message: formError }), _jsx("button", { className: "button-primary", type: "submit", disabled: saving, children: saving ? 'Creating…' : 'Create invoice' })] }), _jsx(FormError, { message: pageError }), loading && invoices.length === 0 ? (_jsx("p", { className: "muted", children: "Loading invoices\u2026" })) : null, !loading && pageError === '' && invoices.length === 0 ? (_jsx("p", { className: "muted", children: "No invoices yet." })) : null, _jsx("div", { className: "list", children: invoices.map((invoice) => (_jsxs("article", { className: "row", children: [_jsx("h3", { children: invoice.number }), _jsxs("p", { children: [invoice.clientName, " \u00B7 ", invoice.service] }), _jsx("p", { className: "amount", children: formatPounds(invoice.amountPence) }), _jsxs("p", { className: "muted", children: ["Issued ", invoice.issuedOn] }), _jsxs("p", { children: ["Status: ", invoice.status] }), _jsx("p", { children: invoice.paidOn === undefined
                                ? 'No paid date yet'
                                : `Paid on ${invoice.paidOn}` }), invoice.transactionId !== undefined ? (_jsxs("p", { children: ["Income entry ", invoice.transactionId] })) : null, _jsxs("div", { className: "actions", children: [_jsx("button", { className: "button-ghost", type: "button", disabled: pdfId === invoice.id, onClick: () => {
                                        void download(invoice);
                                    }, children: pdfId === invoice.id ? 'Downloading…' : 'Download PDF' }), _jsx("button", { className: "button-primary", type: "button", disabled: payingId === invoice.id, onClick: () => {
                                        void pay(invoice);
                                    }, children: payingId === invoice.id ? 'Marking paid…' : 'Mark paid' })] }), rowError?.id === invoice.id ? (_jsx(FormError, { message: rowError.message })) : null] }, invoice.id))) })] }));
}
