import { FlexWidget, TextWidget } from 'react-native-android-widget';

export function buildQuickCaptureWidget() {
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
        text="Quick Capture"
        style={{ fontSize: 14, fontWeight: 'bold', color: '#1c1c1e', marginBottom: 8 }}
      />
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
        }}
      >
        <FlexWidget
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: '#007AFF',
            padding: 8,
            borderRadius: 8,
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'tasky://widget/quick-capture/task' }}
        >
          <TextWidget
            text="+ Task"
            style={{ fontSize: 13, fontWeight: 'bold', color: '#FFFFFF' }}
          />
        </FlexWidget>
        <FlexWidget
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: '#34C759',
            padding: 8,
            borderRadius: 8,
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'tasky://widget/quick-capture/note' }}
        >
          <TextWidget
            text="+ Note"
            style={{ fontSize: 13, fontWeight: 'bold', color: '#FFFFFF' }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
