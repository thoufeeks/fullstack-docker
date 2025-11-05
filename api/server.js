const express = require('express');
const { Pool } = require('pg');

const PORT = process.env.PORT || 5000;

const pool = new Pool({
  host: process.env.PGHOST || 'db',
  user: process.env.PGUSER || 'appuser',
  password: process.env.PGPASSWORD || 'apppassword',
  database: process.env.PGDATABASE || 'appdb',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT) : 5432,
  max: 5
});

async function ensureTable(){
  const create = `
  CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );
  `;
  await pool.query(create);
  console.log('Ensured messages table exists');
}

async function waitForDb(retries=15, delay=2000){
  for(let i=0;i<retries;i++){
    try {
      await pool.query('SELECT 1');
      console.log('Database reachable');
      return;
    } catch(err){
      console.log(`DB not ready yet (${i+1}/${retries}). Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Could not connect to database');
}

const app = express();
app.use(express.json());

app.get('/api/health', (req,res)=> res.json({ok:true}));

app.get('/api/messages', async (req,res)=>{
  try{
    const { rows } = await pool.query('SELECT id, name, text, to_char(created_at, \'YYYY-MM-DD HH24:MI:SS\') as created_at FROM messages ORDER BY id DESC LIMIT 100');
    res.json(rows);
  }catch(err){
    console.error(err);
    res.status(500).json({error:'db error'});
  }
});

app.post('/api/messages', async (req,res)=>{
  const { name, text } = req.body || {};
  if(!text) return res.status(400).json({error:'text missing'});
  try{
    const { rows } = await pool.query('INSERT INTO messages(name, text) VALUES($1,$2) RETURNING id, name, text, to_char(created_at, \'YYYY-MM-DD HH24:MI:SS\') as created_at', [name || 'anonymous', text]);
    res.status(201).json(rows[0]);
  }catch(err){
    console.error(err);
    res.status(500).json({error:'db error'});
  }
});

(async function start(){
  try{
    await waitForDb();
    await ensureTable();
    app.listen(PORT, '0.0.0.0', ()=> console.log(`API listening on ${PORT}`));
  }catch(err){
    console.error('Startup error', err);
    process.exit(1);
  }
})();
