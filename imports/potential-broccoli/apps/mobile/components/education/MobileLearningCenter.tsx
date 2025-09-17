/**
 * Mobile Learning Center - React Native Component
 * Interactive educational content and tutorials for mobile
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  difficulty: string;
}

interface LearningProgress {
  userLevel: number;
  totalPoints: number;
  badges: string[];
  streak: number;
}

interface Quiz {
  id: string;
  title: string;
  difficulty: string;
  questions: number;
  timeLimit: number;
}

interface Webinar {
  id: string;
  title: string;
  speaker: string;
  date: string;
  duration: number;
}

const { width: screenWidth } = Dimensions.get('window');

export const MobileLearningCenter: React.FC = () => {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tutorials' | 'quizzes' | 'webinars'>('tutorials');
  const [tutorialModalVisible, setTutorialModalVisible] = useState(false);
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);

  useEffect(() => {
    fetchLearningData();
  }, []);

  const fetchLearningData = async () => {
    setLoading(true);
    try {
      const [tutorialsRes, progressRes, quizzesRes, webinarsRes] = await Promise.all([
        fetch('/api/v1/advanced/education/tutorials', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch('/api/v1/advanced/education/gamified-modules', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch('/api/v1/advanced/education/quizzes', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch('/api/v1/advanced/education/webinars', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        })
      ]);

      const [tutorialsData, progressData, quizzesData, webinarsData] = await Promise.all([
        tutorialsRes.json(),
        progressRes.json(),
        quizzesRes.json(),
        webinarsRes.json()
      ]);

      if (tutorialsData.success) {
        setTutorials(tutorialsData.data.available || []);
      }
      if (progressData.success) {
        setProgress({
          userLevel: progressData.data.userLevel,
          totalPoints: progressData.data.totalPoints,
          badges: progressData.data.badges,
          streak: progressData.data.streak
        });
      }
      if (quizzesData.success) {
        setQuizzes(quizzesData.data.available || []);
      }
      if (webinarsData.success) {
        setWebinars(webinarsData.data.upcoming || []);
      }
    } catch (error) {
      console.error('Failed to fetch learning data:', error);
      Alert.alert('Error', 'Failed to load learning content');
    } finally {
      setLoading(false);
    }
  };

  const startTutorial = async (tutorial: Tutorial) => {
    try {
      const response = await fetch(`/api/v1/advanced/education/tutorials/${tutorial.id}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      
      if (response.ok) {
        setTutorialModalVisible(false);
        Alert.alert(
          'Tutorial Started',
          `Starting "${tutorial.title}". You'll be guided through each step.`,
          [{ text: 'Continue', onPress: () => {/* Navigate to tutorial */} }]
        );
      }
    } catch (error) {
      console.error('Failed to start tutorial:', error);
      Alert.alert('Error', 'Failed to start tutorial');
    }
  };

  const startQuiz = async (quiz: Quiz) => {
    try {
      const response = await fetch(`/api/v1/advanced/education/quizzes/${quiz.id}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      
      if (response.ok) {
        Alert.alert(
          'Quiz Started',
          `Starting "${quiz.title}". You have ${quiz.timeLimit / 60} minutes to complete ${quiz.questions} questions.`,
          [{ text: 'Begin', onPress: () => {/* Navigate to quiz */} }]
        );
      }
    } catch (error) {
      console.error('Failed to start quiz:', error);
      Alert.alert('Error', 'Failed to start quiz');
    }
  };

  const registerForWebinar = async (webinar: Webinar) => {
    try {
      const response = await fetch(`/api/v1/advanced/education/webinars/${webinar.id}/register`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      
      if (response.ok) {
        Alert.alert(
          'Registration Successful',
          `You've been registered for "${webinar.title}". You'll receive a reminder before it starts.`
        );
      }
    } catch (error) {
      console.error('Failed to register for webinar:', error);
      Alert.alert('Error', 'Failed to register for webinar');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getDifficultyEmoji = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return '🟢';
      case 'intermediate': return '🟡';
      case 'advanced': return '🔴';
      default: return '⚪';
    }
  };

  const renderTutorialItem = ({ item }: { item: Tutorial }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelectedTutorial(item);
        setTutorialModalVisible(true);
      }}
    >
      <ThemedView style={styles.cardHeader}>
        <ThemedView style={styles.cardTitleRow}>
          <Text style={styles.difficultyEmoji}>{getDifficultyEmoji(item.difficulty)}</Text>
          <ThemedText style={styles.cardTitle} numberOfLines={2}>{item.title}</ThemedText>
        </ThemedView>
        <ThemedView style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
          <Text style={styles.difficultyText}>{item.difficulty}</Text>
        </ThemedView>
      </ThemedView>
      <Text style={styles.cardDescription} numberOfLines={3}>{item.description}</Text>
      <ThemedView style={styles.cardFooter}>
        <Text style={styles.timeText}>⏱️ {item.estimatedTime}</Text>
        <TouchableOpacity style={styles.startButton}>
          <Text style={styles.startButtonText}>Start</Text>
        </TouchableOpacity>
      </ThemedView>
    </TouchableOpacity>
  );

  const renderQuizItem = ({ item }: { item: Quiz }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => startQuiz(item)}
    >
      <ThemedView style={styles.cardHeader}>
        <ThemedView style={styles.cardTitleRow}>
          <Text style={styles.difficultyEmoji}>🧠</Text>
          <ThemedText style={styles.cardTitle} numberOfLines={2}>{item.title}</ThemedText>
        </ThemedView>
        <ThemedView style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
          <Text style={styles.difficultyText}>{item.difficulty}</Text>
        </ThemedView>
      </ThemedView>
      <ThemedView style={styles.quizInfo}>
        <Text style={styles.quizInfoText}>📝 {item.questions} questions</Text>
        <Text style={styles.quizInfoText}>⏰ {item.timeLimit / 60} min</Text>
      </ThemedView>
      <TouchableOpacity style={styles.startButton}>
        <Text style={styles.startButtonText}>Take Quiz</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderWebinarItem = ({ item }: { item: Webinar }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => registerForWebinar(item)}
    >
      <ThemedView style={styles.cardHeader}>
        <ThemedView style={styles.cardTitleRow}>
          <Text style={styles.difficultyEmoji}>🎥</Text>
          <ThemedText style={styles.cardTitle} numberOfLines={2}>{item.title}</ThemedText>
        </ThemedView>
      </ThemedView>
      <Text style={styles.speakerText}>👨‍🏫 {item.speaker}</Text>
      <ThemedView style={styles.webinarInfo}>
        <Text style={styles.webinarInfoText}>
          📅 {new Date(item.date).toLocaleDateString()}
        </Text>
        <Text style={styles.webinarInfoText}>
          ⏱️ {item.duration} min
        </Text>
      </ThemedView>
      <TouchableOpacity style={styles.registerButton}>
        <Text style={styles.registerButtonText}>Register</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <ThemedText style={styles.loadingText}>Loading learning content...</ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>🎓 Learning Center</ThemedText>
        <ThemedText style={styles.subtitle}>Enhance your trading skills</ThemedText>
        
        {/* Progress Stats */}
        {progress && (
          <ThemedView style={styles.progressContainer}>
            <ThemedView style={styles.statItem}>
              <Text style={styles.statValue}>{progress.userLevel}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </ThemedView>
            <ThemedView style={styles.statItem}>
              <Text style={styles.statValue}>{progress.totalPoints.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </ThemedView>
            <ThemedView style={styles.statItem}>
              <Text style={styles.statValue}>{progress.streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </ThemedView>
            <ThemedView style={styles.statItem}>
              <Text style={styles.statValue}>{progress.badges.length}</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </ThemedView>
          </ThemedView>
        )}
      </ThemedView>

      {/* Tab Navigation */}
      <ThemedView style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tutorials' && styles.activeTab]}
          onPress={() => setActiveTab('tutorials')}
        >
          <Text style={[styles.tabText, activeTab === 'tutorials' && styles.activeTabText]}>
            Tutorials
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'quizzes' && styles.activeTab]}
          onPress={() => setActiveTab('quizzes')}
        >
          <Text style={[styles.tabText, activeTab === 'quizzes' && styles.activeTabText]}>
            Quizzes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'webinars' && styles.activeTab]}
          onPress={() => setActiveTab('webinars')}
        >
          <Text style={[styles.tabText, activeTab === 'webinars' && styles.activeTabText]}>
            Webinars
          </Text>
        </TouchableOpacity>
      </ThemedView>

      {/* Content */}
      <FlatList
        data={
          activeTab === 'tutorials' ? tutorials :
          activeTab === 'quizzes' ? quizzes :
          webinars
        }
        renderItem={
          activeTab === 'tutorials' ? renderTutorialItem :
          activeTab === 'quizzes' ? renderQuizItem :
          renderWebinarItem
        }
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Tutorial Detail Modal */}
      <Modal
        visible={tutorialModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTutorialModalVisible(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <ThemedView style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setTutorialModalVisible(false)}>
              <Text style={styles.modalCloseButton}>✕</Text>
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>Tutorial Details</ThemedText>
            <View style={styles.modalHeaderSpacer} />
          </ThemedView>

          {selectedTutorial && (
            <ScrollView style={styles.modalContent}>
              <ThemedText style={styles.modalTutorialTitle}>
                {selectedTutorial.title}
              </ThemedText>
              <Text style={styles.modalTutorialDescription}>
                {selectedTutorial.description}
              </Text>
              
              <ThemedView style={styles.modalMetrics}>
                <ThemedView style={styles.modalMetric}>
                  <Text style={styles.modalMetricLabel}>Difficulty</Text>
                  <ThemedView style={[styles.modalDifficultyBadge, { backgroundColor: getDifficultyColor(selectedTutorial.difficulty) }]}>
                    <Text style={styles.modalDifficultyText}>{selectedTutorial.difficulty}</Text>
                  </ThemedView>
                </ThemedView>
                <ThemedView style={styles.modalMetric}>
                  <Text style={styles.modalMetricLabel}>Duration</Text>
                  <Text style={styles.modalMetricValue}>{selectedTutorial.estimatedTime}</Text>
                </ThemedView>
              </ThemedView>

              <TouchableOpacity
                style={styles.modalStartButton}
                onPress={() => startTutorial(selectedTutorial)}
              >
                <Text style={styles.modalStartButtonText}>Start Tutorial</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </ThemedView>
      </Modal>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.secondary,
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.secondary,
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.secondary,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.secondary,
  },
  activeTabText: {
    color: Colors.light.primary,
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  difficultyEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    color: Colors.light.secondary,
  },
  startButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  quizInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quizInfoText: {
    fontSize: 14,
    color: Colors.light.secondary,
  },
  speakerText: {
    fontSize: 14,
    color: Colors.light.secondary,
    marginBottom: 8,
  },
  webinarInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  webinarInfoText: {
    fontSize: 14,
    color: Colors.light.secondary,
  },
  registerButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  registerButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCloseButton: {
    fontSize: 18,
    color: Colors.light.secondary,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  modalHeaderSpacer: {
    width: 20,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalTutorialTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 12,
  },
  modalTutorialDescription: {
    fontSize: 16,
    color: Colors.light.secondary,
    lineHeight: 24,
    marginBottom: 20,
  },
  modalMetrics: {
    marginBottom: 30,
  },
  modalMetric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalMetricLabel: {
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '500',
  },
  modalMetricValue: {
    fontSize: 16,
    color: Colors.light.secondary,
  },
  modalDifficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modalDifficultyText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  modalStartButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalStartButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
});

export default MobileLearningCenter;