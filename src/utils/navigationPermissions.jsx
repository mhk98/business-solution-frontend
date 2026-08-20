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
  MessageSquareText,
  Cable,
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
  FileText,
  FileSpreadsheet,
  CreditCard,
  WalletCards,
  Fingerprint,
  TrendingUp,
  Tags,
} from "lucide-react";
import {
  REPORT_PERMISSION_KEYS,
} from "./reports/reportCatalog";

export const ROLE_OPTIONS = [
  { value: "superAdmin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "marketer", label: "Marketer" },
  { value: "leader", label: "Leader" },
  { value: "leaderCs", label: "Leader CS" },
  { value: "leaderLogistics", label: "Leader Logistics" },
  { value: "inventor", label: "Inventor" },
  { value: "accountant", label: "Accountant" },
  { value: "hr", label: "HR" },
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
    "automated_performance_tracker",
    "ads_campaign_kpi",
    "profit_loss",
    "auto_profit_loss",
    "profit_loss_user",
    "manufacture",
    "packaging",
    "packaging_item",
    "packaging_item_stock",
    "packaging_item_purchase",
    "packaging_manufacturer",
    "packaging_factory",
    "packaging_factory_stock",
    "packaging_mixer",
    "item",
    "item_stock",
    "item_purchase",
    "item_requisition",
    "manufacture_stock",
    "manufacture_menu",
    "manufacturer",
    "stock_adjustment",
    "stock_movement",
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
    "courier_no_entry",
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
    "reports",
    ...REPORT_PERMISSION_KEYS,
    "accounting",
    "accounting_overview",
    "accounting_supplier",
    "book",
    "category",
    "petty_cash_requisition",
    "petty_cash",
    "loan",
    "owner",
    "owner_transaction",
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
    "api_gateway",
    "sms_gateway",
    "email_notification_gateway",
    "role_permissions",
    "email_notification_permissions",
    "sms_notification_permissions",
    "master_permission",
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
    "automated_performance_tracker",
    "ads_campaign_kpi",
    "profit_loss",
    "auto_profit_loss",
    "profit_loss_user",
    "manufacture",
    "packaging",
    "manufacture_menu",
    "manufacturer",
    "packaging_item",
    "packaging_item_stock",
    "packaging_item_purchase",
    "packaging_manufacturer",
    "packaging_factory",
    "packaging_factory_stock",
    "packaging_mixer",
    "item_stock",
    "item_purchase",
    "item_requisition",
    "manufacture_stock",
    "stock_adjustment",
    "stock_movement",
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
    "courier_no_entry",
    "sales_return",
    "damage_management",
    "damage_stock",
    "damage_product",
    "damage_repairing_stock",
    "damage_repairing",
    "damage_repaired",
    "reports",
    ...REPORT_PERMISSION_KEYS,
    "accounting",
    "accounting_overview",
    "accounting_supplier",
    "book",
    "category",
    "petty_cash_requisition",
    "petty_cash",
    "loan",
    "owner",
    "owner_transaction",
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
    "api_gateway",
    "sms_gateway",
    "email_notification_gateway",
    "role_permissions",
    "email_notification_permissions",
    "sms_notification_permissions",
    "master_permission",
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
    "automated_performance_tracker",
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
    "packaging",
    "manufacture_menu",
    "manufacturer",
    "packaging_item",
    "packaging_item_stock",
    "packaging_item_purchase",
    "packaging_manufacturer",
    "packaging_factory",
    "packaging_factory_stock",
    "packaging_mixer",
    "item_stock",
    "item_purchase",
    "manufacture_stock",
    "stock_adjustment",
    "mixer",
    "product",
    "item",
    "item_requisition",
    "purchase_requisition",
    "received_product",
    "received_return",
    "intransit_product",
    "courier_no_entry",
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
    "accounting_overview",
    "accounting_supplier",
    "book",
    "category",
    "petty_cash_requisition",
    "petty_cash",
    "loan",
    "owner",
    "owner_transaction",
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
    "shifa",
    "shifa_overview",
    "shifa_call_history",
    "shifa_starting_situation",
    "shifa_problem_history",
    "shifa_patient_update",
    "shifa_appointment_serial",
    "shifa_incentive",
    "notifications",
    "tasks",
    "profile",
  ],
  logistics: ["logistic_work_reports", "notifications", "tasks", "profile"],
  up: ["notifications", "tasks", "profile"],
  cs: [
    "cs_work_reports",
    "shifa",
    "shifa_overview",
    "shifa_call_history",
    "shifa_starting_situation",
    "shifa_problem_history",
    "shifa_patient_update",
    "shifa_appointment_serial",
    "shifa_incentive",
    "notifications",
    "tasks",
    "profile",
  ],
  staff: ["notifications", "tasks", "profile"],
  user: ["tasks", "profile"],
};

const DEFAULT_PERMISSION_ROLES = new Set(["superAdmin", "admin"]);

ROLE_OPTIONS.forEach((role) => {
  if (!DEFAULT_PERMISSION_ROLES.has(role.value)) {
    DEFAULT_ROLE_PERMISSION_MAP[role.value] = [];
  }
});

const createReportsSubmenu = (groupKey, roles, name = "Reports") => ({
  name,
  key: "reports",
  icon: FileSpreadsheet,
  href: `/reports/group/${groupKey}`,
  roles,
});

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
      createReportsSubmenu("assets", ["superAdmin", "admin"]),
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
        name: "Automated Performance Tracker",
        key: "automated_performance_tracker",
        icon: TrendingUp,
        color: "#f97316",
        href: "/performance-tracker",
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
        name: "Intransit Profit & Loss",
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
      createReportsSubmenu("marketing", ["superAdmin", "admin"]),
    ],
  },
  {
    name: "Packaging",
    key: "packaging",
    icon: Package,
    color: "#0ea5e9",
    roles: ["superAdmin", "admin", "inventor"],
    children: [
      {
        name: "Packaging Item",
        key: "packaging_item",
        icon: PackagePlus,
        href: "/packaging-item",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Packaging Item Stock",
        key: "packaging_item_stock",
        icon: Boxes,
        href: "/packaging-item-stock",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Packaging Item Purchase",
        key: "packaging_item_purchase",
        icon: Cog,
        href: "/packaging-item-purchase",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Packaging Manufacturer",
        key: "packaging_manufacturer",
        icon: Factory,
        href: "/packaging-manufacturer",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Packaging Factory Stock",
        key: "packaging_factory_stock",
        icon: Boxes,
        href: "/packaging-factory-stock",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Packaging Factory",
        key: "packaging_factory",
        icon: Factory,
        href: "/packaging-factory",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Packaging Mixer",
        key: "packaging_mixer",
        icon: FlaskConical,
        href: "/packaging-mixer",
        roles: ["superAdmin", "admin", "inventor"],
      },
      createReportsSubmenu("packaging", ["superAdmin", "admin"]),
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
        name: "Item Requisition",
        key: "item_requisition",
        icon: ClipboardList,
        href: "/item-requisition",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Item Stock",
        key: "item_stock",
        icon: Boxes,
        href: "/item-stock",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Item Purchase",
        key: "item_purchase",
        icon: Cog,
        href: "/item-purchase",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Manufacturer",
        key: "manufacturer",
        icon: Factory,
        href: "/manufacturer",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Factory Stock",
        key: "manufacture_stock",
        icon: Boxes,
        href: "/manufacture-stock",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Factory",
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
        name: "Stock Movement",
        key: "stock_movement",
        icon: History,
        href: "/stock-movement",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Mixer",
        key: "mixer",
        icon: FlaskConical,
        href: "/mixer",
        roles: ["superAdmin", "admin"],
      },
      createReportsSubmenu("manufacture", ["superAdmin", "admin"]),
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
      // {
      //   name: "Purchase Requisition",
      //   key: "purchase_requisition",
      //   icon: ClipboardList,
      //   href: "/purchase-requisition",
      //   roles: ["superAdmin", "admin", "inventor"],
      // },
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
        name: "Courier No Entry",
        key: "courier_no_entry",
        icon: ScanSearch,
        href: "/courier-no-entry",
        roles: ["superAdmin", "admin", "inventor"],
      },

      {
        name: "Sales Return",
        key: "sales_return",
        icon: RotateCcw,
        href: "/sales-return",
        roles: ["superAdmin", "admin", "inventor"],
      },
      createReportsSubmenu("inventory", ["superAdmin", "admin"], "Inventory Reports"),
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
        name: "Damage Return",
        key: "damage_return",
        icon: RotateCcw,
        href: "/damage-return",
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
        name: "Damage Repairing Return",
        key: "damage_repair_return",
        icon: RotateCcw,
        href: "/damage-repair-return",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Damage Repaired",
        key: "damage_repaired",
        icon: Wrench,
        href: "/damage-repaired",
        roles: ["superAdmin", "admin", "inventor"],
      },
      createReportsSubmenu("damage_management", ["superAdmin", "admin"]),
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
      createReportsSubmenu("pos_panel", ["superAdmin", "admin"]),
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
        name: "Overview",
        key: "accounting_overview",
        icon: BarChart3,
        href: "/accounting-overview",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Supplier",
        key: "accounting_supplier",
        icon: Truck,
        href: "/supplier",
        matchPaths: ["/supplier-history"],
        roles: ["superAdmin", "admin"],
      },
      // {
      //   name: "Purchase Requisition",
      //   key: "purchase_requisition",
      //   icon: ClipboardList,
      //   href: "/purchase-requisition",
      //   roles: ["superAdmin", "admin", "inventor"],
      // },
      {
        name: "Item Requisition",
        key: "item_requisition",
        icon: ClipboardList,
        href: "/item-requisition",
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
        name: "Bank",
        key: "bank_account",
        icon: WalletCards,
        href: "/bank-account",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Category",
        key: "category",
        icon: Tags,
        href: "/category",
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
        name: "Loan History",
        key: "loan",
        icon: HandCoins,
        href: "/loan",
        matchPaths: ["/loan/"],
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Owner",
        key: "owner",
        icon: User,
        href: "/owner",
        matchPaths: ["/owner/"],
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Owner Transaction",
        key: "owner_transaction",
        icon: WalletCards,
        href: "/owner-transaction",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Credit Ledger",
        key: "credit_ledger",
        icon: ReceiptText,
        href: "/credit-ledger",
        roles: ["superAdmin", "admin", "accountant"],
      },
      createReportsSubmenu("accounting", ["superAdmin", "admin"]),
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
      {
        name: "Email Notification Permissions",
        key: "email_notification_permissions",
        icon: Bell,
        href: "/settings/email-notification-permissions",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "SMS Notification Permissions",
        key: "sms_notification_permissions",
        icon: MessageSquareText,
        href: "/settings/sms-notification-permissions",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Master Permission",
        key: "master_permission",
        icon: ShieldCheck,
        href: "/settings/master-permission",
        roles: ["superAdmin", "admin"],
        masterOnly: true,
      },
      createReportsSubmenu("system", ["superAdmin", "admin"]),
    ],
  },
  {
    name: "API Gateway",
    key: "api_gateway",
    icon: Cable,
    color: "#0ea5e9",
    roles: ["superAdmin", "admin"],
    children: [
      {
        name: "SMS Gateway",
        key: "sms_gateway",
        icon: MessageSquareText,
        href: "/settings/api-gateway/sms",
        roles: ["superAdmin", "admin"],
      },
      {
        name: "Email Notification",
        key: "email_notification_gateway",
        icon: Bell,
        href: "/settings/api-gateway/email",
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
      {
        name: "Attendance",
        key: "attendance",
        icon: Fingerprint,
        href: "/hrm/attendance",
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
      {
        name: "Logistic Update",
        key: "logistic_update",
        icon: ClipboardCheck,
        href: "/hrm/logistic-updates",
        roles: ["superAdmin", "admin", "accountant", "employee"],
      },
      createReportsSubmenu("hrm", ["superAdmin", "admin"]),
    ],
  },
  {
    name: "Shifa",
    key: "shifa",
    icon: ClipboardCheck,
    color: "#0f766e",
    roles: ["superAdmin", "admin", "cs", "employee"],
    children: [
      {
        name: "Overview",
        key: "shifa_overview",
        icon: BarChart3,
        href: "/shifa/overview",
        roles: ["superAdmin", "admin", "cs", "employee"],
      },
      {
        name: "Call History",
        key: "shifa_call_history",
        icon: History,
        href: "/shifa/call-history",
        roles: ["superAdmin", "admin", "cs", "employee"],
      },
      {
        name: "Starting Situation",
        key: "shifa_starting_situation",
        icon: ClipboardList,
        href: "/shifa/starting-situation",
        roles: ["superAdmin", "admin", "cs", "employee"],
      },
      {
        name: "Problem History",
        key: "shifa_problem_history",
        icon: FileText,
        href: "/shifa/problem-history",
        roles: ["superAdmin", "admin", "cs", "employee"],
      },
      {
        name: "Patient Update",
        key: "shifa_patient_update",
        icon: RefreshCcw,
        href: "/shifa/patient-update",
        roles: ["superAdmin", "admin", "cs", "employee"],
      },
      {
        name: "Appointment Serial",
        key: "shifa_appointment_serial",
        icon: ClipboardList,
        href: "/shifa/appointment-serial",
        roles: ["superAdmin", "admin", "cs", "employee"],
      },
      {
        name: "Incentive",
        key: "shifa_incentive",
        icon: BadgeDollarSign,
        href: "/shifa/incentive",
        roles: ["superAdmin", "admin", "cs", "employee"],
      },
      createReportsSubmenu("shifa", ["superAdmin", "admin"]),
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
        href: "/payroll",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Payroll Fine",
        key: "payroll_fine",
        icon: BadgePercent,
        href: "/payroll-fine",
        roles: ["superAdmin", "admin", "accountant"],
      },
      createReportsSubmenu("hr_payroll", ["superAdmin", "admin"]),
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
const OVERVIEW_DEFAULT_REMOVED_STORAGE_KEY =
  "overview-default-permission-removed";
const DAILY_WORK_REPORTS_DEFAULT_REMOVED_STORAGE_KEY =
  "daily-work-reports-default-permission-removed";
const NON_ADMIN_DEFAULT_PERMISSIONS_REMOVED_STORAGE_KEY =
  "non-admin-default-permissions-removed";
const SHIFA_DEFAULT_REMOVED_STORAGE_KEY = "shifa-default-permission-removed";
const PERMISSION_EVENT = "role-permissions-updated";
const PERMISSION_KEY_ALIASES = {
  employee_profile: "employee_list",
};

const SHIFA_PERMISSION_KEYS = new Set([
  "shifa",
  "shifa_overview",
  "shifa_call_history",
  "shifa_starting_situation",
  "shifa_problem_history",
  "shifa_patient_update",
  "shifa_appointment_serial",
  "shifa_incentive",
]);

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

const toKebabCase = (value) =>
  String(value || "")
    .trim()
    .replace(/_/g, "-")
    .toLowerCase();

const getHrefModuleKey = (href) => {
  if (!href || href === "/") return "";
  return String(href).replace(/^\/+/, "").split("/")[0].toLowerCase();
};

const getMenuLogModules = (item) => {
  const modules = new Set();
  const addModuleCandidates = (entry) => {
    if (!entry) return;
    [entry.key, toKebabCase(entry.key), getHrefModuleKey(entry.href)]
      .filter(Boolean)
      .forEach((moduleKey) => modules.add(moduleKey));
  };

  addModuleCandidates(item);
  item.children?.forEach(addModuleCandidates);

  return Array.from(modules);
};

const appendMenuLogHistoryChild = (item, allowedKeys) => {
  if (!item.children?.length || !allowedKeys.has("log_history")) return item;
  if (item.key === "log_history") return item;
  if (item.children.some((child) => child.key === `${item.key}_log_history`)) {
    return item;
  }

  const modules = getMenuLogModules(item);
  if (!modules.length) return item;

  const params = new URLSearchParams({
    module: modules.join(","),
    menu: item.name,
  });

  return {
    ...item,
    children: [
      ...item.children,
      {
        name: "Log History",
        key: `${item.key}_log_history`,
        icon: History,
        href: `/log-history?${params.toString()}`,
        roles: item.roles,
      },
    ],
  };
};

const flattenSidebarKeys = (items = []) =>
  items.flatMap((item) => [
    item.key,
    ...(item.children ? flattenSidebarKeys(item.children) : []),
  ]);

export const EMAIL_NOTIFICATION_PERMISSION_PREFIX = "email_notify:";
export const SMS_NOTIFICATION_PERMISSION_PREFIX = "sms_notify:";
const LEGACY_MOBILE_NOTIFICATION_PERMISSION_PREFIX = "mobile_notify:";

export const getEmailNotificationPermissionKey = (menuKey) =>
  `${EMAIL_NOTIFICATION_PERMISSION_PREFIX}${getCanonicalPermissionKey(menuKey)}`;

export const getSmsNotificationPermissionKey = (menuKey) =>
  `${SMS_NOTIFICATION_PERMISSION_PREFIX}${getCanonicalPermissionKey(menuKey)}`;

export const isEmailNotificationPermissionKey = (key) =>
  String(key || "").startsWith(EMAIL_NOTIFICATION_PERMISSION_PREFIX);

export const isSmsNotificationPermissionKey = (key) =>
  String(key || "").startsWith(SMS_NOTIFICATION_PERMISSION_PREFIX);

const isLegacyMobileNotificationPermissionKey = (key) =>
  String(key || "").startsWith(LEGACY_MOBILE_NOTIFICATION_PERMISSION_PREFIX);

export const isNotificationPermissionKey = (key) =>
  isEmailNotificationPermissionKey(key) ||
  isSmsNotificationPermissionKey(key) ||
  isLegacyMobileNotificationPermissionKey(key);

const normalizeEmailNotificationPermissionKey = (key) => {
  if (!isEmailNotificationPermissionKey(key)) return null;

  const menuKey = getCanonicalPermissionKey(
    String(key).slice(EMAIL_NOTIFICATION_PERMISSION_PREFIX.length),
  );

  return KNOWN_MENU_PERMISSION_KEYS.has(menuKey)
    ? getEmailNotificationPermissionKey(menuKey)
    : null;
};

const normalizeSmsNotificationPermissionKey = (key) => {
  if (
    !isSmsNotificationPermissionKey(key) &&
    !isLegacyMobileNotificationPermissionKey(key)
  ) {
    return null;
  }

  const prefix = isLegacyMobileNotificationPermissionKey(key)
    ? LEGACY_MOBILE_NOTIFICATION_PERMISSION_PREFIX
    : SMS_NOTIFICATION_PERMISSION_PREFIX;

  const menuKey = getCanonicalPermissionKey(
    String(key).slice(prefix.length),
  );

  return KNOWN_MENU_PERMISSION_KEYS.has(menuKey)
    ? getSmsNotificationPermissionKey(menuKey)
    : null;
};

export const KNOWN_MENU_PERMISSION_KEYS = new Set([
  ...Object.values(DEFAULT_ROLE_PERMISSION_MAP).flat(),
  ...flattenSidebarKeys(SIDEBAR_ITEMS),
  ...Object.keys(PERMISSION_KEY_ALIASES),
  ...Object.values(PERMISSION_KEY_ALIASES),
  ...Object.keys(LEGACY_PERMISSION_EXPANSIONS),
]);

const flattenEmailNotificationItems = (items = [], parentName = "") =>
  items.flatMap((item) => {
    const label = parentName ? `${parentName} / ${item.name}` : item.name;
    const currentItem = item.href
      ? [
          {
            key: item.key,
            label,
            permissionKey: getEmailNotificationPermissionKey(item.key),
          },
        ]
      : [];

    return [
      ...currentItem,
      ...(item.children
        ? flattenEmailNotificationItems(item.children, item.name)
        : []),
    ];
  });

export const EMAIL_NOTIFICATION_ITEMS =
  flattenEmailNotificationItems(SIDEBAR_ITEMS);

const flattenSmsNotificationItems = (items = [], parentName = "") =>
  items.flatMap((item) => {
    const label = parentName ? `${parentName} / ${item.name}` : item.name;
    const currentItem = item.href
      ? [
          {
            key: item.key,
            label,
            permissionKey: getSmsNotificationPermissionKey(item.key),
          },
        ]
      : [];

    return [
      ...currentItem,
      ...(item.children
        ? flattenSmsNotificationItems(item.children, item.name)
        : []),
    ];
  });

export const SMS_NOTIFICATION_ITEMS =
  flattenSmsNotificationItems(SIDEBAR_ITEMS);

export const expandPermissionKeys = (keys = []) => {
  const expanded = new Set();

  keys.forEach((key) => {
    if (!key) return;
    if (isNotificationPermissionKey(key)) {
      expanded.add(key);
      return;
    }

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
        .map((key) =>
          isEmailNotificationPermissionKey(key)
            ? normalizeEmailNotificationPermissionKey(key)
            : isSmsNotificationPermissionKey(key) ||
                isLegacyMobileNotificationPermissionKey(key)
              ? normalizeSmsNotificationPermissionKey(key)
            : getCanonicalPermissionKey(key),
        )
        .filter(
          (key) =>
            KNOWN_MENU_PERMISSION_KEYS.has(key) ||
            (isEmailNotificationPermissionKey(key) &&
              KNOWN_MENU_PERMISSION_KEYS.has(
                key.slice(EMAIL_NOTIFICATION_PERMISSION_PREFIX.length),
              )) ||
            (isSmsNotificationPermissionKey(key) &&
              KNOWN_MENU_PERMISSION_KEYS.has(
                key.slice(SMS_NOTIFICATION_PERMISSION_PREFIX.length),
              )),
        ),
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
      if (defaultKeys.includes("email_notification_permissions")) {
        normalizedKeys.add("email_notification_permissions");
      }
      if (defaultKeys.includes("sms_notification_permissions")) {
        normalizedKeys.add("sms_notification_permissions");
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
      if (defaultKeys.includes("master_permission")) {
        normalizedKeys.add("master_permission");
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

    if (defaultKeys.includes("reports")) {
      normalizedKeys.add("reports");
      REPORT_PERMISSION_KEYS.forEach((permissionKey) => {
        normalizedKeys.add(permissionKey);
      });
    }

    if (defaultKeys.includes("packaging")) {
      normalizedKeys.add("packaging");
    }

    if (defaultKeys.includes("packaging_item")) {
      normalizedKeys.add("packaging_item");
    }

    if (defaultKeys.includes("packaging_item_stock")) {
      normalizedKeys.add("packaging_item_stock");
    }

    if (defaultKeys.includes("packaging_item_purchase")) {
      normalizedKeys.add("packaging_item_purchase");
    }

    if (defaultKeys.includes("packaging_manufacturer")) {
      normalizedKeys.add("packaging_manufacturer");
    }

    if (defaultKeys.includes("packaging_factory")) {
      normalizedKeys.add("packaging_factory");
    }

    if (defaultKeys.includes("packaging_factory_stock")) {
      normalizedKeys.add("packaging_factory_stock");
    }

    if (defaultKeys.includes("packaging_mixer")) {
      normalizedKeys.add("packaging_mixer");
    }

    if (defaultKeys.includes("stock_alert")) {
      normalizedKeys.add("stock_alert");
    }

    if (defaultKeys.includes("stock_movement")) {
      normalizedKeys.add("stock_movement");
    }

    if (defaultKeys.includes("courier_no_entry")) {
      normalizedKeys.add("courier_no_entry");
    }

    if (defaultKeys.includes("loan")) {
      normalizedKeys.add("loan");
    }

    if (defaultKeys.includes("owner_transaction")) {
      normalizedKeys.add("owner_transaction");
    }

    if (defaultKeys.includes("owner")) {
      normalizedKeys.add("owner");
    }

    if (defaultKeys.includes("cs_work_reports")) {
      normalizedKeys.add("cs_work_reports");
    }

    if (defaultKeys.includes("logistic_work_reports")) {
      normalizedKeys.add("logistic_work_reports");
    }

    if (normalizedKeys.has("logistic_work_reports")) {
      normalizedKeys.add("logistic_update");
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
    acc[role] =
      ROLES_WITH_LEGACY_DAILY_WORK_REPORTS_DEFAULT.has(role) &&
      Array.isArray(keys)
        ? keys.filter(
            (key) => getCanonicalPermissionKey(key) !== "daily_work_reports",
          )
        : keys;
    return acc;
  }, {});

const removeNonAdminPermissionsFromMap = (permissionMap = {}) =>
  Object.entries(permissionMap).reduce((acc, [role, keys]) => {
    acc[role] =
      DEFAULT_PERMISSION_ROLES.has(role) && Array.isArray(keys) ? keys : [];
    return acc;
  }, {});

const removeShifaDefaultPermissionsFromMap = (permissionMap = {}) =>
  Object.entries(permissionMap).reduce((acc, [role, keys]) => {
    acc[role] = Array.isArray(keys)
      ? keys.filter(
          (key) => !SHIFA_PERMISSION_KEYS.has(getCanonicalPermissionKey(key)),
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

const migrateStoredNonAdminDefaultPermissions = () => {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(NON_ADMIN_DEFAULT_PERMISSIONS_REMOVED_STORAGE_KEY)) {
    return;
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (parsed && typeof parsed === "object") {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(removeNonAdminPermissionsFromMap(parsed)),
      );
    }
  } catch (error) {
    console.error("Failed to migrate non-admin menu permissions", error);
  } finally {
    localStorage.setItem(
      NON_ADMIN_DEFAULT_PERMISSIONS_REMOVED_STORAGE_KEY,
      "true",
    );
  }
};

const migrateStoredShifaDefaultPermissions = () => {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(SHIFA_DEFAULT_REMOVED_STORAGE_KEY)) return;

  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (parsed && typeof parsed === "object") {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(removeShifaDefaultPermissionsFromMap(parsed)),
      );
    }
  } catch (error) {
    console.error("Failed to migrate shifa menu permissions", error);
  } finally {
    localStorage.setItem(SHIFA_DEFAULT_REMOVED_STORAGE_KEY, "true");
  }
};

export const getStoredRolePermissions = () => {
  if (typeof window === "undefined") return {};

  try {
    migrateStoredOverviewDefaultPermission();
    migrateStoredDailyWorkReportsDefaultPermission();
    migrateStoredNonAdminDefaultPermissions();
    migrateStoredShifaDefaultPermissions();
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
      acc.push(appendMenuLogHistoryChild({ ...item, children: visibleChildren }, allowedKeys));
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
