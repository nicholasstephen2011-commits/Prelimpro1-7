import React from 'react';
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent } from 'react-native';

type Props = {
  onPress?: (e?: GestureResponderEvent) => void;
  children?: React.ReactNode;
  testID?: string;
};

const Button: React.FC<Props> = ({ onPress, children, testID }) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} testID={testID}>
      <Text style={styles.text}>{children}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default Button;
