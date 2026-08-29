declare const z: {
	date(): unknown;
	coerce: { date(): { meta(metadata: unknown): unknown } };
};

const record = { _id: '1' };
const id = record._id;
const created = z.date();
const coerced = z.coerce.date();
const documented = z.coerce.date().meta({ type: 'string' });

export { coerced, created, documented, id, record };
