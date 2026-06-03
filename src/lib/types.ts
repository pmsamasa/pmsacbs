export type UserRole = "customer" | "manager" | "head";
export type AccountType = "saving" | "current" | "fixed";
export type TransactionType = "credit" | "debit" | "reversal" | "opening_balance";
export type MoneyMethod = "liquid" | "online";
export type RequestStatus = "pending" | "approved" | "rejected" | "used";

export type Profile = {
  id: string;
  role: UserRole;
  cic_no: string;
  customer_id: string | null;
  name: string | null;
  class_name: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  force_password_change: boolean;
  assistant_manager_name: string | null;
  assistant_manager_cic_no: string | null;
  assistant_manager_class: string | null;
  assistant_manager_phone: string | null;
  assistant_manager_email: string | null;
};

export type CustomerAccount = {
  id: string;
  customer_id: string;
  account_type: AccountType;
  balance: number;
  status: "active" | "closed" | "frozen";
  opened_at: string;
};

export type TransactionRow = {
  id: string;
  customer_id: string;
  account_id: string;
  account_type: AccountType;
  transaction_type: TransactionType;
  method: MoneyMethod;
  amount: number;
  balance_after: number;
  note: string | null;
  created_at: string;
  manager_period_id: string | null;
};

