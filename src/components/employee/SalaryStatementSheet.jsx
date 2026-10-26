// Salary Statement layout (Holy Gift spreadsheet format). Uses plain CSS
// classes (no Tailwind) so the same markup renders identically in the modal,
// the print popup and html2canvas PDF capture.

const ONES = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

const belowHundred = (n) =>
  n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`;

const belowThousand = (n) => {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  return [hundreds ? `${ONES[hundreds]} hundred` : "", rest ? belowHundred(rest) : ""]
    .filter(Boolean)
    .join(" ");
};

// Bangladeshi numbering: crore / lakh / thousand.
const integerToWords = (value) => {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return "zero";

  const parts = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;

  if (crore) parts.push(`${integerToWords(crore)} crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} thousand`);
  if (n) parts.push(belowThousand(n));

  return parts.join(" ");
};

export const amountToTakaWords = (value) => {
  const amount = Math.round(Math.max(Number(value) || 0, 0) * 100) / 100;
  const taka = Math.floor(amount);
  const paisa = Math.round((amount - taka) * 100);
  const words = `Taka ${integerToWords(taka)}${
    paisa ? ` and ${integerToWords(paisa)} paisa` : ""
  } only`;
  return words;
};

export const formatStatementAmount = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  });

export const formatPaymentDate = (date = new Date()) =>
  new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

export const SALARY_STATEMENT_CSS = `
  .salary-sheet {
    width: 100%;
    max-width: 820px;
    margin: 0 auto;
    padding: 36px 40px;
    background: #ffffff;
    color: #111111;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
    line-height: 1.35;
    box-sizing: border-box;
  }
  .salary-sheet * { box-sizing: border-box; }
  .salary-sheet .ss-hand {
    font-weight: 700;
  }
  .salary-sheet .ss-head {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 32px;
    margin-bottom: 22px;
  }
  .salary-sheet .ss-company {
    margin: 0 0 6px;
    font-size: 22px;
    text-decoration: underline;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .salary-sheet .ss-title {
    margin: 0 0 6px;
    font-size: 22px;
  }
  .salary-sheet .ss-field {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    margin: 0 0 6px;
    white-space: nowrap;
  }
  .salary-sheet .ss-field-value {
    flex: 1;
    min-width: 0;
    padding: 0 4px 1px;
    border-bottom: 1px solid #111111;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .salary-sheet .ss-section {
    display: flex;
    justify-content: space-between;
    margin: 22px 0 14px;
    font-size: 15px;
  }
  .salary-sheet .ss-section span { text-decoration: underline; }
  .salary-sheet .ss-rows { width: 100%; border-collapse: collapse; }
  .salary-sheet .ss-rows td { padding: 4px 0; vertical-align: top; }
  .salary-sheet .ss-rows td.ss-amt {
    width: 140px;
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .salary-sheet .ss-rows tr.ss-total td {
    padding-top: 6px;
    border-top: 1px solid #111111;
  }
  .salary-sheet .ss-rows tr.ss-total td:first-child { font-weight: 700; }
  .salary-sheet .ss-net {
    margin-top: 34px;
    border-top: 1.5px solid #111111;
    border-bottom: 1px solid #111111;
    padding: 6px 0;
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }
  .salary-sheet .ss-net strong { font-weight: 700; }
  .salary-sheet .ss-words { margin: 6px 0 0; }
  .salary-sheet .ss-remarks { margin: 6px 0 0; color: #333333; }
  .salary-sheet .ss-sign-top {
    display: flex;
    justify-content: space-between;
    margin-top: 30px;
    font-size: 12px;
    text-decoration: underline;
    text-transform: uppercase;
  }
  .salary-sheet .ss-sign-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    column-gap: 40px;
    margin-top: 48px;
    align-items: start;
  }
  .salary-sheet .ss-sign-line {
    border-top: 1px solid #111111;
    padding-top: 6px;
    min-height: 24px;
    text-transform: uppercase;
  }
  .salary-sheet .ss-approved {
    margin-top: 6px;
    text-decoration: underline;
    text-transform: uppercase;
  }
  .salary-sheet .ss-controller {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    column-gap: 40px;
    margin-top: 56px;
  }
  .salary-sheet .ss-controller div {
    grid-column: 2;
    border-top: 1px solid #111111;
    padding-top: 6px;
    white-space: nowrap;
  }
`;

const Field = ({ label, value }) => (
  <p className="ss-field">
    <span>{label}</span>
    <span className="ss-field-value">{value || " "}</span>
  </p>
);

const AmountRows = ({ rows, totalLabel, total }) => (
  <table className="ss-rows">
    <tbody>
      {rows.map((row) => (
        <tr key={row.label}>
          <td>{row.label}</td>
          <td className="ss-amt">{formatStatementAmount(row.amount)}</td>
        </tr>
      ))}
      <tr className="ss-total">
        <td>{totalLabel}</td>
        <td className="ss-amt">{formatStatementAmount(total)}</td>
      </tr>
    </tbody>
  </table>
);

/**
 * data: {
 *   companyName, phone, paymentDate, employeeName, employeeId, department,
 *   mobile, entitlements: [{label, amount}], grossPayment,
 *   deductions: [{label, amount}], totalDeduction, netPayable, remarks,
 *   preparedBy, preparedByRole, approvedByTitle
 * }
 */
const SalaryStatementSheet = ({ data }) => (
  <div className="salary-sheet">
    <div className="ss-head">
      <div>
        <h1 className="ss-company ss-hand">{data.companyName}</h1>
        <p className="ss-field">Phone: {data.phone}</p>
      </div>
      <div>
        <h2 className="ss-title ss-hand">Salary Statement</h2>
        <Field label="Dt of Payment:" value={data.paymentDate} />
      </div>
    </div>

    <div className="ss-head">
      <div>
        <Field label="Name of Employee:" value={data.employeeName} />
        <Field label="Department:" value={data.department} />
      </div>
      <div>
        <Field label="Employee ID No:" value={data.employeeId} />
        <Field label="Mobile No:" value={data.mobile} />
      </div>
    </div>

    <div className="ss-section ss-hand">
      <span>Particulars of Entitlement</span>
      <span>Amount(Tk.)</span>
    </div>
    <AmountRows
      rows={data.entitlements}
      totalLabel="Gross Payment"
      total={data.grossPayment}
    />

    <div className="ss-section ss-hand">
      <span>Particulars of Deduction</span>
      <span>Amount(Tk.)</span>
    </div>
    <AmountRows
      rows={data.deductions}
      totalLabel="Total Deduction"
      total={data.totalDeduction}
    />

    <div className="ss-net">
      <span>
        <strong>Net Payable Amount</strong> (Gross Payment (-) Total Deduction)
      </span>
      <strong>{formatStatementAmount(data.netPayable)}</strong>
    </div>
    <p className="ss-words">
      Payable Amount: {amountToTakaWords(data.netPayable)}
    </p>
    {data.remarks ? (
      <p className="ss-remarks">Remarks: {data.remarks}</p>
    ) : null}

    <div className="ss-sign-top">
      <span>Prepared By</span>
      <span>Recipient&apos;s Signature</span>
    </div>
    <div className="ss-sign-row">
      <div>
        <div className="ss-sign-line">{data.preparedBy}</div>
        <div>{data.preparedByRole}</div>
      </div>
      <div style={{ alignSelf: "end" }}>
        <div className="ss-approved">Approved</div>
      </div>
      <div>
        <div className="ss-sign-line">{data.employeeName}</div>
      </div>
    </div>
    <div className="ss-controller">
      <div>{data.approvedByTitle}</div>
    </div>
  </div>
);

export default SalaryStatementSheet;
