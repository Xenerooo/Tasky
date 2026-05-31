import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface GroupProgressData {
  groupId: string;
  groupTitle: string;
  calculatedStatus: string;
  progressPercentage: number;
}

function statusColor(status: string): `#${string}` {
  switch (status) {
    case 'Done':
      return '#34C759';
    case 'Ongoing':
      return '#FF9500';
    case 'Pending':
      return '#FF3B30';
    default:
      return '#8E8E93';
  }
}

export function buildGroupProgressWidget(data: GroupProgressData) {
  if (!data.groupId) {
    return (
      <FlexWidget
        style={{
          flexDirection: 'column',
          padding: 12,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget
          text="No group selected"
          style={{ fontSize: 13, color: '#8E8E93' }}
        />
        <TextWidget
          text="Configure in Settings"
          style={{ fontSize: 11, color: '#007AFF', marginTop: 4 }}
        />
      </FlexWidget>
    );
  }

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
        text={data.groupTitle}
        style={{
          fontSize: 14,
          fontWeight: 'bold',
          color: '#1c1c1e',
          marginBottom: 8,
        }}
        truncate="END"
        maxLines={1}
      />
      <TextWidget
        text={`${data.progressPercentage}%`}
        style={{ fontSize: 24, fontWeight: 'bold', color: '#1c1c1e' }}
      />
      <TextWidget
        text={data.calculatedStatus}
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: statusColor(data.calculatedStatus),
          marginTop: 2,
        }}
      />
    </FlexWidget>
  );
}
