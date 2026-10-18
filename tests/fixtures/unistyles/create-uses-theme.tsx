import { Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { theme } from '../theme';

export const styles = StyleSheet.create({
	text: { color: theme.colors.text },
});

export const callback = StyleSheet.create((current) => ({
	text: { color: current.colors.text },
}));

export const used = [Text];
