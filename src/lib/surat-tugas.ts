export function toRomanMonth(month: number) {
  const map = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  if (month < 1 || month > 12) return "";
  return map[month - 1];
}

export function formatSuratTugasNumber({
  sequenceNo,
  letterDate,
  prefix = "ST-SMG",
  suffix = "DIA",
}: {
  sequenceNo: number;
  letterDate: string;
  prefix?: string;
  suffix?: string;
}) {
  const date = new Date(`${letterDate}T00:00:00`);
  const year = Number.isNaN(date.getTime()) ? "0000" : String(date.getFullYear());
  const month = Number.isNaN(date.getTime()) ? "" : toRomanMonth(date.getMonth() + 1);
  const sequence = String(sequenceNo).padStart(3, "0");
  return `${year}.${sequence}/${prefix}/${month}/${suffix}`;
}

export function splitLines(text: string) {
  return text
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}
