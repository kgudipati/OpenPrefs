/** Stable preference ids understood by the server-backed host application. */
export type ServerPreferenceId =
  | "notifyDirectMessages"
  | "notifyMentions"
  | "notifyComments"
  | "notifyFollows"
  | "notifyMarketing"
  | "digestFrequencyHours";

/** Complete settings state persisted by the fake server. */
export interface ServerSettings {
  readonly notifyDirectMessages: boolean;
  readonly notifyMentions: boolean;
  readonly notifyComments: boolean;
  readonly notifyFollows: boolean;
  readonly notifyMarketing: boolean;
  readonly digestFrequencyHours: number;
}

/** One update refused by the fake server. */
export interface ServerUpdateRejection {
  readonly id: ServerPreferenceId;
  readonly reason: string;
}

/** Native response returned by the existing server settings API. */
export interface ServerUpdateResponse {
  readonly updated: readonly ServerPreferenceId[];
  readonly rejected: readonly ServerUpdateRejection[];
}

const defaults: ServerSettings = {
  notifyDirectMessages: true,
  notifyMentions: true,
  notifyComments: true,
  notifyFollows: true,
  notifyMarketing: true,
  digestFrequencyHours: 24,
};

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/** In-memory HTTP-server stand-in owned by the fake host application. */
export class FakeSettingsServer {
  readonly #latencyMs: number;
  readonly #rejected = new Set<ServerPreferenceId>();
  #state: ServerSettings;

  /** Creates a server with configurable latency and initial persisted settings. */
  constructor(
    options: { readonly latencyMs?: number; readonly initial?: Partial<ServerSettings> } = {},
  ) {
    this.#latencyMs = options.latencyMs ?? 2;
    this.#state = { ...defaults, ...options.initial };
  }

  /** Configures whether subsequent updates to one preference should be rejected. */
  rejectUpdatesFor(id: ServerPreferenceId, reject = true): void {
    if (reject) {
      this.#rejected.add(id);
      return;
    }
    this.#rejected.delete(id);
  }

  /** Handles a delayed server read for a selected set of preference ids. */
  async handleGet(ids: readonly ServerPreferenceId[]): Promise<Partial<ServerSettings>> {
    await delay(this.#latencyMs);
    let response: Partial<ServerSettings> = {};
    for (const id of ids) {
      response = { ...response, ...this.valueFor(id) };
    }
    return response;
  }

  /** Handles a delayed, independently fallible server update. */
  async handleUpdate(changes: Partial<ServerSettings>): Promise<ServerUpdateResponse> {
    await delay(this.#latencyMs);
    const updated: ServerPreferenceId[] = [];
    const rejected: ServerUpdateRejection[] = [];

    for (const id of serverPreferenceIds) {
      if (!Object.hasOwn(changes, id)) {
        continue;
      }
      if (this.#rejected.has(id)) {
        rejected.push({ id, reason: `The server rejected ${id}.` });
        continue;
      }
      this.assignValue(changes, id);
      updated.push(id);
    }

    return { updated, rejected };
  }

  private valueFor(id: ServerPreferenceId): Partial<ServerSettings> {
    switch (id) {
      case "notifyDirectMessages":
        return { notifyDirectMessages: this.#state.notifyDirectMessages };
      case "notifyMentions":
        return { notifyMentions: this.#state.notifyMentions };
      case "notifyComments":
        return { notifyComments: this.#state.notifyComments };
      case "notifyFollows":
        return { notifyFollows: this.#state.notifyFollows };
      case "notifyMarketing":
        return { notifyMarketing: this.#state.notifyMarketing };
      case "digestFrequencyHours":
        return { digestFrequencyHours: this.#state.digestFrequencyHours };
    }
  }

  private assignValue(changes: Partial<ServerSettings>, id: ServerPreferenceId): void {
    switch (id) {
      case "notifyDirectMessages": {
        const value = changes.notifyDirectMessages;
        if (value !== undefined) {
          this.#state = { ...this.#state, notifyDirectMessages: value };
        }
        break;
      }
      case "notifyMentions": {
        const value = changes.notifyMentions;
        if (value !== undefined) {
          this.#state = { ...this.#state, notifyMentions: value };
        }
        break;
      }
      case "notifyComments": {
        const value = changes.notifyComments;
        if (value !== undefined) {
          this.#state = { ...this.#state, notifyComments: value };
        }
        break;
      }
      case "notifyFollows": {
        const value = changes.notifyFollows;
        if (value !== undefined) {
          this.#state = { ...this.#state, notifyFollows: value };
        }
        break;
      }
      case "notifyMarketing": {
        const value = changes.notifyMarketing;
        if (value !== undefined) {
          this.#state = { ...this.#state, notifyMarketing: value };
        }
        break;
      }
      case "digestFrequencyHours": {
        const value = changes.digestFrequencyHours;
        if (value !== undefined) {
          this.#state = { ...this.#state, digestFrequencyHours: value };
        }
        break;
      }
    }
  }
}

/** Preference ids in the order used by the host settings screen. */
export const serverPreferenceIds: readonly ServerPreferenceId[] = [
  "notifyDirectMessages",
  "notifyMentions",
  "notifyComments",
  "notifyFollows",
  "notifyMarketing",
  "digestFrequencyHours",
];

/** Async settings client used by the fake host application. */
export class ServerSettingsClient {
  readonly #server: FakeSettingsServer;

  /** Connects the client to its existing server implementation. */
  constructor(server: FakeSettingsServer) {
    this.#server = server;
  }

  /** Fetches the requested settings from the server. */
  get(ids: readonly ServerPreferenceId[]): Promise<Partial<ServerSettings>> {
    return this.#server.handleGet(ids);
  }

  /** Submits a partial settings update to the server. */
  update(changes: Partial<ServerSettings>): Promise<ServerUpdateResponse> {
    return this.#server.handleUpdate(changes);
  }
}
