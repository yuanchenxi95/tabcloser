import { useState } from 'react';
import { Button, Input, Space, Switch, Alert, Typography } from 'antd';
import { importLocalData } from '../../../storage';
import { isExportData } from '../../../types/typeGuards';
import { generateId } from '../../../idGenerator';

interface Props {
  readonly onClose: () => void;
}

export function ImportModal({ onClose }: Props) {
  const [input, setInput] = useState('');
  const [replace, setReplace] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setError(null);
    try {
      const parsed: unknown = JSON.parse(input.trim());
      if (!isExportData(parsed)) {
        setError('Invalid import format');
        return;
      }
      const groups = parsed.data.groups.map((g) => ({
        id: generateId(),
        name: g.name,
        closeTimeout: g.closeTimeout,
        matches: [...g.matches],
      }));
      await importLocalData({ groups }, replace);
      onClose();
    } catch {
      setError('Invalid JSON');
    }
  };

  return (
    <div>
      <Input.TextArea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={8}
        placeholder="Paste exported JSON here"
      />
      <div style={{ margin: '8px 0' }}>
        <Space>
          <Switch checked={replace} onChange={setReplace} size="small" />
          <Typography.Text>Replace current data</Typography.Text>
        </Space>
      </div>
      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 8 }} />
      )}
      <Space>
        <Button type="primary" onClick={handleImport}>
          Import
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </Space>
    </div>
  );
}
