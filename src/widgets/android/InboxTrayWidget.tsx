import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface InboxTrayItem {
  id: string;
  type: 'task' | 'note';
  text: string;
}

interface InboxTrayData {
  items: InboxTrayItem[];
  total: number;
}

export function buildInboxTrayWidget(data: InboxTrayData) {
  return (
    <FlexWidget
      style={{
        flexDirection: 'column',
        padding: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
      }}
      clickAction="OPEN_APP"
    >
      <TextWidget
        text={`Inbox (${data.total})`}
        style={{ fontSize: 14, fontWeight: 'bold', color: '#1c1c1e', marginBottom: 6 }}
      />
      {data.items.map((item) => (
        <TextWidget
          key={`${item.type}-${item.id}`}
          text={`${item.type === 'task' ? '\u2611' : '\u{1F4DD}'} ${item.text}`}
          style={{ fontSize: 12, color: '#3a3a3c', marginBottom: 2 }}
          truncate="END"
          maxLines={1}
        />
      ))}
      {data.items.length === 0 && (
        <TextWidget
          text="No ungrouped items"
          style={{ fontSize: 12, color: '#8E8E93' }}
        />
      )}
      {data.total > 3 && (
        <TextWidget
          text={`+${data.total - 3} more items`}
          style={{ fontSize: 11, color: '#007AFF', marginTop: 4 }}
        />
      )}
    </FlexWidget>
  );
}
