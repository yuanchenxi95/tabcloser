import { useEffect, useState } from 'react';
import { Card, Switch, Space, Typography, Tooltip, Divider, Button, App } from 'antd';
import {
  SettingOutlined,
  InfoCircleOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { getSettings, saveSettings } from '../../../storage';
import { ExtensionSettings, DEFAULT_SETTINGS } from '../../../types';

export function SettingsTab() {
  const { message } = App.useApp();
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getSettings();
        setSettings(data);
      } catch (e) {
        // Safe fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleToggleActive = async (checked: boolean) => {
    const prev = settings;
    const updated = { ...settings, protectActiveTab: checked };
    setSettings(updated);
    try {
      await saveSettings(updated);
      await triggerScan();
      message.success(`Active tab protection ${checked ? 'enabled' : 'disabled'}`);
    } catch {
      setSettings(prev);
      message.error('Failed to save setting');
    }
  };

  const handleToggleLast = async (checked: boolean) => {
    const prev = settings;
    const updated = { ...settings, protectLastTab: checked };
    setSettings(updated);
    try {
      await saveSettings(updated);
      await triggerScan();
      message.success(`Last tab protection ${checked ? 'enabled' : 'disabled'}`);
    } catch {
      setSettings(prev);
      message.error('Failed to save setting');
    }
  };

  const handleReset = async () => {
    const prev = settings;
    setSettings(DEFAULT_SETTINGS);
    try {
      await saveSettings(DEFAULT_SETTINGS);
      await triggerScan();
      message.success('Settings reset to default values');
    } catch {
      setSettings(prev);
      message.error('Failed to reset settings');
    }
  };

  const triggerScan = async () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      await chrome.runtime.sendMessage({ type: 'RULES_CHANGED' });
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div>
      <Typography.Title
        level={5}
        style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}
      >
        <SettingOutlined /> Exclusion & Protection Settings
      </Typography.Title>

      <Card size="small" style={{ borderRadius: 6, marginBottom: 12, border: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Active Tab Protection */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ paddingRight: 12, flex: 1 }}>
              <Space size={4} style={{ display: 'flex', alignItems: 'center' }}>
                <Typography.Text strong style={{ fontSize: 12 }}>
                  Protect Active Tab
                </Typography.Text>
                <Tooltip title="When enabled, the tab you are currently actively viewing and interacting with will not be auto-closed. Its countdown will pause/postpone until you switch tabs.">
                  <InfoCircleOutlined style={{ fontSize: 10, color: '#8c8c8c', cursor: 'help' }} />
                </Tooltip>
              </Space>
              <Typography.Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 2 }}>
                Prevent auto-closing currently active/focused tabs.
              </Typography.Text>
            </div>
            <Switch
              checked={settings.protectActiveTab}
              onChange={handleToggleActive}
              size="small"
            />
          </div>

          <Divider style={{ margin: 0 }} />

          {/* Last Tab Protection */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ paddingRight: 12, flex: 1 }}>
              <Space size={4} style={{ display: 'flex', alignItems: 'center' }}>
                <Typography.Text strong style={{ fontSize: 12 }}>
                  Protect Last Tab
                </Typography.Text>
                <Tooltip title="When enabled, the final remaining tab in a window will never be auto-closed, preventing the browser window from shutting down. If disabled, closing the last tab will open google.com first to keep the window alive.">
                  <InfoCircleOutlined style={{ fontSize: 10, color: '#8c8c8c', cursor: 'help' }} />
                </Tooltip>
              </Space>
              <Typography.Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 2 }}>
                Keep window open by protecting the final tab.
              </Typography.Text>
            </div>
            <Switch
              checked={settings.protectLastTab}
              onChange={handleToggleLast}
              size="small"
            />
          </div>

        </div>
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="text"
          size="small"
          icon={<UndoOutlined />}
          onClick={handleReset}
          style={{ fontSize: 11, color: '#8c8c8c' }}
        >
          Reset Defaults
        </Button>
      </div>
    </div>
  );
}
