import { request } from 'undici';
import { DateTime } from 'luxon';
import { injectable } from 'inversify';
import Database from '../database';

type FlwResponse<T> = {
	status: string
	message: string
	data?: T
};

type Airtime = {
	phone_number: string
	amount: number
	network: string
	flw_ref: string
	reference: string

	[x: string]: any
};

type Bill = {
	currency: string
	customer_id: string
	frequency: string
	amount: string
	product: string
	product_name: string
	commission: number
	transaction_date: string
	country: string
	tx_ref: string
	product_details: string

	[x: string]: any
};

type Balance = {
	currency: string
	available_balance: number
	ledger_balance: number

	[x: string]: any
};

type BillSummary = {
	currency: string
	sum_bills: number
	sum_commission: number
	sum_airtme: number
	count_airtime: number

	[x: string]: any
};

@injectable()
class Vendor {
	private _base: string = 'https://vtu.ng/wp-json/api/v1';

	private _db: Database;
	private _bills: Record<string, Bill> = {};

	// * DI
	constructor(database: Database) {
		this._db = database;
	}

	async vendAirtime(amount: number, phone: string): Promise<FlwResponse<Airtime>> {
		phone = phone.replace(/^\+234/, '0');

		const req = await request(
			`${this._base}/airtime`,
			{
				query: {
					...await this._db.credentials.get('li3289h'),
					phone,
					amount,
					network_id: await this._db.networks.check(phone),
				},
			}
		);

		const res = await req.body.json() as Record<string, any>;

		const order = res.data as Record<string, string>,
			formatted_response: FlwResponse<Airtime> = {
				status: res.code,
				message: res.message,
			}

		if (order && 'order_id' in order) {
			order.order_id = `${order.order_id}`;
			order.amount = order.amount.replace(/^NGN/, '');

			formatted_response.data = {
				amount: +order.amount,
				network: order.network,
				flw_ref: order.order_id,
				reference: order.order_id,
				phone_number: order.phone,
			};

			// cache the bill
			// we want to conform with flw interface
			const _amount = parseFloat(order.amount),
				_discount = order.network === 'MTN' ? 2.5 : 3.0,
				commission = isNaN(_amount) !== true ? (_discount / 100) * _amount : 0;

			this._bills[order.order_id] = {
				amount: order.amount,
				tx_ref: order.order_id,
				country: 'NG',
				product: order.network,
				currency: 'NGN',
				frequency: 'One Time',
				product_details: 'AIRTIME',
				product_name: 'AIRTIME',
				customer_id: 'xxxxxx',
				transaction_date: DateTime.now().toISO() ?? '',
				commission,
			};
		}

		return formatted_response;
	}

	async getBill(reference: string): Promise<FlwResponse<Bill>> {
		const bill = this._bills[reference];
		const response = bill ?
			{
				status: 'success',
				message: 'Bill fetched successfully',
				data: bill,
			} :
			{
				status: 'failure',
				message: 'Order failed to upsert',
			};

		return Promise.resolve(response);
	}

	async getBalance(): Promise<FlwResponse<Balance>> {
		const req = await request(
			`${this._base}/balance`,
			{
				query: {
					...await this._db.credentials.get('li3289h'),
				},
			},
		);

		const res = await req.body.json() as Record<string, any>;

		const balance = res.data as Record<string, string>,
			formatted_response: FlwResponse<Balance> = {
				status: res.code,
				message: res.message,
			}

		if (balance && 'balance' in balance) {
			formatted_response.data = {
				currency: balance.currency ?? 'NGN',
				ledger_balance: parseFloat(balance.balance),
				available_balance: parseFloat(balance.balance),
			};
		}

		return formatted_response;
	}

	async getSummary(currency: string = 'NGN'): Promise<BillSummary | null> {
		return Promise.resolve(null);
	}
}

export default Vendor;
