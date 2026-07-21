/** PostgreSQL 连接池、参数化查询与事务边界。 */

import { Pool, type PoolClient, type PoolConfig, type QueryResultRow } from "pg";

export type DatabaseConfig = {
	host: string;
	port: number;
	user: string;
	password: string;
	database: string;
	max: number;
};

export type Transaction = Pick<PoolClient, "query">;

let sharedPool: Pool | undefined;

function readPositiveInteger(name: string, fallback: number): number {
	const rawValue = process.env[name];
	if (rawValue === undefined || rawValue === "") {
		return fallback;
	}

	const value = Number(rawValue);
	if (!Number.isInteger(value) || value <= 0) {
		throw new Error(`${name} 必须是正整数，当前值为: ${rawValue}`);
	}

	return value;
}

/** 从环境变量读取连接配置；默认值与 docker-compose.yml 的本地开发配置一致。 */
export function readDatabaseConfig(): DatabaseConfig {
	return {
		host: process.env["PG_HOST"] ?? "127.0.0.1",
		port: readPositiveInteger("PG_PORT", 5432),
		user: process.env["PG_USER"] ?? "agent",
		password: process.env["PG_PASSWORD"] ?? "agent_dev_pw",
		database: process.env["PG_DATABASE"] ?? "issue_agent",
		max: readPositiveInteger("PG_POOL_MAX", 10),
	};
}

/** 创建新的 Pool，主要用于集成测试或需要独立生命周期的进程。 */
export function createPool(config: DatabaseConfig = readDatabaseConfig()): Pool {
	const poolConfig: PoolConfig = {
		host: config.host,
		port: config.port,
		user: config.user,
		password: config.password,
		database: config.database,
		max: config.max,
		idleTimeoutMillis: 30_000,
		connectionTimeoutMillis: 5_000,
	};

	const pool = new Pool(poolConfig);
	pool.on("error", (error) => {
		console.error("[db] PostgreSQL 空闲连接发生错误", error);
	});
	return pool;
}

/** 获取进程级共享连接池；不要为每个请求创建一个 Pool。 */
export function getPool(): Pool {
	sharedPool ??= createPool();
	return sharedPool;
}

/** 关闭共享连接池，供 Worker graceful shutdown 和测试清理使用。 */
export async function closePool(): Promise<void> {
	if (sharedPool === undefined) {
		return;
	}

	const pool = sharedPool;
	sharedPool = undefined;
	await pool.end();
}

/**
 * 参数化查询的唯一公共入口。永远把用户数据放在 values 中，禁止字符串拼接 SQL。
 */
export async function query<Row extends QueryResultRow = QueryResultRow>(
	text: string,
	values: readonly unknown[] = [],
): Promise<ReadonlyArray<Row>> {
	const result = await getPool().query<Row>(text, [...values]);
	return result.rows;
}

/**
 * 在一个连接上执行事务。
 * 回调抛错时必定 ROLLBACK；finally 必定 release，避免耗尽连接池。
 */
export async function withTransaction<Result>(
	work: (transaction: Transaction) => Promise<Result>,
): Promise<Result> {
	const client = await getPool().connect();

	try {
		await client.query("BEGIN");
		const result = await work(client);
		await client.query("COMMIT");
		return result;
	} catch (error: unknown) {
		try {
			await client.query("ROLLBACK");
		} catch (rollbackError: unknown) {
			console.error("[db] 事务回滚失败", rollbackError);
		}
		throw error;
	} finally {
		client.release();
	}
}
