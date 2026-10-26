import { jsx as _jsx } from "react/jsx-runtime";
export function FormError({ message }) {
    if (message === '') {
        return null;
    }
    return (_jsx("p", { className: "error", role: "alert", children: message }));
}
