## Send a webpage to your Kindle


This app helps you to send any article/webpage from the Internet to your Kindle. It uses the Amazon's send-to-kindle functionality.

### install

Clone the repo:
```
git clone git@github.com:smoqadam/webpage-to-kindle.git
cd webpage-to-kindle
```

Install dependencies

```
npm install
```

Rename the `.env.example` to `.env`:

```
mv .env.example .env
```

Edit `.env`
```
#basic HTTP auth username
AUTH_USERNAME=

#basic HTTP auth password
AUTH_PASSWORD= 

SMTP_SERVER=gmail

#email username
SMTP_USERNAME= 

#email password
SMTP_PASSWORD= 

# This email has to have permission to send documents to Kindle
FROM_EMAIL= 

#kindle email ends with @kindle.com
TO_EMAIL=  
```
Then run the following command and open http://localhost:3000:
```
node index.js
```

### Use CLI

You can pass the article's URL as a CLI argument:

```
node index.js http://example.com/new-article
```

### Screenshot

![grafik](https://github.com/smoqadam/webpage-to-kindle/assets/1223848/463f1c53-c8b1-4061-b1f6-24b8cef54a46)
