# dataminerbackfiller

dataminerbackfiller listens for changes to a AWS Dynamodb table, extracts as JSON data and mirrors its to a p4 depot

######SETUP

This project uses [expressjs generator](http://expressjs.com/starter/installing.html).

$ *sudo npm install express-generator -g*

To generate boilerplate.

$ *express dataminerbackfiller*

>create : dataminerbackfiller
   create : dataminerbackfiller/package.json
   create : dataminerbackfiller/app.js
   create : dataminerbackfiller/public
   create : dataminerbackfiller/public/javascripts
   create : dataminerbackfiller/public/images
   create : dataminerbackfiller/public/stylesheets
   create : dataminerbackfiller/public/stylesheets/style.css
   create : dataminerbackfiller/routes
   create : dataminerbackfiller/routes/index.js
   create : dataminerbackfiller/routes/users.js
   create : dataminerbackfiller/views
   create : dataminerbackfiller/views/index.jade
   create : dataminerbackfiller/views/layout.jade
   create : dataminerbackfiller/views/error.jade
   create : dataminerbackfiller/bin
   create : dataminerbackfiller/bin/www

   install dependencies:
     $ cd dataminerbackfiller && npm install

   run the app:
     $ DEBUG=dataminerbackfiller:* npm start

$ *cd dataminerbackfiller/*

Install [nodejs AWS SDK](https://aws.amazon.com/sdk-for-node-js/)

$ *npm install aws-sdk*
>dataminerbackfiller@0.0.0 
>── aws-sdk@2.2.18  extraneous

Install [node-perforce](https://www.npmjs.com/package/node-perforce) module

$ *npm install node-perforce --save*

node-perforce looks for p4 executable user /usr/bin. Download [p4 command line executable](https://www.perforce.com/downloads/helix) and copy it to /usr/bin having first disabled [SIP](http://www.howtogeek.com/230424/how-to-disable-system-integrity-protection-on-a-mac-and-why-you-shouldnt/)

Configure p4.

$ *p4 set P4PORT=ec2-xx-xx-xx-xxx.us-west-1.compute.amazonaws.com:1666*

$ *p4 set P4USER=cmoore*

$ *p4 set P4CLIENT=cmoore_MBP*

$ *npm install*


######LAUNCH

$ _DEBUG=dataminerbackfiller:* npm start_

