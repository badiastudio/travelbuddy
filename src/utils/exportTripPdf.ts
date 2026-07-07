import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Trip, Stop, Expense } from '../types/app.types';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const d = new Date(timeStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function groupStopsByDay(stops: Stop[]): Map<number | null, Stop[]> {
  const map = new Map<number | null, Stop[]>();
  for (const stop of stops) {
    const key = stop.day_index;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(stop);
  }
  return map;
}

export async function exportTripToPDF(
  trip: Trip,
  stops: Stop[],
  expenses: Expense[],
): Promise<void> {
  const dateRange = trip.start_date
    ? `${formatDate(trip.start_date)}${trip.end_date ? ` &ndash; ${formatDate(trip.end_date)}` : ''}`
    : '';

  const stopsByDay = groupStopsByDay(
    [...stops].sort((a, b) => {
      const dayA = a.day_index ?? 0;
      const dayB = b.day_index ?? 0;
      return dayA !== dayB ? dayA - dayB : a.sort_order - b.sort_order;
    }),
  );

  let stopsHtml = '';
  const dayKeys = Array.from(stopsByDay.keys()).sort((a, b) => (a ?? 0) - (b ?? 0));

  for (const day of dayKeys) {
    const dayStops = stopsByDay.get(day)!;
    const dayLabel = day != null ? `Day ${day + 1}` : 'Unscheduled';
    stopsHtml += `
      <h2>${dayLabel}</h2>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Stop</th>
            <th>Location</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${dayStops
            .map(
              (s) => `
            <tr>
              <td class="time">${s.start_time ? formatTime(s.start_time) : '&mdash;'}</td>
              <td class="bold">${s.title}</td>
              <td>${s.location_name ?? '&mdash;'}</td>
              <td class="notes">${s.notes ?? ''}</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const expensesHtml =
    expenses.length > 0
      ? `
      <h2>Expenses</h2>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Category</th>
            <th>Paid By</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${expenses
            .map(
              (e) => `
            <tr>
              <td class="bold">${e.title}</td>
              <td>${e.category ?? '&mdash;'}</td>
              <td>${e.payer?.display_name ?? 'Unknown'}</td>
              <td class="right amount">${formatCurrency(Number(e.amount), e.currency)}</td>
            </tr>
          `,
            )
            .join('')}
          <tr class="total-row">
            <td colspan="3" class="bold">Total</td>
            <td class="right bold amount">${formatCurrency(total, trip.budget_currency ?? 'USD')}</td>
          </tr>
        </tbody>
      </table>
      ${trip.budget != null ? `<p class="budget-note">Budget: ${formatCurrency(trip.budget, trip.budget_currency ?? 'USD')}</p>` : ''}
    `
      : '<p class="empty-note">No expenses recorded for this trip.</p>';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${trip.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      font-size: 13px;
      color: #111827;
      background: #fff;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 3px solid #2563EB;
      padding-bottom: 20px;
      margin-bottom: 32px;
    }
    .trip-icon { font-size: 36px; margin-bottom: 8px; }
    h1 {
      font-size: 28px;
      font-weight: 800;
      color: #1E3A5F;
      margin-bottom: 6px;
    }
    .subtitle {
      font-size: 14px;
      color: #6B7280;
    }
    h2 {
      font-size: 16px;
      font-weight: 700;
      color: #2563EB;
      margin: 28px 0 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #E5E7EB;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
    }
    thead tr {
      background: #F3F4F6;
    }
    th {
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 8px 12px;
      border-bottom: 1px solid #E5E7EB;
    }
    td {
      padding: 9px 12px;
      border-bottom: 1px solid #F3F4F6;
      vertical-align: top;
      color: #374151;
    }
    tr:last-child td { border-bottom: none; }
    .time { white-space: nowrap; color: #6B7280; font-size: 12px; }
    .bold { font-weight: 600; color: #111827; }
    .notes { color: #6B7280; font-size: 12px; }
    .right { text-align: right; }
    .amount { font-weight: 600; }
    .total-row { background: #EFF6FF; }
    .total-row td { padding: 11px 12px; font-size: 14px; }
    .budget-note {
      margin-top: 8px;
      font-size: 12px;
      color: #6B7280;
      text-align: right;
    }
    .empty-note { color: #6B7280; font-style: italic; margin-top: 8px; }
    .footer {
      margin-top: 48px;
      padding-top: 16px;
      border-top: 1px solid #E5E7EB;
      font-size: 11px;
      color: #9CA3AF;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    ${trip.cover_icon ? `<div class="trip-icon">${trip.cover_icon}</div>` : ''}
    <h1>${trip.title}</h1>
    ${dateRange ? `<p class="subtitle">${dateRange}</p>` : ''}
    ${trip.description ? `<p class="subtitle" style="margin-top:6px">${trip.description}</p>` : ''}
  </div>

  ${stopsByDay.size > 0 ? `<h2 style="margin-top:0">Itinerary</h2>${stopsHtml}` : '<p class="empty-note">No stops planned yet.</p>'}

  ${expensesHtml}

  <div class="footer">
    Generated by travelBuddy &bull; ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
  </div>
</body>
</html>
  `.trim();

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `${trip.title} — Trip Summary`,
    UTI: 'com.adobe.pdf',
  });
}
