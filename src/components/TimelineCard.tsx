import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

const eventConfig: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }> = {
  task_created: { icon: 'checkbox-outline', label: 'Task', color: '#007AFF' },
  task_due: { icon: 'alarm', label: 'Deadline', color: '#FF3B30' },
  note_created: { icon: 'document-text-outline', label: 'Note', color: '#34C759' },
  group_created: { icon: 'folder-outline', label: 'Group Created', color: '#FF9500' },
};

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
    if (isDone) cardBorderColor = '#34C759';
    else if (isTaskNear) cardBorderColor = '#FF3B30';
  } else if (isDeadline) {
    cardBorderColor = '#FF3B30';
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
      <View style={[styles.card, cardBorderColor ? { borderLeftWidth: 4, borderLeftColor: cardBorderColor } : null,
        isDeadline && styles.deadlineCard]}>
        <View style={[styles.iconCircle, { backgroundColor: config.color + '20' }]}>
          <Ionicons name={isDone ? 'checkmark-circle' : config.icon} size={20} color={isDone ? '#34C759' : config.color} />
        </View>
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={[styles.eventType, { color: isDone ? '#34C759' : config.color }]}>
              {isDone ? 'Done' : isDeadline ? 'Deadline' : isTask ? 'Task' : config.label}
            </Text>
            {groupTitle && <Text style={styles.groupBadge}>{groupTitle}</Text>}
          </View>
          <Text style={[styles.displayText, (isTaskNear || isDeadline) && styles.overdueText]} numberOfLines={2}>
            {event.display_text}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.date}>{dateStr}</Text>
            {dueDateStr && <Text style={[styles.dueDate, (isTaskNear || isDeadline) && styles.overdueText]}>{dueDateStr}</Text>}
          </View>
          {isDeadline && event.event_date && (
            <Text style={styles.deadlineCountdown}>{getDeadlineCountdown(event.event_date)}</Text>
          )}
        </View>
      </View>
    </>
  );

  if (showTimelineBar) {
    return (
      <View style={styles.timelineOuter}>
        <View style={styles.timelineGutter}>
          <View style={styles.timelineLine} />
          <View style={[styles.timelineDot, { backgroundColor: config.color, borderColor: config.color }]} />
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={handleView} style={styles.timelineCardTouchable}>
          {cardContent}
        </TouchableOpacity>
      </View>
    );
  }

  if (!isActionable) {
    const isGroup = event.event_type === 'group_created';
    if (isGroup) {
      return (
        <View style={styles.groupCreatedRow}>
          <View style={styles.groupCreatedDot} />
          <Text style={styles.groupCreatedText}>{config.label}: {event.display_text}</Text>
          <Text style={styles.groupCreatedDate}>{dateStr}</Text>
        </View>
      );
    }
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <View style={[styles.actionsContainer, { width: SLIDE_DISTANCE }]}>
        <Animated.View style={[styles.actionsInner, { opacity: actionsOpacity }]}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleEdit}>
            <Ionicons name="pencil" size={18} color="#fff" />
            <Text style={styles.actionLabel}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionDelete]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.actionLabel}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Animated.View style={[styles.slideContent, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <TouchableOpacity activeOpacity={0.7} onPress={handleView} style={styles.cardTouchable}>
          {cardContent}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: 16, marginVertical: 4, position: 'relative' },
  actionsContainer: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' },
  actionsInner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 8 },
  actionBtn: { backgroundColor: '#007AFF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', minWidth: 64 },
  actionDelete: { backgroundColor: '#FF3B30' },
  actionLabel: { color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 2 },
  slideContent: { position: 'relative', zIndex: 1 },
  cardTouchable: { borderRadius: 14 },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  deadlineCard: {
    backgroundColor: '#FFF5F5',
  },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  content: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  eventType: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  groupBadge: { fontSize: 11, color: '#8E8E93', backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  displayText: { fontSize: 15, color: '#1c1c1e', lineHeight: 20, marginBottom: 4 },
  overdueText: { color: '#FF3B30', fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  date: { fontSize: 12, color: '#8E8E93' },
  dueDate: { fontSize: 12, color: '#FF9500' },
  deadlineCountdown: { fontSize: 12, color: '#FF3B30', fontWeight: '600', marginTop: 2 },
  timelineOuter: {
    flexDirection: 'row', marginHorizontal: 16, marginVertical: 4, minHeight: 72,
  },
  timelineGutter: {
    width: 28, alignItems: 'center', position: 'relative',
  },
  timelineLine: {
    position: 'absolute', top: 0, bottom: 0, width: 2,
    backgroundColor: '#d9d9d9', left: 13,
  },
  timelineDot: {
    width: 10, height: 10, borderRadius: 5, borderWidth: 2,
    backgroundColor: '#007AFF', position: 'absolute', top: 28,
  },
  timelineCardTouchable: { flex: 1 },
  groupCreatedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 20, marginVertical: 2 },
  groupCreatedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF9500', marginRight: 10 },
  groupCreatedText: { flex: 1, fontSize: 13, color: '#8E8E93', fontStyle: 'italic' },
  groupCreatedDate: { fontSize: 11, color: '#bbb', marginLeft: 8 },
});
