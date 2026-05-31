import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface CalendarEventItem {
  id: string;
  type: string;
  text: string;
}

interface CalendarSnapshotData {
  tasksDue: number;
  notesCreated: number;
  items: CalendarEventItem[];
}

export function buildCalendarSnapshotWidget(data: CalendarSnapshotData) {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

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
        text={dateStr}
        style={{ fontSize: 14, fontWeight: 'bold', color: '#1c1c1e', marginBottom: 6 }}
      />
      <TextWidget
        text={`${data.tasksDue} task${data.tasksDue !== 1 ? 's' : ''} due`}
        style={{ fontSize: 13, color: '#FF3B30' }}
      />
      <TextWidget
        text={`${data.notesCreated} note${data.notesCreated !== 1 ? 's' : ''} created`}
        style={{ fontSize: 13, color: '#34C759' }}
      />
      {data.items.length > 0 && (
        <TextWidget
          text={data.items
            .map((i) => i.text.substring(0, 20))
            .join(' \u00B7 ')}
          style={{ fontSize: 10, color: '#8E8E93', marginTop: 4 }}
          truncate="END"
          maxLines={1}
        />
      )}
    </FlexWidget>
  );
}
