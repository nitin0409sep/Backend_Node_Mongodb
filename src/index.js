import Connect_DB from './db/index.js';
import dotenv from 'dotenv';

// require('dotenv').config({ path: './env' });
dotenv.config({
    path: './env'
})

// Connect Database
Connect_DB();