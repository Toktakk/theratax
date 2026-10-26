import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { messageOf, signIn } from '../api.ts';
import { FormError } from '../FormError.tsx';
export function RegisterPage({ onSignedIn }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    async function onRegister(event) {
        event.preventDefault();
        setError('');
        setPending(true);
        try {
            const user = await signIn('/auth/register', {
                email: email.trim(),
                password,
                name: name.trim(),
            });
            onSignedIn(user);
        }
        catch (caught) {
            setError(messageOf(caught));
        }
        finally {
            setPending(false);
        }
    }
    return (_jsxs("div", { className: "page auth", children: [_jsx("header", { className: "top", children: _jsx("h1", { className: "brand", children: "TheraTax" }) }), _jsx("p", { className: "lede", children: "Sign in to log sessions, receipts, and invoices." }), _jsxs("form", { className: "card stack", onSubmit: onRegister, children: [_jsx("h2", { children: "Register" }), _jsxs("label", { className: "field", children: ["Name", _jsx("input", { id: "register-name", value: name, autoComplete: "name", onChange: (event) => {
                                    setName(event.target.value);
                                } })] }), _jsxs("label", { className: "field", children: ["Email", _jsx("input", { id: "register-email", type: "email", value: email, autoComplete: "email", onChange: (event) => {
                                    setEmail(event.target.value);
                                } })] }), _jsxs("label", { className: "field", children: ["Password", _jsx("input", { id: "register-password", type: "password", value: password, autoComplete: "new-password", onChange: (event) => {
                                    setPassword(event.target.value);
                                } })] }), _jsx(FormError, { message: error }), _jsx("button", { className: "button-primary", type: "submit", disabled: pending, children: pending ? 'Creating account…' : 'Create account' }), _jsx(Link, { className: "switch-link", to: "/", children: "Already have an account? Log in" })] })] }));
}
