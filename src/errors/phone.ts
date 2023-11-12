export class InvalidPhoneError extends Error {
	name: string = 'InvalidPhoneError';

	constructor(message?: string) {
		super(message);
	}
}
