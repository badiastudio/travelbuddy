export interface Balance {
  userId: string;
  name: string;
  amount: number; // positive = owed money, negative = owes money
}

export interface Settlement {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}

export function simplifyDebts(balances: Balance[]): Settlement[] {
  const settlements: Settlement[] = [];
  const debtors = balances
    .filter((b) => b.amount < -0.01)
    .map((b) => ({ ...b, amount: -b.amount }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = balances
    .filter((b) => b.amount > 0.01)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.amount - a.amount);

  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    settlements.push({
      fromUserId: debtors[i].userId,
      fromName: debtors[i].name,
      toUserId: creditors[j].userId,
      toName: creditors[j].name,
      amount: Math.round(pay * 100) / 100,
    });
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }
  return settlements;
}
