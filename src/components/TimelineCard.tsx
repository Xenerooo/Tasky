import React, { useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';
import type { TimelineEvent } from '../hooks/useTimeline';

interface TimelineCardProps {
  event: TimelineEvent;
  groupTitle?: string;
  status?: string;
  dueDate?: string | null;
  showTimelineBar?: boolean;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const ACTIONABLE_TYPES = ['task_created', 'note_created', 'task_due'];
const SLIDE_DISTANCE = 140;
const SWIPE_THRESHOLD = SLIDE_DISTANCE * 0.4;

function getDeadlineCountdown(eventDate: string): string {
  const due = new Date(eventDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `Overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'}`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `Due in ${diff} days`;
}

function isWithinDays(dueDate: string | null | undefined, days: number): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = due.getTime() - now.getTime();
  const dayDiff = Math.round(diff / (1000 * 60 * 60 * 24));
  return dayDiff <= days;
}

export default function TimelineCard({ event, groupTitle, status, dueDate, showTimelineBar = false, onView, onEdit, onDelete }: TimelineCardProps) {
  const { colors } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const eventConfig: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }> = {
    task_created: { icon: 'checkbox-outline', label: 'Task', color: colors.primary },
    task_due: { icon: 'alarm', label: 'Deadline', color: colors.danger },
    note_created: { icon: 'document-text-outline', label: 'Note', color: colors.success },
    group_created: { icon: 'folder-outline', label: 'Group Created', color: colors.warning },
  };
  const config = eventConfig[event.event_type] || eventConfig.task_created;
  const isActionable = ACTIONABLE_TYPES.includes(event.event_type);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isOpenRef = useRef(false);
  const panXRef = useRef(0);

  const isTask = event.event_type === 'task_created';
  const isDeadline = event.event_type === 'task_due';
  const isNote = event.event_type === 'note_created';
  const isDone = status === 'done';
  const isTaskNear = isTask && !isDone && isWithinDays(dueDate, 3);

  let cardBorderColor = 'transparent';
  if (isTask) {
    if (isDone) cardBorderColor = colors.success;
    else if (isTaskNear) cardBorderColor = colors.danger;
  } else if (isDeadline) {
    cardBorderColor = colors.danger;
  }

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
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
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

  const handleView = () => { closeSlide(); onView?.(); };
  const handleEdit = () => { snapClosed(); onEdit?.(); };
  const handleDelete = () => { snapClosed(); onDelete?.(); };

  const dateStr = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '';

  const dueDateStr = (isTask || isDeadline) && dueDate
    ? 'Due: ' + new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const translateX = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -SLIDE_DISTANCE] });
  const actionsOpacity = slideAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.5, 1] });

  const cardContent = (
    <>
      <View style={[s.card, cardBorderColor ? { borderLeftWidth: 4, borderLeftColor: cardBorderColor } : null,
        isDeadline && s.deadlineCard]}>
        <View style={[s.iconCircle, { backgroundColor: config.color + '20' }]}>
          <Ionicons name={isDone ? 'checkmark-circle' : config.icon} size={20} color={isDone ? colors.success : config.color} />
        </View>
        <View style={s.content}>
          <View style={s.topRow}>
            <Text style={[s.eventType, { color: isDone ? colors.success : config.color }]}>
              {isDone ? 'Done' : isDeadline ? 'Deadline' : isTask ? 'Task' : config.label}
            </Text>
            {groupTitle && <Text style={s.groupBadge}>{groupTitle}</Text>}
          </View>
          <Text style={[s.displayText, (isTaskNear || isDeadline) && s.overdueText]} numberOfLines={2}>
            {event.display_text}
          </Text>
          <View style={s.metaRow}>
            <Text style={s.date}>{dateStr}</Text>
            {dueDateStr && <Text style={[s.dueDate, (isTaskNear || isDeadline) && s.overdueText]}>{dueDateStr}</Text>}
          </View>
          {isDeadline && event.event_date && (
            <Text style={s.deadlineCountdown}>{getDeadlineCountdown(event.event_date)}</Text>
          )}
        </View>
      </View>
    </>
  );

  if (showTimelineBar) {
    return (
      <View style={s.timelineOuter}>
        <View style={s.timelineGutter}>
          <View style={s.timelineLine} />
          <View style={[s.timelineDot, { backgroundColor: config.color, borderColor: config.color }]} />
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={handleView} style={s.timelineCardTouchable}>
          {cardContent}
        </TouchableOpacity>
      </View>
    );
  }

  if (!isActionable) {
    const isGroup = event.event_type === 'group_created';
    if (isGroup) {
      return (
        <View style={s.groupCreatedRow}>
          <View style={s.groupCreatedDot} />
          <Text style={s.groupCreatedText}>{config.label}: {event.display_text}</Text>
          <Text style={s.groupCreatedDate}>{dateStr}</Text>
        </View>
      );
    }
    return null;
  }

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
        <TouchableOpacity activeOpacity={0.7} onPress={handleView} style={s.cardTouchable}>
          {cardContent}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = (c: ThemeColors) => StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginVertical: 4, position: 'relative' },
  actionsContainer: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' },
  actionsInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 8 },
  actionBtn: { backgroundColor: c.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', minWidth: 64 },
  actionDelete: { backgroundColor: c.danger },
  actionLabel: { color: c.textOnColor, fontSize: 11, fontWeight: '600', marginTop: 2 },
  slideContent: { position: 'relative', zIndex: 1 },
  cardTouchable: { borderRadius: 14 },
  card: {
    flexDirection: 'row', backgroundColor: c.surface, borderRadius: 14, padding: 14,
    shadowColor: c.shadow, shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  deadlineCard: {
    backgroundColor: c.surfaceDanger,
  },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  content: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  eventType: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  groupBadge: { fontSize: 11, color: c.textTertiary, backgroundColor: c.borderDivider, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  displayText: { fontSize: 15, color: c.textPrimary, lineHeight: 20, marginBottom: 4 },
  overdueText: { color: c.danger, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  date: { fontSize: 12, color: c.textTertiary },
  dueDate: { fontSize: 12, color: c.warning },
  deadlineCountdown: { fontSize: 12, color: c.danger, fontWeight: '600', marginTop: 2 },
  timelineOuter: {
    flexDirection: 'row', marginHorizontal: 16, marginVertical: 4, minHeight: 72,
  },
  timelineGutter: {
    width: 28, alignItems: 'center', position: 'relative',
  },
  timelineLine: {
    position: 'absolute', top: 0, bottom: 0, width: 2,
    backgroundColor: c.border, left: 13,
  },
  timelineDot: {
    width: 10, height: 10, borderRadius: 5, borderWidth: 2,
    backgroundColor: c.primary, position: 'absolute', top: 28,
  },
  timelineCardTouchable: { flex: 1 },
  groupCreatedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 20, marginVertical: 2 },
  groupCreatedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.warning, marginRight: 10 },
  groupCreatedText: { flex: 1, fontSize: 13, color: c.textTertiary, fontStyle: 'italic' },
  groupCreatedDate: { fontSize: 11, color: c.textLowPriority, marginLeft: 8 },
});
