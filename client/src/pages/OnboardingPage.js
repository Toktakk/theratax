import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { messageOf, request } from '../api.ts';
import { FormError } from '../FormError.tsx';
import { asReadyUser } from '../types.ts';
export function OnboardingPage({ user, onComplete, onLogout }) {
    const [practiceType, setPracticeType] = useState(null);
    const [expenseMethod, setExpenseMethod] = useState(null);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    async function onSubmit(event) {
        event.preventDefault();
        if (practiceType === null || expenseMethod === null) {
            return;
        }
        setError('');
        setSaving(true);
        try {
            const updated = await request('/users/me/onboarding', {
                method: 'PATCH',
                json: { practiceType, expenseMethod },
            });
            if (asReadyUser(updated) === null) {
                setError('Onboarding did not complete.');
                return;
            }
            onComplete(updated);
        }
        catch (caught) {
            setError(messageOf(caught));
        }
        finally {
            setSaving(false);
        }
    }
    return (_jsxs("div", { className: "page", children: [_jsxs("header", { className: "top", children: [_jsxs("div", { children: [_jsx("h1", { className: "brand", children: "TheraTax" }), _jsx("p", { className: "who", children: user.name })] }), _jsx("button", { className: "button-ghost", type: "button", onClick: onLogout, children: "Log out" })] }), _jsxs("form", { className: "card stack", onSubmit: onSubmit, children: [_jsx("h2", { children: "Set up your practice" }), _jsx("p", { className: "muted", children: "This happens once." }), _jsxs("fieldset", { children: [_jsx("legend", { children: "How you work" }), _jsxs("label", { className: "choice", children: [_jsx("input", { type: "radio", name: "practiceType", value: "mobile", checked: practiceType === 'mobile', onChange: () => {
                                            setPracticeType('mobile');
                                        } }), "Travels to the client"] }), _jsxs("label", { className: "choice", children: [_jsx("input", { type: "radio", name: "practiceType", value: "fixedLocation", checked: practiceType === 'fixedLocation', onChange: () => {
                                            setPracticeType('fixedLocation');
                                        } }), "Clinic"] }), _jsxs("label", { className: "choice", children: [_jsx("input", { type: "radio", name: "practiceType", value: "mixed", checked: practiceType === 'mixed', onChange: () => {
                                            setPracticeType('mixed');
                                        } }), "Both"] })] }), _jsxs("fieldset", { children: [_jsx("legend", { children: "Vehicle costs" }), _jsx("p", { className: "muted", children: "This method applies to the car only. Massage oils, HCPC fees, insurance, and laundry are still typed as amounts. After single-rate mileage is chosen it cannot be changed back." }), _jsxs("label", { className: "choice", children: [_jsx("input", { type: "radio", name: "expenseMethod", value: "flat_rate", checked: expenseMethod === 'flat_rate', onChange: () => {
                                            setExpenseMethod('flat_rate');
                                        } }), "Single-rate mileage"] }), _jsxs("label", { className: "choice", children: [_jsx("input", { type: "radio", name: "expenseMethod", value: "actual_cost", checked: expenseMethod === 'actual_cost', onChange: () => {
                                            setExpenseMethod('actual_cost');
                                        } }), "Vehicle costs as actually paid"] })] }), _jsx(FormError, { message: error }), _jsx("button", { className: "button-primary", type: "submit", disabled: saving || practiceType === null || expenseMethod === null, children: saving ? 'Saving…' : 'Continue' })] })] }));
}
