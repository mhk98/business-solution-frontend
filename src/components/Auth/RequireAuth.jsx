import { Navigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import {
  canAccessPath,
  getFirstAllowedPathForRole,
  subscribeToPermissionChanges,
} from "../../utils/navigationPermissions";
import SidebarLayout from "../common/SidebarLayout";
import Header from "../common/Header";

const AccessDenied = () => (
  <SidebarLayout>
    <Header title="Access Denied" />
    <main className="p-4 sm:p-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
        You do not have permission to view this page.
      </div>
    </main>
  </SidebarLayout>
);

const RequireAuth = ({ children }) => {
  const location = useLocation();
  const [permissionVersion, setPermissionVersion] = useState(0);
  let token;

  useEffect(() => {
    return subscribeToPermissionChanges(() =>
      setPermissionVersion((prev) => prev + 1),
    );
  }, []);

  try {
    token = localStorage.getItem("token");

    if (!token) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const decoded = jwtDecode(token);

    // If access token expired, check if we have a refresh token
    // The API layer (baseQueryWithReauth) will handle the actual refresh
    if (decoded.exp * 1000 < Date.now()) {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        localStorage.clear();
        return <Navigate to="/login" state={{ from: location }} replace />;
      }
      // refresh token exists — let the API call handle the refresh silently
    }

    const userRole = localStorage.getItem("role") || "user";
    const hasMenuAccess = canAccessPath(userRole, location.pathname);

    if (!hasMenuAccess) {
      const firstAllowedPath = getFirstAllowedPathForRole(userRole);

      if (firstAllowedPath && firstAllowedPath !== location.pathname) {
        return (
          <Navigate
            to={firstAllowedPath}
            replace
            state={{ from: location, permissionVersion }}
          />
        );
      }

      return <AccessDenied />;
    }

    // Proceed to render the children if token is valid
    return children;
  } catch (error) {
    console.error("Token validation error:", error);
    localStorage.removeItem("token");
    localStorage.clear();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

};

export default RequireAuth;
