export type ProfileVisibility = "public" | "connections" | "private";

export interface AccountPreferences {
  readonly profileVisibility: ProfileVisibility;
  readonly trackingEnabled: boolean;
}

/** Existing client for preferences persisted on the user's account. */
export class AccountPreferencesClient {
  get(): Promise<AccountPreferences> {
    return Promise.resolve({ profileVisibility: "connections", trackingEnabled: false });
  }

  update(changes: Partial<AccountPreferences>): Promise<{ updated: readonly string[] }> {
    return Promise.resolve({ updated: Object.keys(changes) });
  }
}
