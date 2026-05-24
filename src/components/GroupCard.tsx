import React, { useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';
import type { GroupedTask } from '../hooks/useGroupedTasks';

interface GroupCardProps {
  group: GroupedTask;
  onPress: (group: GroupedTask) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const SLIDE_DISTANCE = 140;
const SWIPE_THRESHOLD = SLIDE_DISTANCE * 0.4;

export default function GroupCard({ group, onPress, onEdit, onDelete }: GroupCardProps) {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isOpenRef = useRef(false);
  const panXRef = useRef(0);

  const isOngoing = group.calculated_status === 'Ongoing';
  const isDone = group.calculated_status === 'Done';
  const isPending = group.calculated_status === 'Pending';
  const noDeadlines = group.calculated_status === 'No Deadlines Scheduled';

  const statusColor = isDone ? colors.success : isOngoing ? colors.warning : isPending ? colors.danger : colors.textTertiary;

  const snapOpen = () => {
    isOpenRef.current = true;
    Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }).start();
  };

  const snapClosed = () => {
    isOpenRef.current = false;
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        slideAnim.setValue(isOpenRef.current ? 1 : 0);
        panXRef.current = isOpenRef.current ? -SLIDE_DISTANCE : 0;
      },
      onPanResponderMove: (_, g) => {
        let offset = panXRef.current + g.dx;
        offset = Math.min(offset, 0);
        offset = Math.max(offset, -SLIDE_DISTANCE);
        slideAnim.setValue(-offset / SLIDE_DISTANCE);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD) snapOpen();
        else snapClosed();
      },
    })
  ).current;

  const closeSlide = () => { if (isOpenRef.current) snapClosed(); };

  const handleEdit = () => { snapClosed(); onEdit(); };
  const handleDelete = () => { snapClosed(); onDelete(); };

  const translateX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -SLIDE_DISTANCE] });
  const actionsOpacity = slideAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.5, 1] });

  const cardContent = (
    <TouchableOpacity style={s.card} onPress={() => { closeSlide(); onPress(group); }} activeOpacity={0.7}>
      <View style={s.header}>
        <Text style={s.title} numberOfLines={2}>{group.title}</Text>
      </View>
      {noDeadlines ? (
        <View style={s.statusRow}>
          <Text style={[s.statusText, { color: statusColor }]}>{group.calculated_status}</Text>
        </View>
      ) : (
        <>
          <View style={s.progressBarBg}>
            <View style={[s.progressBarFill, { width: `${group.progress_percentage}%` }]} />
          </View>
          <View style={s.statusRow}>
            <Text style={[s.statusText, { color: statusColor }]}>
              {group.calculated_status} ({group.progress_percentage}%)
            </Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={s.wrapper}>
      <View style={[s.actionsContainer, { width: SLIDE_DISTANCE }]}>
        <Animated.View style={[s.actionsInner, { opacity: actionsOpacity }]}>
          <TouchableOpacity style={s.actionBtn} onPress={handleEdit}>
            <Ionicons name="pencil" size={18} color={colors.textOnColor} />
            <Text style={s.actionLabel}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, s.actionDelete]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={colors.textOnColor} />
            <Text style={s.actionLabel}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Animated.View style={[s.slideContent, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        {cardContent}
      </Animated.View>
    </View>
  );
}

const styles = (c: ThemeColors) => StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginVertical: 6, position: 'relative' },
  actionsContainer: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' },
  actionsInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 8 },
  actionBtn: { backgroundColor: c.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', minWidth: 64 },
  actionDelete: { backgroundColor: c.danger },
  actionLabel: { color: c.textOnColor, fontSize: 11, fontWeight: '600', marginTop: 2 },
  slideContent: { position: 'relative', zIndex: 1 },
  card: {
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 16,
    shadowColor: c.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: c.textPrimary,
    flex: 1,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: c.borderDivider,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: c.primary,
    borderRadius: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
