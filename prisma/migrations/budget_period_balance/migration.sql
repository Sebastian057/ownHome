-- Add opening_balance and closing_balance to budget_periods
-- These fields track the actual bank balance at the start and end of a budget month.
-- Expected balance (computed) = opening_balance + actual_income - actual_expenses
-- Discrepancy (computed)      = closing_balance - expected_balance

ALTER TABLE "budget_periods"
  ADD COLUMN IF NOT EXISTS "opening_balance" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "closing_balance" DECIMAL(12,2);
