export interface DeliveryPreferences {
  readonly email: boolean;
  readonly push: boolean;
  readonly mentionsOnly: boolean;
}

let current: DeliveryPreferences = {
  email: true,
  push: true,
  mentionsOnly: false,
};

export function readDeliveryPreferences(): DeliveryPreferences {
  return { ...current };
}

export function setEmail(value: boolean): void {
  current = { ...current, email: value };
}

export function setPush(value: boolean): void {
  current = { ...current, push: value };
}

export function setMentionsOnly(value: boolean): void {
  current = { ...current, mentionsOnly: value };
}
