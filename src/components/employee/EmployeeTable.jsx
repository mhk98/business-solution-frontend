import { motion } from "framer-motion";
import {
  Edit,
  Plus,
  Trash2,
  FileText,
  Notebook,
  Download,
  Printer,
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
import { useLayout } from "../../context/LayoutContext";
import { translations } from "../../utils/translations";
import { useGetAllEmployeeListWithoutQueryQuery } from "../../features/employeeList/employeeList";
import { useGetAllDepartmentsQuery } from "../../features/department/department";
import { useGetAllDesignationsQuery } from "../../features/designation/designation";
import { requestDeleteConfirmation } from "../../utils/deleteConfirmation";

const isActiveEmployee = (employee) =>
  String(employee?.status || "").toLowerCase() === "active";

const EmployeeTable = () => {
  const { language } = useLayout();
  const t = translations[language] || translations.EN;
  const role = localStorage.getItem("role");
  const userId = localStorage.getItem("userId");

  // ----------------------------
  // Modals
  // ----------------------------
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditModalOpen1, setIsEditModalOpen1] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
    holiday_payment: "",
    total_salary: "",
    advance: "",
    late: "",
    early_leave: "",
    absent: "",
    friday_absent: "",
    unapproval_absent: "",
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

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
    const friday_absent = Number(p.friday_absent) || 0;
    const unapproval_absent = Number(p.unapproval_absent) || 0;

    const perDayBasicSalary = basic_salary / 30;

    const basic_payable_salary = perDayBasicSalary * payable_days;
    const holiday_salary = perDayBasicSalary * holiday_days;
    const total_salary = basic_payable_salary + incentive;

    const perDay = total_salary / 30;

    const lateAbsentCount = Math.floor(late / 3);
    const earlyAbsentCount = Math.floor(early_leave / 3);

    const lateCut = lateAbsentCount * (Number(fine.late) * perDay);
    const earlyLeaveCut =
      earlyAbsentCount * (Number(fine.early_leave) * perDay);
    const absentCut = absent * (Number(fine.absent) * perDay);
    const fridayAbsentCut =
      friday_absent * (Number(fine.friday_absent) * perDay);
    const unapprovalAbsentCut =
      unapproval_absent * (Number(fine.unapproval_absent) * perDay);

    const totalCutAmount =
      lateCut +
      earlyLeaveCut +
      absentCut +
      fridayAbsentCut +
      unapprovalAbsentCut;

    const net_salary =
      total_salary - totalCutAmount - advance + holiday_salary + festival_bonus;

    const safe = (n) => (Number.isFinite(n) ? n : 0);

    return {
      perDay: safe(perDay),
      total_salary: safe(total_salary),
      cutAmount: safe(totalCutAmount),
      net_salary: Math.max(safe(net_salary), 0),
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

  const phoneMatchedEmployeeListId = useMemo(() => {
    const trimmed = phoneFilter.trim();
    if (!trimmed) return undefined;
    const matched = (employeeList?.data || []).find(
      (e) => e.phone && e.phone.includes(trimmed),
    );
    return matched ? String(matched.Id) : "0";
  }, [phoneFilter, employeeList]);

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
    const employeeNo = employee?.employee_id || "";

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

    return (employeeList?.data || [])
      .map((employee) => {
        const id = employee.Id ?? employee.id ?? "";
        const employeeNo = employee.employee_id || "";
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
  }, [employeeList]);

  const employeeSalaryOptions = useMemo(() => {
    const seen = new Set();

    return (employeeList?.data || [])
      .filter(isActiveEmployee)
      .map((employee) => {
        const id = employee.Id ?? employee.id ?? "";
        const name = employee.name || "";
        const employeeNo = employee.employee_id || "";
        const key = employeeNo
          ? `employee-${employeeNo}`
          : name.trim().toLowerCase();

        if (!key || seen.has(String(key))) return null;
        seen.add(String(key));

        return {
          value: String(id),
          label: name,
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
  }, [employeeList]);

  const getEmployeeListById = (id) =>
    (employeeList?.data || []).find(
      (employee) =>
        String(employee?.Id ?? employee?.id ?? "") === String(id || ""),
    );

  const getEmployeeListByEmployeeNo = (employeeNo) =>
    (employeeList?.data || []).find(
      (employee) =>
        String(employee?.employee_id ?? "") === String(employeeNo || ""),
    );

  const buildPayrollPlaceholder = (employee) => {
    if (!employee) return null;

    const salary = Number(employee.salary ?? employee.basic_salary ?? 0) || 0;

    return {
      Id: `employee-list-${employee.Id ?? employee.id}`,
      __isPayrollPlaceholder: true,
      name: employee.name || "",
      employee_id: employee.employee_id || "",
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
      holiday_payment: 0,
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
  }, [employeeList, phoneMatchedEmployeeListId, selectedEmployee]);

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

    const matchedEmployee = (employeeList?.data || []).find(
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
      name: selected?.label || "",
      departmentId: selected?.departmentId || "",
      designationId: selected?.designationId || "",
      employeeListId: selected?.id || "",
      employee_id: selected?.employee_id || "",
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

  const handleCreateEmployeeSelect = (selected) => {
    setCreateEmployee((prev) => applyEmployeeSalaryDefaults(prev, selected));
  };

  const handleCurrentEmployeeSelect = (selected) => {
    setCurrentEmployee((prev) => applyEmployeeSalaryDefaults(prev, selected));
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
    const normalized = {
      ...employee,
      date: employee.date ?? "",
      name: employee.name ?? "",
      departmentId: employee.departmentId ?? "",
      designationId:
        employee.designationId ?? employee.employeeProfile?.designationId ?? "",
      employeeListId:
        employee.employeeListId ??
        getEmployeeInternalId(String(employee.employee_id ?? "").trim()) ??
        "",
      employee_id: employee.employee_id ?? "",
      joining_date:
        employee.joining_date ?? employee.employeeProfile?.joiningDate ?? "",
      pre_joining_days: employee.pre_joining_days ?? "",
      payable_days: employee.payable_days ?? "",
      bookId: employee.bookId ?? employee.book?.Id ?? employee.book?.id ?? "",
      basic_salary: employee.basic_salary ?? "",
      incentive: employee.incentive ?? "",
      festival_bonus: employee.festival_bonus ?? "",
      holiday_payment: employee.holiday_payment ?? "",
      total_salary: employee.total_salary ?? "",
      advance: employee.advance ?? "",
      late: employee.late ?? "",
      early_leave: employee.early_leave ?? "",
      absent: employee.absent ?? "",
      friday_absent: employee.friday_absent ?? "",
      unapproval_absent: employee.unapproval_absent ?? "",
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
    const normalized = {
      ...employee,
      name: employee.name ?? "",
      employee_id: employee.employee_id ?? "",
      note: employee.note ?? "",
      remarks: employee.remarks ?? "",
      userId: userId,
    };

    setCurrentEmployee(normalized);
    setIsEditModalOpen1(true);
  };

  const closeEditModal = () => setIsEditModalOpen(false);
  const closeEditModal1 = () => setIsEditModalOpen1(false);
  const openAddModal = () => setIsAddModalOpen(true);
  const closeAddModal = () => setIsAddModalOpen(false);
  const openAddModalForEmployee = (employee) => {
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

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
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
      const s = calcSalary(createEmployee);

      const payload = {
        ...createEmployee,
        date: createEmployee.date || undefined,
        name: createEmployee.name || "",
        departmentId: normalizeOptionalId(createEmployee.departmentId),
        designationId: normalizeOptionalId(createEmployee.designationId),
        employee_id: createEmployee.employee_id || "",
        employeeListId: normalizeOptionalId(createEmployee.employeeListId),
        joining_date: createEmployee.joining_date || null,
        pre_joining_days: Number(createEmployee.pre_joining_days) || 0,
        payable_days:
          createEmployee.payable_days === ""
            ? 30
            : Number(createEmployee.payable_days) || 0,
        bookId: normalizeOptionalId(createEmployee.bookId),
        note: createEmployee.note || "",
        remarks: createEmployee.remarks || "",

        basic_salary: Number(createEmployee.basic_salary) || 0,
        incentive: Number(createEmployee.incentive) || 0,
        festival_bonus: Number(createEmployee.festival_bonus) || 0,
        holiday_payment: Number(createEmployee.holiday_payment) || 0,

        advance: Number(createEmployee.advance) || 0,
        late: Number(createEmployee.late) || 0,
        early_leave: Number(createEmployee.early_leave) || 0,
        absent: Number(createEmployee.absent) || 0,
        friday_absent: Number(createEmployee.friday_absent) || 0,
        unapproval_absent: Number(createEmployee.unapproval_absent) || 0,

        total_salary: s.total_salary,
        net_salary: s.net_salary,
        userId: userId,
      };

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
        holiday_payment: Number(currentEmployee.holiday_payment) || 0,

        advance: Number(currentEmployee.advance) || 0,
        late: Number(currentEmployee.late) || 0,
        early_leave: Number(currentEmployee.early_leave) || 0,
        absent: Number(currentEmployee.absent) || 0,
        friday_absent: Number(currentEmployee.friday_absent) || 0,
        unapproval_absent: Number(currentEmployee.unapproval_absent) || 0,

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

  const handleUpdateEmployee1 = async () => {
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
    setStartDate("");
    setEndDate("");
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
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: #ffffff;
              color: #0f172a;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            #invoiceCapture {
              width: 100%;
              max-width: 760px;
              margin: 0 auto;
              box-shadow: none !important;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            #invoiceCapture table { page-break-inside: avoid; break-inside: avoid; }
            #invoiceCapture tr { page-break-inside: avoid; break-inside: avoid; }
            @media print {
              body { background: #ffffff; }
              #invoiceCapture { border: 0 !important; border-radius: 0 !important; }
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

  const handleDownloadSelectedSheet = () => {
    if (!selectedEmployees.length) {
      toast.error("Please select employees first!");
      return;
    }

    const rows = selectedEmployees.map((emp, idx) => ({
      SL: idx + 1,
      Date: formatExportDate(emp.date || emp.createdAt),
      Employee: emp.name || "-",
      "Employee ID": emp.employee_id || "-",
      "Basic Salary": Number(emp.basic_salary || 0),
      Incentive: Number(emp.incentive || 0),
      "Festival Bonus": Number(emp.festival_bonus || 0),
      "Holiday Days": Number(emp.holiday_payment || 0),
      Advance: Number(emp.advance || 0),
      Late: Number(emp.late || 0),
      "Early Leave": Number(emp.early_leave || 0),
      Absent: Number(emp.absent || 0),
      "Friday Absent": Number(emp.friday_absent || 0),
      "Unapproval Absent": Number(emp.unapproval_absent || 0),
      "Total Salary": Number(emp.total_salary || 0),
      "Net Salary": Number(emp.net_salary || 0),
      Status: emp.status || "-",
      Note: emp.note || "",
      Remarks: emp.remarks || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 24 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 13 },
      { wch: 14 },
      { wch: 12 },
      { wch: 8 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 28 },
      { wch: 28 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Selected Payroll");

    const fileDate = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `selected-payroll-${fileDate}.xlsx`);
    toast.success("Selected payroll sheet downloaded!");
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
              <h1>Kafela Mart</h1>
              <p class="sub">Official Salary Statement</p>
              <p class="phone">Phone: +880 9647-555333</p>
            </div>
            <div class="right-header">
              <h2>INVOICE</h2>
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
              <tr>
                <td>Holiday Days</td>
                <td class="amount-col">${Number(emp?.holiday_payment || 0)}</td>
              </tr>
              <tr>
                <td>Advance (Deduction)</td>
                <td class="amount-col red">-${money(emp?.advance)}</td>
              </tr>
              <tr>
                <td>Attendance Penalty</td>
                <td class="amount-col muted">
                  L:${Number(emp?.late || 0)} |
                  E:${Number(emp?.early_leave || 0)} |
                  A:${Number(emp?.absent || 0)} |
                  F:${Number(emp?.friday_absent || 0)} |
                  U:${Number(emp?.unapproval_absent || 0)}
                </td>
              </tr>
              <tr class="total-row">
                <td>Total Calculation</td>
                <td class="amount-col total-border">${money(emp?.total_salary)}</td>
              </tr>
              <tr class="net-row">
                <td>NET SALARY PAYABLE</td>
                <td class="amount-col">৳ ${money(emp?.net_salary)}</td>
              </tr>
            </tbody>
          </table>

          ${
            emp?.remarks
              ? `
            <div class="remarks-box">
              <h4 class="remarks-title">Important Note</h4>
              <p class="remarks-text">${escapeHtml(emp?.remarks)}</p>
            </div>
          `
              : ""
          }

          <div class="signature-section">
            <div class="signature-box">
              <p class="sig-label">Received By</p>
              <p class="sig-value">${escapeHtml(emp?.name || "-")}</p>
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
          @page { size: A4; margin: 10mm; }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
            color: #111;
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
            max-width: 760px;
            margin: 0 auto;
            padding: 24px;
            background: #fff;
          }

          .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
          }

          .left-header h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 800;
            color: #4f46e5;
          }

          .sub {
            margin: 4px 0 0;
            font-size: 12px;
            font-weight: 700;
            color: #64748b;
          }

          .phone {
            margin: 6px 0 0;
            font-size: 11px;
            color: #94a3b8;
          }

          .right-header {
            text-align: right;
          }

          .right-header h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
          }

          .right-header p {
            margin: 4px 0 0;
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
          }

          .employee-box {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px 24px;
            margin-bottom: 20px;
            padding: 16px 18px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
          }

          .label {
            margin: 0 0 6px;
            font-size: 10px;
            font-weight: 800;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.12em;
          }

          .value {
            margin: 0;
            font-size: 14px;
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
            padding: 8px 0;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #64748b;
            border-bottom: 1px solid #cbd5e1;
          }

          .invoice-table td {
            padding: 10px 0;
            font-size: 14px;
            font-weight: 700;
            color: #334155;
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

          .muted {
            color: #94a3b8;
            font-weight: 600;
          }

          .total-row td {
            background: #f8fafc;
            font-weight: 800;
          }

          .total-border {
            border-top: 2px solid #0f172a !important;
          }

          .net-row td {
            // background: #4f46e5;
            color: #333;
            font-weight: 800;
            padding: 12px 14px;
            font-size: 16px;
          }

          .net-row td:first-child {
            border-radius: 14px 0 0 14px;
          }

          .net-row td:last-child {
            border-radius: 0 14px 14px 0;
          }

          .remarks-box {
            margin-top: 18px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: #f8fafc;
            padding: 12px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .remarks-title {
            margin: 0 0 6px;
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .remarks-text {
            margin: 0;
            font-size: 13px;
            line-height: 1.25rem;
            color: #334155;
            white-space: pre-wrap;
          }

          .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 64px;
            margin-top: 40px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .signature-box {
            text-align: center;
            padding-top: 12px;
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
            body { background: #fff; }
            .invoice-container { max-width: 100%; }
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
      <div className="my-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="my-6 flex flex-wrap gap-3 items-center justify-start">
          <button
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition px-4 py-2 rounded-xl shadow-sm"
            onClick={openAddModal}
          >
            {t.add} <Plus size={18} />
          </button>

          <button
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl disabled:opacity-60 shadow-sm"
            onClick={() => setIsBulkInvoiceOpen(true)}
            disabled={selectedIds.length === 0}
          >
            {t.print_selected || "Print Selected"} ({selectedIds.length})
          </button>

          <button
            className="inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl disabled:opacity-60 shadow-sm"
            onClick={handleDownloadSelectedSheet}
            disabled={selectedIds.length === 0}
          >
            <Download size={18} />
            {t.download_sheet || "Download Sheet"} ({selectedIds.length})
          </button>

          <button
            className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl border border-slate-200 disabled:opacity-60"
            onClick={() => setSelectedIds([])}
            disabled={selectedIds.length === 0}
          >
            {t.clear_selection || "Clear Selection"}
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <RotateCcw size={18} className="text-amber-500" />
            <span className="text-sm">Total Salary</span>
          </div>
          <span className="text-slate-900 font-semibold tabular-nums">
            {isLoading ? "Loading..." : (data?.meta?.totalSalary ?? 0)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-8 gap-4 items-end mb-6 w-full justify-center mx-auto">
        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">{t.from}</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-slate-600 mb-1">{t.to}</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-200"
          />
        </div>

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
          className="inline-flex items-center justify-center bg-white hover:bg-slate-50 text-slate-700 transition px-4 py-[10px] rounded-xl border border-slate-200"
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
                  label: t.holiday_days || "Holiday Days",
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
                      <button
                        onClick={() => openAddModalForEmployee(emp)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-indigo-50 transition"
                        title="Create Payroll"
                      >
                        <Plus size={18} className="text-indigo-600" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => openInvoice(emp)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-emerald-50 transition"
                          title="Invoice"
                        >
                          <FileText size={18} className="text-emerald-600" />
                        </button>

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
                      option.label === (currentEmployee?.name || ""),
                  ) || null
                }
                onChange={handleCurrentEmployeeSelect}
                placeholder={t.select_employee || "Select Employee"}
                isClearable
                hideSelectedOptions={false}
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

            <Field
              label="Pre Joining Days:"
              type="number"
              value={currentEmployee?.pre_joining_days}
              onChange={(v) => updateCurrentField("pre_joining_days", v)}
            />

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
              label={t.holiday_days + ":" || "Holiday Days:"}
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
                      option.label === createEmployee.name,
                  ) || null
                }
                onChange={handleCreateEmployeeSelect}
                placeholder={t.select_employee || "Select Employee"}
                isClearable
                hideSelectedOptions={false}
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

            <Field
              label="Pre Joining Days:"
              type="number"
              value={createEmployee.pre_joining_days}
              onChange={(v) => updateCreateField("pre_joining_days", v)}
            />

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
              label={t.holiday_days + ":" || "Holiday Days:"}
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
        maxWidth="max-w-3xl"
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
            className="bg-white text-slate-900 rounded-2xl p-6 border border-slate-100 shadow-sm"
          >
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="text-xl font-black text-indigo-600 mb-1">
                  Kafela Mart
                </h3>
                <p className="text-xs font-bold text-slate-500">
                  Official Salary Statement
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
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

              <div className="text-right">
                <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight">
                  {t.salary_statement || "INVOICE"}
                </h3>
                <p className="text-[11px] font-bold text-slate-500">
                  Date: {new Date().toLocaleDateString()}
                </p>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                  ID: {invoiceEmployee?.employee_id}-
                  {String(Date.now()).slice(-6)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  {t.employee_name || "Employee Name"}
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {invoiceEmployee?.name}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  {t.employee_id || "Employee ID"}
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {invoiceEmployee?.employee_id}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Department
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {invoiceEmployee?.department?.name ||
                    findDepartmentOption(invoiceEmployee?.departmentId)
                      ?.label ||
                    "-"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  Designation
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {invoiceEmployee?.designation?.name ||
                    findDesignationOption(
                      invoiceEmployee?.designationId,
                      invoiceEmployee?.departmentId,
                    )?.label ||
                    "-"}
                </p>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    {t.description || "Description"}
                  </th>
                  <th className="text-right py-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    {t.amount || "Amount"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 font-bold text-slate-700">
                    {t.basic_salary || "Basic Salary"}
                  </td>
                  <td className="py-2.5 text-right font-black text-slate-900">
                    {Number(
                      invoiceEmployee?.basic_salary || 0,
                    ).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-slate-700">
                    {t.incentive || "Incentive"}
                  </td>
                  <td className="py-2.5 text-right font-black text-slate-900">
                    {Number(invoiceEmployee?.incentive || 0).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-slate-700">
                    {t.holiday_days || "Holiday Days"}
                  </td>
                  <td className="py-2.5 text-right font-black text-slate-900">
                    {Number(invoiceEmployee?.holiday_payment || 0)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-slate-500">
                    {t.advance || "Advance (Deduction)"}
                  </td>
                  <td className="py-2.5 text-right font-black text-red-600">
                    -{Number(invoiceEmployee?.advance || 0).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-bold text-slate-700">
                    {t.attendance_penalty || "Attendance Penalty"}
                  </td>
                  <td className="py-2.5 text-right font-medium text-slate-400">
                    L:{invoiceEmployee?.late} | E:{invoiceEmployee?.early_leave}{" "}
                    | A:{invoiceEmployee?.absent}
                  </td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="py-2.5 font-black text-slate-900">
                    {t.total_calculation || "Total Calculation"}
                  </td>
                  <td className="py-2.5 text-right font-black text-slate-900 border-t-2 border-slate-900">
                    {Number(
                      invoiceEmployee?.total_salary || 0,
                    ).toLocaleString()}
                  </td>
                </tr>
                <tr className="bg-white">
                  <td className="py-3 px-4 font-black text-black rounded-l-xl">
                    {t.net_salary_payable || "NET SALARY PAYABLE"}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-black rounded-r-xl text-lg">
                    ৳{" "}
                    {Number(invoiceEmployee?.net_salary || 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            {invoiceEmployee?.remarks && (
              <div className="relative mt-5 overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                {/* Accent Line */}
                <div className="absolute left-0 top-0 h-full w-1.5 bg-indigo-500" />

                <div className="pl-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      📝
                    </div>

                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                        Important Note
                      </h4>

                      <p className="text-[11px] text-slate-400 font-medium">
                        Management / Payroll Remarks
                      </p>
                    </div>
                  </div>

                  <p className="whitespace-pre-wrap text-[13px] leading-5 text-slate-700 font-medium">
                    {invoiceEmployee.remarks}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-10 grid grid-cols-2 gap-16">
              <div className="text-center pt-3 border-t border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  {t.received_by || "Received By"}
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {invoiceEmployee?.name}
                </p>
              </div>
              <div className="text-center pt-3 border-t border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  {t.authorized_by || "Authorized By"}
                </p>
                <p className="text-sm font-bold text-slate-900">
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
                  className={`invoice-page bg-white text-slate-900 rounded-2xl p-6 border border-slate-100 shadow-sm ${
                    idx !== selectedEmployees.length - 1 ? "mb-8" : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <h3 className="text-xl font-black text-indigo-600 mb-1">
                        Kafela Mart
                      </h3>
                      <p className="text-xs font-bold text-slate-500">
                        {t.official_salary_statement ||
                          "Official Salary Statement"}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Phone: +880 9647-555333
                      </p>
                    </div>

                    <div className="text-right">
                      <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight">
                        {t.salary_statement || "INVOICE"}
                      </h3>
                      <p className="text-[11px] font-bold text-slate-500">
                        {t.date}: {new Date().toLocaleDateString()}
                      </p>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        ID: {emp?.employee_id}-{String(Date.now()).slice(-6)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        {t.employee_name || "Employee Name"}
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {emp?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        {t.employee_id || "Employee ID"}
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {emp?.employee_id}
                      </p>
                    </div>
                  </div>

                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                          {t.description || "Description"}
                        </th>
                        <th className="text-right py-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                          {t.amount || "Amount"}
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2.5 font-bold text-slate-700">
                          {t.basic_salary || "Basic Salary"}
                        </td>
                        <td className="py-2.5 text-right font-black text-slate-900">
                          {Number(emp?.basic_salary || 0).toLocaleString()}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 font-bold text-slate-700">
                          {t.incentive || "Incentive"}
                        </td>
                        <td className="py-2.5 text-right font-black text-slate-900">
                          {Number(emp?.incentive || 0).toLocaleString()}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 font-bold text-slate-700">
                          {t.holiday_days || "Holiday Days"}
                        </td>
                        <td className="py-2.5 text-right font-black text-slate-900">
                          {Number(emp?.holiday_payment || 0)}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 font-bold text-slate-500">
                          {t.advance || "Advance (Deduction)"}
                        </td>
                        <td className="py-2.5 text-right font-black text-red-600">
                          -{Number(emp?.advance || 0).toLocaleString()}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 font-bold text-slate-700">
                          {t.attendance_penalty || "Attendance Penalty"}
                        </td>
                        <td className="py-2.5 text-right font-medium text-slate-400">
                          L:{emp?.late || 0} | E:{emp?.early_leave || 0} | A:
                          {emp?.absent || 0} | F:{emp?.friday_absent || 0} | U:
                          {emp?.unapproval_absent || 0}
                        </td>
                      </tr>

                      <tr className="bg-slate-50/50">
                        <td className="py-2.5 font-black text-slate-900">
                          {t.total_calculation || "Total Calculation"}
                        </td>
                        <td className="py-2.5 text-right font-black text-slate-900 border-t-2 border-slate-900">
                          {Number(emp?.total_salary || 0).toLocaleString()}
                        </td>
                      </tr>

                      <tr className="bg-white">
                        <td className="py-3 px-4 font-black text-black rounded-l-xl">
                          {t.net_salary_payable || "NET SALARY PAYABLE"}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-black rounded-r-xl text-lg">
                          ৳ {Number(emp?.net_salary || 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {emp?.remarks && (
                    <div className="relative mt-5 overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                      {/* Accent Line */}
                      <div className="absolute left-0 top-0 h-full w-1.5 bg-indigo-500" />

                      <div className="pl-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                            📝
                          </div>

                          <div>
                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                              Important Note
                            </h4>

                            <p className="text-[11px] text-slate-400 font-medium">
                              Management / Payroll Remarks
                            </p>
                          </div>
                        </div>

                        <p className="whitespace-pre-wrap text-[13px] leading-5 text-slate-700 font-medium">
                          {emp.remarks}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-10 grid grid-cols-2 gap-16">
                    <div className="text-center pt-3 border-t border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        {t.received_by || "Received By"}
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {emp?.name}
                      </p>
                    </div>

                    <div className="text-center pt-3 border-t border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        {t.authorized_by || "Authorized By"}
                      </p>
                      <p className="text-sm font-bold text-slate-900">
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
