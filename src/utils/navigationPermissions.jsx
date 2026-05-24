import {
  LayoutDashboard,
  Users,
  UserCog,
  BadgeDollarSign,
  Store,
  Warehouse,
  Package,
  ShoppingBag,
  RotateCcw,
  Truck,
  ClipboardList,
  TriangleAlert,
  Wrench,
  Megaphone,
  BarChart3,
  Wallet,
  HandCoins,
  Bell,
  Settings,
  Image,
  ShieldCheck,
  Boxes,
  User,
  ClipboardCheck,
  PackagePlus,
  PackageSearch,
  PackageX,
  ScanSearch,
  SlidersHorizontal,
  FlaskConical,
  Cog,
  RefreshCcw,
  ReceiptText,
  BookMarked,
  BadgePercent,
  BadgeCheck,
  CircleDollarSign,
  Factory,
  History,
  CalendarDays,
  CreditCard,
  Fingerprint,
  WalletCards,
} from "lucide-react";

export const ROLE_OPTIONS = [
  { value: "superAdmin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "marketer", label: "Marketer" },
  { value: "leader", label: "Leader" },
  { value: "inventor", label: "Inventor" },
  { value: "accountant", label: "Accountant" },
  { value: "logistics", label: "Logistics" },
  { value: "up", label: "UP" },
  { value: "cs", label: "CS" },
  { value: "staff", label: "Staff" },
  { value: "employee", label: "Employee" },
  { value: "user", label: "User" },
];

const DEFAULT_ROLE_PERMISSION_MAP = {
  superAdmin: [
    "user_management",
    "assets",
    "assets_stock",
    "requisition",
    "purchase",
    "sale",
    "damage",
    "marketing",
    "dm_expense",
    "ads_campaign_kpi",
    "profit_loss",
    "auto_profit_loss",
    "profit_loss_user",
    "manufacture",
    "item",
    "manufacture_stock",
    "manufacture_menu",
    "stock_adjustment",
    "mixer",
    "inventory",
    "inventory_overview",
    "stock_product",
    "stock_alert",
    "warehouse",
    "supplier",
    "product",
    "purchase_requisition",
    "received_product",
    "received_return",
    "intransit_product",
    "sales_return",
    "damage_management",
    "damage_stock",
    "damage_product",
    "damage_repairing_stock",
    "damage_repairing",
    "damage_repaired",
    "pos_panel",
    "sell",
    "pos_report",
    "accounting",
    "accounting_supplier",
    "book",
    "petty_cash_requisition",
    "petty_cash",
    "loan",
    "credit_ledger",
    "log_history",
    "notifications",
    "tasks",
    "settings",
    "logo",
    "notice",
    "cod_change",
    "cod_charge",
    "delivery_advance",
    "delivery_charge",
    "role_permissions",
    "hrm",
    "employee_management",
    "department_management",
    "designation_management",
    "team_management",
    "shift_management",
    "holiday_management",
    "attendance",
    "attendance_device",
    "attendance",
    "leave_management",
    "cs_work_reports",
    "logistic_work_reports",
    "payroll_management",
    "payslip",
    "hr_payroll",
    "employee_list",
    "employee_kpi",
    "payroll",
    "payroll_fine",
    "expired_product",
    "profile",
  ],
  admin: [
    "user_management",
    "assets",
    "assets_stock",
    "requisition",
    "purchase",
    "sale",
    "damage",
    "marketing",
    "dm_expense",
    "ads_campaign_kpi",
    "profit_loss",
    "auto_profit_loss",
    "profit_loss_user",
    "manufacture",
    "manufacture_menu",
    "manufacture_stock",
    "stock_adjustment",
    "mixer",
    "inventory",
    "inventory_overview",
    "stock_product",
    "stock_alert",
    "warehouse",
    "supplier",
    "product",
    "purchase_requisition",
    "received_product",
    "received_return",
    "intransit_product",
    "sales_return",
    "damage_management",
    "damage_stock",
    "damage_product",
    "damage_repairing_stock",
    "damage_repairing",
    "damage_repaired",
    "accounting",
    "accounting_supplier",
    "book",
    "petty_cash_requisition",
    "petty_cash",
    "loan",
    "credit_ledger",
    "log_history",
    "notifications",
    "tasks",
    "settings",
    "logo",
    "notice",
    "cod_change",
    "cod_charge",
    "delivery_advance",
    "delivery_charge",
    "role_permissions",
    "hrm",
    "employee_management",
    "department_management",
    "designation_management",
    "team_management",
    "shift_management",
    "holiday_management",
    "attendance",
    "attendance_device",
    "attendance",
    "leave_management",
    "cs_work_reports",
    "logistic_work_reports",
    "payroll_management",
    "payslip",
    "hr_payroll",
    "employee_list",
    "employee_kpi",
    "payroll",
    "payroll_fine",
    "profile",
  ],
  marketer: [
    "marketing",
    "dm_expense",
    "ads_campaign_kpi",
    "profit_loss",
    "auto_profit_loss",
    "profit_loss_user",
    "notifications",
    "tasks",
    "profile",
  ],
  leader: [
    "requisition",
    "purchase",
    "sale",
    "profit_loss",
    "profit_loss_user",
    "notifications",
    "tasks",
    "profile",
  ],
  inventor: [
    "assets",
    "assets_stock",
    "inventory",
    "inventory_overview",
    "stock_product",
    "stock_alert",
    "manufacture",
    "manufacture_menu",
    "manufacture_stock",
    "stock_adjustment",
    "mixer",
    "product",
    "item",
    "purchase_requisition",
    "received_product",
    "received_return",
    "intransit_product",
    "sales_return",
    "damage_management",
    "damage_stock",
    "damage_product",
    "damage_repairing_stock",
    "damage_repairing",
    "damage_repaired",
    "warehouse",
    "supplier",
    "profit_loss",
    "profit_loss_user",
    "notifications",
    "tasks",
    "profile",
  ],
  accountant: [
    "profit_loss",
    "profit_loss_user",
    "accounting",
    "accounting_supplier",
    "book",
    "petty_cash_requisition",
    "petty_cash",
    "loan",
    "credit_ledger",
    "log_history",
    "hrm",
    "employee_management",
    "department_management",
    "designation_management",
    "team_management",
    "shift_management",
    "holiday_management",
    "attendance",
    "attendance_device",
    "attendance",
    "leave_management",
    "cs_work_reports",
    "logistic_work_reports",
    "payroll_management",
    "payslip",
    "hr_payroll",
    "employee_list",
    "employee_kpi",
    "payroll",
    "payroll_fine",
    "profit_loss_user",
    "notifications",
    "tasks",
    "profile",
  ],
  employee: [
    "hrm",
    "employee_profile",
    "cs_work_reports",
    "logistic_work_reports",
    "notifications",
    "tasks",
    "profile",
  ],
  logistics: [
    "logistic_work_reports",
    "notifications",
    "tasks",
    "profile",
  ],
  up: ["notifications", "tasks", "profile"],
  cs: ["cs_work_reports", "notifications", "tasks", "profile"],
  staff: ["notifications", "tasks", "profile"],
  user: ["tasks", "profile"],
};

export const SIDEBAR_ITEMS = [
  {
    name: "Overview",
    key: "overview",
    icon: LayoutDashboard,
    color: "#6366f1",
    href: "/",
    roles: [
      "superAdmin",
      "admin",
      "manager",
      "accountant",
      "inventor",
      "marketer",
      "leader",
    ],
  },

  {
    name: "Assets",
    key: "assets",
    icon: ShieldCheck,
    color: "#ec4899",
    roles: ["superAdmin", "admin", "inventor"],
    children: [
      {
        name: "Assets Stock",
        key: "assets_stock",
        icon: Boxes,
        href: "/assets-stock",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Requisition",
        key: "requisition",
        icon: ClipboardList,
        href: "/assets-requisition",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Purchase",
        key: "purchase",
        icon: ClipboardCheck,
        href: "/assets-purchase",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Sale",
        key: "sale",
        icon: BadgeDollarSign,
        href: "/assets-sale",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Damage",
        key: "damage",
        icon: TriangleAlert,
        href: "/assets-damage",
        roles: ["superAdmin", "admin", "inventor"],
      },
    ],
  },
  {
    name: "Marketing",
    key: "marketing",
    icon: Megaphone,
    color: "#f97316",
    roles: ["superAdmin", "admin", "marketer"],
    children: [
      {
        name: "DM Expense",
        key: "dm_expense",
        icon: Megaphone,
        color: "#f97316",
        href: "/marketing-book",
        matchPaths: ["/marketing-book"],
        roles: ["superAdmin", "admin", "marketer"],
      },
      {
        name: "Ads Campaign KPI",
        key: "ads_campaign_kpi",
        icon: BarChart3,
        color: "#f97316",
        href: "/ads-campaign-kpi",
        roles: ["superAdmin", "admin", "marketer"],
      },
      {
        name: "Daily Profit & Loss By Product",
        key: "profit_loss",
        icon: BarChart3,
        color: "#f97316",
        href: "/profit-loss",
        roles: ["superAdmin", "admin", "marketer"],
      },
      {
        name: "Auto Profit & Loss",
        key: "auto_profit_loss",
        icon: BarChart3,
        color: "#f97316",
        href: "/auto-profit-loss",
        matchPaths: ["/auto-profit-loss"],
        roles: ["superAdmin", "admin", "marketer"],
      },
      {
        name: "Daily Profit & Loss By User",
        key: "profit_loss_user",
        icon: BarChart3,
        color: "#f97316",
        href: "/profit-loss-user",
        roles: ["superAdmin", "admin", "marketer"],
      },
    ],
  },
  {
    name: "Manufacture",
    key: "manufacture",
    icon: Factory,
    color: "#8b5cf6",
    roles: ["superAdmin", "admin", "inventor"],
    children: [
      {
        name: "Item",
        key: "item",
        icon: PackagePlus,
        href: "/item",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Manufacture Stock",
        key: "manufacture_stock",
        icon: Boxes,
        href: "/manufacture-stock",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Manufacture",
        key: "manufacture_menu",
        icon: Cog,
        href: "/manufacture",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Stock Adjustment",
        key: "stock_adjustment",
        icon: SlidersHorizontal,
        href: "/stock-adjustment",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Mixer",
        key: "mixer",
        icon: FlaskConical,
        href: "/mixer",
        roles: ["superAdmin", "admin"],
      },
    ],
  },
  {
    name: "Inventory",
    key: "inventory",
    icon: Boxes,
    color: "#8b5cf6",
    roles: ["superAdmin", "admin", "inventor"],
    children: [
      {
        name: "Overview",
        key: "inventory_overview",
        icon: LayoutDashboard,
        href: "/inventory-overview",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Stock Product",
        key: "stock_product",
        icon: PackageSearch,
        href: "/stock-product",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Stock Alert",
        key: "stock_alert",
        icon: TriangleAlert,
        href: "/stock-alert",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Warehouse",
        key: "warehouse",
        icon: Warehouse,
        href: "/warehouse",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Supplier",
        key: "supplier",
        icon: Truck,
        href: "/supplier",
        matchPaths: ["/supplier-history"],
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Product",
        key: "product",
        icon: Package,
        href: "/products",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Purchase Requisition",
        key: "purchase_requisition",
        icon: ClipboardList,
        href: "/purchase-requisition",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Purchase Product",
        key: "received_product",
        icon: PackagePlus,
        href: "/purchase-product",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Purchase Return Product",
        key: "received_return",
        icon: RefreshCcw,
        href: "/purchase-return",
        roles: ["superAdmin", "admin", "inventor"],
      },

      {
        name: "Intransit Product",
        key: "intransit_product",
        icon: ScanSearch,
        href: "/intransit-product",
        roles: ["superAdmin", "admin", "inventor"],
      },

      {
        name: "Sales Return",
        key: "sales_return",
        icon: RotateCcw,
        href: "/sales-return",
        roles: ["superAdmin", "admin", "inventor"],
      },
    ],
  },
  {
    name: "Damage Management",
    key: "damage_management",
    icon: Boxes,
    color: "#8b5cf6",
    roles: ["superAdmin", "admin", "inventor"],
    children: [
      {
        name: "Damage stock",
        key: "damage_stock",
        icon: PackageX,
        href: "/damage-stock",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Damage Product",
        key: "damage_product",
        icon: TriangleAlert,
        href: "/damage-product",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Damage Repairing Stock",
        key: "damage_repairing_stock",
        icon: Wrench,
        href: "/damage-repairing-stock",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Damage Repairing",
        key: "damage_repairing",
        icon: Wrench,
        href: "/damage-repair",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Damage Repaired",
        key: "damage_repaired",
        icon: Wrench,
        href: "/damage-repaired",
        roles: ["superAdmin", "admin", "inventor"],
      },
    ],
  },
  {
    name: "Pos",
    key: "pos_panel",
    icon: Store,
    color: "#f97316",
    roles: ["superAdmin", "admin", "inventor"],
    children: [
      {
        name: "Sell",
        key: "sell",
        icon: ShoppingBag,
        href: "/pos-sell",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Pos Report",
        key: "pos_report",
        icon: ReceiptText,
        href: "/pos-report",
        roles: ["superAdmin", "admin", "inventor"],
      },
    ],
  },
  {
    name: "Accounting",
    key: "accounting",
    icon: Wallet,
    color: "#3b82f6",
    roles: ["superAdmin", "admin", "accountant"],
    children: [
      {
        name: "Supplier",
        key: "accounting_supplier",
        icon: Truck,
        href: "/supplier",
        matchPaths: ["/supplier-history"],
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Purchase Requisition",
        key: "purchase_requisition",
        icon: ClipboardList,
        href: "/purchase-requisition",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Book",
        key: "book",
        icon: BookMarked,
        href: "/book",
        matchPaths: ["/book"],
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Petty Cash Requisition",
        key: "petty_cash_requisition",
        icon: HandCoins,
        href: "/petty-cash-requisition",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Petty Cash",
        key: "petty_cash",
        icon: HandCoins,
        href: "/petty-cash",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Loan",
        key: "loan",
        icon: HandCoins,
        href: "/loan",
        matchPaths: ["/loan/"],
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Credit Ledger",
        key: "credit_ledger",
        icon: ReceiptText,
        href: "/credit-ledger",
        roles: ["superAdmin", "admin", "accountant"],
      },
    ],
  },
  {
    name: "Log History",
    key: "log_history",
    icon: History,
    color: "#0f766e",
    href: "/log-history",
    roles: ["superAdmin", "admin", "accountant"],
  },
  {
    name: "Notifications",
    key: "notifications",
    icon: Bell,
    color: "#60a5fa",
    href: "/notifications",
    roles: [
      "superAdmin",
      "admin",
      "marketer",
      "leader",
      "inventor",
      "accountant",
      "staff",
      "user",
    ],
  },
  {
    name: "Tasks",
    key: "tasks",
    icon: ClipboardList,
    color: "#4f46e5",
    href: "/tasks",
    roles: [
      "superAdmin",
      "admin",
      "marketer",
      "leader",
      "inventor",
      "accountant",
      "staff",
      "employee",
      "user",
    ],
  },
  {
    name: "Settings",
    key: "settings",
    icon: Settings,
    color: "#60a5fa",
    roles: ["superAdmin", "admin"],
    children: [
      {
        name: "Logo",
        key: "logo",
        icon: Image,
        href: "/logo",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Notice",
        key: "notice",
        icon: Megaphone,
        href: "/settings/notice",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "COD Change",
        key: "cod_change",
        icon: WalletCards,
        href: "/settings/cod-change",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "COD Charge",
        key: "cod_charge",
        icon: WalletCards,
        href: "/settings/cod-charge",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Delivery Advance",
        key: "delivery_advance",
        icon: CreditCard,
        href: "/settings/delivery-advance",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Delivery Charge",
        key: "delivery_charge",
        icon: Truck,
        href: "/settings/delivery-charge",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "User Management",
        key: "user_management",
        icon: Users,
        color: "#22c55e",
        href: "/user-management",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Role Permissions",
        key: "role_permissions",
        icon: ShieldCheck,
        href: "/settings/role-permissions",
        roles: ["superAdmin", "admin"],
      },
    ],
  },
  {
    name: "HRM",
    key: "hrm",
    icon: UserCog,
    color: "#ec4899",
    roles: ["superAdmin", "admin", "accountant", "employee"],
    children: [
      // {
      //   name: "Employee Profile",
      //   key: "employee_profile",
      //   icon: BadgeCheck,
      //   href: "/employee-profile",
      //   roles: ["superAdmin", "admin", "employee"],
      // },
      // {
      //   name: "Employee Master",
      //   key: "employee_management",
      //   icon: BadgeCheck,
      //   href: "/employee-master",
      //   roles: ["superAdmin", "admin", "accountant"],
      // },

      {
        name: "Departments",
        key: "department_management",
        icon: Users,
        href: "/hrm/departments",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Designations",
        key: "designation_management",
        icon: BadgeCheck,
        href: "/hrm/designations",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Team",
        key: "team_management",
        icon: Users,
        href: "/hrm/teams",
        roles: ["superAdmin", "admin", "accountant"],
      },

      // {
      //   name: "Shifts",
      //   key: "shift_management",
      //   icon: ClipboardCheck,
      //   href: "/hrm/shifts",
      //   roles: ["superAdmin", "admin", "accountant"],
      // },
      // {
      //   name: "Holidays",
      //   key: "holiday_management",
      //   icon: Bell,
      //   href: "/hrm/holidays",
      //   roles: ["superAdmin", "admin", "accountant"],
      // },
      // {
      //   name: "Attendance Devices",
      //   key: "attendance_device",
      //   icon: Settings,
      //   href: "/hrm/attendance-devices",
      //   roles: ["superAdmin", "admin", "accountant"],
      // },
      // {
      //   name: "Attendance Enrollments",
      //   key: "attendance",
      //   icon: Fingerprint,
      //   href: "/hrm/attendance-enrollments",
      //   roles: ["superAdmin", "admin", "accountant"],
      // },
      // {
      //   name: "Attendance Logs",
      //   key: "attendance",
      //   icon: ClipboardCheck,
      //   href: "/hrm/attendance-logs",
      //   roles: ["superAdmin", "admin", "accountant"],
      // },
      // {
      //   name: "Attendance Summaries",
      //   key: "attendance",
      //   icon: BadgeCheck,
      //   href: "/hrm/attendance-summaries",
      //   roles: ["superAdmin", "admin", "accountant"],
      // },
      // {
      //   name: "Attendance Regularizations",
      //   key: "attendance",
      //   icon: RefreshCcw,
      //   href: "/hrm/attendance-regularizations",
      //   roles: ["superAdmin", "admin", "accountant", "employee"],
      // },
      // {
      //   name: "Leave Types",
      //   key: "leave_management",
      //   icon: CalendarDays,
      //   href: "/hrm/leave-types",
      //   roles: ["superAdmin", "admin", "accountant"],
      // },
      // {
      //   name: "Leave Requests",
      //   key: "leave_management",
      //   icon: ClipboardList,
      //   href: "/hrm/leave-requests",
      //   roles: ["superAdmin", "admin", "accountant", "employee"],
      // },

      {
        name: "Daily Work Reports",
        key: "daily_work_reports",
        icon: ClipboardList,
        href: "/hrm/daily-work-reports",
        roles: ["superAdmin", "admin", "accountant", "employee"],
      },
      {
        name: "CS Work Reports",
        key: "cs_work_reports",
        icon: ClipboardCheck,
        href: "/hrm/employee-work-reports",
        roles: ["superAdmin", "admin", "accountant", "employee"],
      },
      {
        name: "Logistic Work Reports",
        key: "logistic_work_reports",
        icon: ClipboardList,
        href: "/hrm/logistic-work-reports",
        roles: ["superAdmin", "admin", "accountant", "employee"],
      },
    ],
  },
  {
    name: "Payroll",
    key: "hr_payroll",
    icon: CircleDollarSign,
    color: "#16a34a",
    roles: ["superAdmin", "admin", "accountant", "employee"],
    children: [
      // {
      //   name: "Payroll Runs",
      //   key: "payroll_management",
      //   icon: CircleDollarSign,
      //   href: "/hrm/payroll-runs",
      //   roles: ["superAdmin", "admin", "accountant"],
      // },
      // {
      //   name: "Payslips",
      //   key: "payslip",
      //   icon: ReceiptText,
      //   href: "/hrm/payslips",
      //   roles: ["superAdmin", "admin", "accountant", "employee"],
      // },
      {
        name: "Employee List",
        key: "employee_list",
        icon: BadgeCheck,
        color: "#22c55e",
        href: "/employee-list",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Employee KPI",
        key: "employee_kpi",
        icon: BadgeCheck,
        color: "#22c55e",
        href: "/employee-kpi",
        roles: ["superAdmin", "admin", "employee"],
      },
      {
        name: "Payroll",
        key: "payroll",
        icon: CircleDollarSign,
        href: "/employee",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Payroll Fine",
        key: "payroll_fine",
        icon: BadgePercent,
        href: "/salary",
        roles: ["superAdmin", "admin", "accountant"],
      },
    ],
  },
  {
    name: "Expire Product",
    key: "expired_product",
    icon: TriangleAlert,
    color: "#ef4444",
    href: "/expired-product",
    roles: ["superAdmin", "admin"],
  },
  {
    name: "Profile",
    key: "profile",
    icon: User,
    color: "#60a5fa",
    href: "/profile",
    roles: [
      "superAdmin",
      "admin",
      "marketer",
      "leader",
      "inventor",
      "accountant",
      "staff",
      "user",
    ],
  },
];

const STORAGE_KEY = "roleMenuPermissions";
const OVERVIEW_DEFAULT_REMOVED_STORAGE_KEY = "overview-default-permission-removed";
const DAILY_WORK_REPORTS_DEFAULT_REMOVED_STORAGE_KEY =
  "daily-work-reports-default-permission-removed";
const PERMISSION_EVENT = "role-permissions-updated";
const PERMISSION_KEY_ALIASES = {
  employee_profile: "employee_list",
};

const ROLES_WITH_LEGACY_DAILY_WORK_REPORTS_DEFAULT = new Set([
  "superAdmin",
  "admin",
  "accountant",
  "up",
]);

const LEGACY_PERMISSION_EXPANSIONS = {
  department_designation: ["department_management", "designation_management"],
};

const getCanonicalPermissionKey = (key) => PERMISSION_KEY_ALIASES[key] || key;

const flattenSidebarKeys = (items = []) =>
  items.flatMap((item) => [
    item.key,
    ...(item.children ? flattenSidebarKeys(item.children) : []),
  ]);

export const KNOWN_MENU_PERMISSION_KEYS = new Set([
  ...Object.values(DEFAULT_ROLE_PERMISSION_MAP).flat(),
  ...flattenSidebarKeys(SIDEBAR_ITEMS),
  ...Object.keys(PERMISSION_KEY_ALIASES),
  ...Object.values(PERMISSION_KEY_ALIASES),
  ...Object.keys(LEGACY_PERMISSION_EXPANSIONS),
]);

export const expandPermissionKeys = (keys = []) => {
  const expanded = new Set();

  keys.forEach((key) => {
    if (!key) return;

    expanded.add(key);

    const canonicalKey = getCanonicalPermissionKey(key);
    expanded.add(canonicalKey);

    LEGACY_PERMISSION_EXPANSIONS[key]?.forEach((expandedKey) =>
      expanded.add(expandedKey),
    );

    Object.entries(PERMISSION_KEY_ALIASES).forEach(([aliasKey, targetKey]) => {
      if (targetKey === canonicalKey) {
        expanded.add(aliasKey);
      }
    });
  });

  return Array.from(expanded);
};

export const normalizePermissionKeys = (keys = []) =>
  Array.from(
    new Set(
      keys
        .filter(Boolean)
        .map((key) => `${key}`.trim())
        .map((key) => getCanonicalPermissionKey(key))
        .filter((key) => KNOWN_MENU_PERMISSION_KEYS.has(key)),
    ),
  );

export const DEFAULT_ROLE_PERMISSIONS = ROLE_OPTIONS.reduce((acc, role) => {
  acc[role.value] = normalizePermissionKeys(
    DEFAULT_ROLE_PERMISSION_MAP[role.value] || [],
  );
  return acc;
}, {});

const normalizeRolePermissionMap = (value) => {
  if (!value || typeof value !== "object") return {};

  return Object.entries(value).reduce((acc, [role, keys]) => {
    if (!Array.isArray(keys)) return acc;
    const normalizedKeys = new Set(normalizePermissionKeys(keys));

    // Migrate older stored permission sets after the submenu key rename.
    if (normalizedKeys.has("settings")) {
      const defaultKeys = DEFAULT_ROLE_PERMISSION_MAP[role] || [];
      if (defaultKeys.includes("role_permissions")) {
        normalizedKeys.add("role_permissions");
      }
      if (defaultKeys.includes("notice")) {
        normalizedKeys.add("notice");
      }
      if (defaultKeys.includes("cod_change")) {
        normalizedKeys.add("cod_change");
      }
      if (defaultKeys.includes("cod_charge")) {
        normalizedKeys.add("cod_charge");
      }
      if (defaultKeys.includes("delivery_advance")) {
        normalizedKeys.add("delivery_advance");
      }
      if (defaultKeys.includes("delivery_charge")) {
        normalizedKeys.add("delivery_charge");
      }
    }

    const defaultKeys = DEFAULT_ROLE_PERMISSION_MAP[role] || [];
    if (defaultKeys.includes("tasks")) {
      normalizedKeys.add("tasks");
    }

    if (defaultKeys.includes("ads_campaign_kpi")) {
      normalizedKeys.add("ads_campaign_kpi");
    }

    if (defaultKeys.includes("auto_profit_loss")) {
      normalizedKeys.add("auto_profit_loss");
    }

    if (defaultKeys.includes("stock_alert")) {
      normalizedKeys.add("stock_alert");
    }

    if (defaultKeys.includes("loan")) {
      normalizedKeys.add("loan");
    }

    if (defaultKeys.includes("cs_work_reports")) {
      normalizedKeys.add("cs_work_reports");
    }

    if (defaultKeys.includes("logistic_work_reports")) {
      normalizedKeys.add("logistic_work_reports");
    }

    if (normalizedKeys.has("department_designation")) {
      normalizedKeys.add("department_management");
      normalizedKeys.add("designation_management");
    }

    if (defaultKeys.includes("team_management")) {
      normalizedKeys.add("team_management");
    }

    const payrollChildKeys = [
      "payroll_management",
      "payslip",
      "payroll",
      "payroll_fine",
    ];

    if (payrollChildKeys.some((key) => normalizedKeys.has(key))) {
      normalizedKeys.add("hr_payroll");
    }

    acc[role] = Array.from(normalizedKeys);
    return acc;
  }, {});
};

const removeOverviewPermissionFromMap = (permissionMap = {}) =>
  Object.entries(permissionMap).reduce((acc, [role, keys]) => {
    acc[role] = Array.isArray(keys)
      ? keys.filter((key) => getCanonicalPermissionKey(key) !== "overview")
      : keys;
    return acc;
  }, {});

const removeDailyWorkReportsPermissionFromMap = (permissionMap = {}) =>
  Object.entries(permissionMap).reduce((acc, [role, keys]) => {
    acc[role] = ROLES_WITH_LEGACY_DAILY_WORK_REPORTS_DEFAULT.has(role) &&
      Array.isArray(keys)
      ? keys.filter(
          (key) => getCanonicalPermissionKey(key) !== "daily_work_reports",
        )
      : keys;
    return acc;
  }, {});

const migrateStoredOverviewDefaultPermission = () => {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(OVERVIEW_DEFAULT_REMOVED_STORAGE_KEY)) return;

  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (parsed && typeof parsed === "object") {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(removeOverviewPermissionFromMap(parsed)),
      );
    }
  } catch (error) {
    console.error("Failed to migrate overview menu permission", error);
  } finally {
    localStorage.setItem(OVERVIEW_DEFAULT_REMOVED_STORAGE_KEY, "true");
  }
};

const migrateStoredDailyWorkReportsDefaultPermission = () => {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(DAILY_WORK_REPORTS_DEFAULT_REMOVED_STORAGE_KEY)) {
    return;
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (parsed && typeof parsed === "object") {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(removeDailyWorkReportsPermissionFromMap(parsed)),
      );
    }
  } catch (error) {
    console.error(
      "Failed to migrate daily work reports menu permission",
      error,
    );
  } finally {
    localStorage.setItem(
      DAILY_WORK_REPORTS_DEFAULT_REMOVED_STORAGE_KEY,
      "true",
    );
  }
};

export const getStoredRolePermissions = () => {
  if (typeof window === "undefined") return {};

  try {
    migrateStoredOverviewDefaultPermission();
    migrateStoredDailyWorkReportsDefaultPermission();
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return normalizeRolePermissionMap(parsed);
  } catch (error) {
    console.error("Failed to parse stored role permissions", error);
    return {};
  }
};

export const saveStoredRolePermissions = (permissionMap) => {
  if (typeof window === "undefined") return;

  const normalized = normalizeRolePermissionMap(permissionMap);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(PERMISSION_EVENT));
};

export const saveRolePermissionsForRole = (role, menuPermissions = []) => {
  const current = getStoredRolePermissions();
  saveStoredRolePermissions({
    ...current,
    [role]: normalizePermissionKeys(menuPermissions),
  });
};

export const getAllowedKeysForRole = (role) => {
  const stored = getStoredRolePermissions();
  return new Set(expandPermissionKeys(stored[role] || []));
};

export const isItemAllowed = (item, allowedKeys) => {
  if (!allowedKeys.has(item.key)) return false;

  if (!item.children?.length) return true;

  return item.children.some((child) => isItemAllowed(child, allowedKeys));
};

export const filterSidebarItemsByRole = (role, items = SIDEBAR_ITEMS) => {
  const allowedKeys = getAllowedKeysForRole(role);

  return items.reduce((acc, item) => {
    if (!allowedKeys.has(item.key)) return acc;

    if (!item.children?.length) {
      acc.push(item);
      return acc;
    }

    const visibleChildren = item.children.filter((child) =>
      isItemAllowed(child, allowedKeys),
    );

    if (visibleChildren.length > 0) {
      acc.push({ ...item, children: visibleChildren });
    }

    return acc;
  }, []);
};

const flattenItems = (items = SIDEBAR_ITEMS) =>
  items.flatMap((item) => [
    item,
    ...(item.children ? flattenItems(item.children) : []),
  ]);

const pathMatches = (pathname, targetPath) => {
  if (!targetPath || !pathname) return false;
  if (targetPath === "/") return pathname === "/";
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
};

export const canAccessPath = (role, pathname) => {
  const allItems = flattenItems();
  const matchedItem = allItems.find((item) => {
    const candidates = [item.href, ...(item.matchPaths || [])].filter(Boolean);
    return candidates.some((candidate) => pathMatches(pathname, candidate));
  });

  if (!matchedItem) return true;

  return getAllowedKeysForRole(role).has(matchedItem.key);
};

export const getFirstAllowedPathForRole = (role) => {
  const allowedItem = flattenItems(filterSidebarItemsByRole(role)).find(
    (item) => item.href,
  );

  return allowedItem?.href || null;
};

export const subscribeToPermissionChanges = (callback) => {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(PERMISSION_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(PERMISSION_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
};
