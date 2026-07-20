import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const txIds: string[] = body.txIds || [];
    const buId = body.buId;

    if (!txIds || txIds.length === 0) {
      return NextResponse.json({ error: "No transaction IDs provided" }, { status: 400 });
    }

    // Fetch live events from database matching the involved IDs
    const dbEvents = await db.contractLifecycleEvent.findMany({
      where: {
        id: { in: txIds },
      },
    });

    if (dbEvents.length === 0) {
      return NextResponse.json({ error: "No matching transactions found in DB" }, { status: 404 });
    }

    // Define standard headers
    const baseHeaders = [
      "Transaction ID",
      "Event Date",
      "Event Type",
      "Outlet Code",
      "Outlet Name",
      "Customer ID",
    ];

    // Collect all unique keys from metadata across all involved transactions
    const metadataKeys = new Set<string>();
    for (const e of dbEvents) {
      if (e.metadata && typeof e.metadata === "object") {
        for (const key of Object.keys(e.metadata as any)) {
          metadataKeys.add(key);
        }
      }
    }
    const metadataHeaders = Array.from(metadataKeys);
    
    // Final headers for the CSV
    const allHeaders = [...baseHeaders, ...metadataHeaders];

    // Build HTML table for Excel (.xls)
    let htmlContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    htmlContent += `<head><meta charset="utf-8" /><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Anomalies Data</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>`;
    htmlContent += `<body><table border="1">`;
    
    // Headers
    htmlContent += `<tr>` + allHeaders.map(h => `<th style="background-color: #f2f2f2;">${h}</th>`).join("") + `</tr>`;

    // Rows
    for (const e of dbEvents) {
      let rowHtml = `<tr>`;
      rowHtml += `<td>${e.id || ""}</td>`;
      rowHtml += `<td>${e.eventDate ? e.eventDate.toISOString().split("T")[0] : ""}</td>`;
      rowHtml += `<td>${e.eventType || ""}</td>`;
      rowHtml += `<td>${e.outletCode || ""}</td>`;
      rowHtml += `<td>${e.outletName || ""}</td>`;
      rowHtml += `<td>${e.customerId || ""}</td>`;

      for (const key of metadataHeaders) {
        const val = (e.metadata as any) ? (e.metadata as any)[key] : "";
        // Convert to string and escape HTML brackets if any to prevent breaking the table
        const safeVal = (val !== undefined && val !== null ? String(val) : "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        rowHtml += `<td>${safeVal}</td>`;
      }
      rowHtml += `</tr>`;
      htmlContent += rowHtml;
    }

    htmlContent += `</table></body></html>`;

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition": `attachment; filename="Raw_Anomalies_Export_${new Date().toISOString().slice(0, 10)}.xls"`,
      },
    });
  } catch (error) {
    console.error("Export Raw Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
