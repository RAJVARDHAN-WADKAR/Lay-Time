const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database('data/laytime.db');

const clientUsers = [
  {
    id: 'usr-client-sokana',
    name: 'Sokana Operations',
    email: 'client.sokana@laytime.com',
    username: 'client.sokana',
    password: 'Client@123',
    role: 'Client',
    clientId: 'client-sokana3',
    clientName: 'Sokana3',
    roleDescription: 'Sokana Client Portal. Access to all Sokana demurrage claims and updates.'
  },
  {
    id: 'usr-client-eastport',
    name: 'Eastport USA Commercial',
    email: 'client.eastport@laytime.com',
    username: 'client.eastport',
    password: 'Client@123',
    role: 'Client',
    clientId: 'client-eastport',
    clientName: 'Eastport USA LLC',
    roleDescription: 'Eastport USA Client Portal. Access to Eastport voyage claims.'
  },
  {
    id: 'usr-client-peregrine',
    name: 'Peregrine Tankers Commercial',
    email: 'client.peregrine@laytime.com',
    username: 'client.peregrine',
    password: 'Client@123',
    role: 'Client',
    clientId: 'client-peregrine',
    clientName: 'Peregrine Tankers',
    roleDescription: 'Peregrine Tankers Client Portal. Access to Peregrine claims.'
  },
  {
    id: 'usr-client-norstar',
    name: 'Norstar Shipping Lead',
    email: 'client.norstar@laytime.com',
    username: 'client.norstar',
    password: 'Client@123',
    role: 'Client',
    clientId: 'client-norstar',
    clientName: 'Norstar',
    roleDescription: 'Norstar Client Portal. Access to Norstar voyage claims.'
  }
];

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (
    id, name, email, username, password_hash, role, client_id, client_name,
    created_by, avatar, status, role_description, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const now = new Date().toISOString();
for (const u of clientUsers) {
  const hash = bcrypt.hashSync(u.password, 10);
  insertUser.run(
    u.id, u.name, u.email, u.username, hash, u.role, u.clientId, u.clientName,
    'usr-001', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'Active', u.roleDescription, now, now
  );
}

console.log('Client users registered successfully!');
const usersCount = db.prepare('SELECT count(*) as c FROM users').get();
console.log('Total users now:', usersCount.c);
