import {
  AlertTriangle,
  ChevronDown,
  DatabaseZap,
  Search,
  X,
} from "lucide-react";
import { useLayout } from "../../context/LayoutContext";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { useGetAllLogoQuery } from "../../features/logo/logo";
import { useGetMyRolePermissionsQuery } from "../../features/auth/auth";
import { useHardResetDataMutation } from "../../features/systemReset/systemReset";
import { useCanUseMasterPermission } from "../../utils/masterPermissions";
import { translations } from "../../utils/translations";
import {
  filterSidebarItemsByRole,
  saveRolePermissionsForRole,
  subscribeToPermissionChanges,
} from "../../utils/navigationPermissions";
import toast from "react-hot-toast";
const Tooltip = ({ show, text }) => {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -6 }}
          className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50"
        >
          <div className="px-3 py-2 rounded-lg text-xs font-medium text-white bg-slate-900 border border-slate-700 shadow-xl whitespace-nowrap">
            {text}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

const Sidebar = () => {
  const {
    isSidebarOpen,
    isMobileMenuOpen,
    toggleMobileMenu,
    language,
  } = useLayout();
  const t = translations[language] || translations.EN;
  const [openMenu, setOpenMenu] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // ✅ menu filter
  const [menuQuery, setMenuQuery] = useState("");
  const [permissionVersion, setPermissionVersion] = useState(0);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  );

  const userRole = localStorage.getItem("role") || "user";
  const { canUseMasterPermission } = useCanUseMasterPermission();
  const canHardReset = userRole === "superAdmin" && canUseMasterPermission;
  const { pathname } = useLocation();
  const [hardResetData, { isLoading: isResetting }] =
    useHardResetDataMutation();

  const { data: myPermissionsData } = useGetMyRolePermissionsQuery(undefined, {
    skip: !localStorage.getItem("token"),
  });

  useEffect(() => {
    if (!myPermissionsData?.data?.menuPermissions) return;
    saveRolePermissionsForRole(
      myPermissionsData.data.role,
      myPermissionsData.data.menuPermissions,
    );
  }, [myPermissionsData]);

  const toggleMenu = (name) => setOpenMenu((p) => (p === name ? null : name));
  const pathMatches = useCallback(
    (targetPath) => {
      if (!targetPath) return false;
      const cleanTargetPath = String(targetPath).split("?")[0];
      if (cleanTargetPath === "/") return pathname === "/";
      return (
        pathname === cleanTargetPath ||
        pathname.startsWith(`${cleanTargetPath}/`)
      );
    },
    [pathname],
  );
  const isActive = useCallback(
    (itemOrHref) => {
      if (typeof itemOrHref === "string") return pathMatches(itemOrHref);

      const candidates = [
        itemOrHref?.href,
        ...(itemOrHref?.matchPaths || []),
      ].filter(Boolean);

      return candidates.some((candidate) => pathMatches(candidate));
    },
    [pathMatches],
  );

  // ✅ first role filter
  const roleFiltered = useMemo(() => {
    const filterMasterOnlyItems = (items = []) =>
      items
        .map((item) => {
          if (item.masterOnly && !canUseMasterPermission) return null;
          if (!item.children?.length) return item;

          const children = filterMasterOnlyItems(item.children);
          if (!children.length && item.children.length) return null;
          return { ...item, children };
        })
        .filter(Boolean);

    return filterMasterOnlyItems(filterSidebarItemsByRole(userRole));
  }, [userRole, permissionVersion, canUseMasterPermission]);

  // ✅ then search filter (parent + child)
  const filteredItems = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    if (!q) return roleFiltered;

    return roleFiltered
      .map((item) => {
        if (!item.children) return item;

        const childMatches = item.children.filter((c) => {
          const translatedChild = (t[c.key] || c.name).toLowerCase();
          return (
            c.name.toLowerCase().includes(q) || translatedChild.includes(q)
          );
        });

        return { ...item, children: childMatches };
      })
      .filter((item) => {
        const translatedParent = (t[item.key] || item.name).toLowerCase();
        const parentMatch =
          item.name.toLowerCase().includes(q) || translatedParent.includes(q);

        if (!item.children) return parentMatch;
        if (parentMatch) return true;
        return item.children.length > 0;
      });
  }, [roleFiltered, menuQuery, t]);

  // ✅ auto open first matched parent when searching (no stale state)
  useEffect(() => {
    const q = menuQuery.trim();
    if (!q) return;

    const firstWithChildren = filteredItems.find(
      (x) => x.children && x.children.length,
    );

    if (firstWithChildren) setOpenMenu(firstWithChildren.key);
  }, [menuQuery, filteredItems]);

  useEffect(() => {
    const activeParent = filteredItems.find((item) =>
      item.children?.some((child) => isActive(child)),
    );

    if (activeParent) setOpenMenu(activeParent.key);
  }, [filteredItems, isActive]);

  // ✅ logo
  const [logo, setLogo] = useState("");
  const { data, isLoading, isError, error } = useGetAllLogoQuery();

  useEffect(() => {
    if (isError) console.error("Error:", error);
    if (!isLoading && data) {
      setLogo(data?.data?.file ?? "");
    }
  }, [data, isLoading, isError, error]);

  useEffect(() => {
    return subscribeToPermissionChanges(() =>
      setPermissionVersion((prev) => prev + 1),
    );
  }, []);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const shouldShowExpanded = isDesktop ? isSidebarOpen : true;
  const drawerWidth = shouldShowExpanded ? 280 : 88;

  const handleHardReset = async (mode) => {
    try {
      const result = await hardResetData({ mode }).unwrap();
      toast.success(
        `Hard delete completed. Deleted ${result?.data?.deletedTotal || 0} rows.`,
      );
      setResetModalOpen(false);
    } catch (error) {
      toast.error(error?.data?.message || "Reset failed");
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleMobileMenu}
            className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={`fixed left-0 top-0 bottom-0 z-50 transition-all duration-300 lg:translate-x-0 ${
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        } bg-slate-50 border-r border-slate-200`}
        animate={{ width: drawerWidth }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        style={{ width: drawerWidth }}
      >
        {/* ✅ Light dashboard sidebar shell */}
        <div
          className={`h-full border-r border-slate-200 bg-slate-50 flex flex-col ${
            shouldShowExpanded ? "p-4" : "p-2"
          }`}
        >
          <div className="flex-1 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] flex flex-col overflow-hidden">
            {/* Header */}
            <div
              className={`border-b border-slate-200 ${
                shouldShowExpanded ? "p-4" : "p-2"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white flex items-center justify-center">
                  {isLoading ? (
                    <div className="h-full w-full animate-pulse bg-slate-100 rounded-xl" />
                  ) : logo ? (
                    <img
                      src={`${import.meta.env.VITE_API_URL}/${logo}`}
                      alt="Logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-indigo-50 rounded-xl flex items-center justify-center">
                      <span className="text-indigo-400 text-xs font-bold">
                        K
                      </span>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {shouldShowExpanded ? (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      className="min-w-0 flex-1"
                    >
                      <div className="truncate text-slate-900 font-semibold leading-tight">
                        Kafela Mart
                      </div>
                      <div className="whitespace-nowrap text-[11px] leading-tight text-slate-500">
                        {t.inventory_management}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {/* Mobile Close Button */}
                <button
                  onClick={toggleMobileMenu}
                  className="flex lg:hidden h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 items-center justify-center transition"
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search input (menu filter) */}
              <AnimatePresence>
                {shouldShowExpanded ? (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-4"
                  >
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Search size={16} />
                      </span>

                      <input
                        value={menuQuery}
                        onChange={(e) => setMenuQuery(e.target.value)}
                        placeholder="Search Menu..."
                        className="w-full h-11 pl-9 pr-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    {menuQuery.trim() ? (
                      <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                        <span>
                          Showing results for:{" "}
                          <span className="text-slate-900 font-medium">
                            {menuQuery}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setMenuQuery("")}
                          className="text-indigo-600 hover:text-indigo-700"
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Nav */}
            <nav
              className={`flex-1 overflow-y-auto py-3 sidebar-scroll min-h-0 ${
                shouldShowExpanded ? "px-2" : "px-1"
              }`}
            >
              {filteredItems.length === 0 ? (
                <div className="px-3 py-6 text-sm text-slate-500">
                  No menu found.
                </div>
              ) : null}

              {filteredItems.map((item) => {
                const Icon = item.icon;
                const hasChildren = !!item.children?.length;
                const menuOpen = openMenu === item.key;

                const childActive = hasChildren
                  ? item.children.some((c) => isActive(c))
                  : false;

                const parentActive = !hasChildren
                  ? isActive(item)
                  : childActive;

                const parentBase = `w-full group flex items-center rounded-xl transition relative ${
                  shouldShowExpanded
                    ? "gap-3 px-3 py-3"
                    : "justify-center px-2 py-3"
                }`;

                const parentState = parentActive
                  ? "bg-indigo-50 border border-indigo-100"
                  : "hover:bg-slate-50 border border-transparent";

                return (
                  <div key={item.key} className="mb-2">
                    {/* Menu Item */}
                    <div className="relative">
                      {hasChildren ? (
                        <motion.button
                          onClick={() => toggleMenu(item.key)}
                          onMouseEnter={() => setHovered(item.key)}
                          onMouseLeave={() => setHovered(null)}
                          className={`${parentBase} ${parentState}`}
                          type="button"
                        >
                          <span
                            className={`absolute left-0 top-2 bottom-2 w-1 rounded-full transition ${
                              parentActive ? "bg-indigo-500" : "bg-transparent"
                            }`}
                          />

                          <span
                            className={`h-10 w-10 rounded-xl flex items-center justify-center border transition ${
                              parentActive
                                ? "border-indigo-200 bg-indigo-100"
                                : "border-slate-200 bg-white group-hover:bg-slate-50"
                            }`}
                          >
                            <Icon
                              size={18}
                              className={
                                parentActive
                                  ? "text-indigo-600"
                                  : "text-slate-600"
                              }
                            />
                          </span>

                          {shouldShowExpanded ? (
                            <>
                              <span className="text-sm font-medium text-slate-800 flex-1 text-left">
                                {t[item.key] || item.name}
                              </span>
                              <ChevronDown
                                size={16}
                                className={`text-slate-500 transition-transform ${
                                  menuOpen ? "rotate-180" : ""
                                }`}
                              />
                            </>
                          ) : null}

                          <Tooltip
                            show={!shouldShowExpanded && hovered === item.key}
                            text={t[item.key] || item.name}
                          />
                        </motion.button>
                      ) : (
                        <Link to={item.href}>
                          <motion.div
                            onMouseEnter={() => setHovered(item.key)}
                            onMouseLeave={() => setHovered(null)}
                            className={`${parentBase} ${parentState}`}
                          >
                            <span
                              className={`absolute left-0 top-2 bottom-2 w-1 rounded-full transition ${
                                parentActive
                                  ? "bg-indigo-500"
                                  : "bg-transparent"
                              }`}
                            />

                            <span
                              className={`h-10 w-10 rounded-xl flex items-center justify-center border transition ${
                                parentActive
                                  ? "border-indigo-200 bg-indigo-100"
                                  : "border-slate-200 bg-white group-hover:bg-slate-50"
                              }`}
                            >
                              <Icon
                                size={18}
                                className={
                                  parentActive
                                    ? "text-indigo-600"
                                    : "text-slate-600"
                                }
                              />
                            </span>

                            {shouldShowExpanded ? (
                              <span className="text-sm font-medium text-slate-800">
                                {t[item.key] || item.name}
                              </span>
                            ) : null}

                            <Tooltip
                              show={!shouldShowExpanded && hovered === item.key}
                              text={t[item.key] || item.name}
                            />
                          </motion.div>
                        </Link>
                      )}
                    </div>

                    {/* Submenu */}
                    <AnimatePresence>
                      {hasChildren && menuOpen && shouldShowExpanded ? (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-2 ml-2 pl-4 border-l border-slate-200"
                        >
                          <div className="space-y-1 pb-2">
                            {item.children.map((sub) => {
                              const SubIcon = sub.icon;
                              const activeSub = isActive(sub);

                              return (
                                <Link key={sub.key} to={sub.href}>
                                  <div
                                    className={`group flex items-center gap-2 px-3 py-2 rounded-xl transition border ${
                                      activeSub
                                        ? "bg-indigo-50 border-indigo-100"
                                        : "hover:bg-slate-50 border-transparent"
                                    }`}
                                  >
                                    <span
                                      className={`h-7 w-7 rounded-lg flex items-center justify-center border transition ${
                                        activeSub
                                          ? "border-indigo-200 bg-indigo-100"
                                          : "border-slate-200 bg-white group-hover:bg-slate-50"
                                      }`}
                                    >
                                      {SubIcon ? (
                                        <SubIcon
                                          size={14}
                                          className={
                                            activeSub
                                              ? "text-indigo-600"
                                              : "text-slate-600"
                                          }
                                        />
                                      ) : null}
                                    </span>

                                    <span
                                      className={`text-sm ${
                                        activeSub
                                          ? "text-indigo-700"
                                          : "text-slate-700"
                                      }`}
                                    >
                                      {t[sub.key] || sub.name}
                                    </span>

                                    {activeSub ? (
                                      <span className="ml-auto h-2 w-2 rounded-full bg-indigo-500" />
                                    ) : null}
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200">
              {canHardReset ? (
                <div className="mb-3 relative">
                  <button
                    type="button"
                    onClick={() => setResetModalOpen(true)}
                    onMouseEnter={() => setHovered("system_reset")}
                    onMouseLeave={() => setHovered(null)}
                    className={`w-full group flex items-center rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition ${
                      shouldShowExpanded
                        ? "gap-3 px-3 py-3"
                        : "justify-center px-2 py-3"
                    }`}
                  >
                    <span className="h-10 w-10 rounded-xl flex items-center justify-center border border-rose-200 bg-white">
                      <DatabaseZap size={18} />
                    </span>
                    {shouldShowExpanded ? (
                      <span className="text-sm font-bold">Reset Data</span>
                    ) : null}
                  </button>
                  <Tooltip
                    show={!shouldShowExpanded && hovered === "system_reset"}
                    text="Reset Data"
                  />
                </div>
              ) : null}
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <div className="text-xs text-slate-500">{t.signed_in_as}</div>
                <div className="text-sm font-medium text-slate-900 truncate">
                  {userRole}
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
        .sidebar-scroll::-webkit-scrollbar { width: 5px; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.2); border-radius: 999px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.4); }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>
      </motion.aside>

      <AnimatePresence>
        {resetModalOpen ? (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 12 }}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
                    <AlertTriangle size={20} />
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Hard Delete Data
                    </h3>
                    <p className="text-xs font-semibold text-slate-500">
                      This is permanent and not a soft delete.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="h-10 w-10 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center"
                  disabled={isResetting}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 px-5 py-5">
                <p className="text-sm font-semibold leading-6 text-slate-700">
                  80% data delete করতে চান, না কি all data delete করতে চান?
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleHardReset("eightyPercent")}
                    disabled={isResetting}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-left hover:bg-amber-100 disabled:opacity-60"
                  >
                    <div className="text-sm font-black text-amber-800">
                      Delete 80%
                    </div>
                    <div className="mt-1 text-xs font-semibold text-amber-700">
                      Previous 80% business data hard delete হবে।
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleHardReset("all")}
                    disabled={isResetting}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-left hover:bg-rose-100 disabled:opacity-60"
                  >
                    <div className="text-sm font-black text-rose-800">
                      Delete All
                    </div>
                    <div className="mt-1 text-xs font-semibold text-rose-700">
                      সব business data hard delete হবে।
                    </div>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  disabled={isResetting}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
