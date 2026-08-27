import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function HomeSkeleton() {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Header and weekly programme skeleton */}
      <View style={styles.header} />
      <View style={styles.sectionTitle} />
      <View style={styles.daysRow}>
        <View style={styles.day} />
        <View style={styles.day} />
        <View style={styles.day} />
        <View style={styles.day} />
      </View>
      <View style={styles.dateSummary} />

      {/* Featured movie skeleton */}
      <View style={styles.featuredCard}>
        <View style={styles.featuredContent}>
          <View style={styles.featuredTitle} />
          <View style={styles.featuredMeta} />
          <View style={styles.featuredTimes} />
          <View style={styles.featuredAction} />
        </View>
      </View>

      <View style={styles.remainingTitle} />

      {/* Compact movie cards skeleton */}
      <View style={styles.verticalCard}>
        <View style={styles.verticalPoster} />
        <View style={styles.verticalContent}>
          <View style={styles.verticalTitle} />
          <View style={styles.verticalMeta} />
          <View style={styles.verticalChips} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 116,
  },
  header: {
    width: 180,
    height: 32,
    backgroundColor: '#201f1f',
    borderRadius: 6,
    marginBottom: 18,
  },
  sectionTitle: {
    width: 220,
    height: 24,
    backgroundColor: '#201f1f',
    borderRadius: 6,
    marginBottom: 16,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  day: {
    width: 64,
    height: 44,
    backgroundColor: '#201f1f',
    borderRadius: 10,
  },
  dateSummary: {
    width: 230,
    height: 16,
    backgroundColor: '#201f1f',
    borderRadius: 6,
    marginBottom: 13,
  },
  featuredCard: {
    minHeight: 330,
    justifyContent: 'flex-end',
    padding: 18,
    backgroundColor: '#201f1f',
    borderRadius: 22,
  },
  featuredContent: {
    gap: 10,
  },
  featuredTitle: {
    width: '72%',
    height: 28,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
  },
  featuredMeta: {
    width: '48%',
    height: 14,
    borderRadius: 5,
    backgroundColor: '#2a2a2a',
  },
  featuredTimes: {
    width: '64%',
    height: 34,
    borderRadius: 9,
    backgroundColor: '#2a2a2a',
  },
  featuredAction: {
    width: 140,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#2a2a2a',
  },
  remainingTitle: {
    width: 170,
    height: 21,
    marginTop: 24,
    marginBottom: 12,
    borderRadius: 6,
    backgroundColor: '#201f1f',
  },
  verticalCard: {
    flexDirection: 'row',
    backgroundColor: '#201f1f',
    borderRadius: 16,
    padding: 10,
    gap: 13,
    marginBottom: 12,
  },
  verticalPoster: {
    width: 84,
    height: 126,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
  },
  verticalContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  verticalTitle: {
    width: '70%',
    height: 18,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    marginBottom: 8,
  },
  verticalMeta: {
    width: '50%',
    height: 14,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
  },
  verticalChips: {
    width: '80%',
    height: 28,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    marginTop: 8,
  },
});
