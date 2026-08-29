import process from 'node:process';

interface Location {
	value: string;
}

const locations: Location[] = [{ value: process.cwd() }];

export { locations, type Location };
