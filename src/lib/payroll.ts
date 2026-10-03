export type PayrollBreakdownInput = {
  monthlySalary: number;
  daysInMonth: number;
  attendanceDays?: number;
  weekOffDays?: number;
  bonuses?: number;
};

export type PayrollBreakdown = {
  dailyRate: number;
  allowedWeekOffs: number;
  extraWeekOffs: number;
  absentDays: number;
  deductions: number;
  netSalary: number;
};

const SALARY_BASIS_DAYS = 30;

export function calculatePayrollBreakdown({
  monthlySalary,
  daysInMonth,
  attendanceDays = 0,
  weekOffDays = 0,
  bonuses = 0,
}: PayrollBreakdownInput): PayrollBreakdown {
  const safeMonthlySalary = Number(monthlySalary) || 0;
  const safeDaysInMonth = Math.max(1, Number(daysInMonth) || 1);
  const safeAttendanceDays = Math.max(0, Number(attendanceDays) || 0);
  const safeWeekOffDays = Math.max(0, Number(weekOffDays) || 0);
  const safeBonuses = Math.max(0, Number(bonuses) || 0);

  const dailyRate = safeMonthlySalary / SALARY_BASIS_DAYS;
  const allowedWeekOffs = Math.min(safeWeekOffDays, 4);
  const extraWeekOffs = Math.max(0, safeWeekOffDays - 4);
  const absentDays = Math.max(0, safeDaysInMonth - safeAttendanceDays - safeWeekOffDays);
  const deductions = (absentDays + extraWeekOffs) * dailyRate;
  const netSalary = Math.max(0, safeMonthlySalary - deductions + safeBonuses);

  return {
    dailyRate,
    allowedWeekOffs,
    extraWeekOffs,
    absentDays,
    deductions,
    netSalary,
  };
}

export function calculateAccruedSalary({
  monthlySalary,
  attendanceDays,
  weekOffDays = 0,
}: {
  monthlySalary: number;
  attendanceDays: number;
  weekOffDays?: number;
}): number {
  const dailyRate = (Number(monthlySalary) || 0) / SALARY_BASIS_DAYS;
  const paidWeekOffs = Math.min(Math.max(0, Number(weekOffDays) || 0), 4);
  const extraWeekOffs = Math.max(0, (Number(weekOffDays) || 0) - 4);
  const paidDays = Math.max(0, Number(attendanceDays) || 0) + paidWeekOffs - extraWeekOffs;

  return Math.max(0, Math.min(Number(monthlySalary) || 0, paidDays * dailyRate));
}

export function getCalendarDatesForMonth(monthInput: Date | string): string[] {
  const currentMonth = typeof monthInput === "string" ? new Date(`${monthInput}-01T00:00:00`) : new Date(monthInput);
  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();

  return Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    const value = new Date(year, monthIndex, day);
    return formatDateKey(value);
  });
}

export function buildCalendarMonthGrid(monthInput: Date | string): Array<Date | null> {
  const currentMonth = typeof monthInput === "string" ? new Date(`${monthInput}-01T00:00:00`) : new Date(monthInput);
  const year = currentMonth.getFullYear();
  const monthIndex = currentMonth.getMonth();
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const leadingDays = firstDayOfMonth.getDay();
  const totalDaysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = Math.ceil((leadingDays + totalDaysInMonth) / 7) * 7;
  const cells: Array<Date | null> = [];

  for (let index = 0; index < totalCells; index += 1) {
    const dayNumber = index - leadingDays + 1;
    if (dayNumber <= 0 || dayNumber > totalDaysInMonth) {
      cells.push(null);
      continue;
    }
    cells.push(new Date(year, monthIndex, dayNumber));
  }

  return cells;
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
