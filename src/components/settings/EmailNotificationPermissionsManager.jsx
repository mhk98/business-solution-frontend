import { Bell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useGetRolePermissionsQuery,
  useUpdateRolePermissionsMutation,
} from "../../features/auth/auth";
import {
  EMAIL_NOTIFICATION_ITEMS,
  ROLE_OPTIONS,
  expandPermissionKeys,
  getStoredRolePermissions,
  isEmailNotificationPermissionKey,
  normalizePermissionKeys,
  saveRolePermissionsForRole,
  saveStoredRolePermissions,
} from "../../utils/navigationPermissions";
import SettingSection from "./SettingSection";

const EmailNotificationPermissionsManager = () => {
  const [selectedPermissionRole, setSelectedPermissionRole] = useState("admin");
  const [rolePermissions, setRolePermissions] = useState(() =>
    getStoredRolePermissions(),
  );

  const currentActorRole = localStorage.getItem("role") || "user";
  const canManagePermissions =
    currentActorRole === "superAdmin" || currentActorRole === "admin";

  const { data: rolePermissionsRes, isLoading } = useGetRolePermissionsQuery(
    undefined,
    { skip: !canManagePermissions },
  );
  const [updateRolePermissions, { isLoading: savingPermissions }] =
    useUpdateRolePermissionsMutation();

  useEffect(() => {
    const backendRows = rolePermissionsRes?.data;
    if (!Array.isArray(backendRows) || !backendRows.length) return;

    const backendPermissionMap = backendRows.reduce((acc, row) => {
      if (!row?.role || !Array.isArray(row?.menuPermissions)) return acc;
      acc[row.role] = row.menuPermissions;
      return acc;
    }, {});

    setRolePermissions((prev) => ({ ...prev, ...backendPermissionMap }));
    saveStoredRolePermissions({
      ...getStoredRolePermissions(),
      ...backendPermissionMap,
    });
  }, [rolePermissionsRes]);

  const selectedRoleKeys = useMemo(
    () => expandPermissionKeys(rolePermissions[selectedPermissionRole] || []),
    [rolePermissions, selectedPermissionRole],
  );

  const selectedEmailNotificationKeys = useMemo(
    () => selectedRoleKeys.filter(isEmailNotificationPermissionKey),
    [selectedRoleKeys],
  );

  const updateSelectedRoleEmailKeys = (nextEmailKeys) => {
    const menuKeys = selectedRoleKeys.filter(
      (key) => !isEmailNotificationPermissionKey(key),
    );

    setRolePermissions((prev) => ({
      ...prev,
      [selectedPermissionRole]: normalizePermissionKeys([
        ...menuKeys,
        ...nextEmailKeys,
      ]),
    }));
  };

  const toggleEmailNotificationPermission = (permissionKey, checked) => {
    const currentEmailKeys = new Set(selectedEmailNotificationKeys);

    if (checked) currentEmailKeys.add(permissionKey);
    else currentEmailKeys.delete(permissionKey);

    updateSelectedRoleEmailKeys(Array.from(currentEmailKeys));
  };

  const handleSavePermissions = async () => {
    try {
      const menuPermissions = rolePermissions[selectedPermissionRole] || [];
      const res = await updateRolePermissions({
        role: selectedPermissionRole,
        menuPermissions,
      }).unwrap();

      const updatedPermissions = res?.data?.menuPermissions || menuPermissions;
      setRolePermissions((prev) => ({
        ...prev,
        [selectedPermissionRole]: updatedPermissions,
      }));
      saveRolePermissionsForRole(selectedPermissionRole, updatedPermissions);
      toast.success(`${selectedPermissionRole} email permissions updated.`);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update email permissions.");
    }
  };

  const handleClearEmailPermissions = () => {
    updateSelectedRoleEmailKeys([]);
  };

  if (!canManagePermissions) {
    return (
      <SettingSection icon={Bell} title="Email Notification Permissions">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-medium text-amber-800">
          You do not have access to manage email notification permissions.
        </div>
      </SettingSection>
    );
  }

  return (
    <SettingSection icon={Bell} title="Email Notification Permissions">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Email Notification Permission Manager
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            কোন role কোন menu/submenu-এর notification email পাবে সেটা এখান থেকে
            control করা যাবে।
          </p>
        </div>

        <div className="w-full sm:w-[220px]">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Select Role
          </label>
          <select
            value={selectedPermissionRole}
            onChange={(e) => setSelectedPermissionRole(e.target.value)}
            className="w-full h-11 border border-slate-200 rounded-xl px-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {EMAIL_NOTIFICATION_ITEMS.map((item) => (
          <label
            key={item.permissionKey}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700"
          >
            <input
              type="checkbox"
              checked={selectedEmailNotificationKeys.includes(
                item.permissionKey,
              )}
              onChange={(event) =>
                toggleEmailNotificationPermission(
                  item.permissionKey,
                  event.target.checked,
                )
              }
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 flex-wrap border-t border-slate-100 pt-5">
        <p className="text-xs text-slate-500">
          Email notification allowed: {selectedEmailNotificationKeys.length}
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClearEmailPermissions}
            disabled={savingPermissions || isLoading}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition disabled:opacity-60"
          >
            Clear Email Permissions
          </button>
          <button
            type="button"
            onClick={handleSavePermissions}
            disabled={savingPermissions || isLoading}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {savingPermissions ? "Saving..." : "Save Permissions"}
          </button>
        </div>
      </div>
    </SettingSection>
  );
};

export default EmailNotificationPermissionsManager;
