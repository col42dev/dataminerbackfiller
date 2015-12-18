var p4 = require('node-perforce');
var AWS = require('aws-sdk');
var fs = require('fs');
var http = require('http');


AWS.config.region = 'eu-west-1';
AWS.config.credentials = new AWS.CognitoIdentityCredentials({IdentityPoolId: ''});
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
var kRulesDataDepotPath = '//ST_Prototypes/ML/SliceOfMine/Assets/Resources/RulesData/';
var myjsonkeys = ['oxtnpr4', 'omsznkc', 'o5onybx', 'oevkvmv', 'otw4nb', 'od3otrm', 'oz4n58j', 'otdvox9', 'os7bs54', 'o7sqgzj'];
var workingCL = null;
var lastDynamoDBExportDate = ''; // flag to store myjson polling result. 


console.log('started backfiller...');

// poll myjson for change in lastExportDateStamp endpoint which is updated with each dataminer export.
pollForUpdatedExport();
setInterval(function() { 
	pollForUpdatedExport();
}, 1000 * 60 * 1);


function pollForUpdatedExport() {
	
	var options = {
	  host: 'api.myjson.com',
	  port: 80,
	  path: '/bins/3ywwt?pretty=1',
	  method: 'GET',
	  headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0'}
	};

	http.request(options, function(response) {
		  var str = '';

		  response.setEncoding('utf8');

		  response.on('data', function (chunk) {
		    str += chunk;
		  });

		  response.on('error', function(e) {
  				console.log('problem with request: ' + e.message);
		  });

		  response.on('end', function () {

			  	var parsedstr = '';
			  	try {
			  		parsedstr = JSON.parse(str);
			  	} catch (ex) {
    				console.log('failed to parse str: ' + ex.message);
  				}

  				if (parsedstr !== '') {
				    if ( !parsedstr.hasOwnProperty('status')){

				    	var thisLastDynamoDBExportDate = parsedstr;
				    	//console.log('str:' + str);
				    	//console.log(lastDynamoDBExportDate + '!==' + thisLastDynamoDBExportDate.lastDynamoDBExportDate);
					    if (lastDynamoDBExportDate !== thisLastDynamoDBExportDate.lastDynamoDBExportDate) {
					    	lastDynamoDBExportDate = thisLastDynamoDBExportDate.lastDynamoDBExportDate;
					    	console.log('new export date:' + lastDynamoDBExportDate);

					    	syncAll();

					    } else {
					    	process.stdout.write('.'); // no chnage in last export data stampt
					    }
					} else {
						console.log(parsedstr); // status error
					}
				} else {
					process.stdout.write('x'); // JSON parse failed.
				}

		  });
		}
	).end();
}

// Sync all JSON rules files in p4
function syncAll() {
	var syncedFileCount = 0;
		myjsonkeys.forEach( function(myjsonkey) {
			p4.sync({files: [kRulesDataDepotPath+myjsonkey+'.json']}, function(err, result) {
			  	if (err)  console.log(err);
			  	syncedFileCount += 1;
			  	if (syncedFileCount == myjsonkeys.length) {
			  		createCL();
				}
			})
		});
}

// create pending CL with all JSON rules file open in it.
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
						fstatAll();
					}
				});
			});
		});
	});
}

// Run fstat on each JSON rules file in depot and store results
function fstatAll() {
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
		  		getJSONfromAWS( fstats);

		  	}
		});
	});
}
 
// Retrieve all JSON rules data sets from AWS. Add them to fstatsResults object.
function getJSONfromAWS(fstatResults) {
	console.log('getJSON');
	var getItemCompletedCount = 0;
	myjsonkeys.forEach( function(myjsonkey) {
	 	var table = new AWS.DynamoDB({params: {TableName: 'ptownrules'}}); 
	 	var keyname =  myjsonkey;
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

// replace contents of local JSON rules files with content from AWS.
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

// revert unchnged files in pending cl.
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

// submit cl if there are any files in it, otherwise delete it.
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








