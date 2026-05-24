import React, { useMemo } from 'react';
import { ThemedText } from '../components/ThemedText';
import { View, Text, SectionList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTimeline, type TimelineEvent, type TimelineSection } from '../hooks/useTimeline';
import TimelineCard from '../components/TimelineCard';
import { useDatabase } from '../hooks/useDatabase';
import { useTheme, type ThemeColors } from '../theme/ThemeContext';

interface TimelineScreenProps {
  navigation: any;
}

export default function TimelineScreen({ navigation }: TimelineScreenProps) {
  const { sections, search, setSearch, filter, setFilter, refresh } = useTimeline();
  const { db } = useDatabase();
  const { colors, themeName } = useTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const headerColor = colors.textPrimary;
  const headerFontSize = themeName === 'nika' ? 20 : 28;

  const [groupTitles, setGroupTitles] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!db) return;
    (async () => {
      const rows = await db.getAllAsync<{ id: string; title: string }>(
        "SELECT id, title FROM grouped_tasks WHERE is_deleted = 0"
      );
      const map: Record<string, string> = {};
      rows.forEach(r => { map[r.id] = r.title; });
      setGroupTitles(map);
    })();
  }, [db, sections]);

  const filters: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'deadlines', label: 'Deadlines Only' },
    { key: 'notes', label: 'Notes Only' },
  ];

  const handleView = (event: TimelineEvent) => {
    if (event.event_type === 'task_created' || event.event_type === 'task_due') {
      navigation.navigate('TaskDetail', { taskId: event.item_id, groupId: event.group_id });
    } else if (event.event_type === 'note_created') {
      navigation.navigate('NoteDetail', { noteId: event.item_id });
    }
  };

  const renderSectionHeader = ({ section }: { section: TimelineSection }) => (
    <View style={s.sectionHeader}>
      <View style={s.sectionLine} />
      <ThemedText style={s.sectionTitle}>{section.title}</ThemedText>
    </View>
  );

  const renderItem = ({ item }: { item: TimelineEvent }) => (
    <TimelineCard
      event={item}
      groupTitle={item.group_id ? groupTitles[item.group_id] : undefined}
      showTimelineBar
      onView={() => handleView(item)}
    />
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.topBar}>
        <ThemedText style={[s.headerTitle, { color: headerColor, fontSize: headerFontSize } ]}>Timeline</ThemedText>
      </View>

      <TextInput
        style={s.searchInput}
        placeholder="Search timeline or group..."
        value={search}
        onChangeText={setSearch}
      />

      <View style={s.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterPill, filter === f.key && s.filterPillActive]}
            onPress={() => setFilter(f.key)}
          >
            <ThemedText style={[s.filterPillText, filter === f.key && s.filterPillTextActive]}>
              {f.label}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.item_id}-${item.event_type}-${index}`}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        onRefresh={refresh}
        refreshing={false}
        ListEmptyComponent={
          <ThemedText style={s.emptyText}>No timeline events found</ThemedText>
        }
      />
    </SafeAreaView>
  );
}

const styles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.screenBackground,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontFamily: c.headingFont,
  },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: c.surface,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: c.borderSeparator,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderSeparator,
  },
  filterPillActive: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  filterPillText: {
    fontSize: 14,
    color: c.textPrimary,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: c.textOnColor,
  },
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sectionLine: {
    width: 2,
    height: 16,
    backgroundColor: c.border,
    marginRight: 10,
    marginLeft: 13,
    borderRadius: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    textAlign: 'center',
    color: c.textTertiary,
    fontSize: 15,
    fontStyle: 'italic',
    marginTop: 40,
  },
});
