import { useEffect } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';

/** Route params passed to /nap/result (all strings, as expo-router params are). */
export interface NapResultParams {
  date: string;
  start_time: string;
  duration_minutes: string;
  location_tag: string;
  posture: string;
  pre_nap_sleepiness: string;
  /** Identifier of the scheduled evaluation reminder, so the result screen can cancel it. */
  reminder_id?: string;
  [key: string]: string | undefined;
}

/** Wait until sleep inertia has mostly passed before asking for an evaluation. */
export const REMINDER_DELAY_SECONDS = 5 * 60;

const REMINDER_CHANNEL_ID = 'nap-reminder';
const REMINDER_KIND = 'nap-evaluation';

const isSupported = Platform.OS !== 'web';

if (isSupported) {
  // Show the reminder even if the app happens to be in the foreground when it fires.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Requests notification permission if it has not been decided yet.
 * Returns false (without throwing) when denied or unsupported.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isSupported) return false;
  try {
    if (Platform.OS === 'android') {
      // Android 13+ only shows the permission prompt once a channel exists.
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: '仮眠後の評価リマインド',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
      return true;
    }
    if (!current.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch {
    return false;
  }
}

/**
 * Schedules the "rate your concentration" reminder. Returns its identifier,
 * or undefined if notifications are unavailable or not permitted.
 */
export async function scheduleNapEvaluationReminder(
  params: NapResultParams,
  delaySeconds: number = REMINDER_DELAY_SECONDS,
): Promise<string | undefined> {
  if (!isSupported) return undefined;
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return undefined;
    const { reminder_id: _ignored, ...resultParams } = params;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '集中力を記録しましょう',
        body: '仮眠後の集中力・眠気を記録して、自分に合う仮眠パターンを見つけましょう。',
        data: { kind: REMINDER_KIND, params: resultParams },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(delaySeconds)),
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  } catch {
    return undefined;
  }
}

/** Cancels a pending reminder and removes it from the notification tray if already shown. */
export async function cancelNapEvaluationReminder(id: string | undefined): Promise<void> {
  if (!isSupported || !id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
    await Notifications.dismissNotificationAsync(id);
  } catch {
    // Already fired/dismissed or unavailable: nothing to do.
  }
}

/** Light haptic feedback when the nap timer completes. No-op on web or when unavailable. */
export function playTimerCompleteHaptic() {
  if (!isSupported) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

function openReminderTarget(response: Notifications.NotificationResponse) {
  const { request } = response.notification;
  const data = request.content.data as { kind?: unknown; params?: unknown } | undefined;
  if (data?.kind !== REMINDER_KIND || !data.params || typeof data.params !== 'object') return;
  router.push({
    pathname: '/nap/result',
    params: { ...(data.params as NapResultParams), reminder_id: request.identifier },
  });
}

/**
 * Opens the evaluation screen when the user taps a nap reminder, including when
 * the tap cold-starts the app. Must be mounted once inside the root navigator.
 */
export function useNapReminderObserver() {
  useEffect(() => {
    if (!isSupported) return;

    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      openReminderTarget(response);
      // Avoid re-opening the same nap after a reload.
      Notifications.clearLastNotificationResponse();
    };

    try {
      handle(Notifications.getLastNotificationResponse());
    } catch {
      // Unavailable on this platform/runtime.
    }
    const subscription = Notifications.addNotificationResponseReceivedListener(handle);
    return () => subscription.remove();
  }, []);
}
