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
      <View style={styles.selectedDate} />

      {/* Vertical cards skeleton */}
      <View style={styles.verticalCard}>
        <View style={styles.verticalPoster} />
        <View style={styles.verticalContent}>
          <View style={styles.verticalTitle} />
          <View style={styles.verticalMeta} />
          <View style={styles.verticalChips} />
        </View>
      </View>
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
    paddingTop: 16,
    paddingBottom: 100,
  },
  header: {
    width: 180,
    height: 32,
    backgroundColor: '#201f1f',
    borderRadius: 6,
    marginBottom: 28,
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
    marginBottom: 24,
  },
  day: {
    width: 64,
    height: 44,
    backgroundColor: '#201f1f',
    borderRadius: 10,
  },
  selectedDate: {
    width: 200,
    height: 24,
    backgroundColor: '#201f1f',
    borderRadius: 6,
    marginBottom: 16,
  },
  verticalCard: {
    flexDirection: 'row',
    backgroundColor: '#201f1f',
    borderRadius: 16,
    padding: 12,
    gap: 16,
    marginBottom: 16,
  },
  verticalPoster: {
    width: 90,
    height: 130,
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
