export type UrlGroup = {
  readonly id: string;
  readonly name: string;
  readonly closeTimeout: number;
  readonly matches: readonly string[];
};

export type NewUrlGroup = Omit<UrlGroup, 'id'>;

export type LocalStorageData = {
  readonly groups: readonly UrlGroup[];
};

export type StatsData = {
  readonly allClosed: number;
};

export const STORAGE_KEYS = {
  LOCAL: 'ghksjk-local',
  STATS: 'ghksjk-stats',
  REMOTE_DEFAULTS: 'ghksjk-remote-defaults',
  LAST_SYNC: 'ghksjk-last-sync',
  SYNC_ERROR: 'ghksjk-sync-error',
  HISTORY: 'ghksjk-history',
  ACTIVE_COUNTDOWNS: 'ghksjk-active-countdowns',
  ENABLED: 'ghksjk-enabled',
  SETTINGS: 'ghksjk-settings',
} as const;

export type ActiveCountdown = {
  readonly tabId: number;
  readonly url: string;
  readonly groupName: string;
  readonly initializedTime: number;
  readonly closeTimeout: number;
};

export type SyncStatus = {
  readonly lastSyncTime: string | null;
  readonly error: string | null;
};

export type HistoryEntry = {
  readonly id: string;
  readonly timestamp: string;
  readonly url: string;
  readonly groupName: string;
  readonly status: 'closed' | 'failed';
  readonly error?: string;
};

export type PendingClosure = {
  readonly tabId: number;
  readonly url: string;
  readonly groupName: string;
  readonly targetCloseTime: number;
};

export const enum GroupSource {
  DEFAULT = 'DEFAULT',
  LOCAL = 'LOCAL',
}

export type DisplayGroup = {
  readonly source: GroupSource;
  readonly group: UrlGroup;
};

export const enum PopupMode {
  DEFAULT = 'DEFAULT',
  CREATE_NEW = 'CREATE_NEW',
  EDIT = 'EDIT',
  CONFIRM_REMOVE = 'CONFIRM_REMOVE',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
}

export const enum ExportVersion {
  V1 = 'GhksjkExportV1',
}

export type ExportData = {
  readonly version: ExportVersion.V1;
  readonly data: {
    readonly groups: readonly NewUrlGroup[];
  };
};

export type ExtensionSettings = {
  readonly protectActiveTab: boolean;
  readonly protectLastTab: boolean;
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  protectActiveTab: true,
  protectLastTab: true,
};
