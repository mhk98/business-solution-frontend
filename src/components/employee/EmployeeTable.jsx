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
import { useGetAllLogoQuery } from "../../features/logo/logo";
import { DEFAULT_COMPANY_NAME, buildAssetUrl } from "../../utils/pdfBranding";

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
    holiday_payment: "",
    total_salary: "",
    advance: "",
    late: "",
    early_leave: "",
    absent: "",
    half_day_absent: "",
    friday_absent: "",
    unapproval_absent: "",
    approval_absent: "",
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
    const holiday_days = Number(p.holiday_payment) || 0;
    const advance = Number(p.advance) || 0;
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
    const net_salary =
      total_salary -
      totalCutAmount -
      advance +
      holiday_salary +
      festival_bonus +
      bonus;

    const safe = (n) => (Number.isFinite(n) ? n : 0);

    return {
      perDay: safe(perDay),
      total_salary: safe(total_salary),
      cutAmount: safe(totalCutAmount),
      net_salary: Math.max(safe(net_salary), 0),
    };
  };

  const formatAmount = (value) =>
    Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

  const getHolidayDays = (employee) => Number(employee?.holiday_payment || 0);

  const getHolidaySalaryAmount = (employee) => {
    const basicSalary = Number(employee?.basic_salary || 0);
    return (basicSalary / 30) * getHolidayDays(employee);
  };

  const getGrossSalaryAmount = (employee) =>
    Number(employee?.total_salary || 0) +
    getHolidaySalaryAmount(employee) +
    Number(employee?.festival_bonus || 0) +
    Number(employee?.bonus || 0);

  const getSalaryDeductionAmount = (employee) => {
    const grossSalary = getGrossSalaryAmount(employee);
    const deduction = grossSalary - Number(employee?.net_salary || 0);

    return Math.max(Number.isFinite(deduction) ? deduction : 0, 0);
  };

  const getDeductionItems = (employee) => {
    const basicSalary = Number(employee?.basic_salary || 0);
    const incentive = Number(employee?.incentive || 0);
    const perDay = (basicSalary + incentive) / 30;
    const late = Number(employee?.late || 0);
    const earlyLeave = Number(employee?.early_leave || 0);
    const absent = Number(employee?.absent || 0);
    const halfDayAbsent = Number(employee?.half_day_absent || 0);
    const fridayAbsent = Number(employee?.friday_absent || 0);
    const unapprovalAbsent = Number(employee?.unapproval_absent || 0);
    const advance = Number(employee?.advance || 0);

    return [
      {
        label: `Late (${late})`,
        amount: Math.floor(late / 3) * (Number(fine.late) * perDay),
        count: late,
      },
      {
        label: `Early Leave (${earlyLeave})`,
        amount:
          Math.floor(earlyLeave / 3) * (Number(fine.early_leave) * perDay),
        count: earlyLeave,
      },
      {
        label: `Absent (${absent})`,
        amount: absent * (Number(fine.absent) * perDay),
        count: absent,
      },
      {
        label: `Half Day Absent (${halfDayAbsent})`,
        amount: halfDayAbsent * (Number(fine.absent) * perDay * 0.5),
        count: halfDayAbsent,
      },
      {
        label: `Friday Absent (${fridayAbsent})`,
        amount: fridayAbsent * (Number(fine.friday_absent) * perDay),
        count: fridayAbsent,
      },
      {
        label: `Unapproval Absent (${unapprovalAbsent})`,
        amount: unapprovalAbsent * (Number(fine.unapproval_absent) * perDay),
        count: unapprovalAbsent,
      },
      {
        label: "Advance",
        amount: advance,
        count: advance,
      },
    ].filter((item) => item.count > 0 || item.amount > 0);
  };

  const getInvoiceRemarks = (employee) =>
    employee?.remarks ||
    "Thank you for your dedication and valuable contribution.";

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
  const { data: logoData } = useGetAllLogoQuery();
  const payrollLogoUrl = buildAssetUrl(logoData?.data?.file);

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
      holiday_payment: 0,
      approval_absent: 0,
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
    const next = {
      ...(prev || {}),
      name: selected?.name || selected?.label || "",
      departmentId: selected?.departmentId || "",
      designationId: selected?.designationId || "",
      employeeListId: selected?.id || "",
      employee_id: selected?.employee_id || getEmployeeCode(selected?.employee),
      joining_date: selected?.joiningDate || "",
      pre_joining_days: "",
      payable_days: "",
      basic_salary:
        selected?.salary !== undefined && selected?.salary !== null
          ? String(selected.salary)
          : "",
      festival_bonus: prev?.festival_bonus ?? "",
    };

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

      const next = hasCurrentNetBalance
        ? { ...prev, advance: String(currentNetBalance) }
        : { ...prev, advance: "" };
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
      holiday_payment: employee.holiday_payment ?? "",
      total_salary: employee.total_salary ?? "",
      advance: employee.advance ?? "",
      late: employee.late ?? "",
      early_leave: employee.early_leave ?? "",
      absent: employee.absent ?? "",
      half_day_absent: employee.half_day_absent ?? "",
      friday_absent: employee.friday_absent ?? "",
      unapproval_absent: employee.unapproval_absent ?? "",
      approval_absent: employee.approval_absent ?? "",
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
      holiday_payment: Number(source.holiday_payment) || 0,

      advance: Number(source.advance) || 0,
      late: Number(source.late) || 0,
      early_leave: Number(source.early_leave) || 0,
      absent: Number(source.absent) || 0,
      half_day_absent: Number(source.half_day_absent) || 0,
      friday_absent: Number(source.friday_absent) || 0,
      unapproval_absent: Number(source.unapproval_absent) || 0,
      approval_absent: Number(source.approval_absent) || 0,

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
        holiday_payment: Number(currentEmployee.holiday_payment) || 0,

        advance: Number(currentEmployee.advance) || 0,
        late: Number(currentEmployee.late) || 0,
        early_leave: Number(currentEmployee.early_leave) || 0,
        absent: Number(currentEmployee.absent) || 0,
        half_day_absent: Number(currentEmployee.half_day_absent) || 0,
        friday_absent: Number(currentEmployee.friday_absent) || 0,
        unapproval_absent: Number(currentEmployee.unapproval_absent) || 0,
        approval_absent: Number(currentEmployee.approval_absent) || 0,

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

    setCurrentPage(1);
    setStartPage(1);
  };

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
        onclone: (clonedDoc) => {
          clonedDoc.documentElement.style.background = "#ffffff";
          clonedDoc.body.style.background = "#ffffff";

          const style = clonedDoc.createElement("style");
          style.setAttribute("data-html2canvas-fix", "true");
          style.innerHTML = `
            #invoiceCapture, #invoiceCapture * {
              color: #000 !important;
              background: transparent !important;
              background-color: transparent !important;
              border-color: #d1d5db !important;
              box-shadow: none !important;
              text-shadow: none !important;
              filter: none !important;
              outline: none !important;
            }
            #invoiceCapture { background: #fff !important; background-color: #fff !important; }
            #invoiceCapture *::before,
            #invoiceCapture *::after {
              color: #000 !important;
              background: transparent !important;
              background-color: transparent !important;
              border-color: #d1d5db !important;
              box-shadow: none !important;
              text-shadow: none !important;
              filter: none !important;
              outline: none !important;
            }
            #invoiceCapture .salary-brand-name,
            #invoiceCapture .salary-title-block h3 {
              color: #111827 !important;
            }
            #invoiceCapture .salary-brand-subtitle,
            #invoiceCapture .salary-title-block p {
              color: #525252 !important;
            }
            #invoiceCapture .salary-brand-phone {
              color: #737373 !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        },
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

  const printInvoice = () => {
    if (!invoiceRef.current || !invoiceEmployee) return;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      toast.error("Popup blocked! Allow popups then try again.");
      return;
    }

    const styles = Array.from(
      document.querySelectorAll("link[rel='stylesheet'], style"),
    )
      .map((node) => node.outerHTML)
      .join("");

    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>Salary Invoice</title>
          ${styles}
          <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            html,
            body {
              margin: 0;
              min-height: 0;
              background: #ffffff;
              color: #0f172a;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              padding: 7mm;
            }
            #invoiceCapture {
              width: 100%;
              max-width: 100%;
              margin: 0 auto;
              box-shadow: none !important;
              page-break-inside: avoid;
              break-inside: avoid;
              transform-origin: top center;
            }
            #invoiceCapture table { page-break-inside: avoid; break-inside: avoid; }
            #invoiceCapture tr { page-break-inside: avoid; break-inside: avoid; }
            #invoiceCapture .salary-statement-header {
              display: flex !important;
              align-items: center !important;
              justify-content: space-between !important;
              gap: 40px !important;
              margin-bottom: 36px !important;
            }
            #invoiceCapture .salary-branding-block {
              display: flex !important;
              flex-direction: column !important;
              align-items: flex-start !important;
              min-width: 0 !important;
            }
            #invoiceCapture .salary-brand-logo {
              width: auto !important;
              height: 68px !important;
              max-width: 220px !important;
              object-fit: contain !important;
              margin: 0 0 10px !important;
            }
            #invoiceCapture .salary-brand-name {
              color: #111827 !important;
              font-size: 28px !important;
              line-height: 1.05 !important;
              font-weight: 900 !important;
              margin: 0 !important;
            }
            #invoiceCapture .salary-brand-subtitle {
              color: #525252 !important;
              font-size: 14px !important;
              line-height: 1.35 !important;
              font-weight: 600 !important;
              margin: 8px 0 0 !important;
            }
            #invoiceCapture .salary-brand-phone {
              color: #737373 !important;
              font-size: 14px !important;
              line-height: 1.35 !important;
              font-weight: 400 !important;
              margin: 6px 0 0 !important;
            }
            #invoiceCapture .salary-title-block {
              flex: 0 0 auto !important;
              text-align: right !important;
            }
            #invoiceCapture .salary-title-block h3 {
              color: #111827 !important;
              font-size: 27px !important;
              line-height: 1.12 !important;
              font-weight: 900 !important;
              margin: 0 !important;
            }
            #invoiceCapture .salary-title-block p {
              color: #525252 !important;
              font-size: 14px !important;
              line-height: 1.35 !important;
              font-weight: 600 !important;
              margin: 8px 0 0 !important;
            }
            @media print {
              html,
              body {
                width: 210mm;
                height: 297mm;
                overflow: hidden;
                background: #ffffff;
              }
              #invoiceCapture {
                border: 0 !important;
                border-radius: 0 !important;
                padding: 8mm !important;
                zoom: 1;
              }
              #invoiceCapture > .flex:first-child,
              #invoiceCapture .salary-statement-header {
                margin-bottom: 30px !important;
              }
              #invoiceCapture > .grid {
                margin-bottom: 24px !important;
                padding: 18px !important;
                gap: 18px 54px !important;
              }
              #invoiceCapture h3 {
                font-size: 28px !important;
                margin-bottom: 6px !important;
              }
              #invoiceCapture p,
              #invoiceCapture td,
              #invoiceCapture th,
              #invoiceCapture div {
                line-height: 1.25 !important;
              }
              #invoiceCapture table {
                font-size: 16px !important;
              }
              #invoiceCapture th {
                padding-top: 10px !important;
                padding-bottom: 10px !important;
              }
              #invoiceCapture td {
                padding-top: 9px !important;
                padding-bottom: 9px !important;
              }
              #invoiceCapture tr:last-child td {
                padding-top: 14px !important;
                padding-bottom: 14px !important;
                font-size: 20px !important;
              }
              #invoiceCapture .mt-8 {
                margin-top: 26px !important;
              }
              #invoiceCapture .mt-10 {
                margin-top: 44px !important;
              }
            }
          </style>
        </head>
        <body>
          ${invoiceRef.current.outerHTML}
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

  const formatExportDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-GB");
  };

  const getSelectedPayrollRows = () =>
    selectedEmployees.map((emp, idx) => ({
      SL: idx + 1,
      Date: formatExportDate(emp.date || emp.createdAt),
      Employee: emp.name || "-",
      "Employee ID": emp.employee_id || "-",
      "Basic Salary": Number(emp.basic_salary || 0),
      Incentive: Number(emp.incentive || 0),
      Advance: Number(emp.advance || 0),
      "Total Salary": Number(emp.total_salary || 0),
      "Net Salary": Number(emp.net_salary || 0),
    }));

  const handleDownloadSelectedSheet = () => {
    if (!selectedEmployees.length) {
      toast.error("Please select employees first!");
      return;
    }

    const rows = getSelectedPayrollRows();

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 24 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Selected Payroll");

    const fileDate = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `selected-payroll-${fileDate}.xlsx`);
    toast.success("Selected payroll sheet downloaded!");
  };

  const drawPayrollSheetSignatures = (pdf) => {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const signatureY = pageHeight - 16;
    const signatureWidth = 48;
    const signatureGap = 22;
    const groupWidth = signatureWidth * 3 + signatureGap * 2;
    const startX = (pageWidth - groupWidth) / 2;

    [
      [startX, "Prepared By"],
      [startX + signatureWidth + signatureGap, "Checked By"],
      [startX + (signatureWidth + signatureGap) * 2, "Approved By"],
    ].forEach(([x, label]) => {
      pdf.setDrawColor(71, 85, 105);
      pdf.line(x, signatureY, x + signatureWidth, signatureY);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.text(label, x + signatureWidth / 2, signatureY + 4.5, {
        align: "center",
      });
    });
  };

  const handleDownloadSelectedPdf = async () => {
    if (!selectedEmployees.length) {
      toast.error("Please select employees first!");
      return;
    }

    const autoTable = (await import("jspdf-autotable")).default;
    const rows = getSelectedPayrollRows();
    const pdf = new jsPDF("l", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const generatedAt = new Date().toLocaleDateString("en-GB");
    const columns = [
      "SL",
      "Date",
      "Employee",
      "Employee ID",
      "Basic Salary",
      "Incentive",
      "Advance",
      "Total Salary",
      "Net Salary",
    ];

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(DEFAULT_COMPANY_NAME, 12, 12);
    pdf.setFontSize(12);
    pdf.text("Selected Payroll Sheet", pageWidth / 2, 12, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(`Date: ${generatedAt}`, pageWidth - 12, 12, { align: "right" });
    pdf.text(`Total Selected: ${rows.length}`, pageWidth - 12, 17, {
      align: "right",
    });

    autoTable(pdf, {
      startY: 22,
      head: [columns],
      body: rows.map((row) => columns.map((column) => row[column] ?? "")),
      theme: "grid",
      margin: { left: 8, right: 8, bottom: 26 },
      styles: {
        font: "helvetica",
        fontSize: 7.2,
        cellPadding: 1.5,
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
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 24 },
        2: { cellWidth: 60 },
        3: { cellWidth: 28 },
        4: { cellWidth: 24, halign: "right" },
        5: { cellWidth: 24, halign: "right" },
        6: { cellWidth: 24, halign: "right" },
        7: { cellWidth: 24, halign: "right" },
        8: { cellWidth: 24, halign: "right" },
      },
      didDrawPage: () => {
        drawPayrollSheetSignatures(pdf);
      },
    });

    const fileDate = new Date().toISOString().slice(0, 10);
    pdf.save(`selected-payroll-${fileDate}.pdf`);
    toast.success("Selected payroll PDF sheet downloaded!");
  };

  const handlePrintSelectedSheet = () => {
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
    const columns = [
      "SL",
      "Date",
      "Employee",
      "Employee ID",
      "Basic Salary",
      "Incentive",
      "Advance",
      "Total Salary",
      "Net Salary",
    ];

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
            td:nth-child(1),
            td:nth-child(n+5):nth-child(-n+9) {
              text-align: right;
            }
            .signatures {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 34px;
              margin-top: auto;
              padding-top: 34px;
              page-break-inside: avoid;
            }
            .signature {
              border-top: 1px solid #475569;
              padding-top: 6px;
              text-align: center;
              font-size: 11px;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <div class="sheet-page">
            <div class="sheet-header">
              <div>
                <h1>${escapeHtml(DEFAULT_COMPANY_NAME)}</h1>
                <p class="meta" style="text-align:left;">Payroll sheet</p>
              </div>
              <h2>Selected Payroll Sheet</h2>
              <div>
                <p class="meta">Date: ${escapeHtml(new Date().toLocaleDateString("en-GB"))}</p>
                <p class="meta">Total Selected: ${rows.length}</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
            <div class="signatures">
              <div class="signature">Prepared By</div>
              <div class="signature">Checked By</div>
              <div class="signature">Approved By</div>
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

  //
  const printBulkInvoices = () => {
    if (!selectedEmployees?.length) return;

    const printWindow = window.open("", "_blank", "width=900,height=650");
    if (!printWindow) {
      toast.error("Popup blocked! Allow popups then try again.");
      return;
    }

    const formatDate = (d = new Date()) =>
      new Date(d).toLocaleDateString("en-GB");

    const escapeHtml = (v) => {
      const s = String(v ?? "");
      return s
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    };

    const money = (n) => Number(n || 0).toLocaleString();
    const brandHtml = payrollLogoUrl
      ? `
            <img
              class="brand-logo"
              src="${escapeHtml(payrollLogoUrl)}"
              alt="${escapeHtml(DEFAULT_COMPANY_NAME)}"
            />
            <h1>${escapeHtml(DEFAULT_COMPANY_NAME)}</h1>
          `
      : `<h1>${escapeHtml(DEFAULT_COMPANY_NAME)}</h1>`;

    const sessionSuffix = String(Date.now()).slice(-6);

    const invoicesHtml = selectedEmployees
      .map((emp, idx) => {
        const invoiceDate = formatDate(new Date());
        const invoiceNo = `${escapeHtml(
          emp?.employee_id || "EMP",
        )}-${invoiceDate.replaceAll("/", "")}-${sessionSuffix}${idx}`;

        return `
        <div class="invoice-container invoice-page">
          <div class="invoice-header">
            <div class="left-header">
              ${brandHtml}
              <p class="sub">Official Salary Statement</p>
              <p class="phone">Phone: +880 9647-555333</p>
            </div>
            <div class="right-header">
              <h2>Salary Statement</h2>
              <p>Date: ${invoiceDate}</p>
              <p>ID: ${invoiceNo}</p>
            </div>
          </div>

          <div class="employee-box">
            <div>
              <p class="label">Employee Name</p>
              <p class="value">${escapeHtml(emp?.name || "-")}</p>
            </div>
            <div>
              <p class="label">Employee ID</p>
              <p class="value">${escapeHtml(emp?.employee_id || "-")}</p>
            </div>
            <div>
              <p class="label">Department</p>
              <p class="value">${escapeHtml(emp?.department?.name || "-")}</p>
            </div>
            <div>
              <p class="label">Designation</p>
              <p class="value">${escapeHtml(emp?.designation?.name || "-")}</p>
            </div>
          </div>

          <table class="invoice-table">
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount-col">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Basic Salary</td>
                <td class="amount-col">${money(emp?.basic_salary)}</td>
              </tr>
              <tr>
                <td>Incentive</td>
                <td class="amount-col">${money(emp?.incentive)}</td>
              </tr>
              <tr class="invoice-underlined-row">
                <td>Holiday Days (${getHolidayDays(emp)})</td>
                <td class="amount-col">${formatAmount(getHolidaySalaryAmount(emp))}</td>
              </tr>
              <tr class="total-row">
                <td>Gross Amount</td>
                <td class="amount-col">${formatAmount(getGrossSalaryAmount(emp))}</td>
              </tr>
              <tr class="section-row">
                <td colspan="2">Deduction</td>
              </tr>
              ${
                getDeductionItems(emp)
                  .map(
                    (item) => `
                <tr>
                  <td>${escapeHtml(item.label)}</td>
                  <td class="amount-col red">-${formatAmount(item.amount)}</td>
                </tr>`,
                  )
                  .join("") ||
                `
                <tr>
                  <td>No Deduction</td>
                  <td class="amount-col">0</td>
                </tr>`
              }
              <tr class="invoice-underlined-row">
                <td>Total Deduction</td>
                <td class="amount-col red">-${formatAmount(getSalaryDeductionAmount(emp))}</td>
              </tr>
              <tr class="net-row">
                <td>Net Payable Amount</td>
                <td class="amount-col">৳ ${formatAmount(emp?.net_salary)}</td>
              </tr>
            </tbody>
          </table>

          <div class="remarks-wrap">
            <h4 class="remarks-title">Remarks</h4>
            <div class="remarks-box">
              ${escapeHtml(getInvoiceRemarks(emp))}
            </div>
          </div>

          <div class="signature-section">
            <div class="signature-box">
              <p class="sig-label">Received By</p>
              <p class="sig-value">${escapeHtml(emp?.name || "-")}</p>
            </div>
            <div class="signature-box">
              <p class="sig-label">Checked By</p>
              <p class="sig-value">Accounts</p>
            </div>
            <div class="signature-box">
              <p class="sig-label">Authorized By</p>
              <p class="sig-value">Kafela Mart Management</p>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    printWindow.document.open();
    printWindow.document.write(`
    <html>
      <head>
        <title>Print Invoices</title>
        <style>
          * { box-sizing: border-box; }
          @page { size: A4; margin: 0; }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 6mm;
            background: #fff;
            color: #111;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .invoice-page {
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .invoice-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .invoice-container {
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
            padding: 28px;
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 18px;
          }

          .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 40px;
            margin-bottom: 38px;
          }

          .left-header {
            min-width: 0;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
          }

          .brand-logo {
            display: block;
            width: auto;
            height: 72px;
            max-width: 220px;
            object-fit: contain;
            margin: 0 0 10px;
          }

          .left-header h1 {
            margin: 0;
            font-size: 28px;
            line-height: 1.05;
            font-weight: 800;
            color: #0f172a;
          }

          .sub {
            margin: 7px 0 0;
            font-size: 14px;
            font-weight: 600;
            color: #525252;
          }

          .phone {
            margin: 6px 0 0;
            font-size: 14px;
            font-weight: 400;
            color: #737373;
          }

          .right-header {
            text-align: right;
            flex: 0 0 auto;
          }

          .right-header h2 {
            margin: 0;
            font-size: 27px;
            line-height: 1.12;
            font-weight: 800;
            color: #0f172a;
          }

          .right-header p {
            margin: 7px 0 0;
            font-size: 14px;
            font-weight: 600;
            color: #525252;
          }

          .employee-box {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 28px 80px;
            margin-bottom: 32px;
            padding: 24px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
          }

          .label {
            margin: 0 0 6px;
            font-size: 12px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.12em;
          }

          .value {
            margin: 0;
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
          }

          .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .invoice-table th {
            text-align: left;
            padding: 16px 0;
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #64748b;
            border-bottom: 1px solid #cbd5e1;
          }

          .invoice-table td {
            padding: 10px 0;
            font-size: 18px;
            font-weight: 500;
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
          }

          .amount-col {
            text-align: right;
            color: #0f172a;
            font-weight: 800;
          }

          .red {
            color: #dc2626;
          }

          .invoice-underlined-row td {
            border-bottom: 1.5px solid #334155 !important;
          }

          .muted {
            color: #94a3b8;
            font-weight: 600;
          }

          .total-row td {
            background: #f8fafc;
            font-weight: 800;
          }

          .section-row td {
            padding-top: 14px;
            color: #0f172a;
            font-weight: 800;
          }

          .total-border {
            border-top: 2px solid #0f172a !important;
          }

          .net-row td {
            background: #ecfdf5;
            border-top: 1px solid #d1fae5;
            border-bottom: 1px solid #d1fae5;
            color: #0f172a;
            font-weight: 800;
            padding: 16px 26px;
            font-size: 20px;
          }

          .net-row td:first-child {
            border-left: 1px solid #d1fae5;
            border-radius: 8px 0 0 8px;
          }

          .net-row td:last-child {
            border-right: 1px solid #d1fae5;
            border-radius: 0 8px 8px 0;
            color: #047857;
            font-size: 26px;
          }

          .remarks-wrap {
            margin-top: 30px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .remarks-title {
            margin: 0 0 6px;
            font-size: 14px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.12em;
          }

          .remarks-box {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px 20px;
            font-size: 16px;
            font-weight: 700;
            line-height: 1.5rem;
            color: #000000;
            white-space: pre-wrap;
          }

          .signature-section {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 36px;
            margin-top: 38px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .signature-box {
            text-align: center;
            padding-top: 16px;
            border-top: 1px solid #cbd5e1;
          }

          .sig-label {
            margin: 0 0 6px;
            font-size: 10px;
            font-weight: 800;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.12em;
          }

          .sig-value {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
          }

          @media print {
            html,
            body {
              width: 210mm;
              min-height: 297mm;
              background: #fff;
            }
            .invoice-container {
              max-width: 100%;
              padding: 7mm;
              border: 0;
              border-radius: 0;
              zoom: 0.84;
            }
            .invoice-table tr { page-break-inside: avoid; break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        ${invoicesHtml}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          }
        </script>
      </body>
    </html>
  `);
    printWindow.document.close();
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
      valueContainer: (base) => ({ ...base, padding: "0 12px" }),
      placeholder: (base) => ({ ...base, color: "#64748b" }), // slate-500
      singleValue: (base) => ({ ...base, color: "#0f172a" }), // slate-900
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
            onClick={handleDownloadSelectedPdf}
            disabled={selectedIds.length === 0}
          >
            <FileText size={18} />
            {t.download_pdf || "Download PDF"} ({selectedIds.length})
          </button>

          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 py-2 text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            onClick={handlePrintSelectedSheet}
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

      <div className="mb-6 grid w-full grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-8">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          defaultFilter="thisMonth"
          compact
          className="sm:col-span-2 lg:col-span-3 xl:col-span-3"
        />

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">
            {t.employee || "Employee"}
          </label>
          <Select
            options={employeeOptions}
            value={selectedEmployee}
            onChange={setSelectedEmployee}
            placeholder={t.select_employee || "Select Employee"}
            isClearable
            hideSelectedOptions={false}
            styles={selectStyles}
            className="w-full"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Department</label>
          <Select
            options={departmentOptions}
            value={selectedDepartment}
            onChange={(selected) => {
              setSelectedDepartment(selected);
              setSelectedDesignation(null);
            }}
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

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Designation</label>
          <Select
            options={filterDesignationOptions}
            value={selectedDesignation}
            onChange={setSelectedDesignation}
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

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-[10px] rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          >
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">Phone Number</label>
          <input
            type="tel"
            value={phoneFilter}
            onChange={(e) => setPhoneFilter(e.target.value)}
            placeholder="Search by phone..."
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">
            {t.per_page_label}
          </label>

          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
              setStartPage(1);
            }}
            className="px-3 py-[10px] rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>

        <button
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-[10px] text-slate-700 transition hover:bg-slate-50"
          onClick={clearFilters}
        >
          {t.clear_filters}
        </button>
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
                { key: "Employee", label: t.employee || "Employee" },
                { key: "Department", label: "Department" },
                { key: "Designation", label: "Designation" },
                {
                  key: "Employee ID",
                  label: t.employee_id_label || "Employee ID",
                },
                {
                  key: "Basic Salary",
                  label: t.basic_salary || "Basic Salary",
                },
                { key: "Incentive", label: t.incentive || "Incentive" },
                {
                  key: "Festival Bonus",
                  label: t.festival_bonus || "Festival Bonus",
                },
                {
                  key: "Holiday Days",
                  label: t.holiday_days || "Incashment (Holiday)",
                },
                { key: "Advance", label: t.advance || "Advance" },
                { key: "Total Salary", label: t.total_salary },
                { key: "Net Salary", label: t.net_salary },
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {emp.employee_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(emp.basic_salary || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(emp.incentive || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(emp.festival_bonus || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(emp.holiday_payment || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(emp.advance || 0)}
                </td>
                {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(emp.late || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(emp.early_leave || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(emp.absent || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(emp.friday_absent || 0)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(emp.unapproval_absent || 0)}
                </td> */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(emp.total_salary || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                  {Number(emp.net_salary || 0).toFixed(2)}
                </td>
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
              label={t.holiday_days + ":" || "Incashment (Holiday):"}
              type="number"
              value={currentEmployee?.holiday_payment}
              onChange={(v) => updateCurrentField("holiday_payment", v)}
            />

            <Field
              label="Advance:"
              type="number"
              step="0.01"
              value={currentEmployee?.advance}
              readOnly={hasCurrentNetBalance}
              onChange={(v) => updateCurrentField("advance", v)}
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
              label={t.holiday_days + ":" || "Incashment (Holiday):"}
              type="number"
              value={createEmployee.holiday_payment}
              onChange={(v) => updateCreateField("holiday_payment", v)}
            />

            <Field
              label="Advance:"
              type="number"
              step="0.01"
              value={createEmployee.advance}
              readOnly={hasCreateNetBalance}
              onChange={(v) => updateCreateField("advance", v)}
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

          <div
            id="invoiceCapture"
            ref={invoiceRef}
            className="bg-white text-slate-900 rounded-2xl p-10 border border-slate-200 shadow-sm"
          >
            <div className="salary-statement-header flex justify-between items-center gap-10 mb-10">
              <div className="salary-branding-block min-w-0 flex flex-col items-start">
                {payrollLogoUrl ? (
                  <img
                    src={payrollLogoUrl}
                    alt={DEFAULT_COMPANY_NAME}
                    crossOrigin="anonymous"
                    className="salary-brand-logo h-[68px] max-w-[220px] object-contain mb-3"
                  />
                ) : null}
                <div className="salary-brand-name text-[28px] leading-none font-black text-slate-900">
                  {DEFAULT_COMPANY_NAME}
                </div>
                <div className="salary-brand-subtitle mt-2 text-sm font-semibold text-neutral-600">
                  Official Salary Statement
                </div>
                <p className="salary-brand-phone mt-1.5 text-sm font-normal text-neutral-500">
                  Phone: +880 9647-555333
                </p>
              </div>

              {/* <div>
                <img
                  src={logo}
                  alt=" Logo"
                  className="w-36 h-auto mb-3 object-contain"
                />
                <p className="text-sm font-bold text-slate-500">Official Salary Statement</p>
                <p className="text-xs text-slate-400 mt-2">Phone: +880 9647-555333</p>
              </div> */}

              <div className="salary-title-block text-right shrink-0">
                <h3 className="text-[27px] leading-tight font-black text-slate-900 tracking-tight">
                  {t.salary_statement || "INVOICE"}
                </h3>
                <p className="mt-3 text-sm font-semibold text-neutral-600">
                  Date: {new Date().toLocaleDateString()}
                </p>
                <p className="mt-1.5 text-sm font-semibold text-neutral-600">
                  ID: {invoiceEmployee?.employee_id}-
                  {String(Date.now()).slice(-6)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-20 gap-y-7 mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                  {t.employee_name || "Employee Name"}
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {invoiceEmployee?.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                  {t.employee_id || "Employee ID"}
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {invoiceEmployee?.employee_id}
                </p>
              </div>
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                  Department
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {invoiceEmployee?.department?.name ||
                    findDepartmentOption(invoiceEmployee?.departmentId)
                      ?.label ||
                    "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                  Designation
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {invoiceEmployee?.designation?.name ||
                    findDesignationOption(
                      invoiceEmployee?.designationId,
                      invoiceEmployee?.departmentId,
                    )?.label ||
                    "-"}
                </p>
              </div>
            </div>

            <table className="w-full text-lg">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-4 text-sm font-black text-slate-500 uppercase tracking-widest">
                    {t.description || "Description"}
                  </th>
                  <th className="text-right py-4 text-sm font-black text-slate-500 uppercase tracking-widest">
                    {t.amount || "Amount"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 font-medium text-slate-900">
                    {t.basic_salary || "Basic Salary"}
                  </td>
                  <td className="py-3 text-right font-black text-slate-900">
                    {Number(
                      invoiceEmployee?.basic_salary || 0,
                    ).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-medium text-slate-900">
                    {t.incentive || "Incentive"}
                  </td>
                  <td className="py-3 text-right font-black text-slate-900">
                    {Number(invoiceEmployee?.incentive || 0).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 font-medium text-slate-900 border-b-[1.5px] border-slate-700">
                    {t.holiday_days || "Incashment (Holiday)"} (
                    {getHolidayDays(invoiceEmployee)})
                  </td>
                  <td className="py-3 text-right font-black text-slate-900 border-b-[1.5px] border-slate-700">
                    {formatAmount(getHolidaySalaryAmount(invoiceEmployee))}
                  </td>
                </tr>
                <tr>
                  <td className="py-4 font-black text-slate-900">
                    {t.gross_amount || "Gross Amount"}
                  </td>
                  <td className="py-4 text-right font-black text-slate-900">
                    {formatAmount(getGrossSalaryAmount(invoiceEmployee))}
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={2}
                    className="pt-4 pb-3 font-black text-slate-900"
                  >
                    {t.deduction || "Deduction"}
                  </td>
                </tr>
                {getDeductionItems(invoiceEmployee).length ? (
                  getDeductionItems(invoiceEmployee).map((item) => (
                    <tr key={item.label}>
                      <td className="py-3 font-bold text-slate-500">
                        {item.label}
                      </td>
                      <td className="py-3 text-right font-black text-red-600">
                        -{formatAmount(item.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 font-bold text-slate-500">
                      {t.no_deduction || "No Deduction"}
                    </td>
                    <td className="py-3 text-right font-black text-slate-900">
                      0
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="py-4 font-black text-slate-900 border-b-[1.5px] border-slate-700">
                    {t.total_deduction || "Total Deduction"}
                  </td>
                  <td className="py-4 text-right font-black text-red-600 border-b-[1.5px] border-slate-700">
                    -{formatAmount(getSalaryDeductionAmount(invoiceEmployee))}
                  </td>
                </tr>
                <tr>
                  <td className="py-4 px-7 font-black text-slate-900 rounded-l-lg border-y border-l border-emerald-100 bg-emerald-50/60">
                    {t.net_payable_amount || "Net Payable Amount"}
                  </td>
                  <td className="py-4 px-7 text-right font-black text-emerald-700 rounded-r-lg text-2xl border-y border-r border-emerald-100 bg-emerald-50/60">
                    ৳ {formatAmount(invoiceEmployee?.net_salary)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="mt-8">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">
                {t.remarks || "Remarks"}
              </h4>
              <div className="rounded-lg border border-slate-200 px-5 py-4 text-base font-bold text-black">
                {getInvoiceRemarks(invoiceEmployee)}
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-16">
              <div className="text-center pt-4 border-t border-slate-200">
                <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">
                  {t.received_by || "Received By"}
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {invoiceEmployee?.name}
                </p>
              </div>
              <div className="text-center pt-4 border-t border-slate-200">
                <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">
                  {t.authorized_by || "Authorized By"}
                </p>
                <p className="text-lg font-bold text-slate-900">
                  Kafela Mart Management
                </p>
              </div>
            </div>
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

          {/* <div className="bg-slate-50/50 p-6 rounded-3xl max-h-[60vh] overflow-y-auto custom-scrollbar space-y-8">
            <div ref={bulkInvoiceRef}>
              {selectedEmployees.map((emp, idx) => (
                <div
                  key={emp.Id}
                  className={`bg-white text-slate-900 rounded-2xl p-8 border border-slate-200 shadow-sm ${idx !== selectedEmployees.length - 1 ? 'mb-8' : ''}`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-black text-indigo-600"></h3>
                      <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Statement of Earnings</p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Date</p>
                      <p className="text-xs font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6 border-y border-slate-100 py-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</p>
                      <p className="text-sm font-bold text-slate-900">{emp.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee ID</p>
                      <p className="text-sm font-bold text-slate-900">{emp.employee_id}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-bold">Base Earnings</span>
                      <span className="text-slate-900 font-black">{Number(emp.basic_salary || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-bold">Incentives</span>
                      <span className="text-slate-900 font-black">+{Number(emp.incentive || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500 font-bold text-red-400">Deductions (Adv/Fine)</span>
                      <span className="text-red-500 font-black">-{Number(emp.advance || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-base pt-3 border-t border-dashed border-slate-200">
                      <span className="text-slate-900 font-black uppercase tracking-tight">Net Payable Amount</span>
                      <span className="text-indigo-600 font-black">৳ {Number(emp.net_salary || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div> */}
          <div className="bg-slate-50/50 p-6 rounded-3xl max-h-[60vh] overflow-y-auto custom-scrollbar space-y-8">
            <div ref={bulkInvoiceRef}>
              {selectedEmployees.map((emp, idx) => (
                <div
                  key={emp.Id}
                  className={`invoice-page bg-white text-slate-900 rounded-2xl p-10 border border-slate-200 shadow-sm ${
                    idx !== selectedEmployees.length - 1 ? "mb-8" : ""
                  }`}
                >
                  <div className="salary-statement-header flex justify-between items-center gap-10 mb-10">
                    <div className="salary-branding-block min-w-0 flex flex-col items-start">
                      {payrollLogoUrl ? (
                        <img
                          src={payrollLogoUrl}
                          alt={DEFAULT_COMPANY_NAME}
                          crossOrigin="anonymous"
                          className="salary-brand-logo h-[68px] max-w-[220px] object-contain mb-3"
                        />
                      ) : null}
                      <div className="salary-brand-name text-[28px] leading-none font-black text-slate-900">
                        {DEFAULT_COMPANY_NAME}
                      </div>
                      <div className="salary-brand-subtitle mt-2 text-sm font-semibold text-neutral-600">
                        {t.official_salary_statement ||
                          "Official Salary Statement"}
                      </div>
                      <p className="salary-brand-phone mt-1.5 text-sm font-normal text-neutral-500">
                        Phone: +880 9647-555333
                      </p>
                    </div>

                    <div className="salary-title-block text-right shrink-0">
                      <h3 className="text-[27px] leading-tight font-black text-slate-900 tracking-tight">
                        {t.salary_statement || "INVOICE"}
                      </h3>
                      <p className="mt-3 text-sm font-semibold text-neutral-600">
                        {t.date}: {new Date().toLocaleDateString()}
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-neutral-600">
                        ID: {emp?.employee_id}-{String(Date.now()).slice(-6)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-20 gap-y-7 mb-8 p-6 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                        {t.employee_name || "Employee Name"}
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        {emp?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                        {t.employee_id || "Employee ID"}
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        {emp?.employee_id}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                        Department
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        {emp?.department?.name ||
                          findDepartmentOption(emp?.departmentId)?.label ||
                          "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                        Designation
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        {emp?.designation?.name ||
                          findDesignationOption(
                            emp?.designationId,
                            emp?.departmentId,
                          )?.label ||
                          "-"}
                      </p>
                    </div>
                  </div>

                  <table className="w-full text-lg">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-4 text-sm font-black text-slate-500 uppercase tracking-widest">
                          {t.description || "Description"}
                        </th>
                        <th className="text-right py-4 text-sm font-black text-slate-500 uppercase tracking-widest">
                          {t.amount || "Amount"}
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-3 font-medium text-slate-900">
                          {t.basic_salary || "Basic Salary"}
                        </td>
                        <td className="py-3 text-right font-black text-slate-900">
                          {Number(emp?.basic_salary || 0).toLocaleString()}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-3 font-medium text-slate-900">
                          {t.incentive || "Incentive"}
                        </td>
                        <td className="py-3 text-right font-black text-slate-900">
                          {Number(emp?.incentive || 0).toLocaleString()}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-3 font-medium text-slate-900 border-b-[1.5px] border-slate-700">
                          {t.holiday_days || "Incashment (Holiday)"} (
                          {getHolidayDays(emp)})
                        </td>
                        <td className="py-3 text-right font-black text-slate-900 border-b-[1.5px] border-slate-700">
                          {formatAmount(getHolidaySalaryAmount(emp))}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-4 font-black text-slate-900">
                          {t.gross_amount || "Gross Amount"}
                        </td>
                        <td className="py-4 text-right font-black text-slate-900">
                          {formatAmount(getGrossSalaryAmount(emp))}
                        </td>
                      </tr>

                      <tr>
                        <td
                          colSpan={2}
                          className="pt-4 pb-3 font-black text-slate-900"
                        >
                          {t.deduction || "Deduction"}
                        </td>
                      </tr>

                      {getDeductionItems(emp).length ? (
                        getDeductionItems(emp).map((item) => (
                          <tr key={item.label}>
                            <td className="py-3 font-bold text-slate-500">
                              {item.label}
                            </td>
                            <td className="py-3 text-right font-black text-red-600">
                              -{formatAmount(item.amount)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-3 font-bold text-slate-500">
                            {t.no_deduction || "No Deduction"}
                          </td>
                          <td className="py-3 text-right font-black text-slate-900">
                            0
                          </td>
                        </tr>
                      )}

                      <tr>
                        <td className="py-4 font-black text-slate-900 border-b-[1.5px] border-slate-700">
                          {t.total_deduction || "Total Deduction"}
                        </td>
                        <td className="py-4 text-right font-black text-red-600 border-b-[1.5px] border-slate-700">
                          -{formatAmount(getSalaryDeductionAmount(emp))}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-4 px-7 font-black text-slate-900 rounded-l-lg border-y border-l border-emerald-100 bg-emerald-50/60">
                          {t.net_payable_amount || "Net Payable Amount"}
                        </td>
                        <td className="py-4 px-7 text-right font-black text-emerald-700 rounded-r-lg text-2xl border-y border-r border-emerald-100 bg-emerald-50/60">
                          ৳ {formatAmount(emp?.net_salary)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="mt-8">
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-3">
                      {t.remarks || "Remarks"}
                    </h4>
                    <div className="rounded-lg border border-slate-200 px-5 py-4 text-base font-bold text-black">
                      {getInvoiceRemarks(emp)}
                    </div>
                  </div>

                  <div className="mt-10 grid grid-cols-3 gap-10">
                    <div className="text-center pt-4 border-t border-slate-200">
                      <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">
                        {t.received_by || "Received By"}
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        {emp?.name}
                      </p>
                    </div>

                    <div className="text-center pt-4 border-t border-slate-200">
                      <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">
                        {t.checked_by || "Checked By"}
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        {t.accounts || "Accounts"}
                      </p>
                    </div>

                    <div className="text-center pt-4 border-t border-slate-200">
                      <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">
                        {t.authorized_by || "Authorized By"}
                      </p>
                      <p className="text-lg font-bold text-slate-900">
                        {t.holy_gift_management || "Kafela Mart Management"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
