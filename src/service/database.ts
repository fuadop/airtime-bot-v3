import Airtable from 'airtable';
import { injectable } from 'inversify';

export interface Admin {
	Name: string
	TelegramId: number
};

export interface Schedule {
	Amount: number
	PhoneNumber: string
};

export interface Credential {
	username: string
	password: string
};

// Usage
// const db = new Database() (or injected with IOC)
// 
// GetAdmin - await db.admins.get(telegramId)
// AdminExist - await db.admins.has(telegramId)
//
// GetContact - await db.contacts.get(identifier)
//
// GetWeeklySchedules - await db.schedules.weekly()
@injectable()
class Database {
	private _airtable: Airtable
	private _base: string = 'app4hZDhL4qSnxKs0';

	constructor() {
		this._airtable = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN });
	}

	get admins() {
		return {
			get: this.getAdminByTelegramId.bind(this),
			async has(telegramId: number): Promise<boolean> {
				return !!(await this.get(telegramId));
			},
		};
	}

	get networks() {
		return {
			check: this.getNetworkFromPhone.bind(this),
		};
	}

	get contacts() {
		return {
			get: this.getContactByIdentifier.bind(this),
		};
	}

	get schedules() {
		return {
			weekly: this.getWeeklySchedules.bind(this),
		};
	}

	get credentials() {
		return {
			get: this.getCredentialByUsername.bind(this),
		};
	}

	private toLower(str: string) {
		return str?.toLowerCase();
	}

	private async getAdminByTelegramId(telegramId: number): Promise<Admin | null> {
		const records = await
			this._airtable.base(this._base)
				.table('Admins')
				.select({ 
					view: 'Grid view',

					maxRecords: 1, 
					filterByFormula: `{TelegramId} = ${telegramId}`
				})
				.firstPage();

		const [ record ] = records ?? [];
		if (!record)
			return null;

		return {
			Name: record.get('Name') as string,
			TelegramId: record.get('TelegramId') as number,
		};
	}

	private async getContactByIdentifier(identifier: string): Promise<string | null> {
		const records = await
			this._airtable.base(this._base)
				.table('Contacts')
				.select({
					view: 'Grid view',

					maxRecords: 1, 
					filterByFormula: `{Identifier} = '${this.toLower(identifier)}'`
				})
				.firstPage();

		const [ record ] = records ?? [];
		if (!record)
			return null;

		return record.get('PhoneNumber') as string;
	}

	private async getWeeklySchedules(): Promise<Schedule[]> {
		const records = await
			this._airtable.base(this._base)
				.table('WeeklyRecurrent')
				.select({ view: 'Grid view' })
				.all();

		return records.map(record => 
			(
				{
					Amount: record.get('Amount') as number,
					PhoneNumber: record.get('PhoneNumber') as string,
				}
			),
		);
	}

	private async getNetworkFromPhone(phone: string): Promise<string> {
		const five_digit_prefix = phone[0] === '+' ?
			`0${phone.substring(4,8)}` :
			phone.substring(0,5);

		const four_digit_prefix = five_digit_prefix.substring(0, 4),
			regex_match_rule = five_digit_prefix
				.replace(four_digit_prefix, `${four_digit_prefix}[`) + ']?';

		console.log(regex_match_rule);

		const records = await
			this._airtable.base(this._base)
				.table('NetworkPrefixes')
				.select({
					view: 'Grid view',
					sort: [
						{
							field: 'Prefix',
							direction: 'desc',
						},
					],

					maxRecords: 1, 
					filterByFormula: `REGEX_MATCH({Prefix}, "${regex_match_rule}") = 1`
				})
				.firstPage();

		const [ record ] = records ?? [];
		if (!record)
			return '-';

		return record.get('Network') as string;
	}

	private async getCredentialByUsername(username: string): Promise<Credential> {
		const records = await
			this._airtable.base(this._base)
				.table('Xoypxx')
				.select({ 
					view: 'Grid view',

					maxRecords: 1, 
					filterByFormula: `{Zx87xx} = '${username}'`
				})
				.firstPage();

		const [ record ] = records ?? [];
		if (!record)
			throw new Error('Credential not found');

		const credential = {
			username: record.get('Zx87xx') as string,
			password: record.get('T89wjx') as string,
		};

		credential.password = credential.password?.replace(/^\?\,/, '');

		return credential;

	}
}

export default Database;

