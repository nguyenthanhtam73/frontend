/** Response from POST /api/v1/me/push/subscribe and GET /api/v1/me/push/subscription. */
export type PushSubscriptionResponse = {
  id: string;
  endpoint: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** Body for POST /api/v1/me/push/subscribe. */
export type SubscribePushPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  user_agent?: string;
};

export type PushUnsubscribeResponse = {
  message: string;
};

/** Response from POST /api/v1/me/push/test. */
export type PushTestResponse = {
  message: string;
};
