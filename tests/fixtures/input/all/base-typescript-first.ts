import process from 'process';

type Location = {
	value: string;
};

const locations: Array<Location> = [{ value: process.cwd() }];

export { locations, type Location };
