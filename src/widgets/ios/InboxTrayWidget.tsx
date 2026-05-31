import { VStack, Text } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

type InboxTrayItem = {
  id: string;
  type: 'task' | 'note';
  text: string;
};

type InboxTrayProps = {
  items: InboxTrayItem[];
  total: number;
};

const InboxTrayWidget = (
  props: InboxTrayProps,
  environment: WidgetEnvironment
) => {
  'widget';

  return (
    <VStack modifiers={[padding({ all: 12 })]}>
      <Text
        modifiers={[
          font({ weight: 'bold', size: 14 }),
          foregroundStyle('#1c1c1e'),
        ]}
      >
        Inbox ({props.total})
      </Text>
      {props.items.map((item) => (
        <Text
          key={`${item.type}-${item.id}`}
          modifiers={[font({ size: 12 }), foregroundStyle('#3a3a3c')]}
        >
          {item.type === 'task' ? '\u2611' : '\u{1F4DD}'} {item.text}
        </Text>
      ))}
      {props.items.length === 0 && (
        <Text modifiers={[font({ size: 12 }), foregroundStyle('#8E8E93')]}>
          No ungrouped items
        </Text>
      )}
      {props.total > 3 && (
        <Text modifiers={[font({ size: 11 }), foregroundStyle('#007AFF')]}>
          +{props.total - 3} more items
        </Text>
      )}
    </VStack>
  );
};

export default createWidget('InboxTray', InboxTrayWidget);
