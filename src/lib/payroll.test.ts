import { describe, expect, it } from "vitest";
import { calculateAccruedSalary, calculatePayrollBreakdown } from "./payroll";

describe("calculatePayrollBreakdown", () => {
  it("deducts the daily rate when a staff member is absent", () => {
    const result = calculatePayrollBreakdown({
      monthlySalary: 15000,
      daysInMonth: 30,
      attendanceDays: 28,
      weekOffDays: 0,
    });

    expect(result.dailyRate).toBe(500);
    expect(result.absentDays).toBe(2);
    expect(result.deductions).toBe(1000);
    expect(result.netSalary).toBe(14000);
  });

  it("uses a fixed 30-day basis for the daily rate in a 31-day month", () => {
    const result = calculatePayrollBreakdown({
      monthlySalary: 15000,
      daysInMonth: 31,
      attendanceDays: 30,
      weekOffDays: 0,
    });

    expect(result.dailyRate).toBe(500);
    expect(result.absentDays).toBe(1);
    expect(result.deductions).toBe(500);
    expect(result.netSalary).toBe(14500);
  });

  it("allows first four weekly offs without salary deduction and applies a daily-rate penalty for extra week offs", () => {
    const result = calculatePayrollBreakdown({
      monthlySalary: 15000,
      daysInMonth: 30,
      attendanceDays: 24,
      weekOffDays: 5,
    });

    expect(result.allowedWeekOffs).toBe(4);
    expect(result.extraWeekOffs).toBe(1);
    expect(result.absentDays).toBe(1);
    expect(result.deductions).toBe(1000);
    expect(result.netSalary).toBe(14000);
  });
});

describe("calculateAccruedSalary", () => {
  it("shows one day's salary as soon as one attendance is recorded", () => {
    expect(calculateAccruedSalary({ monthlySalary: 15000, attendanceDays: 1 })).toBe(500);
  });

  it("credits up to four weekly offs and deducts extra weekly offs", () => {
    expect(calculateAccruedSalary({ monthlySalary: 15000, attendanceDays: 5, weekOffDays: 5 })).toBe(4000);
  });
});
