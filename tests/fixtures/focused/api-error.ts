const options = {
	queryFn: () => {
		throw new Error('Request failed');
	},
};

export { options };
