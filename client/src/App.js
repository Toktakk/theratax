import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { clearToken, getToken, onSignedOut, request } from './api.ts';
import { FeedPage } from './pages/FeedPage.tsx';
import { InvoicePage } from './pages/InvoicePage.tsx';
import { OnboardingPage } from './pages/OnboardingPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { SignInPage } from './pages/SignInPage.tsx';
import { TaxSummaryPage } from './pages/TaxSummaryPage.tsx';
import { asReadyUser } from './types.ts';
function sessionFromUser(user) {
    const ready = asReadyUser(user);
    if (ready === null) {
        return { status: 'onboarding', user };
    }
    return { status: 'ready', user: ready };
}
export default function App() {
    const navigate = useNavigate();
    const [session, setSession] = useState(() => getToken() === null ? { status: 'signed-out' } : { status: 'loading' });
    useEffect(() => {
        return onSignedOut(() => {
            setSession({ status: 'signed-out' });
        });
    }, []);
    useEffect(() => {
        if (getToken() === null) {
            return;
        }
        let cancelled = false;
        request('/users/me')
            .then((user) => {
            if (!cancelled) {
                setSession(sessionFromUser(user));
            }
        })
            .catch(() => {
            if (!cancelled) {
                setSession({ status: 'signed-out' });
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);
    function logout() {
        clearToken();
        setSession({ status: 'signed-out' });
        navigate('/');
    }
    function onSignedIn(user) {
        setSession(sessionFromUser(user));
    }
    if (session.status === 'loading') {
        return (_jsx("div", { className: "page", children: _jsx("p", { className: "muted", children: "Checking your session\u2026" }) }));
    }
    if (session.status === 'signed-out') {
        return (_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(SignInPage, { onSignedIn: onSignedIn }) }), _jsx(Route, { path: "/register", element: _jsx(RegisterPage, { onSignedIn: onSignedIn }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }));
    }
    if (session.status === 'onboarding') {
        return (_jsx(OnboardingPage, { user: session.user, onLogout: logout, onComplete: (user) => {
                setSession(sessionFromUser(user));
                navigate('/');
            } }));
    }
    return (_jsx("div", { className: "page", children: _jsx(Shell, { user: session.user, onLogout: logout, children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(FeedPage, { user: session.user }) }), _jsx(Route, { path: "/invoices", element: _jsx(InvoicePage, {}) }), _jsx(Route, { path: "/tax", element: _jsx(TaxSummaryPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }) }));
}
function Shell({ user, onLogout, children, }) {
    return (_jsxs(_Fragment, { children: [_jsxs("header", { className: "top", children: [_jsxs("div", { children: [_jsx("h1", { className: "brand", children: "TheraTax" }), _jsx("p", { className: "who", children: user.name })] }), _jsxs("nav", { className: "nav", children: [_jsx(NavLink, { to: "/", end: true, className: navClass, children: "Feed" }), _jsx(NavLink, { to: "/invoices", className: navClass, children: "Invoices" }), _jsx(NavLink, { to: "/tax", className: navClass, children: "Tax summary" })] }), _jsx("button", { className: "button-ghost", type: "button", onClick: onLogout, children: "Log out" })] }), _jsx("main", { children: children })] }));
}
function navClass({ isActive }) {
    return isActive ? 'nav-link active' : 'nav-link';
}
