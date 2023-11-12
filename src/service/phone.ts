import { InvalidPhoneError } from '../errors/phone';
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';

class Phone {
	static isValid(phone: string) {
		return isValidPhoneNumber(phone, 'NG');
	}

	static toString(phone: string) {
		if (Phone.isValid(phone) != true)
			throw new InvalidPhoneError();

		const { number } = parsePhoneNumber(phone, 'NG');

		return number;
	}
}

export default Phone;

