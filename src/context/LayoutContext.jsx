import { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

const LayoutContext = createContext();

export const LayoutProvider = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Desktop collapse
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile drawer
    const [language, setLanguage] = useState(localStorage.getItem("lang") || "EN");
    const { pathname } = useLocation();

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        localStorage.setItem("lang", language);
    }, [language]);

    const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
    const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);
    const toggleLanguage = () => setLanguage((prev) => (prev === "EN" ? "BN" : "EN"));

    return (
        <LayoutContext.Provider
            value={{
                isSidebarOpen,
                setIsSidebarOpen,
                toggleSidebar,
                isMobileMenuOpen,
                setIsMobileMenuOpen,
                toggleMobileMenu,
                language,
                toggleLanguage,
            }}
        >
            {children}
        </LayoutContext.Provider>
    );
};

export const useLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) {
        // Return a dummy context or throw error
        // To avoid breaking if used outside (though it shouldn't be)
        return {
            isSidebarOpen: true,
            setIsSidebarOpen: () => { },
            toggleSidebar: () => { },
            isMobileMenuOpen: false,
            setIsMobileMenuOpen: () => { },
            toggleMobileMenu: () => { },
        };
    }
    return context;
};
