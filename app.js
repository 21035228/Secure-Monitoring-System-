const express = require("express");
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDatabase = require('./config/connectDatabase');
const http = require('http');
const { Server } = require("socket.io");
const fs = require("fs");
const validateAccessUser = require("./router/ValidateAccessUsers");
const SendFiles = require("./router/SendFiles");
const Login = require("./router/Login");
const OAuth = require("./router/OAuth");
const DashboardRouter = require("./router/DashboardRouter");

// Initialize the Express app
const app = express();

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, "config", "config.env") });

// Connect to the database
connectDatabase();

// Middleware for JSON body parsing and CORS handling
app.use(express.json());
app.use(cors({
    origin: '*',
}));

// Create an HTTP server and bind Socket.IO to it
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*", // change in production
    },
});

app.set("io", io);

io.on('connection', (socket) => {
    console.log(`New client connected ${socket.id}`);



    // Handle disconnect event
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

//usefetch methods to router folder
app.use('/', Login);
app.use('/access', validateAccessUser);
app.use('/files', SendFiles);
app.use('/oauth', OAuth);
app.use('/dashboard', DashboardRouter);

// Start the server
server.listen(process.env.PORT, () => {
    console.log(`Listening on port ${process.env.PORT} in ${process.env.NODE_ENV}`);
});
