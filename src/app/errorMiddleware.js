import { isRejectedWithValue } from "@reduxjs/toolkit";

/**
 * Middleware to handle global errors, specifically 401 Unauthorized
 * which indicates an expired or invalid token.
 */
export const errorMiddleware = () => (next) => (action) => {
    if (isRejectedWithValue(action)) {
        if (action.payload?.status === 401) {
            // Prevent infinite loop if we're already on the login page
            if (!window.location.pathname.includes("/login")) {
                // Clear local storage and redirect to login
                localStorage.removeItem("token");
                localStorage.clear();
                window.location.href = "/login";
            }
        }
    }

    return next(action);
};
