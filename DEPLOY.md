# ghksjk - Deployment and Testing Guide

## Prerequisites

- Node.js (v18+)
- pnpm
- Google Chrome

## 1. Configure Default Rulesets

Edit `src/config/rulesets.ts` to define the built-in rules that ship with the extension:

```typescript
export const DEFAULT_RULESETS: readonly NewUrlGroup[] = [
  {
    name: 'Zoom Calls',
    closeTimeout: 5000,
    matches: ['https:\\/\\/(.)*\\.zoom\\.us\\/j\\/(.)*'],
  },
  {
    name: 'Google Meet',
    closeTimeout: 3000,
    matches: ['https:\\/\\/meet\\.google\\.com\\/.*'],
  },
];
```

These rules are baked into the build and shown as read-only "Default" rules in the popup.

## 2. Build

```bash
cd ghksjk
pnpm install
pnpm build
```

The built extension will be in `dist/`.

## 3. Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `dist/` directory inside `ghksjk/`
5. The extension should appear in the list with a gray square icon

## 4. Test Tab Auto-Close

1. Click the extension icon in the toolbar to open the popup
2. Default rules (from `rulesets.ts`) appear with a blue **Default** tag
3. Open a new tab and navigate to a URL that matches a pattern
4. The extension icon on that tab should change to orange
5. After the configured timeout, the tab should automatically close
6. Reopen the popup -- the "Tabs closed" counter should have incremented

## 5. Test Local Groups

1. Open the popup and click **New**
2. Create a test group:
   - Name: `Test`
   - Timeout: `3000`
   - Pattern: `https:\/\/example\.com\/.*`
3. Use the **Test URL** field to paste `https://example.com/page` and click **Test** -- should show "Matches!"
4. Click **Save**
5. The group should appear in the popup list (without a tag)
6. Navigate to `https://example.com` -- the tab should close after 3 seconds
7. Edit and delete the group to verify those work

## 6. Test Import/Export

1. Create a local group
2. Click **Export** -- copy the JSON
3. Delete the local group
4. Click **Import** -- paste the JSON, click **Import**
5. The group should reappear

## 7. Updating Default Rules

To change the default rulesets for all users:

1. Edit `src/config/rulesets.ts`
2. Run `pnpm build`
3. Go to `chrome://extensions/` and click the reload button on the extension
