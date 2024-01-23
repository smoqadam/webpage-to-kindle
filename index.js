
require('dotenv').config();
const express = require('express');
const basicAuth = require('basic-auth');
const puppeteer = require('puppeteer');
var { Readability } = require('@mozilla/readability');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');
const { basename } = require('path');
const { title } = require('process');
const { json } = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express()
const port = 3000

// Initialize SQLite database
const db = new sqlite3.Database('./pdfData.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the SQLite database.');

    // Create table for PDF data
    db.run(`CREATE TABLE IF NOT EXISTS pdf_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        url TEXT,
        filepath TEXT
    )`);
});


// Middleware for basic authentication
const authenticate = (req, res, next) => {
    const credentials = basicAuth(req);

    if (!credentials || credentials.name !== process.env.AUTH_USERNAME || credentials.pass !== process.env.AUTH_PASSWORD) {
        res.set('WWW-Authenticate', 'Basic realm="Authentication required"');
        return res.status(401).send('Authentication required.');
    }

    next();
};

// Apply authentication middleware to all routes
app.use(authenticate);


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
})

app.get('/send', async (req, res) => {
    try {
        await send(req.query.url);
        res.send(JSON.stringify({
            'error': false,
            'message': 'success',
        }));
    } catch (e) {
        console.log({ e });
        res.send(JSON.stringify({
            'error': true,
            "message": e.message,
        }));
    }
})

// Route for getting PDF list
app.get('/pdfs', (req, res) => {
    db.all("SELECT * FROM pdf_data", [], (err, rows) => {
        if (err) {
            throw err;
        }
        res.json(rows);
    });
});

app.get('/delete/:id', (req, res) => {
    db.get(`SELECT filepath FROM pdf_data WHERE id = ?`, req.params.id, (err, row) => {
        if (err) {
            return res.status(500).send({ message: 'Error fetching file path', error: err.message });
        }

        if (row) {
            fs.unlink(row.filepath, (err) => {
                if (err) {
                    // return res.status(500).send({ message: 'Error deleting file', error: err.message });
                    console.error(err);
                }

            });
            
            db.run(`DELETE FROM pdf_data WHERE id = ?`, req.params.id, function(err) {
                if (err) {
                    return res.status(500).send({ message: 'Error deleting database record', error: err.message });
                }
                res.send({ message: 'Successfully deleted', changes: this.changes });
            });
            
        } else {
            res.status(404).send({ message: 'PDF not found' });
        }
    });
});

const readable = (html) => {
    const doc = new JSDOM(html);
    var article = new Readability(doc.window.document).parse();
    return article
}

const toPdf = async (title, html, url) => {
    const browser = await puppeteer.launch();

    const page = await browser.newPage();
    html = '<h1><a href="' + url + '">' + title + '</a></h1>' + html;
    await page.setContent(html);
    const filename = 'docs/' + title.replaceAll(' ', '-') + '.pdf';
    await page.pdf({ path: filename, format: 'A5' });

    await browser.close();

    return filename;
};

const send = async (url) => {
    let response = await fetch(url);
    let body = await response.text();
    let article = readable(body);
    let filename = await toPdf(article.title, article.content, url);
    // Save to database
    db.run(`INSERT INTO pdf_data (title, url, filepath) VALUES (?, ?, ?)`, [article.title, url, filename], function(err) {
        if (err) {
            return console.error(err.message);
        }
        console.log(`A row has been inserted with rowid ${this.lastID}`);
    });
    sendEmail(filename);
    console.log('done!');
}

const sendEmail = (filename) => {

    // Create a transporter using Gmail SMTP
    const transporter = nodemailer.createTransport({
        service: process.env.SMTP_SERVER,
        auth: {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    // Email options
    const mailOptions = {
        from: process.env.FROM_EMAIL,
        to: process.env.TO_EMAIL,
        subject: 'convert',
        text: 'convert',
        attachments: [
            {
                filename: basename(filename),
                content: fs.createReadStream(filename),
            },
            // Add more attachments as needed
        ],
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
        } else {
            console.log('Email sent: ' + info.response);
            // fs.rm(filename, () => {
            //     console.log('file has been deleted')
            // });
        }
    });
}

var args = process.argv.slice(2);
console.log(args);
if (args[0] !== undefined) {
    send(args[0]);

} else {
    app.listen(port, () => {
        console.log(`webpage to kindle app listening on port ${port}`)
    })
}