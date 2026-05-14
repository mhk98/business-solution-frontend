import { ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  useGetRolePermissionsQuery,
  useUpdateRolePermissionsMutation,
} from "../../features/auth/auth";
import {
  ROLE_OPTIONS,
  SIDEBAR_ITEMS,
  expandPermissionKeys,
  getStoredRolePermissions,
  normalizePermissionKeys,
  saveRolePermissionsForRole,
  saveStoredRolePermissions,
} from "../../utils/navigationPermissions";
import SettingSection from "./SettingSection";

const RolePermissionsManager = () => {
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
    () =>
      expandPermissionKeys(rolePermissions[selectedPermissionRole] || []),
    [rolePermissions, selectedPermissionRole],
  );

  const togglePermission = (item, checked) => {
    const currentKeys = new Set(selectedRoleKeys);

    const applyChildren = (menuItem, value) => {
      const normalizedKey = normalizePermissionKeys([menuItem.key])[0];
      const expandedKeys = expandPermissionKeys([menuItem.key]);

      if (value) currentKeys.add(normalizedKey);
      else expandedKeys.forEach((key) => currentKeys.delete(key));

      menuItem.children?.forEach((child) => applyChildren(child, value));
    };

    applyChildren(item, checked);

    setRolePermissions((prev) => ({
      ...prev,
      [selectedPermissionRole]: normalizePermissionKeys(Array.from(currentKeys)),
    }));
  };

  const handleSaveRolePermissions = async () => {
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
      toast.success(`${selectedPermissionRole} permissions updated.`);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to update permissions.");
    }
  };

  const handleClearRolePermissions = async () => {
    try {
      const res = await updateRolePermissions({
        role: selectedPermissionRole,
        menuPermissions: [],
      }).unwrap();

      const updatedPermissions = res?.data?.menuPermissions || [];
      setRolePermissions((prev) => ({
        ...prev,
        [selectedPermissionRole]: updatedPermissions,
      }));
      saveRolePermissionsForRole(selectedPermissionRole, updatedPermissions);
      toast.success(`${selectedPermissionRole} permissions cleared.`);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to clear permissions.");
    }
  };

  if (!canManagePermissions) {
    return (
      <SettingSection icon={ShieldCheck} title="Role Permissions">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-medium text-amber-800">
          You do not have access to manage role permissions.
        </div>
      </SettingSection>
    );
  }

  return (
    <SettingSection icon={ShieldCheck} title="Role Permissions">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Role Permission Manager
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Admin বা Super Admin role অনুযায়ী কোন menu/submenu দেখা যাবে সেটা
            এখান থেকে control করতে পারবে।
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {SIDEBAR_ITEMS.map((item) => {
          const parentChecked = selectedRoleKeys.includes(item.key);

          return (
            <div
              key={item.key}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
            >
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={parentChecked}
                  onChange={(e) => togglePermission(item, e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-semibold text-slate-900">
                  {item.name}
                </span>
              </label>

              {item.children?.length ? (
                <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                  {item.children.map((child) => (
                    <label
                      key={child.key}
                      className="flex items-center gap-3 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoleKeys.includes(child.key)}
                        onChange={(e) =>
                          togglePermission(child, e.target.checked)
                        }
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{child.name}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 flex-wrap border-t border-slate-100 pt-5">
        <p className="text-xs text-slate-500">
          Current allowed count: {selectedRoleKeys.length}
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClearRolePermissions}
            disabled={savingPermissions || isLoading}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition disabled:opacity-60"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={handleSaveRolePermissions}
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

export default RolePermissionsManager;
