import { Text } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

export const styles = StyleSheet.create({
	card: {
		backgroundColor: '#ffffff',
		borderColor: 'rgba(0, 0, 0, 0.1)',
		color: 'red',
		shadowColor: 'transparent',
		fontFamily: 'Tomato',
	},
});

export function Label({ title }: { readonly title: string }) {
	return <Text style={[styles.card, { color: `hsl(0 0% 0%)` }]}>{title}</Text>;
}
