type User = {
	name: string;
};

interface Formatter {
	format: (value: string) => string;
}

const values: Array<string> = [];
const status = 'ready' as 'ready';

export { type Formatter, status, type User, values };
