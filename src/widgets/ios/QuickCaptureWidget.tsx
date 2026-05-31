import { VStack, Text, Label } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

const QuickCaptureWidget = (_props: {}, environment: WidgetEnvironment) => {
  'widget';

  return (
    <VStack modifiers={[padding({ all: 12 })]}>
      <Text
        modifiers={[
          font({ weight: 'bold', size: 14 }),
          foregroundStyle('#1c1c1e'),
        ]}
      >
        Quick Capture
      </Text>
      <VStack>
        <Label
          title="New Task"
          systemImage="checklist"
          modifiers={[font({ size: 13 }), foregroundStyle('#007AFF')]}
        />
        <Label
          title="New Note"
          systemImage="doc.text"
          modifiers={[font({ size: 13 }), foregroundStyle('#34C759')]}
        />
      </VStack>
    </VStack>
  );
};

export default createWidget('QuickCapture', QuickCaptureWidget);
