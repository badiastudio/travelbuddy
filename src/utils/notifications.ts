// Push notifications disabled — expo-notifications removed to fix App Store crash
// Can be re-added once APNs keys are configured in EAS

export async function registerForPushNotifications(): Promise<string | null> {
  return null;
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<string> {
  return '';
}

export async function scheduleTripReminder(
  tripTitle: string,
  startDate: string,
): Promise<string | null> {
  return null;
}
