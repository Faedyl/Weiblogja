const isVerbose = process.env.VERBOSE === 'true' || process.env.VERBOSE === '1';

export const logger = {
	debug: (...args: unknown[]) => {
		if (isVerbose) {
			console.log(...args);
		}
	},
	info: (...args: unknown[]) => {
		if (isVerbose) {
			console.info(...args);
		}
	},
	warn: (...args: unknown[]) => {
		console.warn(...args);
	},
	error: (...args: unknown[]) => {
		console.error(...args);
	},
};
