interface Service {
	run: () => Promise<void>;
}

const services: Service[] = [];

export { services, type Service };
