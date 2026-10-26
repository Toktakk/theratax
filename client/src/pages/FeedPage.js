import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { messageOf, request } from '../api.ts';
import { categoriesForMethod, categoryName } from '../category-filter.ts';
import { FormError } from '../FormError.tsx';
import { civilDateFromInput, expenseMethodLabel, formatPounds, practiceTypeLabel, readAmountPence, readWholeNumber, } from '../format.ts';
import { suggestCategory } from '../hint.ts';
export function FeedPage({ user }) {
    const [categories, setCategories] = useState(null);
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [listLoading, setListLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);
    const [pageError, setPageError] = useState('');
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [type, setType] = useState('expense');
    const [note, setNote] = useState('');
    const [occurredOn, setOccurredOn] = useState('');
    const [pickedSlug, setPickedSlug] = useState('');
    const [pickedNote, setPickedNote] = useState(null);
    const [miles, setMiles] = useState('');
    const [pounds, setPounds] = useState('');
    const [pence, setPence] = useState('');
    const [photos, setPhotos] = useState({});
    const [rowErrors, setRowErrors] = useState({});
    const noteRef = useRef(null);
    const allowed = categories === null
        ? []
        : categoriesForMethod(categories, user.expenseMethod);
    const suggestion = suggestCategory(allowed, note);
    const categorySlug = pickedNote === note ? pickedSlug : (suggestion?.slug ?? pickedSlug);
    const selected = allowed.find((category) => category.slug === categorySlug);
    const mileage = type === 'expense' && selected?.kind === 'mileage';
    const receiptKey = items
        .filter((item) => item.hasReceipt)
        .map((item) => item.id)
        .join(',');
    useEffect(() => {
        let cancelled = false;
        request('/expense-categories')
            .then((rows) => {
            if (!cancelled) {
                setCategories(rows);
            }
        })
            .catch((error) => {
            if (!cancelled) {
                setPageError(messageOf(error));
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);
    useEffect(() => {
        let cancelled = false;
        request('/transactions?limit=100')
            .then((body) => {
            if (!cancelled) {
                setItems(body.items);
                setTotal(body.total);
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
                setListLoading(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [reloadKey]);
    useEffect(() => {
        if (receiptKey === '') {
            return;
        }
        let cancelled = false;
        const ids = receiptKey.split(',').map((value) => Number(value));
        for (const id of ids) {
            request(`/transactions/${id}/receipt`)
                .then((receipt) => {
                if (!cancelled) {
                    setPhotos((current) => ({ ...current, [id]: receipt.url }));
                    setRowErrors((current) => {
                        if (!Object.hasOwn(current, id)) {
                            return current;
                        }
                        const next = { ...current };
                        delete next[id];
                        return next;
                    });
                }
            })
                .catch((error) => {
                if (!cancelled) {
                    setRowErrors((current) => ({ ...current, [id]: messageOf(error) }));
                }
            });
        }
        return () => {
            cancelled = true;
        };
    }, [receiptKey]);
    async function onSubmit(event) {
        event.preventDefault();
        setFormError('');
        const payload = { type };
        const trimmedNote = note.trim();
        if (trimmedNote !== '') {
            payload.note = trimmedNote;
        }
        const civil = civilDateFromInput(occurredOn);
        if (civil !== undefined) {
            payload.occurredOn = civil;
        }
        if (type === 'expense') {
            if (categorySlug !== '') {
                payload.categorySlug = categorySlug;
            }
            if (mileage) {
                const milesValue = readWholeNumber(miles);
                if (!milesValue.ok) {
                    setFormError(milesValue.message);
                    return;
                }
                if (milesValue.value !== undefined) {
                    payload.miles = milesValue.value;
                }
            }
            else {
                const money = readAmountPence(pounds, pence);
                if (!money.ok) {
                    setFormError(money.message);
                    return;
                }
                if (money.amountPence > 0) {
                    payload.amountPence = money.amountPence;
                }
            }
        }
        else {
            const money = readAmountPence(pounds, pence);
            if (!money.ok) {
                setFormError(money.message);
                return;
            }
            if (money.amountPence > 0) {
                payload.amountPence = money.amountPence;
            }
        }
        setSaving(true);
        try {
            await request('/transactions', { method: 'POST', json: payload });
            setNote('');
            setOccurredOn('');
            setPounds('');
            setPence('');
            setMiles('');
            setPickedSlug('');
            setPickedNote(null);
            setReloadKey((value) => value + 1);
            noteRef.current?.focus();
        }
        catch (error) {
            setFormError(messageOf(error));
        }
        finally {
            setSaving(false);
        }
    }
    async function onFile(transactionId, input) {
        const file = input.files?.item(0) ?? undefined;
        input.value = '';
        if (file === undefined) {
            return;
        }
        setRowErrors((current) => {
            const next = { ...current };
            delete next[transactionId];
            return next;
        });
        const formData = new FormData();
        formData.append('file', file);
        try {
            await request(`/transactions/${transactionId}/receipt`, {
                method: 'POST',
                formData,
            });
            setItems((current) => current.map((item) => item.id === transactionId ? { ...item, hasReceipt: true } : item));
        }
        catch (error) {
            setRowErrors((current) => ({
                ...current,
                [transactionId]: messageOf(error),
            }));
        }
    }
    return (_jsxs("div", { className: "stack", children: [_jsxs("div", { children: [_jsx("h2", { children: "Feed" }), _jsxs("p", { className: "muted", children: [practiceTypeLabel(user.practiceType), " \u00B7", ' ', expenseMethodLabel(user.expenseMethod)] })] }), _jsxs("form", { className: "card stack", autoComplete: "off", onSubmit: onSubmit, children: [_jsxs("fieldset", { children: [_jsx("legend", { children: "Type" }), _jsxs("div", { className: "inline-choices", children: [_jsxs("label", { className: "choice", children: [_jsx("input", { type: "radio", name: "entryType", value: "expense", checked: type === 'expense', onChange: () => {
                                                    setType('expense');
                                                } }), "Expense"] }), _jsxs("label", { className: "choice", children: [_jsx("input", { type: "radio", name: "entryType", value: "income", checked: type === 'income', onChange: () => {
                                                    setType('income');
                                                } }), "Income"] })] })] }), _jsxs("label", { className: "field", children: ["Note", _jsx("input", { ref: noteRef, value: note, maxLength: 500, autoFocus: true, onChange: (event) => {
                                    setNote(event.target.value);
                                } })] }), type === 'expense' && suggestion !== null ? (_jsxs("p", { className: "hint", "aria-live": "polite", children: ["Suggested: ", suggestion.name] })) : null, _jsxs("label", { className: "field", children: ["Date", _jsx("input", { type: "date", value: occurredOn, onChange: (event) => {
                                    setOccurredOn(event.target.value);
                                } }), _jsx("span", { className: "muted", children: "Leave blank for today." })] }), type === 'expense' ? (_jsxs("label", { className: "field", children: ["Category", _jsxs("select", { value: categorySlug, disabled: categories === null, onChange: (event) => {
                                    setPickedSlug(event.target.value);
                                    setPickedNote(note);
                                }, children: [_jsx("option", { value: "", children: "Choose a category" }), allowed.map((category) => (_jsx("option", { value: category.slug, children: category.name }, category.slug)))] })] })) : null, mileage ? (_jsxs("label", { className: "field", children: ["Miles", _jsx("input", { inputMode: "numeric", value: miles, onChange: (event) => {
                                    setMiles(event.target.value);
                                } }), _jsx("span", { className: "muted", children: "Enter miles. The amount is calculated for you." })] })) : (_jsxs("div", { className: "money-fields", children: [_jsxs("label", { className: "field", children: ["Pounds", _jsx("input", { inputMode: "numeric", value: pounds, onChange: (event) => {
                                            setPounds(event.target.value);
                                        } })] }), _jsxs("label", { className: "field", children: ["Pence", _jsx("input", { inputMode: "numeric", maxLength: 2, value: pence, onChange: (event) => {
                                            setPence(event.target.value);
                                        } })] })] })), _jsx(FormError, { message: formError }), _jsx("button", { className: "button-primary", type: "submit", disabled: saving || (type === 'expense' && categories === null), children: saving ? 'Saving…' : 'Save' })] }), _jsx(FormError, { message: pageError }), listLoading && items.length === 0 ? (_jsx("p", { className: "muted", children: "Loading entries\u2026" })) : null, !listLoading && pageError === '' && items.length === 0 ? (_jsx("p", { className: "muted", children: "No entries yet." })) : null, total > items.length ? (_jsxs("p", { className: "muted", children: ["Showing the latest ", items.length, " of ", total, "."] })) : null, _jsx("div", { className: "list", children: items.map((item) => (_jsx(TransactionRow, { item: item, categories: categories ?? [], photoUrl: storedValue(photos, item.id), error: storedValue(rowErrors, item.id) ?? '', onFile: onFile }, item.id))) })] }));
}
function TransactionRow({ item, categories, photoUrl, error, onFile, }) {
    const label = item.categorySlug === undefined
        ? null
        : categoryName(categories, item.categorySlug);
    return (_jsxs("article", { className: item.type === 'income' ? 'row income' : 'row expense', children: [_jsxs("p", { className: "muted", children: [item.occurredOn, " \u00B7 ", item.type === 'income' ? 'Income' : 'Expense', label === null ? '' : ` · ${label}`] }), item.note !== undefined ? _jsx("p", { className: "note", children: item.note }) : null, item.miles !== undefined ? (_jsxs("p", { className: "amount", children: [item.miles, " miles \u00B7 ", formatPounds(item.amountPence)] })) : (_jsx("p", { className: "amount", children: formatPounds(item.amountPence) })), item.hasReceipt ? (photoUrl === undefined ? (_jsx("p", { className: "muted", children: "Loading photo\u2026" })) : (_jsx("img", { className: "receipt", src: photoUrl, alt: "Receipt" }))) : (_jsxs("label", { className: "field", children: ["Attach a photo", _jsx("input", { type: "file", onChange: (event) => {
                            onFile(item.id, event.target);
                        } }), _jsx("span", { className: "muted", children: "JPEG, PNG, or WebP." })] })), _jsx(FormError, { message: error })] }));
}
function storedValue(record, id) {
    if (!Object.hasOwn(record, id)) {
        return undefined;
    }
    return record[id];
}
