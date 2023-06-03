const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');

const secretKey = 's3CR3tK3y123!'; 
const expirationTime = 3600; // 1 hour

// console.log(token);

const app = express();

const pool = mysql.createPool({
  host: 'localhost',
  port: '3306',
  user: 'root',
  password: 'Nevergiveup1',
  database: 'tambola'
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');
});

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: 'No token provided.' });
  }

  jwt.verify(token, secretKey, (error, decoded) => {
    if (error) {
      return res.status(401).json({ message: 'Failed to authenticate token.' });
    }
    req.user = decoded;
    next();
  });
};

// Login API
app.post('/login', (req, res) => {
  
  const userId = 1; // Replace with the actual user ID

  // Generate a JWT token
  const token = jwt.sign({ id: userId }, secretKey,{ expiresIn: expirationTime });

  // Return the token in the response
  res.status(200).json({ token });
});

// Tambola ticket generation API
app.post('/generate-tickets', verifyToken, (req, res) => {
  // Get the user ID from the decoded token
  const userId = req.user.id;

  const numberOfTickets = 5;
  const tickets = [];

  for (let i = 0; i < numberOfTickets; i++) {
    const ticket = generateTicket();
    console.log('Generated Ticket:', ticket);
    tickets.push(ticket);
  }

  const values = tickets.map((ticket) => [ticket, userId]);

  const query = 'INSERT INTO tickets (ticket_number, user_id) VALUES ?';

  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error getting database connection:', err);
      return res.status(500).json({ message: 'Failed to generate tickets.' });
    }

    connection.query(query, [values], (error, result) => {
      connection.release(); // Release the connection

      if (error) {
        console.error('Error storing tickets:', error);
        return res.status(500).json({ message: 'Failed to generate tickets.' });
      }
      res.status(200).json({ tickets });
    });
  });
});


// Fetch Tambola tickets based on user ID API
app.get('/tickets', verifyToken, (req, res) => {
  // Get the user ID from the decoded token
  const userId = req.user.id;

  // Fetch the Tambola tickets associated with the user ID from the database
  const query = 'SELECT ticket_number FROM tickets WHERE user_id = ?';
  const values = [userId];

  pool.query(query, values, (error, result) => {
    if (error) {
      console.error('Error fetching tickets:', error);
      return res.status(500).json({ message: 'Failed to fetch tickets.' });
    }

    // Extract the ticket data from the database result
    const ticketsData = result[0].ticket_data;
    const tickets = JSON.parse(ticketsData);

    // Return the fetched tickets in the response
    res.status(200).json({ tickets });
  });
});

// Function to generate a unique Tambola ticket
const generateTicket = () => {
  const ticket = [];

  // Generate an array of 15 unique numbers for each column
  const columns = Array.from({ length: 9 }, (_, i) => Array.from({ length: 3 }, (_, j) => i * 10 + j + 1));

  // Shuffle the numbers within each column
  for (let column of columns) {
    column.sort(() => Math.random() - 0.5);
  }

  // Generate the ticket rows
  for (let i = 0; i < 3; i++) {
    const row = [];

    // Fill each row with 5 numbers from different columns
    for (let j = 0; j < 5; j++) {
      let num;
      let columnIndex;

      // Find a column with available numbers
      do {
        columnIndex = Math.floor(Math.random() * 9);
        num = columns[columnIndex].pop();
      } while (num === undefined);

      row.push(num);
    }

    ticket.push(row);
  }

  return ticket;
};


// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

