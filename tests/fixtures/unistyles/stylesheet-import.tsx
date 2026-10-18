import { StyleSheet, Text } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

export const styles = StyleSheet.create((theme) => ({ text: { color: theme.colors.text } }));
export const used = [Text, useUnistyles];
