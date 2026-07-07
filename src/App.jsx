import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import store from "./app/store";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import RequireAuth from "./components/Auth/RequireAuth";
import SidebarLayout from "./components/common/SidebarLayout";
import ErrorBoundary from "./components/common/ErrorBoundary";
import LoadingBar from "./components/common/LoadingBar";
import DeleteConfirmationProvider from "./components/common/DeleteConfirmationProvider";
import DuplicateSameDayEntryHighlighter from "./components/common/DuplicateSameDayEntryHighlighter";

const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ReceivedProductPage = lazy(() => import("./pages/ReceivedProductPage"));
const ReturnProductPage = lazy(() => import("./pages/ReturnProductPage"));
const InTransitProductPage = lazy(() => import("./pages/InTransitProductPage"));
const MetaPage = lazy(() => import("./pages/MetaPage"));
const GooglePage = lazy(() => import("./pages/GooglePage"));
const TiktokPage = lazy(() => import("./pages/TiktokPage"));
const SEOPage = lazy(() => import("./pages/SEOPage"));
const AssetsPurchasePage = lazy(() => import("./pages/AssetsPurchasePage"));
const AssetsStockPage = lazy(() => import("./pages/AssetsStockPage"));
const AssetsSalePage = lazy(() => import("./pages/AssetsSalePage"));
const ConfirmOrderPage = lazy(() => import("./pages/ConfirmOrderPage"));
const CashInPage = lazy(() => import("./pages/CashInOutPage"));
const ExpensePage = lazy(() => import("./pages/ExpensePage"));
const AccountingPage = lazy(() => import("./pages/AccountingPage"));
const CashInOutPage = lazy(() => import("./pages/CashInOutPage"));
const PurchaseReturnProductPage = lazy(() => import("./pages/PurchaseReturnProductPage"));
const ReceiveablePage = lazy(() => import("./pages/ReceiveablePage"));
const PayablePage = lazy(() => import("./pages/PayablePage"));
const UsermanagementPage = lazy(() => import("./pages/UsermanagementPage"));
const PettyCashPage = lazy(() => import("./pages/PettyCashPage"));
const PettyCashRequisitionPage = lazy(() => import("./pages/PettyCashRequisitionPage"));
const AssetsDamagePage = lazy(() => import("./pages/AssetsDamagePage"));
const SupplierPage = lazy(() => import("./pages/SupplierPage"));
const DamageProductPage = lazy(() => import("./pages/DamageProductPage"));
const EmployeePage = lazy(() => import("./pages/EmployeePage"));
const POSPage = lazy(() => import("./pages/POSPage"));
const NotificationPage = lazy(() => import("./pages/NotificationPage"));
const NoticePage = lazy(() => import("./pages/NoticePage"));
const ChargeSettingsPage = lazy(() => import("./pages/ChargeSettingsPage"));
const TaskPage = lazy(() => import("./pages/TaskPage"));
const SalaryPage = lazy(() => import("./pages/SalaryPage"));
const LogoPage = lazy(() => import("./pages/LogoPage"));
const RolePermissionsPage = lazy(() => import("./pages/RolePermissionsPage"));
const DamageRepairPage = lazy(() => import("./pages/DamageRepairPage"));
const DamageRepairedPage = lazy(() => import("./pages/DamageRepairedPage"));
const PurchaseRequisitionPage = lazy(() => import("./pages/purchaseRequisitionPage"));
const ItemRequisitionPage = lazy(() => import("./pages/ItemRequisitionPage"));
const AssetsRequisitionPage = lazy(() => import("./pages/AssetsRequisitionPage"));
const ExpiredProductPage = lazy(() => import("./pages/ExpiredProductPage"));
const PosReportPage = lazy(() => import("./pages/PosReportPage"));
const InventoryOverviewPage = lazy(() => import("./pages/InventoryOverviewPage"));
const StockAlertPage = lazy(() => import("./pages/StockAlertPage"));
const MarketingBookPage = lazy(() => import("./pages/MarketingBookPage"));
const MarketingExpensePage = lazy(() => import("./pages/MarketingExpensePage"));
const AdsCampaignKPIPage = lazy(() => import("./pages/AdsCampaignKPIPage"));
const AutoProfitLossPage = lazy(() => import("./pages/AutoProfitLossPage"));
const InventoryDashboardPage = lazy(() => import("./pages/InventoryDashboardPage"));
const DamageStockPage = lazy(() => import("./pages/DamageStockPage"));
const WarehousePage = lazy(() => import("./pages/WarehousePage"));
const SupplierHistoryPage = lazy(() => import("./pages/SupplierHistoryPage"));
const LoanPage = lazy(() => import("./pages/LoanPage"));
const LoanHistoryPage = lazy(() => import("./pages/LoanHistoryPage"));
const OwnerTransactionPage = lazy(() => import("./pages/OwnerTransactionPage"));
const CreditLedgerPage = lazy(() => import("./pages/CreditLedgerPage"));
const LogHistoryPage = lazy(() => import("./pages/LogHistoryPage"));
const ManufacturePage = lazy(() => import("./pages/ManufacturePage"));
const ManufacturerPage = lazy(() => import("./pages/ManufacturerPage"));
const ManufacturerHistoryPage = lazy(() => import("./pages/ManufacturerHistoryPage"));
const ItemStockPage = lazy(() => import("./pages/ItemStockPage"));
const ItemPurchasePage = lazy(() => import("./pages/ItemPurchasePage"));
const ItemsPage = lazy(() => import("./pages/ItemsPage"));
const ManufactureStockPage = lazy(() => import("./pages/ManufactureStockPage"));
const MixerPage = lazy(() => import("./pages/MixerPage"));
const StockAdjustmentPage = lazy(() => import("./pages/StockAdjustmentPage"));
const StockMovementPage = lazy(() => import("./pages/StockMovementPage"));
const DamageRepairingStockPage = lazy(() => import("./pages/DamageRepairingStockPage"));
const DailyProfitLossPage = lazy(() => import("./pages/DailyProfitLossPage"));
const DailyProfitLossUserPage = lazy(() => import("./pages/DailyProfitLossUserPage"));
const DailyWorkReportPage = lazy(() => import("./pages/DailyWorkReportPage"));
const EmployeeWorkReportPage = lazy(() => import("./pages/EmployeeWorkReportPage"));
const LogisticWorkReportPage = lazy(() => import("./pages/LogisticWorkReportPage"));
const LogisticUpdatePage = lazy(() => import("./pages/LogisticUpdatePage"));
const EmployeeMasterPage = lazy(() => import("./pages/EmployeeMasterPage"));
const EmployeeProfilePage = lazy(() => import("./pages/EmployeeProfilePage"));
const DepartmentPage = lazy(() => import("./pages/DepartmentPage"));
const DesignationPage = lazy(() => import("./pages/DesignationPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const ShiftPage = lazy(() => import("./pages/ShiftPage"));
const HolidayPage = lazy(() => import("./pages/HolidayPage"));
const AttendanceDevicePage = lazy(() => import("./pages/AttendanceDevicePage"));
const AttendanceEnrollmentPage = lazy(() => import("./pages/AttendanceEnrollmentPage"));
const AttendanceLogsPage = lazy(() => import("./pages/AttendanceLogsPage"));
const AttendanceSummaryPage = lazy(() => import("./pages/AttendanceSummaryPage"));
const AttendanceRegularizationPage = lazy(() => import("./pages/AttendanceRegularizationPage"));
const LeaveTypePage = lazy(() => import("./pages/LeaveTypePage"));
const LeaveRequestPage = lazy(() => import("./pages/LeaveRequestPage"));
const PayrollRunPage = lazy(() => import("./pages/PayrollRunPage"));
const PayslipPage = lazy(() => import("./pages/PayslipPage"));
const EmployeeListPage = lazy(() => import("./pages/EmployeeListPage"));
const EmployeeKPIPage = lazy(() => import("./pages/EmployeeKPIPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
  </div>
);

const AuthedRoute = ({ children }) => (
  <RequireAuth>
    <SidebarLayout>{children}</SidebarLayout>
  </RequireAuth>
);

function App() {
  const location = useLocation();

  return (
    <Provider store={store}>
      <ErrorBoundary resetKey={location.pathname}>
        <div className="flex min-h-dvh bg-gray-900 text-gray-100 overflow-x-hidden">
          {/* Background */}
          <div className="fixed inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 opacity-80" />
            <div className="absolute inset-0 backdrop-blur-sm" />
          </div>

          {/* Main content area */}
          <div className="flex-1 min-w-0 relative z-10 min-h-dvh">
            <LoadingBar />
            <DuplicateSameDayEntryHighlighter />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<AuthedRoute><OverviewPage /></AuthedRoute>} />
                <Route path="/employee-list" element={<AuthedRoute><EmployeeListPage /></AuthedRoute>} />
                <Route path="/employee-profile" element={<AuthedRoute><EmployeeProfilePage /></AuthedRoute>} />
                <Route path="/employee-master" element={<AuthedRoute><EmployeeMasterPage /></AuthedRoute>} />
                <Route path="/hrm/departments" element={<AuthedRoute><DepartmentPage /></AuthedRoute>} />
                <Route path="/hrm/designations" element={<AuthedRoute><DesignationPage /></AuthedRoute>} />
                <Route path="/hrm/teams" element={<AuthedRoute><TeamPage /></AuthedRoute>} />
                <Route path="/hrm/shifts" element={<AuthedRoute><ShiftPage /></AuthedRoute>} />
                <Route path="/hrm/holidays" element={<AuthedRoute><HolidayPage /></AuthedRoute>} />
                <Route path="/hrm/attendance-devices" element={<AuthedRoute><AttendanceDevicePage /></AuthedRoute>} />
                <Route path="/hrm/attendance-enrollments" element={<AuthedRoute><AttendanceEnrollmentPage /></AuthedRoute>} />
                <Route path="/hrm/attendance-logs" element={<AuthedRoute><AttendanceLogsPage /></AuthedRoute>} />
                <Route path="/hrm/attendance-summaries" element={<AuthedRoute><AttendanceSummaryPage /></AuthedRoute>} />
                <Route path="/hrm/attendance-regularizations" element={<AuthedRoute><AttendanceRegularizationPage /></AuthedRoute>} />
                <Route path="/hrm/leave-types" element={<AuthedRoute><LeaveTypePage /></AuthedRoute>} />
                <Route path="/hrm/leave-requests" element={<AuthedRoute><LeaveRequestPage /></AuthedRoute>} />
                <Route path="/hrm/payroll-runs" element={<AuthedRoute><PayrollRunPage /></AuthedRoute>} />
                <Route path="/hrm/payslips" element={<AuthedRoute><PayslipPage /></AuthedRoute>} />
                <Route path="/hrm/daily-work-reports" element={<AuthedRoute><DailyWorkReportPage /></AuthedRoute>} />
                <Route path="/hrm/employee-work-reports" element={<AuthedRoute><EmployeeWorkReportPage /></AuthedRoute>} />
                <Route path="/hrm/logistic-work-reports" element={<AuthedRoute><LogisticWorkReportPage /></AuthedRoute>} />
                <Route path="/hrm/logistic-updates" element={<AuthedRoute><LogisticUpdatePage /></AuthedRoute>} />
                <Route path="/employee-kpi" element={<AuthedRoute><EmployeeKPIPage /></AuthedRoute>} />
                <Route path="/employee" element={<AuthedRoute><EmployeePage /></AuthedRoute>} />
                <Route path="/pos-sell" element={<AuthedRoute><POSPage /></AuthedRoute>} />
                <Route path="/pos-report" element={<AuthedRoute><PosReportPage /></AuthedRoute>} />
                <Route path="/inventory-overview" element={<AuthedRoute><InventoryDashboardPage /></AuthedRoute>} />
                <Route path="/item" element={<AuthedRoute><ItemsPage /></AuthedRoute>} />
                <Route path="/item-stock" element={<AuthedRoute><ItemStockPage /></AuthedRoute>} />
                <Route path="/item-requisition" element={<AuthedRoute><ItemRequisitionPage /></AuthedRoute>} />
                <Route path="/item-purchase" element={<AuthedRoute><ItemPurchasePage /></AuthedRoute>} />
                <Route path="/manufacture-stock" element={<AuthedRoute><ManufactureStockPage /></AuthedRoute>} />
                <Route path="/manufacture" element={<AuthedRoute><ManufacturePage /></AuthedRoute>} />
                <Route path="/manufacturer" element={<AuthedRoute><ManufacturerPage /></AuthedRoute>} />
                <Route path="/manufacturer/:id" element={<AuthedRoute><ManufacturerHistoryPage /></AuthedRoute>} />
                <Route path="/stock-adjustment" element={<AuthedRoute><StockAdjustmentPage /></AuthedRoute>} />
                <Route path="/stock-movement" element={<AuthedRoute><StockMovementPage /></AuthedRoute>} />
                <Route path="/mixer" element={<AuthedRoute><MixerPage /></AuthedRoute>} />
                <Route path="/stock-product" element={<AuthedRoute><InventoryOverviewPage /></AuthedRoute>} />
                <Route path="/stock-alert" element={<AuthedRoute><StockAlertPage /></AuthedRoute>} />
                <Route path="/products" element={<AuthedRoute><ProductsPage /></AuthedRoute>} />
                <Route path="/purchase-requisition" element={<AuthedRoute><PurchaseRequisitionPage /></AuthedRoute>} />
                <Route path="/purchase-product" element={<AuthedRoute><ReceivedProductPage /></AuthedRoute>} />
                <Route path="/intransit-product" element={<AuthedRoute><InTransitProductPage /></AuthedRoute>} />
                <Route path="/sales-return" element={<AuthedRoute><ReturnProductPage /></AuthedRoute>} />
                <Route path="/purchase-return" element={<AuthedRoute><PurchaseReturnProductPage /></AuthedRoute>} />
                <Route path="/damage-stock" element={<AuthedRoute><DamageStockPage /></AuthedRoute>} />
                <Route path="/damage-repairing-stock" element={<AuthedRoute><DamageRepairingStockPage /></AuthedRoute>} />
                <Route path="/damage-product" element={<AuthedRoute><DamageProductPage /></AuthedRoute>} />
                <Route path="/damage-repair" element={<AuthedRoute><DamageRepairPage /></AuthedRoute>} />
                <Route path="/damage-repaired" element={<AuthedRoute><DamageRepairedPage /></AuthedRoute>} />
                <Route path="/confirm-order" element={<AuthedRoute><ConfirmOrderPage /></AuthedRoute>} />
                <Route path="/meta" element={<AuthedRoute><MetaPage /></AuthedRoute>} />
                <Route path="/google" element={<AuthedRoute><GooglePage /></AuthedRoute>} />
                <Route path="/tiktok" element={<AuthedRoute><TiktokPage /></AuthedRoute>} />
                <Route path="/seo" element={<AuthedRoute><SEOPage /></AuthedRoute>} />
                <Route path="/cash-in" element={<AuthedRoute><CashInPage /></AuthedRoute>} />
                <Route path="/petty-cash-requisition" element={<AuthedRoute><PettyCashRequisitionPage /></AuthedRoute>} />
                <Route path="/petty-cash" element={<AuthedRoute><PettyCashPage /></AuthedRoute>} />
                <Route path="/loan" element={<AuthedRoute><LoanPage /></AuthedRoute>} />
                <Route path="/loan/:lender" element={<AuthedRoute><LoanHistoryPage /></AuthedRoute>} />
                <Route path="/owner-transaction" element={<AuthedRoute><OwnerTransactionPage /></AuthedRoute>} />
                <Route path="/credit-ledger" element={<AuthedRoute><CreditLedgerPage /></AuthedRoute>} />
                <Route path="/log-history" element={<AuthedRoute><LogHistoryPage /></AuthedRoute>} />
                <Route path="/expense" element={<AuthedRoute><ExpensePage /></AuthedRoute>} />
                <Route path="/book" element={<AuthedRoute><AccountingPage /></AuthedRoute>} />
                <Route path="/book/:id" element={<AuthedRoute><CashInOutPage /></AuthedRoute>} />
                <Route path="/marketing-book" element={<AuthedRoute><MarketingBookPage /></AuthedRoute>} />
                <Route path="/marketing-book/:id" element={<AuthedRoute><MarketingExpensePage /></AuthedRoute>} />
                <Route path="/ads-campaign-kpi" element={<AuthedRoute><AdsCampaignKPIPage /></AuthedRoute>} />
                <Route path="/auto-profit-loss" element={<AuthedRoute><AutoProfitLossPage /></AuthedRoute>} />
                <Route path="/profit-loss" element={<AuthedRoute><DailyProfitLossPage /></AuthedRoute>} />
                <Route path="/profit-loss-user" element={<AuthedRoute><DailyProfitLossUserPage /></AuthedRoute>} />
                <Route path="/warehouse" element={<AuthedRoute><WarehousePage /></AuthedRoute>} />
                <Route path="/supplier" element={<AuthedRoute><SupplierPage /></AuthedRoute>} />
                <Route path="/supplier-history/:id" element={<AuthedRoute><SupplierHistoryPage /></AuthedRoute>} />
                <Route path="/assets-requisition" element={<AuthedRoute><AssetsRequisitionPage /></AuthedRoute>} />
                <Route path="/assets-stock" element={<AuthedRoute><AssetsStockPage /></AuthedRoute>} />
                <Route path="/assets-purchase" element={<AuthedRoute><AssetsPurchasePage /></AuthedRoute>} />
                <Route path="/assets-sale" element={<AuthedRoute><AssetsSalePage /></AuthedRoute>} />
                <Route path="/assets-damage" element={<AuthedRoute><AssetsDamagePage /></AuthedRoute>} />
                <Route path="/Receivable" element={<AuthedRoute><ReceiveablePage /></AuthedRoute>} />
                <Route path="/payable" element={<AuthedRoute><PayablePage /></AuthedRoute>} />
                <Route path="/user-management" element={<AuthedRoute><UsermanagementPage /></AuthedRoute>} />
                <Route path="/salary" element={<AuthedRoute><SalaryPage /></AuthedRoute>} />
                <Route path="/logo" element={<AuthedRoute><LogoPage /></AuthedRoute>} />
                <Route path="/tasks" element={<AuthedRoute><TaskPage /></AuthedRoute>} />
                <Route path="/settings/notice" element={<AuthedRoute><NoticePage /></AuthedRoute>} />
                <Route path="/settings/cod-change" element={<AuthedRoute><ChargeSettingsPage chargeType="codChange" /></AuthedRoute>} />
                <Route path="/settings/cod-charge" element={<AuthedRoute><ChargeSettingsPage chargeType="cod" /></AuthedRoute>} />
                <Route path="/settings/delivery-advance" element={<AuthedRoute><ChargeSettingsPage chargeType="deliveryAdvance" /></AuthedRoute>} />
                <Route path="/settings/delivery-charge" element={<AuthedRoute><ChargeSettingsPage chargeType="delivery" /></AuthedRoute>} />
                <Route path="/settings/role-permissions" element={<AuthedRoute><RolePermissionsPage /></AuthedRoute>} />
                <Route path="/notifications" element={<AuthedRoute><NotificationPage /></AuthedRoute>} />
                <Route path="/chat" element={<AuthedRoute><ChatPage /></AuthedRoute>} />
                <Route path="/profile" element={<AuthedRoute><ProfilePage /></AuthedRoute>} />
                <Route path="/expired-product" element={<AuthedRoute><ExpiredProductPage /></AuthedRoute>} />
              </Routes>
            </Suspense>
          </div>
        </div>

        <DeleteConfirmationProvider />
        <Toaster
          position="top-center"
          reverseOrder={false}
          containerStyle={{ zIndex: 2147483647 }}
        />
      </ErrorBoundary>
    </Provider>
  );
}

export default App;
