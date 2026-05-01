/**
 * PostgREST: products.stock_quantity yo‘q yoki schema cache eskirgan bo‘lsa chiqadigan xato.
 */
export function withProductStockSqlHint(message: string): string {
  const m = message.toLowerCase()
  if (
    m.includes('stock_quantity') &&
    (m.includes('schema cache') ||
      m.includes('could not find') ||
      m.includes('pgrst'))
  ) {
    return `${message} — Supabase → SQL Editor: loyiha ichidagi «admin-panel/supabase-product-stock-quantity.sql» skriptini ishga tushiring (ustun va triggerlar).`
  }
  return message
}
