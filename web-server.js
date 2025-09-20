const express = require('express');
const path = require('path');
const app = express();
const port = 5000;

// Serve static files from src directory
app.use(express.static('src'));

// Route for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Timer Assistant running at http://localhost:${port}`);
});