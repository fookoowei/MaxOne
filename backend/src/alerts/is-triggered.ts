// The single server-side trigger rule (twin of the customer's computeAlerts).
export function isTriggered(direction: string, targetPrice: number, price: number): boolean {
  return direction === 'above' ? price >= targetPrice : price <= targetPrice;
}
