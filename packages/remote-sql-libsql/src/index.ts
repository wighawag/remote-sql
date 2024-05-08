import {RemoteSQL, SQLPreparedStatement, SQLResult, SQLStatement} from 'remote-sql';
import type {Client, ResultSet} from '@libsql/core/api';

export class LibSQLPreparedStatement implements SQLPreparedStatement {
	public readonly args: any[];
	constructor(private client: Client, public readonly sql: string, args: any[] = []) {
		this.args = args;
	}
	bind(...values: any[]): SQLPreparedStatement {
		return new LibSQLPreparedStatement(this.client, this.sql, this.args.concat(values));
	}
	async all<T = any>(): Promise<SQLResult<T>> {
		let resultSet: ResultSet;
		if (this.args.length > 0) {
			resultSet = await this.client.execute({sql: this.sql, args: this.args});
		} else {
			resultSet = await this.client.execute(this.sql);
		}
		return {
			results: resultSet.rows,
		} as SQLResult<T>;
	}
}

export class RemoteLibSQL implements RemoteSQL {
	constructor(private client: Client) {}
	prepare(sql: string): SQLPreparedStatement {
		return new LibSQLPreparedStatement(this.client, sql);
	}
	async batch<T = any>(list: SQLPreparedStatement[]): Promise<SQLResult<T>[]> {
		const response = await this.client.batch(
			list.map((v) => {
				const p = v as LibSQLPreparedStatement;
				return p.args.length > 0 ? {sql: p.sql, args: p.args} : p.sql;
			})
		);
		return response.map((res) => ({results: res.rows})) as SQLResult<T>[];
	}
}
