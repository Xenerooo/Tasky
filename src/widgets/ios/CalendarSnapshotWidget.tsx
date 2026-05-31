import { VStack, Text } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

type CalendarEventItem = {
  id: string;
  type: string;
  text: string;
};

type CalendarSnapshotProps = {
  tasksDue: number;
  notesCreated: number;
  items: CalendarEventItem[];
};

const CalendarSnapshotWidget = (
  props: CalendarSnapshotProps,
  environment: WidgetEnvironment
) => {
  'widget';

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <VStack modifiers={[padding({ all: 12 })]}>
      <Text
        modifiers={[
          font({ weight: 'bold', size: 14 }),
          foregroundStyle('#1c1c1e'),
        ]}
      >
        {dateStr}
      </Text>
      <VStack>
        <Text modifiers={[font({ size: 13 }), foregroundStyle('#FF3B30')]}>
          {props.tasksDue} task{props.tasksDue !== 1 ? 's' : ''} due
        </Text>
        <Text modifiers={[font({ size: 13 }), foregroundStyle('#34C759')]}>
          {props.notesCreated} note{props.notesCreated !== 1 ? 's' : ''} created
        </Text>
      </VStack>
      {props.items.length > 0 && (
        <Text
          modifiers={[
            font({ size: 10 }),
            foregroundStyle('#8E8E93'),
          ]}
        >
          {props
            .items!.map((i) => i.text.substring(0, 20))
            .join(' \u00B7 ')}
        </Text>
      )}
    </VStack>
  );
};

export default createWidget('CalendarSnapshot', CalendarSnapshotWidget);
