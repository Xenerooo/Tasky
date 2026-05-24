import React from 'react';
import { View, Text, SectionList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTimeline, type TimelineEvent, type TimelineSection } from '../hooks/useTimeline';
import TimelineCard from '../components/TimelineCard';
import { useDatabase } from '../hooks/useDatabase';

interface TimelineScreenProps {
  navigation: any;
}

export default function TimelineScreen({ navigation }: TimelineScreenProps) {
  const { sections, search, setSearch, filter, setFilter, refresh } = useTimeline();
  const { db } = useDatabase();

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
    <View style={styles.sectionHeader}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionTitle}>{section.title}</Text>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>Timeline</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search timeline or group..."
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterPillText, filter === f.key && styles.filterPillTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.item_id}-${item.event_type}-${index}`}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onRefresh={refresh}
        refreshing={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No timeline events found</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1c1c1e',
  },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e5ea',
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
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  filterPillActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterPillText: {
    fontSize: 14,
    color: '#1c1c1e',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#fff',
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
    backgroundColor: '#d9d9d9',
    marginRight: 10,
    marginLeft: 13,
    borderRadius: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 15,
    fontStyle: 'italic',
    marginTop: 40,
  },
});
