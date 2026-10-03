// Payment modes backed by an Account (BankAccount row). Cash / Card are not.
// Values match the payment mode strings stored on Book entries.
export const ACCOUNT_TYPES = ["Bank", "Bkash", "Nagad", "Rocket"];

export const WALLET_TYPES = ACCOUNT_TYPES.filter((type) => type !== "Bank");

export const isAccountMode = (mode) => ACCOUNT_TYPES.includes(mode);
export const isWalletMode = (mode) => WALLET_TYPES.includes(mode);

export const getAccountType = (account) => account?.accountType || "Bank";

export const ACCOUNT_TYPE_STYLES = {
  Bank: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Bkash: "bg-pink-50 text-pink-700 border-pink-200",
  Nagad: "bg-orange-50 text-orange-700 border-orange-200",
  Rocket: "bg-purple-50 text-purple-700 border-purple-200",
};

// Field labels differ: a bank has a bank name + account number, a wallet has
// an account (display) name + mobile number.
export const getAccountFieldLabels = (type) =>
  type === "Bank" || !type
    ? { name: "Bank Name", number: "Account Number" }
    : { name: "Account Name", number: `${type} Number` };

export const formatAccountLabel = (account) => {
  const type = getAccountType(account);
  return type === "Bank"
    ? `${account.accountNumber} (${account.bankName})`
    : `${account.accountNumber} (${account.bankName || type})`;
};
