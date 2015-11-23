# dataminerbackfiller

dataminerbackfiller listens for changes to a AWS Dynamodb table, extracts as JSON data and mirrors its to a p4 depot

#####SETUP (OS -X) & LAUNCH

This project uses [expressjs generator](http://expressjs.com/starter/installing.html).

$ *sudo npm install express-generator -g*

To generate boilerplate.

$ *express dataminerbackfiller*

>   create : dataminerbackfiller
>   create : dataminerbackfiller/package.json
>   create : dataminerbackfiller/app.js
>   create : dataminerbackfiller/public
>   create : dataminerbackfiller/public/javascripts
>   create : dataminerbackfiller/public/images
>   create : dataminerbackfiller/public/stylesheets
>   create : dataminerbackfiller/public/stylesheets/style.css
>   create : dataminerbackfiller/routes
>   create : dataminerbackfiller/routes/index.js
>   create : dataminerbackfiller/routes/users.js
>   create : dataminerbackfiller/views
>   create : dataminerbackfiller/views/index.jade
>   create : dataminerbackfiller/views/layout.jade
>   create : dataminerbackfiller/views/error.jade
>   create : dataminerbackfiller/bin
>   create : dataminerbackfiller/bin/www


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

Install dependencies:
$ *cd dataminerbackfiller && npm install*

To launch:

$ _DEBUG=dataminerbackfiller:* npm start_

#####SETUP (EC2 Linux AMI) & LAUNCH

update npm

$ *npm -v*
>1.3.4
    
$ *sudo npm install npm -g*
    
$ *npm -v*
>2.13.0
    
[update nodejs](http://stackoverflow.com/questions/8191459/how-to-update-node-js)

$ * sudo npm cache clean -f
>npm WARN using --force I sure hope you know what you are doing.

$ *sudo npm install -g n*
>/usr/local/bin/n -> /usr/local/lib/node_modules/n/bin/n
>n@1.3.0 /usr/local/lib/node_modules/n
    
$ *sudo n stable*
>install : node-v0.12.7
> mkdir : /usr/local/n/versions/node/0.12.7
> fetch : https://nodejs.org/dist/v0.12.7/node-v0.12.7-linux-x64.tar.gz
>installed : v0.12.7

Configure p4.

[download p4v](https://www.perforce.com/downloads/register/helix?return_url=http://www.perforce.com/downloads/perforce/r15.2/bin.linux26x86_64/p4&platform_family=LINUX&platform=Linux%20%28x64%29&version=2015.2/1264740&product_selected=Perforce&edition_selected=helix&product_name=P4:%20:%20Command-Line&prod_num=6) and copy to /usr/bin.

$ *p4 set P4PORT=ec2-xx-xx-xx-xxx.us-west-1.compute.amazonaws.com:1666*
$ *p4 set P4USER=cmoore*
$ *p4 set P4CLIENT=dataminer_ec2*
$ *p4 login -p*
This outputs a 32 character ticket value.  

$ *touch $HOME/.p4tickets*
$ *echo "32CHARTICKETVALUE" > /home/ec2-user/.p4tickets*
$ *p4 login*
User cmoore logged in.


$ *npm install aws-sdk*
>dataminerbackfiller@0.0.0 
>── aws-sdk@2.2.18  extraneous

$ *npm install*

To launch and stay resident once session ends.

$ *screen*
$ *node app.js*
CTRL-A then hit D

$ *ps -A*
25910 pts/2    00:00:00 node
