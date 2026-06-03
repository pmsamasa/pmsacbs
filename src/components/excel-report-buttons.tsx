"use client";

import { Download } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { formatKolkataDate } from "@/lib/utils";

type TransactionExportRow = {
  id: string;
  created_at: string;
  customer_id: string;
  customer: string;
  class_name: string;
  account_type: string;
  transaction_type: string;
  method: string;
  amount: number;
};

type CustomerExportRow = {
  id: string;
  name: string;
  class_name: string;
  accounts: { account_type: string; balance: number }[];
};

type IncomeExportRow = {
  id: string;
  created_at: string;
  entry_type: string;
  category: string;
  method: string;
  amount: number;
  note: string;
};

const green = "FF127A49";
const red = "FFBE2D2D";
const emerald = "FF0B3B2E";
const pale = "FFDFF7EA";

export function TransactionsExcelButton({ transactions, customers }: { transactions: TransactionExportRow[]; customers: CustomerExportRow[] }) {
  return (
    <button className="btn-primary" type="button" onClick={() => exportTransactions(transactions, customers)}>
      <Download className="size-4" /> Export Excel
    </button>
  );
}

export function IncomeExcelButton({ rows }: { rows: IncomeExportRow[] }) {
  return (
    <button className="btn-primary" type="button" onClick={() => exportIncome(rows)}>
      <Download className="size-4" /> Export Excel
    </button>
  );
}

async function exportTransactions(transactions: TransactionExportRow[], customers: CustomerExportRow[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PMSA CBS";
  workbook.created = new Date();

  const all = workbook.addWorksheet("All Transactions");
  setupColumns(all, [
    ["Sl No", 10],
    ["Date & Time", 24],
    ["Customer", 28],
    ["Class", 14],
    ["Account", 16],
    ["Type", 14],
    ["Method", 14],
    ["Amount", 16],
  ]);
  transactions.forEach((row, index) => {
    const excelRow = all.addRow([
      index + 1,
      formatKolkataDate(row.created_at),
      row.customer,
      row.class_name,
      titleCase(row.account_type),
      titleCase(row.transaction_type),
      titleCase(row.method),
      formatINR(row.amount),
    ]);
    colorAmountCell(excelRow.getCell(8), row.transaction_type);
  });
  finishTable(all, 1, transactions.length + 1);

  customers.forEach((customer) => {
    const sheetName = safeSheetName(customer.name || "Student");
    const sheet = workbook.addWorksheet(sheetName);
    const customerRows = transactions.filter((row) => row.customer_id === customer.id);
    const totalCredit = customerRows.filter((row) => row.transaction_type === "credit").reduce((sum, row) => sum + row.amount, 0);
    const totalDebit = customerRows.filter((row) => row.transaction_type === "debit").reduce((sum, row) => sum + row.amount, 0);
    const totalBalance = customer.accounts.reduce((sum, account) => sum + account.balance, 0);

    setupColumns(sheet, [
      ["Field", 24],
      ["Details", 32],
      ["Summary", 32],
      ["Amount", 18],
      ["Notes", 28],
      ["Extra", 18],
    ]);
    sheet.addRow(["Name", customer.name, "Accounts", customer.accounts.map((account) => titleCase(account.account_type)).join(", ") || "-", "", ""]);
    sheet.addRow(["Class", customer.class_name, "Total Balance", formatINR(totalBalance), "", ""]);
    sheet.addRow(["Account Count", customer.accounts.length, "Total Credited", formatINR(totalCredit), "", ""]);
    sheet.addRow(["", "", "Total Debited", formatINR(totalDebit), "", ""]);
    customer.accounts.forEach((account) => sheet.addRow(["", "", `${titleCase(account.account_type)} Balance`, formatINR(account.balance), "", ""]));
    sheet.addRow([]);

    const headerRow = sheet.addRow(["Sl No", "Date", "Account", "Type", "Method", "Amount"]);
    styleHeader(headerRow);
    customerRows.forEach((row, index) => {
      const excelRow = sheet.addRow([index + 1, formatKolkataDate(row.created_at), titleCase(row.account_type), titleCase(row.transaction_type), titleCase(row.method), formatINR(row.amount)]);
      colorAmountCell(excelRow.getCell(6), row.transaction_type);
      borderRow(excelRow);
    });
    sheet.autoFilter = { from: { row: headerRow.number, column: 1 }, to: { row: headerRow.number, column: 6 } };
    sheet.views = [{ state: "frozen", ySplit: headerRow.number }];
  });

  await saveWorkbook(workbook, "pmsa-cbs-transactions.xlsx");
}

async function exportIncome(rows: IncomeExportRow[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "PMSA CBS";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Income");
  setupColumns(sheet, [
    ["Sl No", 10],
    ["Date", 24],
    ["Type", 14],
    ["Category", 22],
    ["Method", 14],
    ["Amount", 16],
    ["Note", 42],
  ]);
  rows.forEach((row, index) => {
    const excelRow = sheet.addRow([index + 1, formatKolkataDate(row.created_at), titleCase(row.entry_type), row.category, titleCase(row.method), formatINR(row.amount), row.note]);
    colorAmountCell(excelRow.getCell(6), row.entry_type === "credit" ? "credit" : "debit");
  });
  finishTable(sheet, 1, rows.length + 1);
  await saveWorkbook(workbook, "pmsa-cbs-income.xlsx");
}

function setupColumns(sheet: ExcelJS.Worksheet, columns: [string, number][]) {
  sheet.columns = columns.map(([header, width]) => ({ header, width }));
  styleHeader(sheet.getRow(1));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function finishTable(sheet: ExcelJS.Worksheet, startRow: number, endRow: number) {
  for (let rowNumber = startRow; rowNumber <= endRow; rowNumber += 1) borderRow(sheet.getRow(rowNumber));
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
}

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: pale } };
    cell.font = { bold: true, color: { argb: emerald } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  borderRow(row);
}

function borderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FF0B3B2E" } },
      left: { style: "thin", color: { argb: "FF0B3B2E" } },
      bottom: { style: "thin", color: { argb: "FF0B3B2E" } },
      right: { style: "thin", color: { argb: "FF0B3B2E" } },
    };
  });
}

function colorAmountCell(cell: ExcelJS.Cell, type: string) {
  cell.font = { bold: true, color: { argb: type === "credit" ? green : type === "debit" ? red : emerald } };
  cell.alignment = { horizontal: "right" };
}

async function saveWorkbook(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), filename);
}

function formatINR(value: number) {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeSheetName(value: string) {
  return value.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Student";
}

