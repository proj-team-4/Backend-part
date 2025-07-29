import mysql, { Pool, PoolConnection } from 'mysql2/promise';


export class dataBaseConnection {
    private static pool: Pool;
    private constructor() { }

    private static createPool(): void {
        this.pool = mysql.createPool({
            host: 'localhost',
            user: 'root',
            password: 'DB12345678',
            database: 'party_app',
            waitForConnections: true,
            connectionLimit: 20,
            queueLimit: 0,
            idleTimeout: 300000,
            maxIdle: 10,
        });
    }

    public static async getConnection(): Promise<PoolConnection> {
        if (!this.pool) {
            this.createPool();
        }

        try {
            return await this.pool.getConnection();
        } catch (error) {
            console.error('Error getting database connection:', error);
            throw error;
        }
    }
    // Method to close the pool when shutting down
    public static async closePool(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            console.log('Database pool closed');
        }
    }

}

