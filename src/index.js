import Connect_DB from './db/index.js';
import dotenv from 'dotenv';
import { app } from './app.js';

// require('dotenv').config({ path: './env' });
dotenv.config({
    path: './.env'
})

// Connect Database
Connect_DB().then(() => {
    // Server hasn't connected due to some issue
    app.on("error", (err) => {
        console.log("Server Error - ", err);
        throw err;
    })

    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server has started at port ${process.env.PORT}`);
    })
}).catch((err) => {
    console.log("Mongo DB connection failed !!! ", err)
})