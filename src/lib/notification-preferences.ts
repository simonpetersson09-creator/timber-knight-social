export function allowsNotification(key: string, prefs: { notify: boolean; notify_turn: boolean; notify_reminders: boolean; notify_play: boolean }) {
  if (!prefs.notify) return false;
  if (key === "pushTurn") return prefs.notify_turn;
  if (key === "pushRemindMove") return prefs.notify_reminders;
  if (key === "pushPlayReminder") return prefs.notify_play;
  return true;
}