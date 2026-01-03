import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../contexts/AuthContext";
import { NotificationProvider } from "../contexts/NotificationContext";
import { colors } from "../constants/theme";

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.surface,
            },
            headerTintColor: colors.primary,
            headerTitleStyle: {
              fontWeight: '600',
            },
            headerShadowVisible: false,
            contentStyle: {
              backgroundColor: colors.background,
            },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen 
            name="(app)/upgrade" 
            options={{ 
              title: 'Upgrade to Pro',
            }} 
          />
          <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/verify-email" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/forgot-password" options={{ headerShown: false }} />
          <Stack.Screen 
            name="(app)/dashboard" 
            options={{ 
              title: 'My Projects',
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="(app)/new-project" 
            options={{ 
              title: 'New Project',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="(app)/project/[id]" 
            options={{ 
              title: 'Project Details',
            }} 
          />
          <Stack.Screen 
            name="(app)/disclaimer" 
            options={{ 
              title: 'Legal Disclaimer',
              presentation: 'modal',
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="(app)/preview" 
            options={{ 
              title: 'Notice Preview',
            }} 
          />
          <Stack.Screen 
            name="(app)/delivery" 
            options={{ 
              title: 'Send Notice',
            }} 
          />
          <Stack.Screen 
            name="(app)/notifications" 
            options={{ 
              title: 'Notifications',
            }} 
          />
          <Stack.Screen 
            name="(app)/templates" 
            options={{ 
              title: 'Project Templates',
            }} 
          />
          <Stack.Screen 
            name="(app)/export" 
            options={{ 
              title: 'Export Projects',
            }} 
          />
          <Stack.Screen 
            name="(app)/state-resources" 
            options={{ 
              title: 'State Resources',
            }} 
          />
          <Stack.Screen 
            name="(app)/settings" 
            options={{ 
              title: 'Settings',
            }} 
          />
        </Stack>
      </NotificationProvider>
    </AuthProvider>
  );
}
