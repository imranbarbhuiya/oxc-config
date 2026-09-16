function Card(props: { title: string }) {
	return (
		<div>
			<input value="x" name="q" />

			<a rel="noopener junk">x</a>
		</div>
	);
}

type NamedProps = { title: string };

function Named(props: NamedProps) {
	return <div>{props.title}</div>;
}

export { Card, Named };
