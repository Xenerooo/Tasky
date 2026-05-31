import { VStack, HStack, Text } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

type TaskOverviewProps = {
  dueToday: number;
  overdue: number;
  upcoming: number;
  totalOngoing: number;
};

const TaskOverviewWidget = (
  props: TaskOverviewProps,
  environment: WidgetEnvironment
) => {
  'widget';

  if (environment.widgetFamily === 'systemSmall') {
    return (
      <VStack modifiers={[padding({ all: 12 })]}>
        <Text
          modifiers={[
            font({ weight: 'bold', size: 14 }),
            foregroundStyle('#FF3B30'),
          ]}
        >
          Overdue: {props.overdue}
        </Text>
        <Text
          modifiers={[
            font({ weight: 'bold', size: 14 }),
            foregroundStyle('#007AFF'),
          ]}
        >
          Due today: {props.dueToday}
        </Text>
        <Text
          modifiers={[font({ size: 12 }), foregroundStyle('#8E8E93')]}
        >
          Upcoming: {props.upcoming}
        </Text>
      </VStack>
    );
  }

  return (
    <VStack modifiers={[padding({ all: 12 })]}>
      <Text
        modifiers={[
          font({ weight: 'bold', size: 16 }),
          foregroundStyle('#1c1c1e'),
        ]}
      >
        Task Overview
      </Text>
      <HStack>
        <VStack>
          <Text
            modifiers={[
              font({ weight: 'bold', size: 24 }),
              foregroundStyle('#FF3B30'),
            ]}
          >
            {props.overdue}
          </Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle('#8E8E93')]}>
            Overdue
          </Text>
        </VStack>
        <VStack>
          <Text
            modifiers={[
              font({ weight: 'bold', size: 24 }),
              foregroundStyle('#007AFF'),
            ]}
          >
            {props.dueToday}
          </Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle('#8E8E93')]}>
            Due today
          </Text>
        </VStack>
        <VStack>
          <Text
            modifiers={[
              font({ weight: 'bold', size: 24 }),
              foregroundStyle('#FF9500'),
            ]}
          >
            {props.upcoming}
          </Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle('#8E8E93')]}>
            Upcoming
          </Text>
        </VStack>
      </HStack>
      <Text modifiers={[font({ size: 11 }), foregroundStyle('#8E8E93')]}>
        {props.totalOngoing} ongoing tasks
      </Text>
    </VStack>
  );
};

export default createWidget('TaskOverview', TaskOverviewWidget);
