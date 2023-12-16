
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


const app = express()
const port = 3000

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
        let url = req.query.url;
        console.log(req.query);
        let response = await fetch(url);
        let body = await response.text();
        let article = readable(body);
        let filename = await toPdf(article.title, article.content);

        sendEmail(filename);
        res.send(JSON.stringify({
            'error': false,
            'message': 'success',
        }));
    } catch (e) {
        console.log({e});
        res.send(JSON.stringify({
            'error': true,
            "message": e.message,
        }));
    }
})


const readable = (html) => {
    const doc = new JSDOM(html);
    var article = new Readability(doc.window.document).parse();
    return article
}

const toPdf = async (title, html) => {
    const browser = await puppeteer.launch();

    const page = await browser.newPage();

    await page.setContent(html);
    const filename = 'docs/' + title + '.pdf';
    await page.pdf({ path: filename, format: 'A5' });

    await browser.close();

    return filename;
};

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




app.listen(port, () => {
    console.log(`webpage to kindle app listening on port ${port}`)
})