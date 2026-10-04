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
  ArrowLeftRight,
  PiggyBank,
  BadgePercent,
  BadgeCheck,
  CircleDollarSign,
  Factory,
  History,
  UserX,
  FileText,
  FileSpreadsheet,
  CreditCard,
  WalletCards,
  Fingerprint,
  TrendingUp,
  Tags,
  CalendarRange,
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
    "packaging_stock_movement",
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
    "combo_production",
    "inventory",
    "inventory_overview",
    "stock_product",
    "stock_alert",
    "warehouse",
    "supplier",
    "dollar_supplier",
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
    "damage_stock_movement",
    "inventory_stock_movement",
    "pos_panel",
    "sell",
    "pos_report",
    "reports",
    ...REPORT_PERMISSION_KEYS,
    "accounting",
    "accounting_overview",
    "accounting_supplier",
    "book",
    "monthly_reporting_book",
    "category",
    "fund_transfer",
    "account_balance",
    "petty_cash_requisition",
    "petty_cash",
    "loan",
    "owner",
    "owner_transaction",
    "credit_ledger",
    "log_history",
    "daily_inactive_users",
    "notifications",
    "tasks",
    "settings",
    "logo",
    "notice",
    "cod_change",
    "cod_charge",
    "delivery_advance",
    "delivery_charge",
    "shipping_charge",
    "api_gateway",
    "sms_gateway",
    "email_notification_gateway",
    "role_permissions",
    "email_notification_permissions",
    "sms_notification_permissions",
    "master_permission",
    "hrm",
    "attendance_management",
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
    "packaging_stock_movement",
    "item_stock",
    "item_purchase",
    "item_requisition",
    "manufacture_stock",
    "stock_adjustment",
    "stock_movement",
    "mixer",
    "combo_production",
    "inventory",
    "inventory_overview",
    "stock_product",
    "stock_alert",
    "warehouse",
    "supplier",
    "dollar_supplier",
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
    "damage_stock_movement",
    "inventory_stock_movement",
    "reports",
    ...REPORT_PERMISSION_KEYS,
    "accounting",
    "accounting_overview",
    "accounting_supplier",
    "book",
    "monthly_reporting_book",
    "category",
    "fund_transfer",
    "account_balance",
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
    "shipping_charge",
    "api_gateway",
    "sms_gateway",
    "email_notification_gateway",
    "role_permissions",
    "email_notification_permissions",
    "sms_notification_permissions",
    "master_permission",
    "hrm",
    "attendance_management",
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
    "packaging_stock_movement",
    "item_stock",
    "item_purchase",
    "manufacture_stock",
    "stock_adjustment",
    "mixer",
    "combo_production",
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
    "damage_stock_movement",
    "inventory_stock_movement",
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
    "monthly_reporting_book",
    "category",
    "fund_transfer",
    "account_balance",
    "petty_cash_requisition",
    "petty_cash",
    "loan",
    "owner",
    "owner_transaction",
    "credit_ledger",
    "log_history",
    "hrm",
    "attendance_management",
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
    "attendance_management",
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
        name: "Dollar Supplier",
        key: "dollar_supplier",
        icon: Truck,
        color: "#f97316",
        href: "/dollar-supplier",
        matchPaths: ["/dollar-supplier-history"],
        roles: ["superAdmin", "admin"],
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
        name: "Packaging Item Stock Adjustment",
        key: "packaging_item_stock_adjustment",
        icon: SlidersHorizontal,
        href: "/packaging-item-stock-adjustment",
        roles: ["superAdmin", "admin"],
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
        name: "Packaging Factory Stock Adjustment",
        key: "packaging_factory_stock_adjustment",
        icon: SlidersHorizontal,
        href: "/packaging-factory-stock-adjustment",
        roles: ["superAdmin", "admin"],
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
      {
        name: "Stock Movement",
        key: "packaging_stock_movement",
        icon: History,
        href: "/packaging-stock-movement",
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
        name: "Factory Stock Adjustment",
        key: "factory_stock_adjustment",
        icon: SlidersHorizontal,
        href: "/factory-stock-adjustment",
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
      {
        name: "Combo Production",
        key: "combo_production",
        icon: PackagePlus,
        href: "/combo-production",
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
        name: "Courier Product Stock",
        key: "courier_product_stock",
        icon: PackageSearch,
        href: "/courier-product-stock",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Courier Balance",
        key: "courier_balance",
        icon: Wallet,
        href: "/courier-balance",
        roles: ["superAdmin", "admin", "inventor"],
      },

      {
        name: "Sales Return",
        key: "sales_return",
        icon: RotateCcw,
        href: "/sales-return",
        roles: ["superAdmin", "admin", "inventor"],
      },
      {
        name: "Stock Movement",
        key: "inventory_stock_movement",
        icon: History,
        href: "/inventory-stock-movement",
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
      {
        name: "Stock Movement",
        key: "damage_stock_movement",
        icon: History,
        href: "/damage-stock-movement",
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
        name: "Monthly Reporting Book",
        key: "monthly_reporting_book",
        icon: CalendarRange,
        href: "/monthly-reporting-book",
        matchPaths: ["/monthly-reporting-book/transactions"],
        roles: ["superAdmin", "admin", "accountant"],
        masterOnly: true,
      },
      {
        name: "Account",
        key: "bank_account",
        icon: WalletCards,
        href: "/bank-account",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Fund Transfer",
        key: "fund_transfer",
        icon: ArrowLeftRight,
        href: "/fund-transfer",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Account Balance",
        key: "account_balance",
        icon: PiggyBank,
        href: "/account-balance",
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
        name: "Sales Due",
        key: "sales_due",
        icon: ReceiptText,
        href: "/sales-due",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Salary Advance",
        key: "salary_advance",
        icon: BadgeDollarSign,
        href: "/salary-advance",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Lender",
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
        name: "Director Profit Share",
        key: "director_profit_share",
        icon: User,
        href: "/director-profit-share",
        matchPaths: ["/director-profit-share/"],
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
    name: "Work History",
    key: "work_history",
    icon: History,
    color: "#4f46e5",
    href: "/work-history",
    roles: ["superAdmin"],
  },
  {
    name: "Today Not Worked",
    key: "daily_inactive_users",
    icon: UserX,
    color: "#dc2626",
    href: "/today-not-worked",
    roles: ["superAdmin"],
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
        name: "Shipping Charge",
        key: "shipping_charge",
        icon: Truck,
        href: "/settings/shipping-charge",
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
    name: "Attendance",
    key: "attendance_management",
    icon: Fingerprint,
    color: "#0ea5e9",
    roles: ["superAdmin", "admin", "accountant", "employee"],
    children: [
      {
        name: "Attendance Report",
        key: "attendance",
        icon: Fingerprint,
        href: "/hrm/attendance",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Attendance Setup",
        key: "attendance",
        icon: Users,
        href: "/hrm/attendance-setup",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Attendance Device",
        key: "attendance_device",
        icon: Settings,
        href: "/hrm/attendance-devices",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Shifts",
        key: "shift_management",
        icon: ClipboardCheck,
        href: "/hrm/shifts",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Shift Assignment",
        key: "shift_management",
        icon: CalendarRange,
        href: "/hrm/shift-assignments",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Holidays",
        key: "holiday_management",
        icon: Bell,
        href: "/hrm/holidays",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Leave Types",
        key: "leave_management",
        icon: Tags,
        href: "/hrm/leave-types",
        roles: ["superAdmin", "admin", "accountant"],
      },
      {
        name: "Leave Requests",
        key: "leave_management",
        icon: ClipboardList,
        href: "/hrm/leave-requests",
        roles: ["superAdmin", "admin", "accountant", "employee"],
      },
      {
        name: "Attendance Correction",
        key: "attendance",
        icon: RefreshCcw,
        href: "/hrm/attendance-regularizations",
        roles: ["superAdmin", "admin", "accountant", "employee"],
      },
      {
        name: "Attendance Policy",
        key: "attendance",
        icon: SlidersHorizontal,
        href: "/hrm/attendance-policy",
        roles: ["superAdmin", "admin", "accountant"],
      },
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
const PERMISSION_EVENT = "role-permissions-updated";
const PERMISSION_KEY_ALIASES = {
  employee_profile: "employee_list",
};

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
  return Object.fromEntries(Object.entries(value)
    .filter(([, keys]) => Array.isArray(keys))
    .map(([role, keys]) => [role, normalizePermissionKeys(keys)]));
};

// A selected submenu must have a visible parent, without granting its siblings.
export const includeParentMenuPermissions = (keys = []) => {
  const allowed = new Set(expandPermissionKeys(keys));
  const visit = (item) => {
    const childrenAllowed = item.children?.map(visit).some(Boolean);
    if (childrenAllowed) allowed.add(item.key);
    return allowed.has(item.key);
  };
  SIDEBAR_ITEMS.forEach(visit);
  return Array.from(allowed);
};

export const SUPER_ADMIN_PERMISSION_KEYS = Array.from(KNOWN_MENU_PERMISSION_KEYS);

export const getStoredRolePermissions = () => {
  if (typeof window === "undefined") return {};

  try {
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
  if (role === "superAdmin") return new Set(SUPER_ADMIN_PERMISSION_KEYS);
  const stored = getStoredRolePermissions();
  const keys = new Set(includeParentMenuPermissions(stored[role] || []));
  return keys;
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
