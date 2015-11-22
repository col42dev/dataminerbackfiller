var express = require('express');
var router = express.Router();
var p4 = require('node-perforce');

console.log('view cl');


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;

// create a new changelist 
/*
p4.changelist.create({description: 'hello world'}, function (err, changelist) {
  if (err) return console.log(err);
  console.log('changelist:', changelist);
});*/


console.log('view cl');
p4.changelist.view({changelist: 1535}, function (err, view) {
  if (err) return console.log(err);
  console.log(view);
});