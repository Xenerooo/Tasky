import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface TaskOverviewData {
  dueToday: number;
  overdue: number;
  upcoming: number;
  totalOngoing: number;
}

export function buildTaskOverviewWidget(data: TaskOverviewData) {
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
        text="Task Overview"
        style={{
          fontSize: 16,
          fontWeight: 'bold',
          color: '#1c1c1e',
          marginBottom: 8,
        }}
      />
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <FlexWidget style={{ flexDirection: 'column', alignItems: 'center' }}>
          <TextWidget
            text={String(data.overdue)}
            style={{ fontSize: 24, fontWeight: 'bold', color: '#FF3B30' }}
          />
          <TextWidget
            text="Overdue"
            style={{ fontSize: 11, color: '#8E8E93' }}
          />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: 'column', alignItems: 'center' }}>
          <TextWidget
            text={String(data.dueToday)}
            style={{ fontSize: 24, fontWeight: 'bold', color: '#007AFF' }}
          />
          <TextWidget
            text="Due today"
            style={{ fontSize: 11, color: '#8E8E93' }}
          />
        </FlexWidget>
        <FlexWidget style={{ flexDirection: 'column', alignItems: 'center' }}>
          <TextWidget
            text={String(data.upcoming)}
            style={{ fontSize: 24, fontWeight: 'bold', color: '#FF9500' }}
          />
          <TextWidget
            text="Upcoming"
            style={{ fontSize: 11, color: '#8E8E93' }}
          />
        </FlexWidget>
      </FlexWidget>
      <TextWidget
        text={`${data.totalOngoing} ongoing tasks`}
        style={{ fontSize: 11, color: '#8E8E93', marginTop: 6 }}
      />
    </FlexWidget>
  );
}
