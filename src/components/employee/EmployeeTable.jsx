import { motion } from "framer-motion";
import {
  Edit,
  Plus,
  Trash2,
  FileText,
  Notebook,
  Download,
  Printer,
  Upload,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

import {
  useDeleteEmployeeMutation,
  useGetAllEmployeeQuery,
  useGetAllEmployeeWithoutQueryQuery,
  useInsertEmployeeMutation,
  useUpdateEmployeeMutation,
} from "../../features/employee/employee";
import { useGetAllBookWithoutQueryQuery } from "../../features/book/book";
import { useGetAllLedgerHistoryQuery } from "../../features/ledgerHistory/ledgerHistory";
import { useGetAllSalaryQuery } from "../../features/salary/salary";
import Modal from "../common/Modal";
import DateRangeFilter, { getDatePresetRange } from "../common/DateRangeFilter";
import { useLayout } from "../../context/LayoutContext";
import { translations } from "../../utils/translations";
import {
  useGetAllEmployeeListQuery,
  useGetAllEmployeeListWithoutQueryQuery,
} from "../../features/employeeList/employeeList";
import { useGetAllDepartmentsQuery } from "../../features/department/department";
import { useGetAllDesignationsQuery } from "../../features/designation/designation";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";
import { DEFAULT_COMPANY_NAME } from "../../utils/pdfBranding";
import SalaryStatementSheet, {
  SALARY_STATEMENT_CSS,
  formatPaymentDate,
} from "./SalaryStatementSheet";

const isActiveEmployee = (employee) =>
  String(employee?.status || "")
    .trim()
    .toLowerCase() === "active";

const getEmployeeCode = (employee) =>
  String(
    employee?.employee_id ??
      employee?.employeeCode ??
      employee?.employeeProfile?.employee_id ??
      employee?.employeeProfile?.employeeCode ??
      "",
  ).trim();

const normalizeSheetHeader = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const getSheetValue = (row, aliases) => {
  const normalizedRow = Object.entries(row || {}).reduce(
    (acc, [key, value]) => {
      acc[normalizeSheetHeader(key)] = value;
      return acc;
    },
    {},
  );

  for (const alias of aliases) {
    const key = normalizeSheetHeader(alias);
    if (normalizedRow[key] !== undefined && normalizedRow[key] !== null) {
      return normalizedRow[key];
    }
  }

  return "";
};

const normalizeSheetNumber = (value) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "0";
  }

  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? String(parsed) : "0";
};

// Payroll Sheet (PDF / Print) — header + footer like the HR salary sheet.
const PAYROLL_SHEET_GROUP_NAME = "Wazih Group";
const PAYROLL_SIGNATORIES_STORAGE_KEY = "payrollSheetSignatories";
const DEFAULT_PAYROLL_SIGNATORIES = [
  { role: "Prepared By", name: "Rebeka Sultana Mithun", title: "On Behalf of HRD" },
  { role: "Verified By", name: "Nazrul Islam", title: "Accountant" },
  { role: "Scrutinized By", name: "Abbas Uddin", title: "Head of Finance & Accounts" },
];

const loadPayrollSignatories = () => {
  try {
    const saved = JSON.parse(
      localStorage.getItem(PAYROLL_SIGNATORIES_STORAGE_KEY) || "null",
    );
    if (Array.isArray(saved) && saved.length === 3) {
      return DEFAULT_PAYROLL_SIGNATORIES.map((d, i) => ({
        ...d,
        name: String(saved[i]?.name ?? d.name),
        title: String(saved[i]?.title ?? d.title),
      }));
    }
  } catch {
    // storage blocked / bad JSON → defaults
  }
  return DEFAULT_PAYROLL_SIGNATORIES.map((d) => ({ ...d }));
};

const savePayrollSignatories = (signatories) => {
  try {
    localStorage.setItem(
      PAYROLL_SIGNATORIES_STORAGE_KEY,
      JSON.stringify(signatories.map(({ name, title }) => ({ name, title }))),
    );
  } catch {
    // not critical
  }
};

// "2026-09" → "September 2026"
const formatSheetMonth = (value) => {
  const match = /^(\d{4})-(\d{2})/.exec(String(value || ""));
  if (!match) return "";
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );
};

const toMonthValue = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

// Salary is paid the month after: paid October → September salary.
const previousMonthValue = (monthValue) => {
  const match = /^(\d{4})-(\d{2})/.exec(String(monthValue || ""));
  if (!match) return "";
  return toMonthValue(new Date(Number(match[1]), Number(match[2]) - 2, 1));
};

// Taka amount in words, Bangladeshi grouping (Crore / Lac / Thousand):
// 136088 → "One Lac Thirty Six Thousand Eighty Eight Taka Only".
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty",
  "Ninety",
];
const twoDigitWords = (n) =>
  n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]} ${ONES[n % 10]}`.trim();
const threeDigitWords = (n) => {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return [hundred ? `${ONES[hundred]} Hundred` : "", rest ? twoDigitWords(rest) : ""]
    .filter(Boolean)
    .join(" ");
};
const integerToWordsBD = (value) => {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return "Zero";
  const parts = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lac = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${integerToWordsBD(crore)} Crore`);
  if (lac) parts.push(`${twoDigitWords(lac)} Lac`);
  if (thousand) parts.push(`${twoDigitWords(thousand)} Thousand`);
  if (n) parts.push(threeDigitWords(n));
  return parts.join(" ");
};
const amountInWordsBD = (amount) => {
  const rounded = Math.round(Number(amount || 0) * 100) / 100;
  const taka = Math.floor(rounded);
  const paisa = Math.round((rounded - taka) * 100);
  return `${integerToWordsBD(taka)} Taka${paisa ? ` and ${twoDigitWords(paisa)} Paisa` : ""} Only`;
};

// Shared look for the payroll filter row (matches DateRangeFilter).
const FILTER_LABEL =
  "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5";
const FILTER_CONTROL =
  "h-11 w-full rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

const EmployeeTable = () => {
  const { language } = useLayout();
  const t = translations[language] || translations.EN;
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");
  const normalizedRole = String(role || "")
    .trim()
    .toLowerCase();
  const isAccountant = normalizedRole === "accountant";
  const canManagePayroll = !isAccountant;

  // ----------------------------
  // Modals
  // ----------------------------
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditModalOpen1, setIsEditModalOpen1] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSheetUploadModalOpen, setIsSheetUploadModalOpen] = useState(false);
  const [sheetDraftRows, setSheetDraftRows] = useState([]);
  const [isSheetSaving, setIsSheetSaving] = useState(false);
  const sheetFileInputRef = useRef(null);

  // Invoice (single)
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceEmployee, setInvoiceEmployee] = useState(null);
  const invoiceRef = useRef(null);

  // Invoice (bulk)
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkInvoiceOpen, setIsBulkInvoiceOpen] = useState(false);
  const bulkInvoiceRef = useRef(null);

  // ----------------------------
  // Employee state
  // ----------------------------
  const [currentEmployee, setCurrentEmployee] = useState(null);

  const emptyEmployee = {
    date: "",
    name: "",
    departmentId: "",
    designationId: "",
    employeeListId: "",
    employee_id: "",
    joining_date: "",
    pre_joining_days: "",
    payable_days: "",
    bookId: "",
    basic_salary: "",
    incentive: "",
    festival_bonus: "",
    bonus: "",
    additional_pay: "",
    holiday_payment: "",
    total_salary: "",
    advance: "",
    advance_recovered: "",
    late: "",
    early_leave: "",
    absent: "",
    half_day_absent: "",
    friday_absent: "",
    unapproval_absent: "",
    approval_absent: "",
    sick_exam_days: "",
    misc_deduction: "",
    sale_amount: "",
    net_salary: "",
    note: "",
    remarks: "",
    status: "Pending",
  };

  const [createEmployee, setCreateEmployee] = useState(emptyEmployee);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // list + filter states
  const [employees, setEmployees] = useState([]);
  const [employeesAll, setEmployeesAll] = useState([]);

  const defaultPayrollRange = useMemo(
    () => getDatePresetRange("thisMonth"),
    [],
  );
  const [startDate, setStartDate] = useState(defaultPayrollRange.from);
  const [endDate, setEndDate] = useState(defaultPayrollRange.to);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedDesignation, setSelectedDesignation] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [phoneFilter, setPhoneFilter] = useState("");
  // Bumped by Clear Filters so the date dropdown also goes back to This Month.
  const [filterResetKey, setFilterResetKey] = useState(0);

  // ✅ Per-page user selectable
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [currentPage, setCurrentPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesPerSet, setPagesPerSet] = useState(10);

  // ----------------------------
  // Fine meta
  // ----------------------------
  const [fine, setFine] = useState({
    late: 0,
    early_leave: 0,
    absent: 0,
    half_day_absent: 0,
    friday_absent: 0,
    unapproval_absent: 0,
  });

  const {
    data: fineData,
    isLoading: fineLoading,
    error: fineError,
  } = useGetAllSalaryQuery();

  useEffect(() => {
    if (fineError) {
      console.error("Error fetching fine meta", fineError);
      return;
    }
    if (!fineLoading && fineData?.data) {
      const payload = Array.isArray(fineData.data)
        ? fineData.data[0]
        : fineData.data;

      setFine((prev) => ({
        late: Number(payload?.late ?? prev.late ?? 0),
        early_leave: Number(payload?.early_leave ?? prev.early_leave ?? 0),
        absent: Number(payload?.absent ?? prev.absent ?? 0),
        friday_absent: Number(
          payload?.friday_absent ?? prev.friday_absent ?? 0,
        ),
        unapproval_absent: Number(
          payload?.unapproval_absent ?? prev.unapproval_absent ?? 0,
        ),
      }));
    }
  }, [fineData, fineLoading, fineError]);

  // ----------------------------
  // Salary Calculation
  // ----------------------------
  const calcSalary = (p) => {
    const basic_salary = Number(p.basic_salary) || 0;
    const incentive = Number(p.incentive) || 0;
    const festival_bonus = Number(p.festival_bonus) || 0;
    const bonus = Number(p.bonus) || 0;
    const additional_pay = Number(p.additional_pay) || 0;
    const holiday_days = Number(p.holiday_payment) || 0;
    // Only the recovered part of the advance is deducted. Sheet-import rows
    // have no advance_recovered and keep deducting their advance column.
    const advance = Number(p.advance_recovered ?? p.advance) || 0;
    const payable_days =
      p.payable_days === "" ||
      p.payable_days === null ||
      p.payable_days === undefined
        ? 30
        : Math.max(Math.min(Number(p.payable_days) || 0, 30), 0);

    const late = Number(p.late) || 0;
    const early_leave = Number(p.early_leave) || 0;
    const absent = Number(p.absent) || 0;
    const half_day_absent = Number(p.half_day_absent) || 0;
    const friday_absent = Number(p.friday_absent) || 0;
    const unapproval_absent = Number(p.unapproval_absent) || 0;
    const approval_absent = Number(p.approval_absent) || 0;
    const sick_exam_days = Number(p.sick_exam_days) || 0;
    const misc_deduction = Number(p.misc_deduction) || 0;

    const perDayBasicSalary = basic_salary / 30;

    // Approval Absent deducts only from the Basic Salary component (not
    // Incentive, not via the configurable per-day fine rates like the other
    // absence fields) — it reduces the days Basic Salary is paid for.
    const approvalAbsentCut = perDayBasicSalary * approval_absent;
    const basic_payable_salary =
      perDayBasicSalary * payable_days - approvalAbsentCut;
    const holiday_salary = perDayBasicSalary * holiday_days;
    const total_salary = basic_payable_salary + incentive;

    const perDay = (basic_salary + incentive) / 30;

    const lateAbsentCount = Math.floor(late / 3);
    const earlyAbsentCount = Math.floor(early_leave / 3);

    const lateCut = lateAbsentCount * (Number(fine.late) * perDay);
    const earlyLeaveCut =
      earlyAbsentCount * (Number(fine.early_leave) * perDay);
    const absentCut = absent * (Number(fine.absent) * perDay);
    const halfDayAbsentCut =
      half_day_absent * (Number(fine.absent) * perDay * 0.5);
    const fridayAbsentCut =
      friday_absent * (Number(fine.friday_absent) * perDay);
    const unapprovalAbsentCut =
      unapproval_absent * (Number(fine.unapproval_absent) * perDay);

    const totalCutAmount =
      lateCut +
      earlyLeaveCut +
      absentCut +
      halfDayAbsentCut +
      fridayAbsentCut +
      unapprovalAbsentCut;

    // Bonus adds straight into Net Salary (the main/take-home salary),
    // same as Festival Bonus.
    // Sick/Exam days deduct one day of Basic each; Misc is a flat amount.
    const sickExamCut = perDayBasicSalary * sick_exam_days;

    const net_salary =
      total_salary -
      totalCutAmount -
      sickExamCut -
      misc_deduction -
      advance +
      holiday_salary +
      festival_bonus +
      bonus +
      additional_pay;

    const safe = (n) => (Number.isFinite(n) ? n : 0);

    return {
      perDay: safe(perDay),
      total_salary: safe(total_salary),
      cutAmount: safe(totalCutAmount),
      net_salary: Math.max(safe(net_salary), 0),
    };
  };

  const getHolidayDays = (employee) => Number(employee?.holiday_payment || 0);

  const getHolidaySalaryAmount = (employee) => {
    const basicSalary = Number(employee?.basic_salary || 0);
    return (basicSalary / 30) * getHolidayDays(employee);
  };

  const getAdvanceRecoveredError = (employee) => {
    const recovered = Number(employee?.advance_recovered) || 0;
    if (recovered < 0) return "Advance Recovered cannot be negative!";
    if (recovered > (Number(employee?.advance) || 0))
      return "Advance Recovered cannot be more than Advance!";
    return "";
  };

  const getRemainingAdvanceLabel = (employee) => {
    const remaining = Math.max(
      (Number(employee?.advance) || 0) -
        (Number(employee?.advance_recovered) || 0),
      0,
    );
    return `Advance Recovered (Remaining: ৳${remaining.toLocaleString()}):`;
  };

  // Maps a salary row onto the Salary Statement sheet. Entitlement/deduction
  // lines are arranged so Gross − Total Deduction = net_salary:
  // approval-absent days (cut from basic in calcSalary) are shown under
  // absent days instead of shrinking Basic Pay.
  const buildSalaryStatementData = (employee) => {
    const basicSalary = Number(employee?.basic_salary || 0);
    const perDayBasic = basicSalary / 30;
    const perDay = (basicSalary + Number(employee?.incentive || 0)) / 30;
    const rawPayableDays = employee?.payable_days;
    const payableDays =
      rawPayableDays === "" || rawPayableDays == null
        ? 30
        : Math.max(Math.min(Number(rawPayableDays) || 0, 30), 0);
    const holidayDays = getHolidayDays(employee);
    const count = (key) => Number(employee?.[key] || 0);

    const basicPay = perDayBasic * payableDays;
    const approvalAbsentCut = perDayBasic * count("approval_absent");
    const sickExamCut = perDayBasic * count("sick_exam_days");
    const absentCut =
      approvalAbsentCut +
      count("absent") * Number(fine.absent) * perDay +
      count("half_day_absent") * Number(fine.absent) * perDay * 0.5 +
      count("friday_absent") * Number(fine.friday_absent) * perDay +
      count("unapproval_absent") * Number(fine.unapproval_absent) * perDay;
    const lateCut = Math.floor(count("late") / 3) * Number(fine.late) * perDay;
    const earlyLeaveCut =
      Math.floor(count("early_leave") / 3) * Number(fine.early_leave) * perDay;
    const absentDays =
      count("absent") +
      count("half_day_absent") * 0.5 +
      count("friday_absent") +
      count("unapproval_absent") +
      count("approval_absent");

    const entitlements = [
      {
        label:
          payableDays < 30 ? `Basic Pay (${payableDays} days)` : "Basic Pay",
        amount: basicPay,
      },
      { label: "Incentive", amount: Number(employee?.incentive || 0) },
      {
        label: `Encashment for Off Day Duty${holidayDays ? ` (${holidayDays} days)` : ""}`,
        amount: getHolidaySalaryAmount(employee),
      },
      {
        label: "Additional Pay/ Allowance (If any)",
        amount:
          Number(employee?.festival_bonus || 0) +
          Number(employee?.bonus || 0) +
          Number(employee?.additional_pay || 0),
      },
      { label: "Advance Pay (When Applicable) for the month of", amount: 0 },
    ];
    const deductions = [
      { label: "Recovery of Advance Pay", amount: count("advance_recovered") },
      {
        label: `Deduction for absent days${absentDays ? ` (${absentDays})` : ""}`,
        amount: absentCut,
      },
      {
        label: `Deduction for Sick/Exam days${count("sick_exam_days") ? ` (${count("sick_exam_days")})` : ""}`,
        amount: sickExamCut,
      },
      {
        label: `Deduction for late days (Every 3 days, count as 1 day)${count("late") ? ` (${count("late")})` : ""}`,
        amount: lateCut,
      },
      {
        label: `Misc Deduction (If any)${count("early_leave") ? ` - Early Leave (${count("early_leave")})` : ""}`,
        amount: count("misc_deduction") + earlyLeaveCut,
      },
    ];

    const grossPayment = entitlements.reduce((sum, row) => sum + row.amount, 0);
    const netPayable = Number(employee?.net_salary || 0);
    const employeeListId = String(employee?.employeeListId ?? "");
    const listEmployee = employeeListId
      ? employeeListRows.find(
          (row) => String(row?.Id ?? row?.id ?? "") === employeeListId,
        )
      : null;

    return {
      companyName: DEFAULT_COMPANY_NAME,
      phone: "+880 9647-555333",
      paymentDate: formatPaymentDate(new Date()),
      employeeName: employee?.name || "",
      employeeId: employee?.employee_id || "",
      department:
        employee?.department?.name ||
        findDepartmentOption(employee?.departmentId)?.label ||
        "",
      mobile: employee?.phone || listEmployee?.phone || "",
      entitlements,
      grossPayment,
      deductions,
      totalDeduction: Math.max(grossPayment - netPayable, 0),
      netPayable,
      remarks: employee?.remarks || "",
      preparedBy: "",
      preparedByRole: "HR",
      approvedByTitle: `Finance Controller, ${DEFAULT_COMPANY_NAME}`,
    };
  };

  // One payroll row in the Payroll Sheet layout (table + exports). Amounts
  // come from the Salary Statement so they always match the payslip:
  // Gross − Total Deduct = Net Salary.
  const getPayrollSheetBreakdown = (employee) => {
    const statement = buildSalaryStatementData(employee);
    const count = (key) => Number(employee?.[key] || 0);
    const encash = statement.entitlements[2];
    const miscAddition = statement.entitlements[3];
    const [advanceRow, absentRow, sickExamRow, lateRow, miscRow] =
      statement.deductions;

    return {
      basicSalary: count("basic_salary"),
      encashDays: getHolidayDays(employee),
      encashAmount: encash.amount,
      incentive: count("incentive"),
      saleAmount: count("sale_amount"),
      miscAddition: miscAddition.amount,
      grossSalary: statement.grossPayment,
      advance: advanceRow.amount,
      lateDays: count("late"),
      lateDeduct: lateRow.amount,
      absentDays:
        count("absent") +
        count("half_day_absent") * 0.5 +
        count("friday_absent") +
        count("unapproval_absent") +
        count("approval_absent"),
      absentDeduct: absentRow.amount,
      // Sick/Exam days and early-leave cuts have no column of their own.
      miscDeduct: miscRow.amount + sickExamRow.amount,
      totalDeduct: statement.totalDeduction,
      netSalary: statement.netPayable,
      remarks: employee?.remarks || "",
    };
  };

  // Payroll period = 26th of the previous month → 25th of the salary month
  // (month of the Date field, else this month). Joined before the period →
  // full 30; after it → 0; inside it → days from joining to the 25th
  // (joined on the 1st → 25), capped at 30.
  const PAYROLL_PERIOD_END_DAY = 25;
  const getDefaultPayableDays = (joiningDate, salaryDate) => {
    const join = String(joiningDate || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(join)) return 30;
    const salaryMonth = /^\d{4}-\d{2}/.test(String(salaryDate || ""))
      ? String(salaryDate).slice(0, 7)
      : new Date().toISOString().slice(0, 7);
    const [year, month] = salaryMonth.split("-").map(Number);
    const toUtc = (y, m, d) => Date.UTC(y, m - 1, d);
    const periodStart = toUtc(year, month - 1, PAYROLL_PERIOD_END_DAY + 1);
    const periodEnd = toUtc(year, month, PAYROLL_PERIOD_END_DAY);
    const joinedAt = toUtc(...join.split("-").map(Number));

    if (joinedAt <= periodStart) return 30;
    if (joinedAt > periodEnd) return 0;
    const days = Math.round((periodEnd - joinedAt) / 86400000) + 1;
    return Math.min(days, 30);
  };

  const applyDefaultPayableDays = (employee) => {
    const payableDays = getDefaultPayableDays(
      employee?.joining_date,
      employee?.date,
    );
    return {
      ...employee,
      payable_days: String(payableDays),
      pre_joining_days: String(30 - payableDays),
    };
  };

  const applyPreJoiningDays = (employee, value) => {
    const preJoiningDays = Math.max(Math.min(Number(value) || 0, 30), 0);

    return {
      ...employee,
      pre_joining_days: value,
      payable_days: Math.max(30 - preJoiningDays, 0),
    };
  };

  const updateCreateField = (key, value) => {
    setCreateEmployee((prev) => {
      const next =
        key === "pre_joining_days"
          ? applyPreJoiningDays(prev, value)
          : key === "joining_date" || key === "date"
            ? applyDefaultPayableDays({ ...prev, [key]: value })
            : { ...prev, [key]: value };
      const s = calcSalary(next);
      return {
        ...next,
        total_salary: s.total_salary.toFixed(2),
        net_salary: s.net_salary.toFixed(2),
      };
    });
  };

  const updateCurrentField = (key, value) => {
    setCurrentEmployee((prev) => {
      const next =
        key === "pre_joining_days"
          ? applyPreJoiningDays(prev, value)
          : key === "joining_date" || key === "date"
            ? applyDefaultPayableDays({ ...prev, [key]: value })
            : { ...prev, [key]: value };
      const s = calcSalary(next);
      return {
        ...next,
        total_salary: s.total_salary.toFixed(2),
        net_salary: s.net_salary.toFixed(2),
      };
    });
  };

  // ----------------------------
  // Queries
  // ----------------------------
  const {
    data: dataAll,
    isLoading: isLoadingAll,
    isError: isErrorAll,
    error: errorAll,
  } = useGetAllEmployeeWithoutQueryQuery();

  useEffect(() => {
    if (isErrorAll) {
      console.error("Error fetching employees", errorAll);
      return;
    }
    if (!isLoadingAll && dataAll?.data) {
      setEmployeesAll(dataAll.data);
    }
  }, [dataAll, isLoadingAll, isErrorAll, errorAll]);

  useEffect(() => {
    const updatePagesPerSet = () => {
      if (window.innerWidth < 640) setPagesPerSet(5);
      else if (window.innerWidth < 1024) setPagesPerSet(7);
      else setPagesPerSet(10);
    };
    updatePagesPerSet();
    window.addEventListener("resize", updatePagesPerSet);
    return () => window.removeEventListener("resize", updatePagesPerSet);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setStartPage(1);
  }, [
    startDate,
    endDate,
    selectedEmployee,
    selectedDepartment,
    selectedDesignation,
    selectedStatus,
    phoneFilter,
    itemsPerPage,
  ]);

  const { data: employeeList } = useGetAllEmployeeListWithoutQueryQuery();
  const { data: employeeListOptionsData } = useGetAllEmployeeListQuery({
    page: 1,
    limit: 1000,
  });

  const employeeListRows = useMemo(() => {
    const rowsById = new Map();

    [...(employeeList?.data || []), ...(employeeListOptionsData?.data || [])]
      .filter(Boolean)
      .forEach((employee) => {
        const id = employee?.Id ?? employee?.id ?? "";
        if (!id) return;
        rowsById.set(String(id), employee);
      });

    return [...rowsById.values()];
  }, [employeeList, employeeListOptionsData]);

  const phoneMatchedEmployeeListId = useMemo(() => {
    const trimmed = phoneFilter.trim();
    if (!trimmed) return undefined;
    const matched = employeeListRows.find(
      (e) => e.phone && e.phone.includes(trimmed),
    );
    return matched ? String(matched.Id) : "0";
  }, [phoneFilter, employeeListRows]);

  const queryArgs = {
    page: currentPage,
    limit: itemsPerPage,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    employeeListId:
      selectedEmployee?.employeeListId ||
      selectedEmployee?.id ||
      selectedEmployee?.value ||
      phoneMatchedEmployeeListId ||
      undefined,
    departmentId: selectedDepartment?.value || undefined,
    designationId: selectedDesignation?.value || undefined,
    status: selectedStatus === "All" ? undefined : selectedStatus,
  };

  const { data, isLoading, isError, error, refetch } =
    useGetAllEmployeeQuery(queryArgs);

  useEffect(() => {
    if (isError) {
      console.error("Error fetching employee data", error);
      return;
    }
    if (!isLoading && data?.data) {
      setEmployees(data.data);
      setTotalPages(Math.ceil((data?.meta?.count || 0) / itemsPerPage) || 1);
    }
  }, [data, isLoading, isError, error, currentPage, itemsPerPage]);
  const { data: allBookRes } = useGetAllBookWithoutQueryQuery();
  const { data: departmentsData, isLoading: isDepartmentsLoading } =
    useGetAllDepartmentsQuery({ page: 1, limit: 500 });
  const { data: designationsData, isLoading: isDesignationsLoading } =
    useGetAllDesignationsQuery({ page: 1, limit: 500 });

  // ----------------------------
  // Options
  // ----------------------------
  const buildEmployeeOption = (employee) => {
    const id = employee?.Id ?? employee?.id ?? "";
    const name = employee?.name || "";
    const employeeNo = getEmployeeCode(employee);

    if (!id || !name) return null;

    return {
      value: String(id),
      label: name,
      id: String(id),
      employeeListId: String(id),
      employee_id: employeeNo,
      phone: employee?.phone || "",
      status: employee?.status || "",
      employee,
    };
  };

  const employeeOptions = useMemo(() => {
    const seen = new Set();

    return employeeListRows
      .map((employee) => {
        const id = employee.Id ?? employee.id ?? "";
        const employeeNo = getEmployeeCode(employee);
        const key = id
          ? `employee-list-${id}`
          : employeeNo
            ? `employee-${employeeNo}`
            : String(employee.name || "")
                .trim()
                .toLowerCase();

        if (!key || seen.has(String(key))) return null;
        seen.add(String(key));

        return buildEmployeeOption(employee);
      })
      .filter(Boolean);
  }, [employeeListRows]);

  const employeeSalaryOptions = useMemo(() => {
    const seen = new Set();

    return employeeListRows
      .filter(isActiveEmployee)
      .map((employee) => {
        const id = employee.Id ?? employee.id ?? "";
        const name = employee.name || "";
        const employeeNo = getEmployeeCode(employee);
        const key = id
          ? `employee-list-${id}`
          : employeeNo
            ? `employee-${employeeNo}`
            : name.trim().toLowerCase();

        if (!key || seen.has(String(key))) return null;
        seen.add(String(key));

        return {
          value: String(id),
          label: name,
          name,
          id,
          employee_id: employeeNo,
          salary:
            employee.salary ?? employee.basic_salary ?? employee.price ?? "",
          joiningDate: employee.joiningDate || "",
          departmentId: employee.departmentId
            ? String(employee.departmentId)
            : "",
          designationId: employee.designationId
            ? String(employee.designationId)
            : "",
        };
      })
      .filter(Boolean);
  }, [employeeListRows]);

  const getEmployeeListById = (id) =>
    employeeListRows.find(
      (employee) =>
        String(employee?.Id ?? employee?.id ?? "") === String(id || ""),
    );

  const getEmployeeListByEmployeeNo = (employeeNo) =>
    employeeListRows.find(
      (employee) =>
        getEmployeeCode(employee) === String(employeeNo || "").trim(),
    );

  const buildPayrollPlaceholder = (employee) => {
    if (!employee) return null;

    const salary = Number(employee.salary ?? employee.basic_salary ?? 0) || 0;

    return {
      Id: `employee-list-${employee.Id ?? employee.id}`,
      __isPayrollPlaceholder: true,
      name: employee.name || "",
      employee_id: getEmployeeCode(employee),
      employeeListId: employee.Id ?? employee.id ?? "",
      departmentId: employee.departmentId || "",
      designationId: employee.designationId || "",
      department: employee.department || null,
      designation: employee.designation || null,
      employeeProfile: employee,
      joining_date: employee.joiningDate || "",
      basic_salary: salary,
      incentive: 0,
      festival_bonus: 0,
      bonus: 0,
      additional_pay: 0,
      holiday_payment: 0,
      approval_absent: 0,
      sick_exam_days: 0,
      misc_deduction: 0,
      sale_amount: 0,
      advance: employee.advance || 0,
      total_salary: salary,
      net_salary: salary,
      status: "Not Created",
    };
  };

  const selectedEmployeeListRecord = useMemo(() => {
    const id =
      selectedEmployee?.employeeListId ||
      selectedEmployee?.id ||
      selectedEmployee?.value ||
      phoneMatchedEmployeeListId;
    if (!id || id === "0") return null;

    return (
      getEmployeeListById(id) ||
      selectedEmployee?.employee ||
      getEmployeeListByEmployeeNo(selectedEmployee?.employee_id)
    );
  }, [employeeListRows, phoneMatchedEmployeeListId, selectedEmployee]);

  const displayEmployees = useMemo(() => {
    const rows = employees || [];
    if (!selectedEmployeeListRecord) return rows;

    const selectedId = String(
      selectedEmployeeListRecord.Id ?? selectedEmployeeListRecord.id ?? "",
    );
    const selectedEmployeeNo = String(
      selectedEmployeeListRecord.employee_id ?? "",
    );
    const hasPayrollRow = rows.some((row) => {
      const rowListId = String(row.employeeListId ?? "");
      const rowEmployeeNo = String(row.employee_id ?? "");
      return (
        (selectedId && rowListId === selectedId) ||
        (selectedEmployeeNo && rowEmployeeNo === selectedEmployeeNo)
      );
    });

    if (hasPayrollRow) return rows;

    const placeholder = buildPayrollPlaceholder(selectedEmployeeListRecord);
    return placeholder ? [placeholder] : rows;
  }, [employees, selectedEmployeeListRecord]);

  const departmentOptions = useMemo(() => {
    return (departmentsData?.data || []).map((department) => ({
      value: String(department.Id ?? department.id ?? ""),
      label: department.name || "Unnamed Department",
    }));
  }, [departmentsData]);

  const findDepartmentOption = (departmentId) =>
    departmentOptions.find(
      (option) => String(option.value) === String(departmentId || ""),
    ) || null;

  const designationOptions = useMemo(() => {
    return (designationsData?.data || []).map((designation) => ({
      value: String(designation.Id ?? designation.id ?? ""),
      label: designation.name || "Unnamed Designation",
      departmentId: designation.departmentId
        ? String(designation.departmentId)
        : "",
    }));
  }, [designationsData]);

  const getDesignationOptions = (departmentId) => {
    const normalizedDepartmentId = String(departmentId || "");
    if (!normalizedDepartmentId) return designationOptions;

    return designationOptions.filter(
      (option) =>
        !option.departmentId || option.departmentId === normalizedDepartmentId,
    );
  };

  const findDesignationOption = (designationId, departmentId) =>
    getDesignationOptions(departmentId).find(
      (option) => String(option.value) === String(designationId || ""),
    ) || null;

  const filterDesignationOptions = useMemo(
    () => getDesignationOptions(selectedDepartment?.value),
    [designationOptions, selectedDepartment],
  );

  const bookOptions = useMemo(() => {
    return (allBookRes?.data || []).map((book) => ({
      value: String(book?.Id ?? book?.id ?? ""),
      label: book?.name || "Unnamed Book",
    }));
  }, [allBookRes]);

  const hasAdvanceValue = (value) => {
    if (value === null || value === undefined) return false;
    return String(value).trim() !== "";
  };

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const normalizeOptionalId = (value) => {
    if (value === null || value === undefined || String(value).trim() === "") {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const getAdvanceBalanceValue = (response) =>
    response?.meta?.netBalance ??
    response?.meta?.net_balance ??
    response?.meta?.unpaid ??
    response?.data?.[0]?.netBalance ??
    response?.data?.[0]?.net_balance ??
    response?.data?.[0]?.unpaidAmount;

  const createEmployeeId = createEmployee?.employee_id?.toString().trim() || "";
  const currentEmployeeId =
    currentEmployee?.employee_id?.toString().trim() || "";

  const getEmployeeInternalId = (employeeCode) => {
    if (!employeeCode) return undefined;

    const matchedEmployee = employeeListRows.find(
      (employee) => String(employee?.employee_id ?? "").trim() === employeeCode,
    );

    return matchedEmployee?.Id ?? matchedEmployee?.id ?? undefined;
  };

  const createLedgerEmployeeId = createEmployeeId || "";
  const currentLedgerEmployeeId = currentEmployeeId || "";

  const { data: createLedgerHistoryData } = useGetAllLedgerHistoryQuery(
    {
      page: 1,
      limit: 1000,
      employeeId: createLedgerEmployeeId,
    },
    { skip: !createLedgerEmployeeId },
  );

  console.log("createLedgerHistoryData", createLedgerHistoryData);

  const { data: currentLedgerHistoryData } = useGetAllLedgerHistoryQuery(
    {
      page: 1,
      limit: 1000,
      employeeId: currentLedgerEmployeeId,
    },
    { skip: !currentLedgerEmployeeId },
  );

  const createNetBalance = toNumber(
    getAdvanceBalanceValue(createLedgerHistoryData),
  );
  const currentNetBalance = toNumber(
    getAdvanceBalanceValue(currentLedgerHistoryData),
  );
  const hasCreateNetBalance =
    createLedgerEmployeeId &&
    getAdvanceBalanceValue(createLedgerHistoryData) !== undefined &&
    createNetBalance > 0;
  const hasCurrentNetBalance =
    currentLedgerEmployeeId &&
    getAdvanceBalanceValue(currentLedgerHistoryData) !== undefined &&
    currentNetBalance > 0;

  const applyEmployeeSalaryDefaults = (prev, selected) => {
    const next = applyDefaultPayableDays({
      ...(prev || {}),
      name: selected?.name || selected?.label || "",
      departmentId: selected?.departmentId || "",
      designationId: selected?.designationId || "",
      employeeListId: selected?.id || "",
      employee_id: selected?.employee_id || getEmployeeCode(selected?.employee),
      joining_date: selected?.joiningDate || "",
      basic_salary:
        selected?.salary !== undefined && selected?.salary !== null
          ? String(selected.salary)
          : "",
      festival_bonus: prev?.festival_bonus ?? "",
    });

    const s = calcSalary(next);

    return {
      ...next,
      total_salary: s.total_salary.toFixed(2),
      net_salary: s.net_salary.toFixed(2),
    };
  };

  const applyAttendanceDeductionDefaults = (base, sheetRow) => {
    const next = {
      ...base,
      absent: normalizeSheetNumber(
        getSheetValue(sheetRow, ["Absent", "absent", "Absent Days"]),
      ),
      late: normalizeSheetNumber(
        getSheetValue(sheetRow, ["Late", "late", "Late Days"]),
      ),
      sale_amount: normalizeSheetNumber(
        getSheetValue(sheetRow, ["Sale Amount", "sale_amount", "Sales Amount"]),
      ),
      early_leave: normalizeSheetNumber(
        getSheetValue(sheetRow, [
          "Early Out",
          "Early Leave",
          "early_leave",
          "early leave",
          "early out",
        ]),
      ),
    };
    const s = calcSalary(next);

    return {
      ...next,
      total_salary: s.total_salary.toFixed(2),
      net_salary: s.net_salary.toFixed(2),
    };
  };

  const handleCreateEmployeeSelect = (selected) => {
    setCreateEmployee((prev) => applyEmployeeSalaryDefaults(prev, selected));
  };

  const handleCurrentEmployeeSelect = (selected) => {
    setCurrentEmployee((prev) => applyEmployeeSalaryDefaults(prev, selected));
  };

  const selectPortalTarget =
    typeof document !== "undefined" ? document.body : null;

  const formatEmployeeSalaryOption = (option, { context }) => {
    const name = option?.name || option?.label || "";
    if (context === "value") return name;

    return (
      <div className="flex flex-col">
        <span className="font-medium text-slate-900">{name}</span>
        <span className="text-xs text-slate-500">
          ID: {option?.employee_id || option?.id || "-"} - Salary:{" "}
          {option?.salary || 0}
        </span>
      </div>
    );
  };

  useEffect(() => {
    if (!createEmployeeId) return;

    setCreateEmployee((prev) => {
      if (!prev || prev.employee_id?.toString().trim() !== createEmployeeId) {
        return prev;
      }

      const next = hasCreateNetBalance
        ? { ...prev, advance: String(createNetBalance) }
        : { ...prev, advance: "" };
      const s = calcSalary(next);

      return {
        ...next,
        total_salary: s.total_salary.toFixed(2),
        net_salary: s.net_salary.toFixed(2),
      };
    });
  }, [createEmployeeId, createNetBalance, hasCreateNetBalance]);

  useEffect(() => {
    if (!currentEmployeeId) return;

    setCurrentEmployee((prev) => {
      if (!prev || prev.employee_id?.toString().trim() !== currentEmployeeId) {
        return prev;
      }

      // Ledger balance already includes this salary's own recovery.
      const ownRecovery =
        prev.saved_employee_id === currentEmployeeId
          ? Number(prev.saved_advance_recovered || 0)
          : 0;
      const outstanding = Math.max(
        (hasCurrentNetBalance ? currentNetBalance : 0) + ownRecovery,
        0,
      );
      const next = {
        ...prev,
        advance: outstanding > 0 ? String(outstanding) : "",
      };
      const s = calcSalary(next);

      return {
        ...next,
        total_salary: s.total_salary.toFixed(2),
        net_salary: s.net_salary.toFixed(2),
      };
    });
  }, [currentEmployeeId, currentNetBalance, hasCurrentNetBalance]);

  // ----------------------------
  // Modal Handlers
  // ----------------------------
  const handleEditClick = (employee) => {
    if (!canManagePayroll) return;

    const normalized = {
      ...employee,
      date: employee.date ?? "",
      name: employee.name ?? "",
      departmentId: employee.departmentId ?? "",
      designationId:
        employee.designationId ?? employee.employeeProfile?.designationId ?? "",
      employeeListId:
        employee.employeeListId ??
        getEmployeeInternalId(getEmployeeCode(employee)) ??
        "",
      employee_id: getEmployeeCode(employee),
      joining_date:
        employee.joining_date ?? employee.employeeProfile?.joiningDate ?? "",
      pre_joining_days: employee.pre_joining_days ?? "",
      payable_days: employee.payable_days ?? "",
      bookId: employee.bookId ?? employee.book?.Id ?? employee.book?.id ?? "",
      basic_salary: employee.basic_salary ?? "",
      incentive: employee.incentive ?? "",
      festival_bonus: employee.festival_bonus ?? "",
      bonus: employee.bonus ?? "",
      additional_pay: employee.additional_pay ?? "",
      holiday_payment: employee.holiday_payment ?? "",
      total_salary: employee.total_salary ?? "",
      advance: employee.advance ?? "",
      advance_recovered: employee.advance_recovered ?? "",
      // What this salary already recovered — added back so the Advance field
      // shows the balance as it stood before this salary.
      saved_advance_recovered: Number(employee.advance_recovered || 0),
      saved_employee_id: String(employee.employee_id ?? "").trim(),
      late: employee.late ?? "",
      early_leave: employee.early_leave ?? "",
      absent: employee.absent ?? "",
      half_day_absent: employee.half_day_absent ?? "",
      friday_absent: employee.friday_absent ?? "",
      unapproval_absent: employee.unapproval_absent ?? "",
      approval_absent: employee.approval_absent ?? "",
      sick_exam_days: employee.sick_exam_days ?? "",
      misc_deduction: employee.misc_deduction ?? "",
      sale_amount: employee.sale_amount ?? "",
      net_salary: employee.net_salary ?? "",
      note: employee.note ?? "",
      remarks: employee.remarks ?? "",
      userId: userId,
    };

    const s = calcSalary(normalized);
    setCurrentEmployee({
      ...normalized,
      total_salary: s.total_salary.toFixed(2),
      net_salary: s.net_salary.toFixed(2),
    });

    setIsEditModalOpen(true);
  };

  const handleEditClick1 = (employee) => {
    if (!canManagePayroll) return;

    const normalized = {
      ...employee,
      name: employee.name ?? "",
      employee_id: getEmployeeCode(employee),
      note: employee.note ?? "",
      remarks: employee.remarks ?? "",
      userId: userId,
    };

    setCurrentEmployee(normalized);
    setIsEditModalOpen1(true);
  };

  const closeEditModal = () => setIsEditModalOpen(false);
  const closeEditModal1 = () => setIsEditModalOpen1(false);
  const openAddModal = () => {
    if (!canManagePayroll) return;
    setIsAddModalOpen(true);
  };
  const closeAddModal = () => setIsAddModalOpen(false);
  const openAddModalForEmployee = (employee) => {
    if (!canManagePayroll) return;

    const option = employeeSalaryOptions.find(
      (item) =>
        String(item.value) === String(employee?.employeeListId || "") ||
        String(item.employee_id || "") === String(employee?.employee_id || ""),
    );

    setCreateEmployee((prev) =>
      option ? applyEmployeeSalaryDefaults(prev, option) : prev,
    );
    setIsAddModalOpen(true);
  };

  // ----------------------------
  // Mutations
  // ----------------------------
  const [insertEmployee] = useInsertEmployeeMutation();
  const [updateEmployee] = useUpdateEmployeeMutation();
  const [deleteEmployee] = useDeleteEmployeeMutation();

  const buildEmployeeCreatePayload = (source) => {
    const s = calcSalary(source);

    return {
      ...source,
      date: source.date || undefined,
      name: source.name || "",
      departmentId: normalizeOptionalId(source.departmentId),
      designationId: normalizeOptionalId(source.designationId),
      employee_id: source.employee_id || "",
      employeeListId: normalizeOptionalId(source.employeeListId),
      joining_date: source.joining_date || null,
      pre_joining_days: Number(source.pre_joining_days) || 0,
      payable_days:
        source.payable_days === "" ? 30 : Number(source.payable_days) || 0,
      bookId: normalizeOptionalId(source.bookId),
      note: source.note || "",
      remarks: source.remarks || "",

      basic_salary: Number(source.basic_salary) || 0,
      incentive: Number(source.incentive) || 0,
      festival_bonus: Number(source.festival_bonus) || 0,
      bonus: Number(source.bonus) || 0,
      additional_pay: Number(source.additional_pay) || 0,
      holiday_payment: Number(source.holiday_payment) || 0,

      advance: Number(source.advance) || 0,
      advance_recovered: Number(source.advance_recovered) || 0,
      late: Number(source.late) || 0,
      early_leave: Number(source.early_leave) || 0,
      absent: Number(source.absent) || 0,
      half_day_absent: Number(source.half_day_absent) || 0,
      friday_absent: Number(source.friday_absent) || 0,
      unapproval_absent: Number(source.unapproval_absent) || 0,
      approval_absent: Number(source.approval_absent) || 0,
      sick_exam_days: Number(source.sick_exam_days) || 0,
      misc_deduction: Number(source.misc_deduction) || 0,
      sale_amount: Number(source.sale_amount) || 0,

      total_salary: s.total_salary,
      net_salary: s.net_salary,
      userId: userId,
    };
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!canManagePayroll)
      return toast.error("You are not allowed to create payroll.");

    if (!createEmployee.name?.trim()) return toast.error("Name is required!");
    if (!createEmployee.employee_id?.toString().trim())
      return toast.error("Employee Id is required!");
    if (getAdvanceRecoveredError(createEmployee))
      return toast.error(getAdvanceRecoveredError(createEmployee));
    // if (
    //   Number(createEmployee.advance) > 0 &&
    //   !normalizeOptionalId(createEmployee.bookId)
    // ) {
    //   return toast.error("Book is required when advance exists!");
    // }
    try {
      const payload = buildEmployeeCreatePayload(createEmployee);

      const res = await insertEmployee(payload).unwrap();
      if (res.success) {
        toast.success("Successfully created employee");
        setIsAddModalOpen(false);
        setCreateEmployee(emptyEmployee);
        refetch?.();
      }
    } catch (err) {
      toast.error(err?.data?.message || "Create failed!");
    }
  };

  const handleUpdateEmployee = async () => {
    if (!canManagePayroll)
      return toast.error("You are not allowed to update payroll.");

    if (!currentEmployee) return;
    if (!currentEmployee.name?.trim()) return toast.error("Name is required!");
    if (!currentEmployee.employee_id?.toString().trim())
      return toast.error("Employee Id is required!");
    if (getAdvanceRecoveredError(currentEmployee))
      return toast.error(getAdvanceRecoveredError(currentEmployee));
    // if (
    //   Number(currentEmployee.advance) > 0 &&
    //   !normalizeOptionalId(currentEmployee.bookId)
    // ) {
    //   return toast.error("Book is required when advance exists!");
    // }
    try {
      const s = calcSalary(currentEmployee);

      const updatedEmployee = {
        date: currentEmployee.date || undefined,
        name: currentEmployee.name || "",
        departmentId: normalizeOptionalId(currentEmployee.departmentId),
        designationId: normalizeOptionalId(currentEmployee.designationId),
        employee_id: currentEmployee.employee_id || "",
        employeeListId: normalizeOptionalId(currentEmployee.employeeListId),
        joining_date: currentEmployee.joining_date || null,
        pre_joining_days: Number(currentEmployee.pre_joining_days) || 0,
        payable_days:
          currentEmployee.payable_days === ""
            ? 30
            : Number(currentEmployee.payable_days) || 0,
        bookId: normalizeOptionalId(currentEmployee.bookId),
        note: currentEmployee.note || "",
        remarks: currentEmployee.remarks || "",

        basic_salary: Number(currentEmployee.basic_salary) || 0,
        incentive: Number(currentEmployee.incentive) || 0,
        festival_bonus: Number(currentEmployee.festival_bonus) || 0,
        bonus: Number(currentEmployee.bonus) || 0,
        additional_pay: Number(currentEmployee.additional_pay) || 0,
        holiday_payment: Number(currentEmployee.holiday_payment) || 0,

        advance: Number(currentEmployee.advance) || 0,
        advance_recovered: Number(currentEmployee.advance_recovered) || 0,
        late: Number(currentEmployee.late) || 0,
        early_leave: Number(currentEmployee.early_leave) || 0,
        absent: Number(currentEmployee.absent) || 0,
        half_day_absent: Number(currentEmployee.half_day_absent) || 0,
        friday_absent: Number(currentEmployee.friday_absent) || 0,
        unapproval_absent: Number(currentEmployee.unapproval_absent) || 0,
        approval_absent: Number(currentEmployee.approval_absent) || 0,
        sick_exam_days: Number(currentEmployee.sick_exam_days) || 0,
        misc_deduction: Number(currentEmployee.misc_deduction) || 0,
        sale_amount: Number(currentEmployee.sale_amount) || 0,

        total_salary: s.total_salary,
        net_salary: s.net_salary,
        status: currentEmployee.status,
        userId: userId,
        actorRole: role,
      };

      const res = await updateEmployee({
        id: currentEmployee.Id,
        data: updatedEmployee,
      }).unwrap();

      if (res.success) {
        toast.success("Successfully updated employee!");
        setIsEditModalOpen(false);
        refetch?.();
      } else {
        toast.error("Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleSheetUploadClick = () => {
    if (!canManagePayroll) return;
    sheetFileInputRef.current?.click();
  };

  const handleSheetFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        toast.error("No rows found in the uploaded sheet.");
        return;
      }

      // Salary date for imported rows (was referenced but never defined).
      const today = new Date().toISOString().slice(0, 10);
      const drafts = rows.map((row, index) => {
        const regId = String(
          getSheetValue(row, [
            "Reg ID",
            "RegId",
            "Registration ID",
            "employee_id",
          ]),
        ).trim();
        const matchedEmployee = employeeSalaryOptions.find(
          (employee) => String(employee.employee_id || "").trim() === regId,
        );

        if (!matchedEmployee) {
          return {
            rowKey: `sheet-row-${index}`,
            sourceRowNumber: index + 2,
            regId,
            matched: false,
            reason: regId ? "Employee not matched" : "Reg ID missing",
            data: {
              ...emptyEmployee,
              employee_id: regId,
              absent: normalizeSheetNumber(getSheetValue(row, ["Absent"])),
              late: normalizeSheetNumber(getSheetValue(row, ["Late"])),
              early_leave: normalizeSheetNumber(
                getSheetValue(row, ["Early Out", "Early Leave"]),
              ),
            },
          };
        }

        const base = applyEmployeeSalaryDefaults(
          {
            ...emptyEmployee,
            date: today,
            payable_days: "30",
            remarks: "Imported from attendance sheet",
          },
          matchedEmployee,
        );

        return {
          rowKey: `sheet-row-${index}`,
          sourceRowNumber: index + 2,
          regId,
          matched: true,
          reason: "",
          data: applyAttendanceDeductionDefaults(base, row),
        };
      });

      setSheetDraftRows(drafts);
      setIsSheetUploadModalOpen(true);

      const matchedCount = drafts.filter((row) => row.matched).length;
      const unmatchedCount = drafts.length - matchedCount;
      toast.success(
        `Sheet loaded: ${matchedCount} matched${
          unmatchedCount ? `, ${unmatchedCount} unmatched` : ""
        }.`,
      );
    } catch (err) {
      console.error(err);
      toast.error("Sheet upload failed. Please upload XLSX/XLS/CSV file.");
    }
  };

  const updateSheetDraftField = (rowKey, key, value) => {
    setSheetDraftRows((prev) =>
      prev.map((row) => {
        if (row.rowKey !== rowKey) return row;
        const next =
          key === "pre_joining_days"
            ? applyPreJoiningDays(row.data, value)
            : { ...row.data, [key]: value };
        const s = calcSalary(next);

        return {
          ...row,
          data: {
            ...next,
            total_salary: s.total_salary.toFixed(2),
            net_salary: s.net_salary.toFixed(2),
          },
        };
      }),
    );
  };

  const closeSheetUploadModal = () => {
    if (isSheetSaving) return;
    setIsSheetUploadModalOpen(false);
  };

  const handleSaveSheetDrafts = async () => {
    if (!canManagePayroll)
      return toast.error("You are not allowed to create payroll.");

    const rowsToSave = sheetDraftRows.filter((row) => row.matched);
    if (!rowsToSave.length) {
      toast.error("No matched employee rows found to insert.");
      return;
    }

    const invalidRow = rowsToSave.find(
      (row) =>
        !row.data.name?.trim() || !row.data.employee_id?.toString().trim(),
    );
    if (invalidRow) {
      toast.error(
        `Row ${invalidRow.sourceRowNumber}: Name and Employee Id are required.`,
      );
      return;
    }

    try {
      setIsSheetSaving(true);
      let savedCount = 0;

      for (const row of rowsToSave) {
        const payload = buildEmployeeCreatePayload(row.data);
        const res = await insertEmployee(payload).unwrap();
        if (res?.success) savedCount += 1;
      }

      toast.success(`Successfully inserted ${savedCount} salary rows.`);
      setIsSheetUploadModalOpen(false);
      setSheetDraftRows([]);
      refetch?.();
    } catch (err) {
      toast.error(err?.data?.message || "Sheet rows insert failed.");
    } finally {
      setIsSheetSaving(false);
    }
  };

  const handleUpdateEmployee1 = async () => {
    if (!canManagePayroll)
      return toast.error("You are not allowed to update payroll.");

    if (!currentEmployee) return;
    try {
      const updatedEmployee = {
        name: currentEmployee.name || "",
        employee_id: currentEmployee.employee_id || "",
        note: currentEmployee.note || "",
        status: currentEmployee.status,
        userId: userId,
        actorRole: role,
      };

      const res = await updateEmployee({
        id: currentEmployee.Id,
        data: updatedEmployee,
      }).unwrap();

      if (res.success) {
        toast.success("Successfully updated!");
        setIsEditModalOpen1(false);
        refetch?.();
      } else {
        toast.error("Update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Update failed!");
    }
  };

  const handleInlineStatusUpdate = async (employee, nextStatus) => {
    if (!canManagePayroll)
      return toast.error("You are not allowed to update payroll status.");

    if (!employee || employee.status === nextStatus) return;

    const updatedEmployee = {
      date: employee.date || undefined,
      name: employee.name || "",
      departmentId: normalizeOptionalId(employee.departmentId),
      designationId: normalizeOptionalId(employee.designationId),
      employee_id: employee.employee_id || "",
      employeeListId: normalizeOptionalId(employee.employeeListId),
      joining_date:
        employee.joining_date || employee.employeeProfile?.joiningDate || null,
      pre_joining_days: Number(employee.pre_joining_days) || 0,
      payable_days:
        employee.payable_days === "" ? 30 : Number(employee.payable_days) || 0,
      bookId: normalizeOptionalId(employee.bookId),
      note: employee.note || "",
      remarks: employee.remarks || "",

      basic_salary: Number(employee.basic_salary) || 0,
      incentive: Number(employee.incentive) || 0,
      holiday_payment: Number(employee.holiday_payment) || 0,

      advance: Number(employee.advance) || 0,
      advance_recovered:
        Number(employee.advance_recovered ?? employee.advance) || 0,
      late: Number(employee.late) || 0,
      early_leave: Number(employee.early_leave) || 0,
      absent: Number(employee.absent) || 0,
      half_day_absent: Number(employee.half_day_absent) || 0,
      friday_absent: Number(employee.friday_absent) || 0,
      unapproval_absent: Number(employee.unapproval_absent) || 0,

      total_salary: Number(employee.total_salary) || 0,
      net_salary: Number(employee.net_salary) || 0,
      status: nextStatus,
      userId,
      actorRole: role,
    };

    try {
      setUpdatingStatusId(employee.Id);
      const res = await updateEmployee({
        id: employee.Id,
        data: updatedEmployee,
      }).unwrap();

      if (res.success) {
        toast.success("Status updated");
        refetch?.();
      } else {
        toast.error("Status update failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Status update failed!");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!canManagePayroll)
      return toast.error("You are not allowed to delete payroll.");

    const confirmDelete = await requestDeleteConfirmation({
      message: "Do you want to delete this employee?",
    });
    if (!confirmDelete) return toast.info("Delete action was cancelled.");

    try {
      const res = await deleteEmployee(id).unwrap();
      if (res.success) {
        toast.success("Employee deleted successfully!");
        refetch?.();
      } else {
        toast.error("Delete failed!");
      }
    } catch (err) {
      toast.error(err?.data?.message || "Delete failed!");
    }
  };

  // ----------------------------
  // Pagination
  // ----------------------------
  const clearFilters = () => {
    setStartDate(defaultPayrollRange.from);
    setEndDate(defaultPayrollRange.to);
    setSelectedEmployee(null);
    setSelectedDepartment(null);
    setSelectedDesignation(null);
    setSelectedStatus("All");
    setPhoneFilter("");
    setFilterResetKey((k) => k + 1);

    setCurrentPage(1);
    setStartPage(1);
  };

  // Filters other than the date range (which always has a value).
  const activeFilterCount = [
    selectedEmployee,
    selectedDepartment,
    selectedDesignation,
    selectedStatus !== "All" ? selectedStatus : null,
    phoneFilter.trim() ? phoneFilter : null,
  ].filter(Boolean).length;

  const endPage = Math.min(startPage + pagesPerSet - 1, totalPages);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    if (pageNumber < startPage) setStartPage(pageNumber);
    else if (pageNumber > endPage) setStartPage(pageNumber - pagesPerSet + 1);
  };

  const handlePreviousSet = () =>
    setStartPage((prev) => Math.max(prev - pagesPerSet, 1));

  const handleNextSet = () =>
    setStartPage((prev) =>
      Math.min(prev + pagesPerSet, totalPages - pagesPerSet + 1),
    );

  // ----------------------------
  // Invoice: single
  // ----------------------------
  const openInvoice = (emp) => {
    setInvoiceEmployee(emp);
    setIsInvoiceOpen(true);
  };

  const closeInvoice = () => {
    setIsInvoiceOpen(false);
    setInvoiceEmployee(null);
  };

  const downloadInvoicePDF = async () => {
    try {
      if (!invoiceRef.current || !invoiceEmployee) return;

      if (document.fonts?.ready) await document.fonts.ready;

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const pageMargin = 8;
      const maxImgWidth = pdfWidth - pageMargin * 2;
      const maxImgHeight = pdfHeight - pageMargin * 2;
      const naturalImgHeight = (canvas.height * maxImgWidth) / canvas.width;
      const fitRatio = Math.min(1, maxImgHeight / naturalImgHeight);
      const imgWidth = maxImgWidth * fitRatio;
      const imgHeight = naturalImgHeight * fitRatio;
      const positionX = (pdfWidth - imgWidth) / 2;
      const positionY = pageMargin;

      pdf.addImage(imgData, "JPEG", positionX, positionY, imgWidth, imgHeight);

      const fileName = `Invoice_${invoiceEmployee?.employee_id || "EMP"}_${Date.now()}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error(err);
      toast.error("PDF download failed! Console এ error দেখুন.");
    }
  };

  // Opens a popup with the given Salary Statement markup and prints it.
  const openSalaryStatementPrint = (title, sheetsHtml) => {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      toast.error("Popup blocked! Allow popups then try again.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            html, body {
              margin: 0;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            ${SALARY_STATEMENT_CSS}
            .salary-sheet {
              max-width: 100%;
              padding: 0;
              page-break-after: always;
              break-after: page;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .salary-sheet:last-child {
              page-break-after: auto;
              break-after: auto;
            }
          </style>
        </head>
        <body>
          ${sheetsHtml}
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printInvoice = () => {
    if (!invoiceRef.current || !invoiceEmployee) return;
    openSalaryStatementPrint("Salary Statement", invoiceRef.current.innerHTML);
  };

  // ----------------------------
  // Bulk selection (table checkbox)
  // ----------------------------
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const isAllSelectedOnPage = useMemo(() => {
    const idsOnPage = (displayEmployees || [])
      .filter((e) => !e.__isPayrollPlaceholder)
      .map((e) => e.Id);
    return (
      idsOnPage.length > 0 && idsOnPage.every((id) => selectedIds.includes(id))
    );
  }, [displayEmployees, selectedIds]);

  const toggleSelectAllOnPage = () => {
    const idsOnPage = (displayEmployees || [])
      .filter((e) => !e.__isPayrollPlaceholder)
      .map((e) => e.Id);
    setSelectedIds((prev) => {
      const allSelected = idsOnPage.every((id) => prev.includes(id));
      if (allSelected) return prev.filter((id) => !idsOnPage.includes(id));
      return Array.from(new Set([...prev, ...idsOnPage]));
    });
  };

  const selectedEmployees = useMemo(() => {
    const all =
      Array.isArray(employeesAll) && employeesAll.length
        ? employeesAll
        : employees;
    const map = new Map(
      (all || [])
        .filter((e) => !e.__isPayrollPlaceholder)
        .map((e) => [e.Id, e]),
    );
    return selectedIds.map((id) => map.get(id)).filter(Boolean);
  }, [selectedIds, employeesAll, employees]);

  // Payroll Sheet layout shared by Download Sheet / PDF / Print.
  const PAYROLL_SHEET_COLUMNS = [
    "Emp ID",
    "Employee Name",
    "Designation",
    "Basic Salary",
    "Encash days (in no.)",
    "Encash Amount",
    "Incentive Amount",
    "Sale Amount",
    "Misc Addition",
    "Gross Salary",
    "Advance",
    "Late Days",
    "Late Deduct",
    "Absent Days",
    "Absent Deduct",
    "Misc Deduct",
    "Total Deduct",
    "Net Salary",
    "Remarks",
    "Signature",
  ];

  const getSelectedPayrollRows = () =>
    selectedEmployees.map((emp) => {
      const b = getPayrollSheetBreakdown(emp);
      const money = (v) => Math.round(Number(v || 0) * 100) / 100;
      return {
        "Emp ID": emp.employee_id || "-",
        "Employee Name": emp.name || "-",
        Designation:
          emp.designation?.name ||
          findDesignationOption(
            emp.designationId ?? emp.employeeProfile?.designationId,
            emp.departmentId,
          )?.label ||
          "-",
        "Basic Salary": money(b.basicSalary),
        "Encash days (in no.)": b.encashDays,
        "Encash Amount": money(b.encashAmount),
        "Incentive Amount": money(b.incentive),
        "Sale Amount": money(b.saleAmount),
        "Misc Addition": money(b.miscAddition),
        "Gross Salary": money(b.grossSalary),
        Advance: money(b.advance),
        "Late Days": b.lateDays,
        "Late Deduct": money(b.lateDeduct),
        "Absent Days": b.absentDays,
        "Absent Deduct": money(b.absentDeduct),
        "Misc Deduct": money(b.miscDeduct),
        "Total Deduct": money(b.totalDeduct),
        "Net Salary": money(b.netSalary),
        Remarks: b.remarks,
        Signature: "",
      };
    });

  const handleDownloadSelectedSheet = () => {
    if (!selectedEmployees.length) {
      toast.error("Please select employees first!");
      return;
    }

    const rows = getSelectedPayrollRows();

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: PAYROLL_SHEET_COLUMNS,
    });
    worksheet["!cols"] = PAYROLL_SHEET_COLUMNS.map((column) => ({
      wch:
        column === "Employee Name"
          ? 26
          : column === "Remarks" || column === "Signature"
            ? 18
            : Math.max(10, column.length + 2),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Selected Payroll");

    const fileDate = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `selected-payroll-${fileDate}.xlsx`);
    toast.success("Selected payroll sheet downloaded!");
  };

  // Columns summed in the Total row (everything from Basic Salary to Net).
  const PAYROLL_SHEET_TOTAL_COLUMNS = PAYROLL_SHEET_COLUMNS.slice(
    PAYROLL_SHEET_COLUMNS.indexOf("Basic Salary"),
    PAYROLL_SHEET_COLUMNS.indexOf("Net Salary") + 1,
  );

  const getPayrollSheetTotals = (rows) =>
    Object.fromEntries(
      PAYROLL_SHEET_TOTAL_COLUMNS.map((column) => [
        column,
        Math.round(
          rows.reduce((sum, row) => sum + Number(row[column] || 0), 0) * 100,
        ) / 100,
      ]),
    );

  // Header/footer details asked once before PDF / Print.
  const [sheetMetaAction, setSheetMetaAction] = useState(null); // "pdf" | "print"
  const [sheetMeta, setSheetMeta] = useState(null);

  const openPayrollSheetMeta = (action) => {
    if (!selectedEmployees.length) {
      toast.error("Please select employees first!");
      return;
    }

    const departments = [
      ...new Set(
        selectedEmployees
          .map(
            (emp) =>
              emp.department?.name ||
              findDepartmentOption(emp.departmentId)?.label ||
              "",
          )
          .filter(Boolean),
      ),
    ];

    const paymentMonth = toMonthValue(new Date());
    setSheetMeta({
      paymentMonth,
      salaryMonth: previousMonthValue(paymentMonth),
      department: departments.join(", "),
      signatories: loadPayrollSignatories(),
    });
    setSheetMetaAction(action);
  };

  const updateSheetSignatory = (index, key, value) =>
    setSheetMeta((prev) => ({
      ...prev,
      signatories: prev.signatories.map((sig, i) =>
        i === index ? { ...sig, [key]: value } : sig,
      ),
    }));

  const confirmPayrollSheetMeta = () => {
    const meta = sheetMeta;
    const action = sheetMetaAction;
    savePayrollSignatories(meta.signatories);
    setSheetMetaAction(null);
    // Print opens a window — must stay inside this click handler.
    if (action === "print") handlePrintSelectedSheet(meta);
    else handleDownloadSelectedPdf(meta);
  };

  const handleDownloadSelectedPdf = async (meta) => {
    if (!selectedEmployees.length) {
      toast.error("Please select employees first!");
      return;
    }

    const autoTable = (await import("jspdf-autotable")).default;
    const rows = getSelectedPayrollRows();
    const totals = getPayrollSheetTotals(rows);
    const pdf = new jsPDF("l", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const columns = PAYROLL_SHEET_COLUMNS;
    const left = 8;
    const right = pageWidth - 8;

    // "Label: value" centred, label bold
    const centredPair = (label, value, y, size = 11) => {
      pdf.setFontSize(size);
      pdf.setFont("helvetica", "bold");
      const labelText = `${label}: `;
      const labelWidth = pdf.getTextWidth(labelText);
      pdf.setFont("helvetica", "normal");
      const valueWidth = pdf.getTextWidth(value || "-");
      const x = (pageWidth - labelWidth - valueWidth) / 2;
      pdf.setFont("helvetica", "bold");
      pdf.text(labelText, x, y);
      pdf.setFont("helvetica", "normal");
      pdf.text(value || "-", x + labelWidth, y);
    };

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(
      `Date of Payment:   ${formatSheetMonth(meta?.paymentMonth)}`,
      right,
      10,
      { align: "right" },
    );
    centredPair(PAYROLL_SHEET_GROUP_NAME, DEFAULT_COMPANY_NAME, 16, 12);
    centredPair("Department", meta?.department, 22);
    centredPair("Salary Month", formatSheetMonth(meta?.salaryMonth), 28);
    pdf.setDrawColor(71, 85, 105);
    pdf.line(left, 31, right, 31);

    const totalRow = columns.map((column) => {
      if (column === "Emp ID") return "";
      if (column === "Employee Name") return "Total";
      return totals[column] ?? "";
    });

    autoTable(pdf, {
      startY: 34,
      head: [columns],
      body: rows.map((row) => columns.map((column) => row[column] ?? "")),
      foot: [totalRow],
      showFoot: "lastPage",
      theme: "grid",
      margin: { left, right: 8, bottom: 12 },
      styles: {
        font: "helvetica",
        fontSize: 5.8,
        cellPadding: 1,
        overflow: "linebreak",
        valign: "middle",
        textColor: [15, 23, 42],
        lineColor: [203, 213, 225],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontStyle: "bold",
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: "bold",
        halign: "right",
      },
      // 20 columns on A4 landscape (281mm usable).
      columnStyles: Object.fromEntries(
        PAYROLL_SHEET_COLUMNS.map((column, index) => {
          if (column === "Emp ID") return [index, { cellWidth: 10 }];
          if (column === "Employee Name") return [index, { cellWidth: 24 }];
          if (column === "Designation") return [index, { cellWidth: 16 }];
          if (column === "Remarks") return [index, { cellWidth: 17 }];
          if (column === "Signature") return [index, { cellWidth: 18 }];
          return [index, { cellWidth: 12.4, halign: "right" }];
        }),
      ),
    });

    // In words + signatures (new page if they don't fit under the table)
    let y = pdf.lastAutoTable.finalY + 7;
    if (y + 40 > pageHeight - 8) {
      pdf.addPage();
      y = 16;
    }
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    const wordsLabel = "In Words : ";
    const wordsText = amountInWordsBD(totals["Net Salary"]);
    const wordsLabelWidth = pdf.getTextWidth(wordsLabel);
    pdf.setFont("helvetica", "normal");
    const wordsX =
      (pageWidth - wordsLabelWidth - pdf.getTextWidth(wordsText)) / 2;
    pdf.setFont("helvetica", "bold");
    pdf.text(wordsLabel, wordsX, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(wordsText, wordsX + wordsLabelWidth, y);

    const signatories = meta?.signatories || DEFAULT_PAYROLL_SIGNATORIES;
    const positions = [
      [left + 2, "left"],
      [pageWidth / 2, "center"],
      [right - 2, "right"],
    ];
    signatories.forEach((sig, index) => {
      const [x, align] = positions[index];
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${sig.role}:`, x, y + 13, { align });
      pdf.text(sig.name || "", x, y + 29, { align });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(sig.title || "", x, y + 34, { align });
    });

    const fileDate = new Date().toISOString().slice(0, 10);
    pdf.save(`selected-payroll-${fileDate}.pdf`);
    toast.success("Selected payroll PDF sheet downloaded!");
  };

  const handlePrintSelectedSheet = (meta) => {
    if (!selectedEmployees.length) {
      toast.error("Please select employees first!");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
      toast.error("Popup blocked! Allow popups then try again.");
      return;
    }

    const rows = getSelectedPayrollRows();
    const totals = getPayrollSheetTotals(rows);
    const columns = PAYROLL_SHEET_COLUMNS;
    const signatories = meta?.signatories || DEFAULT_PAYROLL_SIGNATORIES;

    const escapeHtml = (value) =>
      String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const tableRows = rows
      .map(
        (row) => `
          <tr>
            ${columns
              .map((column) => `<td>${escapeHtml(row[column])}</td>`)
              .join("")}
          </tr>
        `,
      )
      .join("");

    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>Selected Payroll Sheet</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Arial, sans-serif;
              color: #0f172a;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sheet-page {
              min-height: 194mm;
              display: flex;
              flex-direction: column;
            }
            .sheet-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 24px;
              margin-bottom: 10px;
            }
            h1 {
              margin: 0;
              font-size: 18px;
              line-height: 1.2;
            }
            h2 {
              margin: 0;
              font-size: 16px;
              text-align: center;
            }
            .meta {
              margin: 0;
              font-size: 11px;
              text-align: right;
              color: #475569;
              white-space: nowrap;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-size: 9px;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 3px 4px;
              vertical-align: middle;
              word-break: break-word;
            }
            th {
              background: #f1f5f9;
              color: #334155;
              font-weight: 700;
            }
            td:nth-child(n+4):nth-child(-n+18) {
              text-align: right;
            }
            td:nth-child(20) {
              height: 28px;
            }
            .sheet-top {
              border: 1px solid #475569;
              margin-bottom: 8px;
              font-size: 14px;
            }
            .sheet-top div {
              padding: 3px 6px;
              text-align: center;
              border-bottom: 1px solid #475569;
            }
            .sheet-top div:last-child { border-bottom: none; }
            .sheet-top .payment { text-align: right; font-weight: 700; }
            .sheet-top b { font-weight: 700; }
            tfoot td {
              background: #f1f5f9;
              font-weight: 700;
            }
            .in-words {
              text-align: center;
              font-size: 12px;
              padding: 6px;
            }
            .signatures {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 34px;
              margin-top: 18px;
              page-break-inside: avoid;
              font-size: 13px;
            }
            .signature .role { font-weight: 700; }
            .signature .name { font-weight: 700; margin-top: 40px; }
            .signature:nth-child(2) { text-align: center; }
            .signature:nth-child(3) { text-align: right; }
          </style>
        </head>
        <body>
          <div class="sheet-page">
            <div class="sheet-top">
              <div class="payment">Date of Payment: &nbsp; ${escapeHtml(formatSheetMonth(meta?.paymentMonth))}</div>
              <div><b>${escapeHtml(PAYROLL_SHEET_GROUP_NAME)}:</b> ${escapeHtml(DEFAULT_COMPANY_NAME)}</div>
              <div><b>Department:</b> ${escapeHtml(meta?.department || "-")}</div>
              <div><b>Salary Month:</b> ${escapeHtml(formatSheetMonth(meta?.salaryMonth))}</div>
            </div>
            <table>
              <thead>
                <tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>
              </thead>
              <tbody>${tableRows}</tbody>
              <tfoot>
                <tr>${columns
                  .map((column) => {
                    if (column === "Employee Name") return "<td>Total</td>";
                    return `<td>${escapeHtml(totals[column] ?? "")}</td>`;
                  })
                  .join("")}</tr>
                <tr>
                  <td colspan="${columns.length}" class="in-words">
                    <b>In Words :</b> ${escapeHtml(amountInWordsBD(totals["Net Salary"]))}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div class="signatures">
              ${signatories
                .map(
                  (sig) => `
                <div class="signature">
                  <div class="role">${escapeHtml(sig.role)}:</div>
                  <div class="name">${escapeHtml(sig.name)}</div>
                  <div>${escapeHtml(sig.title)}</div>
                </div>`,
                )
                .join("")}
            </div>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printBulkInvoices = () => {
    if (!selectedEmployees?.length || !bulkInvoiceRef.current) return;
    const sheetsHtml = Array.from(
      bulkInvoiceRef.current.querySelectorAll(".salary-sheet"),
    )
      .map((node) => node.outerHTML)
      .join("");
    openSalaryStatementPrint("Salary Statements", sheetsHtml);
  };

  // ----------------------------
  // ✅ React-select styles (light)
  // ----------------------------
  const selectStyles = useMemo(
    () => ({
      control: (base, state) => ({
        ...base,
        minHeight: 44,
        borderRadius: 12,
        borderColor: state.isFocused ? "#c7d2fe" : "#e2e8f0", // indigo-200 / slate-200
        boxShadow: state.isFocused
          ? "0 0 0 4px rgba(99, 102, 241, 0.15)"
          : "none",
        "&:hover": { borderColor: state.isFocused ? "#c7d2fe" : "#cbd5e1" },
      }),
      valueContainer: (base) => ({
        ...base,
        padding: "0 12px",
        flexWrap: "nowrap",
      }),
      placeholder: (base) => ({
        ...base,
        color: "#64748b", // slate-500
        fontSize: 14,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }),
      input: (base) => ({ ...base, fontSize: 14 }),
      indicatorSeparator: () => ({ display: "none" }),
      singleValue: (base) => ({ ...base, color: "#0f172a", fontSize: 14 }), // slate-900
      menu: (base) => ({
        ...base,
        borderRadius: 12,
        overflow: "hidden",
        zIndex: 60,
      }),
      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
          ? "rgba(99, 102, 241, 0.12)"
          : state.isFocused
            ? "#f8fafc"
            : "#fff",
        color: "#0f172a",
      }),
    }),
    [],
  );

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");

  const handleNoteClick = (note) => {
    setNoteContent(note);
    setIsNoteModalOpen(true); // Open the modal
  };

  const handleModalClose = () => {
    setIsNoteModalOpen(false); // Close the modal
  };

  const normalizePayrollStatus = (status) =>
    status === "Completed" ? "Completed" : "Pending";

  const getPayrollStatusClass = (status) =>
    normalizePayrollStatus(status) === "Completed"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <motion.div
      className="bg-white/90 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] rounded-2xl p-6 border border-slate-200 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="my-2 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="my-2 flex flex-wrap items-center justify-start gap-3 xl:my-6 xl:flex-1">
          {canManagePayroll && (
            <>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-indigo-600 px-4 py-2 text-white shadow-sm transition hover:bg-indigo-700"
                onClick={openAddModal}
              >
                {t.add} <Plus size={18} />
              </button>

              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
                onClick={handleSheetUploadClick}
                type="button"
              >
                <Upload size={18} />
                Upload Sheet
              </button>
              <input
                ref={sheetFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleSheetFileChange}
              />
            </>
          )}

          <button
            className="min-h-10 whitespace-nowrap rounded-xl bg-emerald-600 px-4 py-2 text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
            onClick={() => setIsBulkInvoiceOpen(true)}
            disabled={selectedIds.length === 0}
          >
            {t.print_selected || "Print Selected"} ({selectedIds.length})
          </button>

          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-sky-600 px-4 py-2 text-white shadow-sm hover:bg-sky-700 disabled:opacity-60"
            onClick={handleDownloadSelectedSheet}
            disabled={selectedIds.length === 0}
          >
            <Download size={18} />
            {t.download_sheet || "Download Sheet"} ({selectedIds.length})
          </button>

          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-slate-900 px-4 py-2 text-white shadow-sm hover:bg-slate-800 disabled:opacity-60"
            onClick={() => openPayrollSheetMeta("pdf")}
            disabled={selectedIds.length === 0}
          >
            <FileText size={18} />
            {t.download_pdf || "Download PDF"} ({selectedIds.length})
          </button>

          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            onClick={() => openPayrollSheetMeta("print")}
            disabled={selectedIds.length === 0}
          >
            <Printer size={18} />
            {t.print_sheet || "Print Sheet"} ({selectedIds.length})
          </button>

          <button
            className="min-h-10 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            onClick={() => setSelectedIds([])}
            disabled={selectedIds.length === 0}
          >
            {t.clear_selection || "Clear Selection"}
          </button>
        </div>

        <div className="flex min-h-10 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm sm:w-auto xl:mt-6 xl:shrink-0">
          <div className="flex items-center gap-2 text-slate-700">
            <RotateCcw size={18} className="text-amber-500" />
            <span className="text-sm">Total Salary</span>
          </div>
          <span className="text-slate-900 font-semibold tabular-nums">
            {isLoading ? "Loading..." : (data?.meta?.totalSalary ?? 0)}
          </span>
        </div>
      </div>

      {/* Filters — one toolbar: header (count, per page, clear) + equal-height
          controls with the same label style. */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-indigo-600" />
            <span className="text-sm font-semibold text-slate-800">
              Filters
            </span>
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                {activeFilterCount} active
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              {t.per_page_label || "Per Page"}
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                  setStartPage(1);
                }}
                className={`${FILTER_CONTROL} !h-9 w-20 px-2`}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </label>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <X size={14} />
              {t.clear_filters || "Clear Filters"}
            </button>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <DateRangeFilter
            key={filterResetKey}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            defaultFilter="thisMonth"
            label="Date"
            compact
          />

          <div className="flex min-w-0 flex-col">
            <label className={FILTER_LABEL}>{t.employee || "Employee"}</label>
            <Select
              options={employeeOptions}
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              placeholder="All employees"
              isClearable
              hideSelectedOptions={false}
              styles={selectStyles}
              className="w-full"
            />
          </div>

          <div className="flex min-w-0 flex-col">
            <label className={FILTER_LABEL}>Department</label>
            <Select
              options={departmentOptions}
              value={selectedDepartment}
              onChange={(selected) => {
                setSelectedDepartment(selected);
                setSelectedDesignation(null);
              }}
              placeholder={
                isDepartmentsLoading ? "Loading..." : "All departments"
              }
              isClearable
              isLoading={isDepartmentsLoading}
              styles={selectStyles}
              className="w-full"
            />
          </div>

          <div className="flex min-w-0 flex-col">
            <label className={FILTER_LABEL}>Designation</label>
            <Select
              options={filterDesignationOptions}
              value={selectedDesignation}
              onChange={setSelectedDesignation}
              placeholder={
                isDesignationsLoading ? "Loading..." : "All designations"
              }
              isClearable
              isLoading={isDesignationsLoading}
              styles={selectStyles}
              className="w-full"
            />
          </div>

          <div className="flex min-w-0 flex-col">
            <label className={FILTER_LABEL}>Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={`${FILTER_CONTROL} px-3`}
            >
              <option value="All">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="flex min-w-0 flex-col">
            <label className={FILTER_LABEL}>Phone Number</label>
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="tel"
                value={phoneFilter}
                onChange={(e) => setPhoneFilter(e.target.value)}
                placeholder="Search by phone..."
                className={`${FILTER_CONTROL} pl-9 pr-3`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={isAllSelectedOnPage}
                  onChange={toggleSelectAllOnPage}
                />
              </th>

              {[
                { key: "Date", label: t.date },
                {
                  key: "Employee ID",
                  label: t.employee_id_label || "Emp ID",
                },
                { key: "Employee", label: "Employee Name" },
                { key: "Department", label: "Department" },
                { key: "Designation", label: "Designation" },
                {
                  key: "Basic Salary",
                  label: t.basic_salary || "Basic Salary",
                },
                { key: "Encash Days", label: "Encash days (in no.)" },
                { key: "Encash Amount", label: "Encash Amount" },
                { key: "Incentive", label: "Incentive Amount" },
                { key: "Sale Amount", label: "Sale Amount" },
                { key: "Misc Addition", label: "Misc Addition" },
                { key: "Gross Salary", label: "Gross Salary" },
                { key: "Advance", label: "Advance" },
                { key: "Late Days", label: "Late Days" },
                { key: "Late Deduct", label: "Late Deduct" },
                { key: "Absent Days", label: "Absent Days" },
                { key: "Absent Deduct", label: "Absent Deduct" },
                { key: "Misc Deduct", label: "Misc Deduct" },
                { key: "Total Deduct", label: "Total Deduct" },
                { key: "Net Salary", label: t.net_salary },
                { key: "Remarks", label: t.remarks || "Remarks" },
                { key: "Status", label: t.status },
                { key: "Action", label: t.actions },
              ].map((h) => (
                <th
                  key={h.key}
                  className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {(displayEmployees || []).map((emp) => (
              <motion.tr
                key={emp.Id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="hover:bg-slate-50"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(emp.Id)}
                    onChange={() => toggleSelect(emp.Id)}
                    disabled={emp.__isPayrollPlaceholder}
                  />
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                  {emp.date || emp.createdAt
                    ? new Date(emp.date || emp.createdAt).toLocaleDateString()
                    : "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {emp.employee_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">
                  {emp.name}
                  {emp.__isPayrollPlaceholder ? (
                    <div className="mt-1 text-xs font-medium text-amber-600">
                      Payroll not created yet
                    </div>
                  ) : null}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {emp.department?.name ||
                    findDepartmentOption(emp.departmentId)?.label ||
                    "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {emp.designation?.name ||
                    findDesignationOption(
                      emp.designationId ?? emp.employeeProfile?.designationId,
                      emp.departmentId,
                    )?.label ||
                    "-"}
                </td>
                {(() => {
                  const b = getPayrollSheetBreakdown(emp);
                  const money = (v) => Number(v || 0).toFixed(2);
                  const cell =
                    "px-6 py-4 whitespace-nowrap text-sm text-slate-700";
                  return (
                    <>
                      <td className={cell}>{money(b.basicSalary)}</td>
                      <td className={cell}>{b.encashDays}</td>
                      <td className={cell}>{money(b.encashAmount)}</td>
                      <td className={cell}>{money(b.incentive)}</td>
                      <td className={cell}>{money(b.saleAmount)}</td>
                      <td className={cell}>{money(b.miscAddition)}</td>
                      <td className={`${cell} font-semibold text-slate-900`}>
                        {money(b.grossSalary)}
                      </td>
                      <td className={cell}>{money(b.advance)}</td>
                      <td className={cell}>{b.lateDays}</td>
                      <td className={cell}>{money(b.lateDeduct)}</td>
                      <td className={cell}>{b.absentDays}</td>
                      <td className={cell}>{money(b.absentDeduct)}</td>
                      <td className={cell}>{money(b.miscDeduct)}</td>
                      <td className={`${cell} text-rose-600`}>
                        {money(b.totalDeduct)}
                      </td>
                      <td className={`${cell} font-semibold text-slate-900`}>
                        {money(b.netSalary)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 min-w-[160px]">
                        {b.remarks || "-"}
                      </td>
                    </>
                  );
                })()}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {emp.__isPayrollPlaceholder ? (
                    <span className="inline-flex h-8 min-w-[118px] items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700">
                      Not Created
                    </span>
                  ) : isAccountant ? (
                    <span
                      className={`inline-flex h-8 min-w-[118px] items-center justify-center rounded-full border px-3 text-xs font-semibold ${getPayrollStatusClass(
                        emp.status,
                      )}`}
                    >
                      {normalizePayrollStatus(emp.status)}
                    </span>
                  ) : (
                    <select
                      value={normalizePayrollStatus(emp.status)}
                      onChange={(e) =>
                        handleInlineStatusUpdate(emp, e.target.value)
                      }
                      disabled={updatingStatusId === emp.Id}
                      className={`h-8 min-w-[118px] rounded-full border px-3 text-xs font-semibold outline-none transition focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60 ${getPayrollStatusClass(
                        emp.status,
                      )}`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                    </select>
                  )}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-3">
                    {emp.note ? (
                      <div className="relative">
                        <button
                          className="relative h-10 w-10 rounded-md flex items-center justify-center"
                          title={emp.note}
                          type="button"
                          onClick={() => handleNoteClick(emp.note)} // Open modal on click
                        >
                          <Notebook size={18} className="text-slate-700" />
                        </button>

                        <span className="absolute top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">
                          {emp.note ? 1 : null}
                        </span>
                      </div>
                    ) : (
                      <button
                        className="h-10 w-10 rounded-md flex items-center justify-center"
                        title={emp.note}
                        type="button"
                      >
                        <Notebook size={18} className="text-slate-700" />
                      </button>
                    )}
                    {emp.__isPayrollPlaceholder ? (
                      canManagePayroll ? (
                        <button
                          onClick={() => openAddModalForEmployee(emp)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-indigo-50 transition"
                          title="Create Payroll"
                        >
                          <Plus size={18} className="text-indigo-600" />
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          View only
                        </span>
                      )
                    ) : (
                      <>
                        <button
                          onClick={() => openInvoice(emp)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-emerald-50 transition"
                          title="Invoice"
                        >
                          <FileText size={18} className="text-emerald-600" />
                        </button>

                        {canManagePayroll && (
                          <>
                            <button
                              onClick={() => handleEditClick(emp)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-indigo-50 transition"
                              title="Edit"
                            >
                              <Edit size={18} className="text-indigo-600" />
                            </button>

                            {role === "superAdmin" || role === "admin" ? (
                              <button
                                onClick={() => handleDeleteEmployee(emp.Id)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-rose-50 transition"
                                title="Delete"
                              >
                                <Trash2 size={18} className="text-rose-600" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEditClick1(emp)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-rose-50 transition"
                                title="Delete Request / Note"
                              >
                                <Trash2 size={18} className="text-rose-600" />
                              </button>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center flex-wrap gap-2 mt-6">
        <button
          onClick={handlePreviousSet}
          disabled={startPage === 1}
          className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
        >
          {t.prev}
        </button>

        {[...Array(endPage - startPage + 1)].map((_, index) => {
          const pageNum = startPage + index;
          const active = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`px-4 py-2 rounded-xl border transition ${
                active
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        <button
          onClick={handleNextSet}
          disabled={endPage === totalPages}
          className="px-4 py-2 text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-60 hover:bg-slate-50 transition"
        >
          Next
        </button>
      </div>

      {/* -------------------- Edit Modal -------------------- */}
      <Modal
        isOpen={isEditModalOpen && !!currentEmployee}
        onClose={closeEditModal}
        title={t.edit_salary_calculation || "Edit Employee Salary Calculation"}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="Date:"
              type="date"
              value={currentEmployee?.date}
              onChange={(v) => updateCurrentField("date", v)}
            />

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                {t.employee_name_label || "Employee Name:"}
              </label>
              <Select
                options={employeeSalaryOptions}
                value={
                  employeeSalaryOptions.find(
                    (option) =>
                      option.value ===
                        String(currentEmployee?.employeeListId || "") ||
                      option.name === (currentEmployee?.name || ""),
                  ) || null
                }
                onChange={handleCurrentEmployeeSelect}
                placeholder={t.select_employee || "Select Employee"}
                isClearable
                hideSelectedOptions={false}
                formatOptionLabel={formatEmployeeSalaryOption}
                menuPortalTarget={selectPortalTarget}
                menuPosition="fixed"
                menuPlacement="auto"
                styles={selectStyles}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Department
              </label>
              <Select
                options={departmentOptions}
                value={findDepartmentOption(currentEmployee?.departmentId)}
                onChange={(selected) =>
                  setCurrentEmployee({
                    ...currentEmployee,
                    departmentId: selected?.value || "",
                    designationId: "",
                  })
                }
                placeholder={
                  isDepartmentsLoading
                    ? "Loading departments..."
                    : "Select Department"
                }
                isClearable
                isLoading={isDepartmentsLoading}
                styles={selectStyles}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Designation
              </label>
              <Select
                options={getDesignationOptions(currentEmployee?.departmentId)}
                value={findDesignationOption(
                  currentEmployee?.designationId,
                  currentEmployee?.departmentId,
                )}
                onChange={(selected) =>
                  setCurrentEmployee({
                    ...currentEmployee,
                    designationId: selected?.value || "",
                  })
                }
                placeholder={
                  isDesignationsLoading
                    ? "Loading designations..."
                    : "Select Designation"
                }
                isClearable
                isLoading={isDesignationsLoading}
                styles={selectStyles}
                className="w-full"
              />
            </div>

            <Field
              label={t.employee_id_label + ":" || "Employee Id:"}
              type="number"
              value={currentEmployee?.employee_id}
              onChange={(v) =>
                setCurrentEmployee({ ...currentEmployee, employee_id: v })
              }
            />

            <Field
              label="Joining Date:"
              type="date"
              value={currentEmployee?.joining_date || ""}
              onChange={(v) => updateCurrentField("joining_date", v)}
            />

            {/* <Field
              label="Pre Joining Days:"
              type="number"
              value={currentEmployee?.pre_joining_days}
              onChange={(v) => updateCurrentField("pre_joining_days", v)}
            /> */}

            <Field
              label="Payable Days:"
              type="number"
              value={currentEmployee?.payable_days}
              onChange={(v) => updateCurrentField("payable_days", v)}
            />

            <Field
              label="Basic Salary:"
              type="number"
              step="0.01"
              value={currentEmployee?.basic_salary}
              onChange={(v) => updateCurrentField("basic_salary", v)}
            />

            <Field
              label="Incentive:"
              type="number"
              step="0.01"
              value={currentEmployee?.incentive}
              onChange={(v) => updateCurrentField("incentive", v)}
            />

            <Field
              label="Sale Amount:"
              type="number"
              step="0.01"
              value={currentEmployee?.sale_amount}
              onChange={(v) => updateCurrentField("sale_amount", v)}
            />

            <Field
              label={`${t.festival_bonus || "Festival Bonus"}:`}
              type="number"
              step="0.01"
              value={currentEmployee?.festival_bonus}
              onChange={(v) => updateCurrentField("festival_bonus", v)}
            />

            <Field
              label="Bonus:"
              type="number"
              step="0.01"
              value={currentEmployee?.bonus}
              onChange={(v) => updateCurrentField("bonus", v)}
            />

            <Field
              label="Additional Pay/ Allowance (If any):"
              type="number"
              step="0.01"
              value={currentEmployee?.additional_pay}
              onChange={(v) => updateCurrentField("additional_pay", v)}
            />

            <Field
              label={t.holiday_days + ":" || "Incashment (Holiday):"}
              type="number"
              value={currentEmployee?.holiday_payment}
              onChange={(v) => updateCurrentField("holiday_payment", v)}
            />

            <Field
              label="Advance Pay:"
              type="number"
              step="0.01"
              value={currentEmployee?.advance}
              readOnly={hasCurrentNetBalance}
              onChange={(v) => updateCurrentField("advance", v)}
            />

            <Field
              label={getRemainingAdvanceLabel(currentEmployee)}
              type="number"
              step="0.01"
              value={currentEmployee?.advance_recovered}
              onChange={(v) => updateCurrentField("advance_recovered", v)}
            />

            {/* 
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Book:
              </label>
              <Select
                options={bookOptions}
                value={
                  bookOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(currentEmployee?.bookId || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCurrentEmployee((prev) => ({
                    ...prev,
                    bookId: selected?.value || "",
                  }))
                }
                placeholder="Select Book"
                isClearable
                styles={selectStyles}
                className="w-full"
              />
            </div> */}

            <Field
              label={t.late_days_label || "Late (days):"}
              type="number"
              value={currentEmployee?.late}
              onChange={(v) => updateCurrentField("late", v)}
            />

            <Field
              label={t.early_leave_days_label || "Early Leave (days):"}
              type="number"
              value={currentEmployee?.early_leave}
              onChange={(v) => updateCurrentField("early_leave", v)}
            />

            <Field
              label={t.absent_days_label || "Absent (days):"}
              type="number"
              value={currentEmployee?.absent}
              onChange={(v) => updateCurrentField("absent", v)}
            />

            <Field
              label="Half Day Absent (days):"
              type="number"
              step="0.5"
              value={currentEmployee?.half_day_absent}
              onChange={(v) => updateCurrentField("half_day_absent", v)}
            />

            <Field
              label={t.friday_absent_days_label || "Friday Absent (days):"}
              type="number"
              value={currentEmployee?.friday_absent}
              onChange={(v) => updateCurrentField("friday_absent", v)}
            />

            <Field
              label={
                t.unapproval_absent_days_label || "Unapproval Absent (days):"
              }
              type="number"
              value={currentEmployee?.unapproval_absent}
              onChange={(v) => updateCurrentField("unapproval_absent", v)}
            />

            <Field
              label="Approval Absent (days):"
              type="number"
              value={currentEmployee?.approval_absent}
              onChange={(v) => updateCurrentField("approval_absent", v)}
            />

            <Field
              label="Sick/Exam (days):"
              type="number"
              step="0.5"
              value={currentEmployee?.sick_exam_days}
              onChange={(v) => updateCurrentField("sick_exam_days", v)}
            />

            <Field
              label="Misc Deduction (If any):"
              type="number"
              step="0.01"
              value={currentEmployee?.misc_deduction}
              onChange={(v) => updateCurrentField("misc_deduction", v)}
            />

            <Field
              label="Total Salary:"
              type="number"
              step="0.01"
              value={currentEmployee?.total_salary}
              readOnly
            />

            <Field
              label="Net Salary:"
              type="number"
              step="0.01"
              value={currentEmployee?.net_salary}
              readOnly
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              {t.remarks}
            </label>
            <textarea
              value={currentEmployee?.remarks || ""}
              onChange={(e) =>
                setCurrentEmployee({
                  ...currentEmployee,
                  remarks: e.target.value,
                })
              }
              className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              rows={3}
              placeholder={
                t.enter_additional_remarks || "Enter any additional remarks..."
              }
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {role === "superAdmin" ? (
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  {t.status}
                </label>
                <select
                  value={currentEmployee?.status || ""}
                  onChange={(e) =>
                    setCurrentEmployee({
                      ...currentEmployee,
                      status: e.target.value,
                    })
                  }
                  className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-bold text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  required
                >
                  <option value="">{t.select_status || "Select Status"}</option>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            ) : (
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                  {t.note}
                </label>
                <textarea
                  value={currentEmployee?.note || ""}
                  onChange={(e) =>
                    setCurrentEmployee({
                      ...currentEmployee,
                      note: e.target.value,
                    })
                  }
                  className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  placeholder={t.internal_notes || "Internal notes..."}
                  rows={2}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={closeEditModal}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateEmployee}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              {t.update_changes}
            </button>
          </div>
        </div>
      </Modal>

      {/* -------------------- "Delete" Modal (note/status update) -------------------- */}
      <Modal
        isOpen={isEditModalOpen1 && !!currentEmployee}
        onClose={closeEditModal1}
        title={t.update_employee_status || "Update Employee Status"}
      >
        <div className="space-y-6">
          {role === "superAdmin" ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                {t.status}
              </label>
              <select
                value={currentEmployee?.status || ""}
                onChange={(e) =>
                  setCurrentEmployee({
                    ...currentEmployee,
                    status: e.target.value,
                  })
                }
                className="w-full h-12 border border-slate-200 rounded-2xl px-4 text-sm font-bold text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                required
              >
                <option value="">{t.select_status || "Select Status"}</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                {t.internal_notes || "Internal Note"}
              </label>
              <textarea
                value={currentEmployee?.note || ""}
                onChange={(e) =>
                  setCurrentEmployee({
                    ...currentEmployee,
                    note: e.target.value,
                  })
                }
                className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                placeholder={
                  t.explain_why_remove_record ||
                  "Brief reason for status change or deletion request..."
                }
                rows={4}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={closeEditModal1}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateEmployee1}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              {t.confirm_update || "Confirm Update"}
            </button>
          </div>
        </div>
      </Modal>

      {/* -------------------- Sheet Upload Preview Modal -------------------- */}
      <Modal
        isOpen={isSheetUploadModalOpen}
        onClose={closeSheetUploadModal}
        title="Upload Salary Deduction Sheet"
        maxWidth="max-w-7xl"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Matched rows will be inserted by matching sheet Reg ID with
            employee_id. You can edit salary information before saving.
            Unmatched rows are skipped.
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Matched
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-900">
                {sheetDraftRows.filter((row) => row.matched).length}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700">
                Unmatched
              </p>
              <p className="mt-1 text-2xl font-black text-rose-900">
                {sheetDraftRows.filter((row) => !row.matched).length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Rows
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900">
                {sheetDraftRows.length}
              </p>
            </div>
          </div>

          <div className="max-h-[56vh] overflow-auto rounded-2xl border border-slate-200">
            <table className="min-w-[1900px] divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr>
                  {[
                    "Row",
                    "Match",
                    "Reg ID",
                    "Name",
                    "Date",
                    "Basic",
                    "Incentive",
                    "Festival",
                    "Holiday",
                    "Payable",
                    "Absent",
                    "Late",
                    "Early Leave",
                    "Half Day",
                    "Friday",
                    "Unapproval",
                    "Advance",
                    "Total",
                    "Net",
                    "Remarks",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sheetDraftRows.map((row) => (
                  <tr
                    key={row.rowKey}
                    className={!row.matched ? "bg-rose-50/50" : ""}
                  >
                    <td className="px-3 py-3 font-semibold text-slate-700">
                      {row.sourceRowNumber}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                          row.matched
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {row.matched ? "Matched" : row.reason}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-800">
                      {row.regId || "-"}
                    </td>
                    <td className="px-3 py-3">
                      <input
                        value={row.data.name || ""}
                        onChange={(e) =>
                          updateSheetDraftField(
                            row.rowKey,
                            "name",
                            e.target.value,
                          )
                        }
                        disabled={!row.matched}
                        className="h-10 w-44 rounded-xl border border-slate-200 px-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="date"
                        value={row.data.date || ""}
                        onChange={(e) =>
                          updateSheetDraftField(
                            row.rowKey,
                            "date",
                            e.target.value,
                          )
                        }
                        disabled={!row.matched}
                        className="h-10 w-40 rounded-xl border border-slate-200 px-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100"
                      />
                    </td>
                    {[
                      ["basic_salary", "number"],
                      ["incentive", "number"],
                      ["festival_bonus", "number"],
                      ["holiday_payment", "number"],
                      ["payable_days", "number"],
                      ["absent", "number"],
                      ["late", "number"],
                      ["early_leave", "number"],
                      ["half_day_absent", "number"],
                      ["friday_absent", "number"],
                      ["unapproval_absent", "number"],
                      ["advance", "number"],
                    ].map(([field, type]) => (
                      <td key={field} className="px-3 py-3">
                        <input
                          type={type}
                          step="0.01"
                          value={row.data[field] ?? ""}
                          onChange={(e) =>
                            updateSheetDraftField(
                              row.rowKey,
                              field,
                              e.target.value,
                            )
                          }
                          disabled={!row.matched}
                          className="h-10 w-28 rounded-xl border border-slate-200 px-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-3 font-semibold text-slate-700">
                      {Number(row.data.total_salary || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-900">
                      {Number(row.data.net_salary || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-3">
                      <input
                        value={row.data.remarks || ""}
                        onChange={(e) =>
                          updateSheetDraftField(
                            row.rowKey,
                            "remarks",
                            e.target.value,
                          )
                        }
                        disabled={!row.matched}
                        className="h-10 w-64 rounded-xl border border-slate-200 px-3 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={closeSheetUploadModal}
              disabled={isSheetSaving}
              className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveSheetDrafts}
              disabled={
                isSheetSaving || !sheetDraftRows.some((row) => row.matched)
              }
              className="rounded-2xl bg-indigo-600 px-8 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-100 transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {isSheetSaving ? "Saving..." : "Save Matched Rows"}
            </button>
          </div>
        </div>
      </Modal>

      {/* -------------------- Add Modal -------------------- */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        title={
          t.employee_salary_calculation_title || "Employee Salary Calculation"
        }
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleCreateEmployee} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="Date:"
              type="date"
              value={createEmployee.date}
              onChange={(v) => updateCreateField("date", v)}
            />

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                {t.employee_name_label + ":" || "Employee Name:"}
              </label>
              <Select
                options={employeeSalaryOptions}
                value={
                  employeeSalaryOptions.find(
                    (option) =>
                      option.value ===
                        String(createEmployee.employeeListId || "") ||
                      option.name === createEmployee.name,
                  ) || null
                }
                onChange={handleCreateEmployeeSelect}
                placeholder={t.select_employee || "Select Employee"}
                isClearable
                hideSelectedOptions={false}
                formatOptionLabel={formatEmployeeSalaryOption}
                menuPortalTarget={selectPortalTarget}
                menuPosition="fixed"
                menuPlacement="auto"
                styles={selectStyles}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Department
              </label>
              <Select
                options={departmentOptions}
                value={findDepartmentOption(createEmployee.departmentId)}
                onChange={(selected) =>
                  setCreateEmployee({
                    ...createEmployee,
                    departmentId: selected?.value || "",
                    designationId: "",
                  })
                }
                placeholder={
                  isDepartmentsLoading
                    ? "Loading departments..."
                    : "Select Department"
                }
                isClearable
                isLoading={isDepartmentsLoading}
                styles={selectStyles}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Designation
              </label>
              <Select
                options={getDesignationOptions(createEmployee.departmentId)}
                value={findDesignationOption(
                  createEmployee.designationId,
                  createEmployee.departmentId,
                )}
                onChange={(selected) =>
                  setCreateEmployee({
                    ...createEmployee,
                    designationId: selected?.value || "",
                  })
                }
                placeholder={
                  isDesignationsLoading
                    ? "Loading designations..."
                    : "Select Designation"
                }
                isClearable
                isLoading={isDesignationsLoading}
                styles={selectStyles}
                className="w-full"
              />
            </div>

            <Field
              label="Employee Id:"
              type="number"
              value={createEmployee.employee_id}
              onChange={(v) =>
                setCreateEmployee({ ...createEmployee, employee_id: v })
              }
              required
            />

            <Field
              label="Joining Date:"
              type="date"
              value={createEmployee.joining_date || ""}
              onChange={(v) => updateCreateField("joining_date", v)}
            />

            {/* <Field
              label="Pre Joining Days:"
              type="number"
              value={createEmployee.pre_joining_days}
              onChange={(v) => updateCreateField("pre_joining_days", v)}
            /> */}

            <Field
              label="Payable Days:"
              type="number"
              value={createEmployee.payable_days}
              onChange={(v) => updateCreateField("payable_days", v)}
            />

            <Field
              label="Basic Salary:"
              type="number"
              step="0.01"
              value={createEmployee.basic_salary}
              onChange={(v) => updateCreateField("basic_salary", v)}
            />

            <Field
              label="Incentive:"
              type="number"
              step="0.01"
              value={createEmployee.incentive}
              onChange={(v) => updateCreateField("incentive", v)}
            />

            <Field
              label="Sale Amount:"
              type="number"
              step="0.01"
              value={createEmployee.sale_amount}
              onChange={(v) => updateCreateField("sale_amount", v)}
            />

            <Field
              label={`${t.festival_bonus || "Festival Bonus"}:`}
              type="number"
              step="0.01"
              value={createEmployee.festival_bonus}
              onChange={(v) => updateCreateField("festival_bonus", v)}
            />

            <Field
              label="Bonus:"
              type="number"
              step="0.01"
              value={createEmployee.bonus}
              onChange={(v) => updateCreateField("bonus", v)}
            />

            <Field
              label="Additional Pay/ Allowance (If any):"
              type="number"
              step="0.01"
              value={createEmployee.additional_pay}
              onChange={(v) => updateCreateField("additional_pay", v)}
            />

            <Field
              label={t.holiday_days + ":" || "Incashment (Holiday):"}
              type="number"
              value={createEmployee.holiday_payment}
              onChange={(v) => updateCreateField("holiday_payment", v)}
            />

            <Field
              label="Advance Pay:"
              type="number"
              step="0.01"
              value={createEmployee.advance}
              readOnly={hasCreateNetBalance}
              onChange={(v) => updateCreateField("advance", v)}
            />

            <Field
              label={getRemainingAdvanceLabel(createEmployee)}
              type="number"
              step="0.01"
              value={createEmployee.advance_recovered}
              onChange={(v) => updateCreateField("advance_recovered", v)}
            />

            {/* <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Book:
              </label>
              <Select
                options={bookOptions}
                value={
                  bookOptions.find(
                    (option) =>
                      String(option.value) ===
                      String(createEmployee.bookId || ""),
                  ) || null
                }
                onChange={(selected) =>
                  setCreateEmployee((prev) => ({
                    ...prev,
                    bookId: selected?.value || "",
                  }))
                }
                placeholder="Select Book"
                isClearable
                styles={selectStyles}
                className="w-full"
              />
            </div> */}

            <Field
              label={t.late_days_label + ":" || "Late (days):"}
              type="number"
              value={createEmployee.late}
              onChange={(v) => updateCreateField("late", v)}
            />

            <Field
              label={t.early_leave_days_label + ":" || "Early Leave (days):"}
              type="number"
              value={createEmployee.early_leave}
              onChange={(v) => updateCreateField("early_leave", v)}
            />

            <Field
              label={t.absent_days_label + ":" || "Absent (days):"}
              type="number"
              value={createEmployee.absent}
              onChange={(v) => updateCreateField("absent", v)}
            />

            <Field
              label="Half Day Absent (days):"
              type="number"
              step="0.5"
              value={createEmployee.half_day_absent}
              onChange={(v) => updateCreateField("half_day_absent", v)}
            />

            <Field
              label={
                t.friday_absent_days_label + ":" || "Friday Absent (days):"
              }
              type="number"
              value={createEmployee.friday_absent}
              onChange={(v) => updateCreateField("friday_absent", v)}
            />

            <Field
              label={
                t.unapproval_absent_days_label + ":" ||
                "Unapproval Absent (days):"
              }
              type="number"
              value={createEmployee.unapproval_absent}
              onChange={(v) => updateCreateField("unapproval_absent", v)}
            />

            <Field
              label="Approval Absent (days):"
              type="number"
              value={createEmployee.approval_absent}
              onChange={(v) => updateCreateField("approval_absent", v)}
            />

            <Field
              label="Sick/Exam (days):"
              type="number"
              step="0.5"
              value={createEmployee.sick_exam_days}
              onChange={(v) => updateCreateField("sick_exam_days", v)}
            />

            <Field
              label="Misc Deduction (If any):"
              type="number"
              step="0.01"
              value={createEmployee.misc_deduction}
              onChange={(v) => updateCreateField("misc_deduction", v)}
            />

            <Field
              label="Total Salary:"
              type="number"
              step="0.01"
              value={createEmployee.total_salary}
              readOnly
            />

            <Field
              label="Net Salary:"
              type="number"
              step="0.01"
              value={createEmployee.net_salary}
              readOnly
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              {t.remarks || "Remarks"}
            </label>
            <textarea
              value={createEmployee.remarks}
              onChange={(e) =>
                setCreateEmployee({
                  ...createEmployee,
                  remarks: e.target.value,
                })
              }
              className="w-full border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-900 bg-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              rows={3}
              placeholder={
                t.any_additional_notes ||
                "Any additional notes about this entry..."
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={closeAddModal}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              {t.confirm_entry || "Confirm Entry"}
            </button>
          </div>
        </form>
      </Modal>

      {/* -------------------- Single Invoice Modal -------------------- */}
      <Modal
        isOpen={isInvoiceOpen && !!invoiceEmployee}
        onClose={closeInvoice}
        title={t.salary_invoice_title || "Salary Invoice"}
        maxWidth="max-w-5xl"
      >
        <div className="space-y-6">
          <div className="flex justify-end gap-3 pb-2">
            <button
              onClick={downloadInvoicePDF}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 flex items-center gap-2"
            >
              <Download size={16} /> {t.download_pdf || "Download PDF"}
            </button>
            <button
              onClick={printInvoice}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center gap-2"
            >
              <Printer size={16} /> {t.print || "Print"}
            </button>
            <button
              onClick={closeInvoice}
              className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-bold hover:bg-slate-50 transition"
            >
              {t.close || "Close"}
            </button>
          </div>

          <style>{SALARY_STATEMENT_CSS}</style>
          <div
            id="invoiceCapture"
            ref={invoiceRef}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto"
          >
            {invoiceEmployee ? (
              <SalaryStatementSheet
                data={buildSalaryStatementData(invoiceEmployee)}
              />
            ) : null}
          </div>
        </div>
      </Modal>

      {/* -------------------- Bulk Invoice Modal -------------------- */}
      <Modal
        isOpen={isBulkInvoiceOpen}
        onClose={() => setIsBulkInvoiceOpen(false)}
        title={t.batch_invoice_generator || "Batch Invoice Generator"}
        maxWidth="max-w-5xl"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-500">
              {t.generating_invoices_prefix || "Generating"}{" "}
              <span className="text-indigo-600">
                {selectedEmployees.length}
              </span>{" "}
              {t.generating_invoices_suffix || "invoices in current batch"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={printBulkInvoices}
                className="px-8 py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:shadow-none"
                disabled={selectedEmployees.length === 0}
              >
                {t.print_all_invoices || "Print All Invoices"}
              </button>
              <button
                onClick={() => setIsBulkInvoiceOpen(false)}
                className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition"
              >
                {t.close}
              </button>
            </div>
          </div>

          <style>{SALARY_STATEMENT_CSS}</style>
          <div className="bg-slate-50/50 p-6 rounded-3xl max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div ref={bulkInvoiceRef} className="space-y-8">
              {selectedEmployees.map((emp) => (
                <div
                  key={emp.Id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto"
                >
                  <SalaryStatementSheet data={buildSalaryStatementData(emp)} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Payroll Sheet header/footer details (PDF / Print) */}
      <Modal
        isOpen={Boolean(sheetMetaAction && sheetMeta)}
        onClose={() => setSheetMetaAction(null)}
        title={
          sheetMetaAction === "print" ? "Print Payroll Sheet" : "Payroll Sheet PDF"
        }
      >
        {sheetMeta ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              confirmPayrollSheetMeta();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col">
                <label className={FILTER_LABEL}>Salary Month</label>
                <input
                  type="month"
                  value={sheetMeta.salaryMonth}
                  onChange={(e) =>
                    setSheetMeta((p) => ({ ...p, salaryMonth: e.target.value }))
                  }
                  className={`${FILTER_CONTROL} px-3`}
                  required
                />
              </div>
              <div className="flex flex-col">
                <label className={FILTER_LABEL}>Date of Payment</label>
                <input
                  type="month"
                  value={sheetMeta.paymentMonth}
                  onChange={(e) =>
                    setSheetMeta((p) => ({
                      ...p,
                      paymentMonth: e.target.value,
                      salaryMonth:
                        previousMonthValue(e.target.value) || p.salaryMonth,
                    }))
                  }
                  className={`${FILTER_CONTROL} px-3`}
                  required
                />
              </div>
              <div className="flex flex-col sm:col-span-2">
                <label className={FILTER_LABEL}>Department</label>
                <input
                  type="text"
                  value={sheetMeta.department}
                  onChange={(e) =>
                    setSheetMeta((p) => ({ ...p, department: e.target.value }))
                  }
                  placeholder="e.g. Logistics & Supply Chain"
                  className={`${FILTER_CONTROL} px-3`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className={FILTER_LABEL}>Signatures</p>
              {sheetMeta.signatories.map((sig, index) => (
                <div
                  key={sig.role}
                  className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[110px_1fr_1fr]"
                >
                  <span className="text-sm font-semibold text-slate-700">
                    {sig.role}
                  </span>
                  <input
                    type="text"
                    value={sig.name}
                    onChange={(e) =>
                      updateSheetSignatory(index, "name", e.target.value)
                    }
                    placeholder="Name"
                    className={`${FILTER_CONTROL} px-3`}
                  />
                  <input
                    type="text"
                    value={sig.title}
                    onChange={(e) =>
                      updateSheetSignatory(index, "title", e.target.value)
                    }
                    placeholder="Designation"
                    className={`${FILTER_CONTROL} px-3`}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSheetMetaAction(null)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                {sheetMetaAction === "print" ? (
                  <Printer size={16} />
                ) : (
                  <FileText size={16} />
                )}
                {sheetMetaAction === "print" ? "Print" : "Download PDF"} (
                {selectedIds.length})
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      {/* ✅ Note Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={handleModalClose}
        title={t.employee_note_title || "Employee Note"}
      >
        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
              {noteContent}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={handleModalClose}
              className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-xl shadow-indigo-100"
            >
              {t.close}
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  type = "text",
  step,
  readOnly,
  required,
}) => (
  <div>
    <label className="block text-sm text-slate-700">{label}</label>
    <input
      type={type}
      step={step}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      required={required}
      className={`border border-slate-200 rounded-xl p-3 w-full mt-1 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200 ${
        readOnly ? "text-slate-900 opacity-80" : "text-slate-900"
      }`}
    />
  </div>
);

export default EmployeeTable;
