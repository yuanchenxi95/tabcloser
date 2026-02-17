import { Button, Space, Typography } from 'antd';

interface Props {
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmRemoveModal({ onConfirm, onCancel }: Props) {
  return (
    <div style={{ textAlign: 'center', padding: 16 }}>
      <Typography.Text>Remove this group?</Typography.Text>
      <div style={{ marginTop: 16 }}>
        <Space>
          <Button danger onClick={onConfirm}>
            Yes
          </Button>
          <Button onClick={onCancel}>No</Button>
        </Space>
      </div>
    </div>
  );
}
