require('dotenv').config();
const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });
client.connect().then(() => client.query("SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as polqual, pg_get_expr(polwithcheck, polrelid) as polwithcheck FROM pg_policy WHERE polrelid = 'categories'::regclass")).then(res => { console.log(res.rows); client.end(); })
