import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ProfileGuardProvider, useProfileGuard } from '../../context/profile-context';

function TabsInner() {
  const colorScheme = useColorScheme();
  const { hasUnsavedChanges } = useProfileGuard();
  const insets = useSafeAreaInsets();

  const guardedListener = ({ preventDefault }: { preventDefault: () => void }) => {
    if (hasUnsavedChanges()) {
      if (Platform.OS === 'web') {
        const leave = window.confirm('You have unsaved changes. Discard them?');
        if (!leave) {
          preventDefault();
        }
      } else {
        // On native, block by default — the profile screen handles the Alert
        preventDefault();
      }
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        sceneStyle: { paddingTop: insets.top },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
        listeners={{ tabPress: guardedListener }}
      />
      <Tabs.Screen
        name="recommendations"
        options={{
          title: 'For You',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="star.fill" color={color} />,
        }}
        listeners={{ tabPress: guardedListener }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  return (
    <ProfileGuardProvider>
      <TabsInner />
    </ProfileGuardProvider>
  );
}
