import { NewUrlGroup, ExportData, ExportVersion } from './index';
import { exhaustiveSwitchGuard } from './exhaustiveSwitchGuard';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNewUrlGroup(value: unknown): value is NewUrlGroup {
  if (!isRecord(value)) return false;
  return (
    typeof value['name'] === 'string' &&
    typeof value['closeTimeout'] === 'number' &&
    isStringArray(value['matches'])
  );
}

export function isNewUrlGroupArray(value: unknown): value is NewUrlGroup[] {
  return Array.isArray(value) && value.every(isNewUrlGroup);
}

function isExportVersion(value: unknown): value is ExportVersion {
  return value === ExportVersion.V1;
}

export function isExportData(value: unknown): value is ExportData {
  if (!isRecord(value)) return false;
  if (!isExportVersion(value['version'])) return false;

  const version = value['version'];
  switch (version) {
    case ExportVersion.V1: {
      const data = value['data'];
      if (!isRecord(data)) return false;
      return isNewUrlGroupArray(data['groups']);
    }
    default:
      return exhaustiveSwitchGuard(version);
  }
}
