import { useEffect, useState } from 'react';
import { Button, Input, Space } from 'antd';
import { getLocalData } from '../../../storage';
import { ExportData, ExportVersion } from '../../../types';

interface Props {
  readonly onClose: () => void;
}

export function ExportModal({ onClose }: Props) {
  const [exportJson, setExportJson] = useState('');

  useEffect(() => {
    getLocalData().then((data) => {
      const exportData: ExportData = {
        version: ExportVersion.V1,
        data: {
          groups: data.groups.map(({ name, closeTimeout, matches }) => ({
            name,
            closeTimeout,
            matches,
          })),
        },
      };
      setExportJson(JSON.stringify(exportData, null, 2));
    });
  }, []);

  return (
    <div>
      <Input.TextArea value={exportJson} rows={10} readOnly />
      <Space style={{ marginTop: 8 }}>
        <Button
          type="primary"
          onClick={() => navigator.clipboard.writeText(exportJson)}
        >
          Copy
        </Button>
        <Button onClick={onClose}>Close</Button>
      </Space>
    </div>
  );
}
