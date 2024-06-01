import { request } from 'undici';
import { DateTime } from 'luxon';
import { randomUUID } from 'crypto';
import { injectable } from 'inversify';

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

type SummaryRoot = {
	summary: BillSummary[]
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
	private _base: string = 'https://api.flutterwave.com/v3';
	private _headers: Record<string, string>;

	private _datetime: DateTime;

	constructor() {
		this._headers = {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${process.env.FLW_SECRET_KEY}`,
		};

		this._datetime = DateTime.now();
	}

	async vendAirtime(amount: number, phone: string): Promise<FlwResponse<Airtime>> {
		const req = await request(
			`${this._base}/bills`,
			{
				method: 'POST',
				headers: this._headers,
				body: JSON.stringify({
					country: 'NG',
					customer: phone,
					amount: `${amount}`,
					type: 'AIRTIME',
					reference: randomUUID(),
				}),
			},
		);

		return await req.body.json() as FlwResponse<Airtime>;
	}

	async getBill(reference: string): Promise<FlwResponse<Bill>> {
		const req = await request(
			`${this._base}/bills/${reference}`,
			{
				method: 'GET',
				headers: this._headers,
			},
		);

		return await req.body.json() as FlwResponse<Bill>;
	}

	async getBalance(): Promise<FlwResponse<Balance>> {
		const req = await request(
			`${this._base}/balances/NGN`,
			{
				method: 'GET',
				headers: this._headers,
			},
		);

		return await req.body.json() as FlwResponse<Balance>;
	}

	async getSummaries(): Promise<FlwResponse<SummaryRoot>> {
		const req = await request(
			`${this._base}/bills`,
			{
				method: 'GET',
				headers: this._headers,
				query: {
					to: this._datetime.endOf('month').endOf('day').toISO(),
					from: this._datetime.startOf('month').startOf('day').toISO(),
				},
			},
		);

		return await req.body.json() as FlwResponse<SummaryRoot>;
	}

	async getSummary(currency: string = 'NGN'): Promise<BillSummary> {
		const res = await this.getSummaries(),
			summary = res.data?.summary.find(i => i.currency === currency);

		if (!summary)
			throw new Error(res.message ?? 'Flutterwave API error');

		return summary;
	}
}

export default Vendor;

