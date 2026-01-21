export type CreateNotificationInput = {
  user_id: string;
  title: string;
  message: string;
  type: string;
  related_id?: string | null;
};

export function buildNotificationRow(input: CreateNotificationInput) {
  return {
    id: crypto.randomUUID(),
    user_id: input.user_id,
    title: input.title,
    message: input.message,
    type: input.type,
    related_id: input.related_id ?? null,
    read: false,
    created_at: new Date().toISOString(),
  };
}
