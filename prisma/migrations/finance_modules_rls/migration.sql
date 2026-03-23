-- RLS policies for finance modules
-- Applied after: prisma db push (finance_modules_init)
-- Note: Prisma maps userId → "userId" (camelCase, no @map annotation)

-- budget_templates
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_budget_templates" ON budget_templates
  FOR ALL USING (auth.uid()::text = "userId");

-- budget_template_incomes
ALTER TABLE budget_template_incomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_budget_template_incomes" ON budget_template_incomes
  FOR ALL USING (auth.uid()::text = "userId");

-- budget_template_expenses
ALTER TABLE budget_template_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_budget_template_expenses" ON budget_template_expenses
  FOR ALL USING (auth.uid()::text = "userId");

-- budget_periods
ALTER TABLE budget_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_budget_periods" ON budget_periods
  FOR ALL USING (auth.uid()::text = "userId");

-- budget_incomes
ALTER TABLE budget_incomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_budget_incomes" ON budget_incomes
  FOR ALL USING (auth.uid()::text = "userId");

-- budget_category_plans
ALTER TABLE budget_category_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_budget_category_plans" ON budget_category_plans
  FOR ALL USING (auth.uid()::text = "userId");

-- transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_transactions" ON transactions
  FOR ALL USING (auth.uid()::text = "userId");

-- subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_subscriptions" ON subscriptions
  FOR ALL USING (auth.uid()::text = "userId");

-- recurring_templates
ALTER TABLE recurring_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_recurring_templates" ON recurring_templates
  FOR ALL USING (auth.uid()::text = "userId");

-- recurring_payments
ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_recurring_payments" ON recurring_payments
  FOR ALL USING (auth.uid()::text = "userId");
