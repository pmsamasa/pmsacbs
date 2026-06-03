"use client";

import { Download } from "lucide-react";
import { downloadExcel, downloadPdf, type ReportRow } from "@/lib/reports";

export function ReportExportButton({ filename, title, rows, label = "Export filtered PDF" }: { filename: string; title: string; rows: ReportRow[]; label?: string }) {
  return (
    <button className="btn-secondary" type="button" onClick={() => downloadPdf(filename, title, rows)}>
      <Download className="size-4" /> {label}
    </button>
  );
}

export function ExcelExportButton({ filename, rows, label = "Excel" }: { filename: string; rows: ReportRow[]; label?: string }) {
  return (
    <button className="btn-primary" type="button" onClick={() => downloadExcel(filename, rows)}>
      <Download className="size-4" /> {label}
    </button>
  );
}
