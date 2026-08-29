interface User {
	name: string;
}

interface Formatter {
	format: (value: string) => string;
}

const values: string[] = [];
const status = 'ready';

export { type Formatter, status, type User, values };
