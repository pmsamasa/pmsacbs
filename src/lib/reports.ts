"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatINR, formatKolkataDate } from "@/lib/utils";

export type ReportRow = Record<string, string | number | null | undefined>;

export function downloadPdf(filename: string, title: string, rows: ReportRow[]) {
  const doc = new jsPDF();
  const headers = rows.length ? Object.keys(rows[0]) : ["Status"];
  const body = rows.length ? rows.map((row) => headers.map((key) => String(row[key] ?? ""))) : [["No records"]];
  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.text(`Generated: ${formatKolkataDate(new Date())}`, 14, 23);
  autoTable(doc, { head: [headers], body, startY: 30, styles: { fontSize: 8 } });
  doc.save(filename);
}

export function downloadExcel(filename: string, rows: ReportRow[]) {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Status: "No records" }]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Report");
  XLSX.writeFile(workbook, filename);
}

export function normalizeTransaction(row: ReportRow) {
  return {
    Date: formatKolkataDate(row.created_at as string),
    Customer: row.customer_name ?? row.customer_id,
    Account: row.account_type,
    Type: row.transaction_type,
    Method: row.method,
    Amount: formatINR(row.amount as number),
    Balance: formatINR(row.balance_after as number),
    Note: row.note ?? "",
  };
}

