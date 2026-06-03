"use client";

import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable, { type CellHookData } from "jspdf-autotable";
import { formatKolkataDate } from "@/lib/utils";

type FullReportTransaction = {
  created_at: string;
  customer: string;
  class_name: string;
  account_type: string;
  transaction_type: string;
  method: string;
  amount: number;
};

export function HeadFullReportButton({
  transactions,
  accountBalances,
}: {
  transactions: FullReportTransaction[];
  accountBalances: Record<string, number>;
}) {
  return (
    <button className="btn-primary" type="button" onClick={() => generateReport(transactions, accountBalances)}>
      <Download className="size-4" /> PDF
    </button>
  );
}

async function generateReport(transactions: FullReportTransaction[], accountBalances: Record<string, number>) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await registerNotoFont(doc);
  doc.setFont("NotoSans", "normal");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const credit = transactions.filter((row) => row.transaction_type === "credit").reduce((sum, row) => sum + row.amount, 0);
  const debit = transactions.filter((row) => row.transaction_type === "debit").reduce((sum, row) => sum + row.amount, 0);
  const balance = Object.values(accountBalances).reduce((sum, value) => sum + value, 0);

  doc.setFillColor(11, 59, 46);
  doc.roundedRect(margin, 12, pageWidth - margin * 2, 18, 3, 3, "F");
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(16);
  doc.setTextColor(247, 223, 138);
  doc.text("CBS MASA Full Report", pageWidth / 2, 23.5, { align: "center" });

  doc.setFont("NotoSans", "normal");
  doc.setFontSize(9);
  doc.setTextColor(20, 81, 62);
  doc.text(`Last Updated: ${formatKolkataDate(new Date())}`, pageWidth - margin, 39, { align: "right" });

  drawSummaryCard(doc, margin, 46, "Credited", credit, [18, 122, 73]);
  drawSummaryCard(doc, margin + 64, 46, "Debited", debit, [190, 45, 45]);
  drawSummaryCard(doc, margin + 128, 46, "Balance", balance, [154, 106, 3]);

  doc.setFont("NotoSans", "bold");
  doc.setFontSize(10);
  doc.setTextColor(6, 45, 36);
  doc.text("Account Balances", margin, 73);
  drawAccountCard(doc, margin, 78, "Saving", accountBalances.saving ?? 0);
  drawAccountCard(doc, margin + 64, 78, "Current", accountBalances.current ?? 0);
  drawAccountCard(doc, margin + 128, 78, "Fixed", accountBalances.fixed ?? 0);

  autoTable(doc, {
    head: [["Sl No", "Date & Time", "Customer", "Class", "Account", "Type", "Method", "Amount"]],
    body: transactions.map((row, index) => [
      String(index + 1),
      formatKolkataDate(row.created_at),
      row.customer,
      row.class_name,
      titleCase(row.account_type),
      titleCase(row.transaction_type),
      titleCase(row.method),
      formatINR(row.amount),
    ]),
    startY: 103,
    margin: { left: margin, right: margin, bottom: 18 },
    showHead: "firstPage",
    styles: {
      font: "NotoSans",
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: [6, 45, 36],
      lineWidth: 0.15,
      textColor: [6, 45, 36],
      valign: "middle",
    },
    headStyles: {
      fillColor: [223, 247, 234],
      textColor: [6, 45, 36],
      fontStyle: "bold",
      lineColor: [6, 45, 36],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: { cellWidth: 33 },
      2: { cellWidth: 32 },
      3: { cellWidth: 18 },
      4: { cellWidth: 20 },
      5: { cellWidth: 18 },
      6: { cellWidth: 18 },
      7: { halign: "right", cellWidth: 24 },
    },
    didParseCell: (data: CellHookData) => {
      if (data.section !== "body" || data.column.index !== 7) return;
      const transaction = transactions[data.row.index];
      if (transaction?.transaction_type === "credit") data.cell.styles.textColor = [18, 122, 73];
      if (transaction?.transaction_type === "debit") data.cell.styles.textColor = [190, 45, 45];
      data.cell.styles.fontStyle = "bold";
    },
  });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(9);
    doc.setTextColor(20, 81, 62);
    doc.text(`${page}/${pages}`, pageWidth / 2, pageHeight - 9, { align: "center" });
  }
  doc.save("CBS-MASA-Full-Report.pdf");
}

function drawSummaryCard(doc: jsPDF, x: number, y: number, label: string, amount: number, color: [number, number, number]) {
  doc.setFillColor(248, 255, 249);
  doc.setDrawColor(11, 59, 46);
  doc.roundedRect(x, y, 56, 18, 3, 3, "FD");
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(8);
  doc.setTextColor(20, 81, 62);
  doc.text(label, x + 4, y + 6);
  doc.setFont("NotoSans", "bold");
  doc.setFontSize(12);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(formatINR(amount), x + 4, y + 14);
}

function drawAccountCard(doc: jsPDF, x: number, y: number, label: string, amount: number) {
  doc.setFillColor(255, 250, 240);
  doc.setDrawColor(11, 59, 46);
  doc.roundedRect(x, y, 56, 14, 3, 3, "FD");
  doc.setFont("NotoSans", "normal");
  doc.setFontSize(8);
  doc.setTextColor(20, 81, 62);
  doc.text(label, x + 4, y + 5);
  doc.setFont("NotoSans", "bold");
  doc.setTextColor(154, 106, 3);
  doc.text(formatINR(amount), x + 4, y + 11);
}

async function registerNotoFont(doc: jsPDF) {
  const [regular, bold] = await Promise.all([
    loadFontBase64("/fonts/NotoSans-Regular.ttf"),
    loadFontBase64("/fonts/NotoSans-Bold.ttf"),
  ]);
  doc.addFileToVFS("NotoSans-Regular.ttf", regular);
  doc.addFileToVFS("NotoSans-Bold.ttf", bold);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
}

async function loadFontBase64(path: string) {
  const response = await fetch(path);
  const buffer = await response.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  return btoa(binary);
}

function formatINR(value: number) {
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

