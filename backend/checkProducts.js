console.log('STARTING checkProducts.js...');

try {
    require('dotenv').config();
    console.log('DATABASE_URL loaded:', process.env.DATABASE_URL ? 'yes' : 'NO - MISSING');

    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const fs = require('fs');

    (async () => {
        try {
            const { rows } = await pool.query('SELECT id, name, sku, deleted_at FROM products ORDER BY id');
            const output = JSON.stringify(rows, null, 2);
            console.log('--- Current products ---');
            console.log(output);
            fs.writeFileSync('products_output.json', output);
            console.log('Also saved to products_output.json');
        } catch (err) {
            console.log('QUERY ERROR:', err.message);
            fs.writeFileSync('products_output.json', 'ERROR: ' + err.message);
        } finally {
            await pool.end();
            process.exit(0);
        }
    })();
} catch (err) {
    console.log('TOP LEVEL ERROR:', err.message);
}