var p4 = require('node-perforce');
var AWS = require('aws-sdk');
var fs = require('fs');



AWS.config.region = 'eu-west-1';
AWS.config.credentials = new AWS.CognitoIdentityCredentials({IdentityPoolId: ''});
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
var kRulesDataDepotPath = '//ST_Prototypes/ML/SliceOfMine/Assets/Resources/RulesData/';
var myjsonkeys = ['51viy', '1a9rm', '1184a', '4rrxs', '4xb60', '339pe', '22cm6', '2hewe', '28kay', '457gd'];
var workingCL = null;


console.log('started backfiller...');

function update() {
	var syncedFileCount = 0;
		myjsonkeys.forEach( function(myjsonkey) {
			p4.sync({files: [kRulesDataDepotPath+myjsonkey+'.json']}, function(err, result) {
			  	//if (err) return console.log(err);
			  	syncedFileCount += 1;
			  	if (syncedFileCount == myjsonkeys.length) {
			  		createCL();
				}
			})
		});
}

function createCL() {

	workingCL = null;

	console.log('updating ...');
	var editedFileCount = 0;
	p4.changelist.create({description: '[SliceOfMine] automated rules JSON sync from AWS'}, function (err, changelist) {
		if (err) return console.log(err);
		workingCL = changelist;
		console.log('created changelist:', changelist);
		myjsonkeys.forEach( function(myjsonkey) {
			var filename = kRulesDataDepotPath+myjsonkey+'.json';
			console.log("editing..." + filename);
			p4.edit({files: [filename]}, function(err) {
				if (err) return console.log(err);
				// command line example syntax: p4 reopen -c 2445 //ST_Prototypes/ML/SliceOfMine/Assets/Resources/RulesDataTest/28kay.json
				var options = { changelist : changelist, files: [filename]};
				p4.reopen( options, function (reopenErr) {
					if (reopenErr) return console.log(reopenErr);
					editedFileCount += 1;
					if (editedFileCount === myjsonkeys.length) {
						fstatEdited();
					}
				});
			});
		});
	});
}

function fstatEdited() {
	var fstats = {};
	var editedFileCount = 0;
	console.log('fstatEdited');
	myjsonkeys.forEach( function(myjsonkey) {
		var filename = kRulesDataDepotPath+myjsonkey+'.json';
		console.log("fstating..." + filename);
		p4.fstat({files: [filename]}, function(err, result) {
		  if (err) return console.log(err);
			fstats[myjsonkey] = {};
		  	fstats[myjsonkey].clientFile = result.clientFile;
		  	editedFileCount += 1;
		  	if (editedFileCount === myjsonkeys.length) {
		  		getJSON( fstats);
		  	}
		});
	});
}
 

function getJSON(fstatResults) {
	console.log('getJSON');
	var getItemCompletedCount = 0;
	myjsonkeys.forEach( function(myjsonkey) {
	 	var table = new AWS.DynamoDB({params: {TableName: 'ptownrules'}}); 
	 	var keyname =  'https://api.myjson.com/bins/'+myjsonkey+'?pretty=1';
	    table.getItem({Key: {ptownrules: {S: keyname}}}, function(err, data) {
	    	if(err) {
			 	return console.log('getJSON:' + err);
			}
			fstatResults[myjsonkey].getContent = data.Item.data.S;
	    	getItemCompletedCount ++;
	    	if (getItemCompletedCount === myjsonkeys.length) {
		  		writeUpdates( fstatResults);
		  	}
	    });  
	});
}


function writeUpdates( fstatResults) {
	console.log('writeUpdates');
	var writtenFileCount = 0;
	for (var property in fstatResults) {
	    if (fstatResults.hasOwnProperty(property)) {
	        //fstatResults[property]
	        fs.writeFile(fstatResults[property].clientFile, fstatResults[property].getContent, function(err) {
			    if(err) {
			        return console.log(err);
			    }
			    writtenFileCount += 1;
			   	if (writtenFileCount === myjsonkeys.length) {
		  			revertUnchangedUpdates( fstatResults);
		  		}
			}); 
	    }
	}
}


function revertUnchangedUpdates( fstatResults) {
	console.log('revertUnchangedUpdates');
	var revertCalledCount= 0;
	myjsonkeys.forEach( function(myjsonkey) {
		var filename = kRulesDataDepotPath+myjsonkey+'.json';
		p4.revert({files: [filename], changelist: workingCL, 'unchanged' : null}, function (err) {
		  	if (err) console.log(err);
			revertCalledCount += 1;
			if (revertCalledCount === myjsonkeys.length) {
				console.log('revertUnchangedUpdates completed');
				submitUpdates( fstatResults);
			}
		});
	}); 
}

function submitUpdates( fstatResults) {
	console.log('submitUpdates');
	p4.changelist.view({changelist: workingCL}, function (err, view) {
		if (err) return console.log(err);
		if ( view.files.length === 0) {
				p4.changelist.delete({changelist: workingCL}, function (err) {
					if (err) console.log(err);
					console.log('delete cl completed.');
			});
		} else {
				p4.changelist.submit({changelist: workingCL}, function (err) {
					if (err) console.log(err);
					console.log('submit completed.');
			});
		}
	});
}


// poll AWS for changes every 5 minutes.
update();


setInterval(function() { 
 	update();
}, 1000 * 60 * 5);




