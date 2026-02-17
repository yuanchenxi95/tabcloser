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
} as const;

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
