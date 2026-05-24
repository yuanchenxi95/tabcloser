import { useState } from 'react';
import { Button, Form, Input, InputNumber, Space, Alert, Typography } from 'antd';
import { UrlGroup } from '../../../types';
import { generateId } from '../../../idGenerator';
import { saveLocalGroup } from '../../../storage';
import { formatDuration } from '../../../formatDuration';

interface Props {
  readonly onClose: () => void;
  readonly existingGroup?: UrlGroup;
}

export function SaveModal({ onClose, existingGroup }: Props) {
  const [name, setName] = useState(existingGroup?.name ?? '');
  const [timeout, setTimeout] = useState(existingGroup?.closeTimeout ?? 5000);
  const [patterns, setPatterns] = useState(
    existingGroup?.matches.join('\n') ?? '',
  );
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<'match' | 'no-match' | null>(null);

  const handleTest = () => {
    if (!testUrl.trim() || !patterns.trim()) {
      setTestResult(null);
      return;
    }
    const patternList = patterns
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);
    const matched = patternList.some((p) => {
      try {
        return new RegExp(p).test(testUrl);
      } catch {
        return false;
      }
    });
    setTestResult(matched ? 'match' : 'no-match');
  };

  const handleSave = async () => {
    const matchList = patterns
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);
    if (!name.trim() || matchList.length === 0) {
      return;
    }
    const group: UrlGroup = {
      id: existingGroup?.id ?? generateId(),
      name: name.trim(),
      closeTimeout: timeout,
      matches: matchList,
    };
    await saveLocalGroup(group);
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'RULES_CHANGED' });
    }
    onClose();
  };

  return (
    <div>
      <Form layout="vertical" size="small">
        <Form.Item label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Zoom Calls"
          />
        </Form.Item>
        <Form.Item label="Close timeout (ms)">
          <InputNumber
            value={timeout}
            onChange={(v) => setTimeout(v ?? 5000)}
            min={0}
            step={1000}
            style={{ width: '100%' }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatDuration(timeout)}
          </Typography.Text>
        </Form.Item>
        <Form.Item label="URL patterns (one regex per line)">
          <Input.TextArea
            value={patterns}
            onChange={(e) => setPatterns(e.target.value)}
            rows={4}
            placeholder="https:\/\/(.)*\.zoom\.us\/j\/(.)* "
          />
        </Form.Item>
        <Form.Item label="Test URL">
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={testUrl}
              onChange={(e) => {
                setTestUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="Paste a URL to test"
            />
            <Button onClick={handleTest}>Test</Button>
          </Space.Compact>
        </Form.Item>
        {testResult !== null && (
          <Alert
            type={testResult === 'match' ? 'success' : 'error'}
            message={testResult === 'match' ? 'Matches!' : 'No match'}
            style={{ marginBottom: 12 }}
            showIcon
          />
        )}
        <Space>
          <Button type="primary" onClick={handleSave}>
            Save
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </Space>
      </Form>
    </div>
  );
}
