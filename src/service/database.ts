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
}

export default Database;

