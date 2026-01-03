declare module 'expo-print' {
  export function printToFileAsync(options: unknown): Promise<{ uri: string }>
  export function printAsync(options: unknown): Promise<void>
}

declare module 'expo-sharing' {
  export function isAvailableAsync(): Promise<boolean>
  export function shareAsync(uri: string, options?: unknown): Promise<void>
}

declare module 'expo-file-system' {
  export const documentDirectory: string | null
  export function moveAsync(config: { from: string; to: string }): Promise<void>
}

declare module 'react-native' {
  import type { ComponentType } from 'react'
  export const View: ComponentType<Record<string, unknown>>
  export const Text: ComponentType<Record<string, unknown>>
  export const TouchableOpacity: ComponentType<Record<string, unknown>>
  export const ActivityIndicator: ComponentType<Record<string, unknown>>
  export const StyleSheet: {
    create: <T extends Record<string, unknown>>(styles: T) => T
  }
}

declare module '@expo/vector-icons' {
  import type { ComponentType } from 'react'
  export const Ionicons: ComponentType<Record<string, unknown>>
}
