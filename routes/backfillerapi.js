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

    //var message = req.body.message;
   	var sendMessage = 'POST message received:<br/>';

   	backfiller.scan();

    res.send(sendMessage);
});

module.exports = router;