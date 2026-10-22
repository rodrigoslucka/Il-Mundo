import { createPaymentTotals } from "./totals.js";

const encoder = new TextEncoder();

const workbookEntries = [
  ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`],
  ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`],
  ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Resumen" sheetId="1" r:id="rId1"/><sheet name="Movimientos" sheetId="2" r:id="rId2"/></sheets>
</workbook>`],
  ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`],
  ["xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>
  <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`],
];

function escapeXml(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    })[character]);
}

function cents(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round((amount + Number.EPSILON) * 100) / 100 : 0;
}

function columnName(index) {
  let column = "";
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    value = Math.floor((value - 1) / 26);
  }
  return column;
}

function worksheet(rows, widths, moneyColumns = [], headerRow = 0) {
  const columns = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      if (value === null || value === undefined || value === "") return "";
      const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
      const style = rowIndex === 0 || rowIndex === headerRow ? ' s="1"' : moneyColumns.includes(columnIndex) && typeof value === "number" ? ' s="2"' : "";
      return typeof value === "number"
        ? `<c r="${reference}"${style}><v>${value}</v></c>`
        : `<c r="${reference}" t="inlineStr"${style}><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>${columns}</cols><sheetData>${sheetRows}</sheetData>
</worksheet>`;
}

function cashRows(state) {
  const sessions = [...state.cashSessions].sort((left, right) =>
    String(right.closedAt || right.openedAt || "").localeCompare(String(left.closedAt || left.openedAt || "")),
  );
  const memberNames = new Map(state.team.map((member) => [member.id, member.name]));
  const summaryRows = [
    [`Balance de caja — ${state.settings?.businessName || "Il Mundo"}`],
    ["Exportado", new Date().toISOString()],
    [],
    [
      "Turno", "Fecha", "Estado", "Abrió", "Monto de apertura", "Total generado",
      "Efectivo", "QR", "Otros medios", "Efectivo esperado", "Efectivo contado",
      "Diferencia", "Inicio", "Cierre",
    ],
  ];
  const paymentRows = [[`Movimientos de caja — ${state.settings?.businessName || "Il Mundo"}`], [], ["Turno", "Fecha y hora", "Pedido", "Medio de pago", "Importe"]];

  for (const session of sessions) {
    const transactions = Array.isArray(session.transactions) ? session.transactions : [];
    const totals = createPaymentTotals(transactions, state.settings?.paymentMethods || ["Efectivo", "QR"]);
    const opening = cents(session.openingAmount);
    const cash = totals.Efectivo || 0;
    const qr = totals.QR || 0;
    const other = cents(Object.entries(totals).filter(([method]) => !["Efectivo", "QR"].includes(method)).reduce((sum, [, amount]) => sum + amount, 0));
    const expected = cents(opening + cash);
    const closed = Boolean(session.closedAt);
    const counted = closed ? cents(session.countedAmount) : null;
    summaryRows.push([
      session.id || "",
      session.date || "",
      closed ? "Cerrado" : "Abierto",
      memberNames.get(session.openedBy) || session.openedBy || "",
      opening,
      cents(Object.values(totals).reduce((sum, amount) => sum + amount, 0)),
      cash,
      qr,
      other,
      expected,
      counted,
      closed ? cents(counted - expected) : null,
      session.openedAt || "",
      session.closedAt || "",
    ]);

    for (const transaction of transactions) {
      paymentRows.push([
        session.id || "",
        transaction?.paidAt || "",
        transaction?.orderId || "",
        transaction?.method || "",
        cents(transaction?.amount),
      ]);
    }
  }
  return { sessions, summaryRows, paymentRows };
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStoredFiles(files) {
  const localRecords = [];
  const centralRecords = [];
  let offset = 0;

  for (const [path, contents] of files) {
    const name = encoder.encode(path);
    const data = encoder.encode(contents);
    const checksum = crc32(data);
    const local = new Uint8Array(30 + name.length + data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    local.set(name, 30);
    local.set(data, 30 + name.length);
    localRecords.push(local);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centralRecords.push(central);
    offset += local.length;
  }

  const centralSize = centralRecords.reduce((size, record) => size + record.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  const size = offset + centralSize + end.length;
  const archive = new Uint8Array(size);
  let cursor = 0;
  for (const record of localRecords) {
    archive.set(record, cursor);
    cursor += record.length;
  }
  for (const record of centralRecords) {
    archive.set(record, cursor);
    cursor += record.length;
  }
  archive.set(end, cursor);
  return archive;
}

export function createCashWorkbook(state) {
  if (!state || !Array.isArray(state.cashSessions) || !Array.isArray(state.team)) {
    throw new Error("No se encontraron turnos de caja válidos para exportar.");
  }
  const { summaryRows, paymentRows } = cashRows(state);
  if (summaryRows.length > 1_048_576 || paymentRows.length > 1_048_576) {
    throw new Error("El balance supera el máximo de filas que Excel admite por hoja.");
  }
  const files = [
    ...workbookEntries,
    ["xl/worksheets/sheet1.xml", worksheet(summaryRows, [24, 14, 12, 22, 19, 18, 15, 15, 18, 21, 20, 15, 25, 25], [4, 5, 6, 7, 8, 9, 10, 11], 3)],
    ["xl/worksheets/sheet2.xml", worksheet(paymentRows, [24, 25, 25, 20, 16], [4], 2)],
  ];
  return zipStoredFiles(files);
}

export function createDailyBalanceWorkbook(state, dateKey) {
  if (!state || !Array.isArray(state.orders) || !state.settings || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error("No se encontraron pedidos válidos para exportar el balance del día.");
  }
  const orders = state.orders.filter((order) => order.date === dateKey && order.payment?.paidAt);
  const payments = orders.map((order) => ({
    orderId: order.id,
    paidAt: order.payment.paidAt,
    method: order.payment.method || order.paymentMethod || "",
    amount: cents(order.payment.amount ?? orderTotalForExport(order)),
  }));
  const totals = createPaymentTotals(payments, state.settings.paymentMethods || ["Efectivo", "QR"]);
  const total = cents(payments.reduce((sum, payment) => sum + payment.amount, 0));
  const methodRows = Object.entries(totals).map(([method, amount]) => [method, cents(amount)]);
  const summaryRows = [
    [`Balance del día — ${state.settings.businessName || "Il Mundo"}`],
    ["Fecha", dateKey],
    ["Pedidos pagados", String(orders.length)],
    ["Total vendido", total],
    [],
    ["Medio de pago", "Importe"],
    ...methodRows,
  ];
  const paymentRows = [
    [`Pedidos pagados — ${state.settings.businessName || "Il Mundo"}`],
    [],
    ["Pedido", "Hora de pago", "Modalidad", "Cliente", "Medio de pago", "Importe"],
    ...orders.map((order) => [
      order.number ? `#${String(order.number).padStart(3, "0")}` : order.id || "",
      order.payment.paidAt || "",
      order.channel === "dinein" ? "En mesa" : order.channel === "delivery" ? "Delivery" : "Para llevar",
      order.customerName || "",
      order.payment.method || order.paymentMethod || "",
      cents(order.payment.amount ?? orderTotalForExport(order)),
    ]),
  ];
  if (summaryRows.length > 1_048_576 || paymentRows.length > 1_048_576) {
    throw new Error("El balance supera el máximo de filas que Excel admite por hoja.");
  }
  const files = [
    ...workbookEntries,
    ["xl/worksheets/sheet1.xml", worksheet(summaryRows, [28, 24], [1], 5)],
    ["xl/worksheets/sheet2.xml", worksheet(paymentRows, [18, 25, 18, 28, 20, 16], [5], 2)],
  ];
  return zipStoredFiles(files);
}

function orderTotalForExport(order) {
  return Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)
    : 0;
}

export function cashWorkbookFilename(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  const dateKey = new Date(date.getTime() - offset).toISOString().slice(0, 10);
  return `il-mundo-balance-caja-${dateKey}.xlsx`;
}

export function dailyBalanceWorkbookFilename(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error("La fecha del balance no es válida.");
  return `il-mundo-balance-dia-${dateKey}.xlsx`;
}
