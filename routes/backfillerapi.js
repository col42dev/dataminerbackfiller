var express = require('express');
var router = express.Router();

var backfiller = require("../backfiller/backfiller.js");

/* GET users listing. */
router.get('/getlog', function(req, res, next) {
	var log = backfiller.getlog();

	var logarray = log.split('<br/>');
	logarray.reverse();

	log = logarray.join('<br/>');

  res.send(log);
});


// POST http://localhost:3000/
router.post('/process', function(req, res) {

    var comment = req.body.comment;
   	var sendMessage = 'POST message received:<br/>';
   	 sendMessage = ''+ comment + '<br/>';

   	 //console.log('comment:' + JSON.stringify(req.body));

   	backfiller.scan(comment);

    res.send(sendMessage);
});

module.exports = router;