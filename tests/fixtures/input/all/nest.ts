type Service = {
	run(): Promise<void>;
};

const services: Array<Service> = [];

export { services, type Service };
