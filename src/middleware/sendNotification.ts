import { messaging } from './firebaseConfig';

interface NotificationPayload {
  title: string;
  body: string;
}

interface NotificationOptions {
  priority?: 'high' | 'normal';
  timeToLive?: number;
}

export async function sendNotification(
  token: string,
  payload: NotificationPayload,
  options?: NotificationOptions
): Promise<void> {
  const message = {
    token,
    notification: {
      title: payload.title,
      body: payload.body,
    },
  };

  try {
    await messaging.send(message);
    console.log('Notification sent successfully');
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}
