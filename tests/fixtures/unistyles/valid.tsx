import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

const styles = StyleSheet.create((theme, rt) => ({
	container: {
		backgroundColor: theme.colors.background,
		borderColor: 'transparent',
		paddingTop: rt.insets.top,
		fontFamily: 'Tomato',
	},
}));

export function Card({ title, opacity }: { readonly opacity: number; readonly title: string }) {
	return (
		<View style={[styles.container, { opacity }]}>
			<Text style={styles.container}>{title}</Text>
		</View>
	);
}
