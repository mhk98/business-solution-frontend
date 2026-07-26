import { useMemo } from "react";
import { useGetMyMasterPermissionQuery } from "../features/masterPermission/masterPermission";

export const DEFAULT_MASTER_PERMISSION_EMAIL = "ndhrubotara7@gmail.com";

export const normalizePermissionEmail = (email) =>
  String(email || "").trim().toLowerCase();

export const getStoredAuthUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "{}");
  } catch {
    return {};
  }
};

export const getCurrentUserEmail = () => {
  const authUser = getStoredAuthUser();
  return normalizePermissionEmail(
    authUser?.Email || authUser?.email || localStorage.getItem("email") || "",
  );
};

export const isDefaultMasterPermissionEmail = (email = getCurrentUserEmail()) =>
  normalizePermissionEmail(email) === DEFAULT_MASTER_PERMISSION_EMAIL;

export const useCanUseMasterPermission = () => {
  const hasToken =
    typeof window !== "undefined" && Boolean(localStorage.getItem("token"));
  const currentUserEmail = useMemo(() => getCurrentUserEmail(), []);
  const fallbackAllowed = isDefaultMasterPermissionEmail(currentUserEmail);
  const { data, isLoading } = useGetMyMasterPermissionQuery(undefined, {
    skip: !hasToken,
  });

  return {
    canUseMasterPermission:
      fallbackAllowed || Boolean(data?.data?.canManageMasterPermission),
    isLoadingMasterPermission: isLoading,
    currentUserEmail,
  };
};
