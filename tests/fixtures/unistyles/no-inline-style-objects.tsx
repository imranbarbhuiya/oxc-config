import { ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

const styles = StyleSheet.create((theme) => ({ box: { padding: theme.space.md } }));

export function Box({
	title,
	opacity,
	active,
}: {
	readonly active: boolean;
	readonly opacity: number;
	readonly title: string;
}) {
	return (
		<ScrollView contentContainerStyle={{ padding: 8 }}>
			<View style={[styles.box, { marginTop: 8 }]}>
				<Text style={active ? { fontWeight: 'bold' } : styles.box}>{title}</Text>
				<Text style={[styles.box, { opacity }]}>{title}</Text>
				<Text style={{ opacity: opacity, padding: styles.box.padding }}>{title}</Text>
			</View>
		</ScrollView>
	);
}
