import { VStack, HStack, Text } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

type GroupProgressProps = {
  groupId: string;
  groupTitle: string;
  calculatedStatus: string;
  progressPercentage: number;
};

function statusColor(status: string): string {
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

const GroupProgressWidget = (
  props: GroupProgressProps,
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
        {props.groupTitle}
      </Text>
      <HStack>
        <VStack>
          <Text
            modifiers={[
              font({ weight: 'bold', size: 24 }),
              foregroundStyle('#1c1c1e'),
            ]}
          >
            {props.progressPercentage}%
          </Text>
          <Text
            modifiers={[
              font({ size: 12 }),
              foregroundStyle(statusColor(props.calculatedStatus)),
            ]}
          >
            {props.calculatedStatus}
          </Text>
        </VStack>
      </HStack>
    </VStack>
  );
};

export default createWidget('GroupProgress', GroupProgressWidget);
