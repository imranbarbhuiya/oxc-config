const message = 'Greeting';

function translate(t: (key: string) => string) {
	t(message);
	consume(t);
}

declare function consume(callback: (key: string) => string): void;

export { translate };
