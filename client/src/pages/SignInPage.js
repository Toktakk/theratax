import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { messageOf, signIn } from '../api.ts';
import { FormError } from '../FormError.tsx';
export function SignInPage({ onSignedIn }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    async function onLogin(event) {
        event.preventDefault();
        setError('');
        setPending(true);
        try {
            const user = await signIn('/auth/login', {
                email: email.trim(),
                password,
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
    return (_jsxs("div", { className: "page auth", children: [_jsx("header", { className: "top", children: _jsx("h1", { className: "brand", children: "TheraTax" }) }), _jsx("p", { className: "lede", children: "Sign in to log sessions, receipts, and invoices." }), _jsxs("form", { className: "card stack", onSubmit: onLogin, children: [_jsx("h2", { children: "Log in" }), _jsxs("label", { className: "field", children: ["Email", _jsx("input", { id: "login-email", type: "email", value: email, autoComplete: "email", onChange: (event) => {
                                    setEmail(event.target.value);
                                } })] }), _jsxs("label", { className: "field", children: ["Password", _jsx("input", { id: "login-password", type: "password", value: password, autoComplete: "current-password", onChange: (event) => {
                                    setPassword(event.target.value);
                                } })] }), _jsx(FormError, { message: error }), _jsx("button", { className: "button-primary", type: "submit", disabled: pending, children: pending ? 'Logging in…' : 'Log in' }), _jsx(Link, { className: "switch-link", to: "/register", children: "Create an account" })] })] }));
}
