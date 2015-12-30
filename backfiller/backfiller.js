
var p4 = require('node-perforce');
var AWS = require('aws-sdk');
var fs = require('fs');
var http = require('http');


AWS.config.region = 'eu-west-1';
AWS.config.credentials = new AWS.CognitoIdentityCredentials({IdentityPoolId: 'eu-west-1:'});
var dynamodbDoc = new AWS.DynamoDB.DocumentClient();
var kRulesDataDepotPath = '//ST_Prototypes/ML/SliceOfMine/Assets/Resources/RulesData/';
var dynamoDBKeys = [];
var workingCL = null;
var lastDynamoDBExportDate = ''; // flag to store myjson polling result. 
var postlog = '';

var processActive = false;
var retryProcessTimeoutId = null;
var commitComment = '';

console.log('started backfiller...');
postlog += '<b>started backfiller...</b><br/>';

//
module.exports = {
	getlog: function() {
		return postlog;
	},

	scan: function(comment) {

		commitComment = comment;

		var d = new Date();
	
		if  (processActive === false) {
			var log = '<b>starting process....</b>' + d.toString() + '<br/>';
		
			console.log(log);
			postlog += log;

			console.log('commit comment:' + commitComment);
			postlog += 'commit comment:' + commitComment;

	  		scanDynamoDBTable();
		} else {
			if (retryProcessTimeoutId === null) {
				postlog += '<b>process failed because backfiller export was already active, retry in 20 seconds.</b>' + d.toString() + '<br/>';
				retryProcessTimeoutId = setTimeout( function() { 
						retryProcess(processActive); 
					}.bind(this),1000 * 20);
			}
		}
	    return postlog;
	  }
};


function retryProcess (isProcessActive) {
  	var d = new Date();
	
	var log = '';
	if  (isProcessActive === false) {
		log = '<b>retrying process ....<b>' + d.toString() + '<br/>';
	
		console.log(log);
		postlog += log;

  	  	scanDynamoDBTable();
  	} else {
  		log = '<b>retrying failed because process was still active.<b>' + d.toString() + '<br/>';
	
  		console.log(log);
		postlog += log;
  	}
  	retryProcessTimeoutId = null;
}

// scan dynomoDb to populate list of item key names
function scanDynamoDBTable() {

	processActive = true;
	//http://www.markomedia.com.au/dynamodb-for-javascript-cheatsheet/
	var params = {
	    TableName : 'ptownrules',
	    AttributesToGet: [ 
	        'ptownrules'
	    ]
	};

	dynamoDBKeys = [];

	dynamodbDoc.scan(params, function(err, data) {
	    if (err) {
	        postlog += 'Unable to query. Error:' + JSON.stringify(err, null, 2) + '<br/>';
	        console.log('Unable to query. Error:' + JSON.stringify(err, null, 2));
	        processActive = false;
	    } else {
	        postlog += 'Query succeeded.' + '<br/>';
	        console.log('Query succeeded.');
	        data.Items.forEach(function(item) {
	            postlog += 'item: ' + item.ptownrules + '<br/>';
	            console.log('item: ' + item.ptownrules);
	            dynamoDBKeys.push(item.ptownrules);
	        });
	        syncAll();
	    }
	});
}


// Sync all JSON rules files in p4
function syncAll() {
	var syncedFileCount = 0;
		dynamoDBKeys.forEach( function(myjsonkey) {
			p4.sync({files: [kRulesDataDepotPath+myjsonkey+'.json']}, function(err, result) {
				var hasError = false;
			  	if (err)  {

			  		var errorString = 'p4.sync error: ' + err;
			  		if (errorString.indexOf('file(s) up') === -1 &&  errorString.indexOf('no such file(s)') === -1) { //permissiable sync errors

						processActive = false;
			  			console.log('p4.sync error:' + err);
			  			postlog += 'p4.sync error:' + err + '<br/>';
			  			hasError = true;
			  		}
			  	}
			  	if (hasError === false) {
					syncedFileCount += 1;
			  	}

			  	if (syncedFileCount == dynamoDBKeys.length) {
			  		createCL();
				}
			})
		});
}

// create pending CL with all JSON rules file open in it.
function createCL() {

	workingCL = null;

	
	postlog += 'createCL ...' + '<br/>';
	console.log('createCL ...');
	var editedFileCount = 0;
	p4.changelist.create({description: '[SliceOfMine] automated rules JSON sync from AWS. ' + commitComment}, function (err, changelist) {
		if (err) {
			processActive = false;
			postlog += 'p4.changelist.create error:' + err + '<br/>';
			return console.log('p4.changelist.create:' + err);
		}
		workingCL = changelist;
		console.log('created changelist:', changelist);
		postlog += 'created changelist:' + changelist + '<br/>';

		dynamoDBKeys.forEach( function(myjsonkey) {

			var filename = kRulesDataDepotPath+myjsonkey+'.json';
				console.log('editing...' + filename);
				postlog += 'editing...' + filename + '<br/>';
				p4.edit({files: [filename]}, function(errEdit) {
					if (errEdit) { 
							
							var errString = 'error' + errEdit;
							if ( errString.indexOf('file(s) not on client') !== -1) {

								p4.add({files: [filename], changelist: changelist}, function(errAdd) {
									if (errAdd) {
										console.log('p4.add error: ' +errAdd);
										postlog += 'p4.add error: ' +errAdd + '<br/>';
										processActive = false;
									} else {
										editedFileCount += 1;
										if (editedFileCount === dynamoDBKeys.length) {
											fstatAll();
										}
									}
								});
							} else {

								processActive = false;
								console.log('p4.edit error: ' + errEdit);	
								postlog += 'p4.edit error:' +errEdit + '<br/>';	
								return;
							}
					}
					// command line example syntax: p4 reopen -c 2445 //ST_Prototypes/ML/SliceOfMine/Assets/Resources/RulesDataTest/28kay.json
					var options = { changelist : changelist, files: [filename]};
					p4.reopen( options, function (reopenErr) {
						if (reopenErr) {
							processActive = false;
							postlog += 'p4.reopen error:' + reopenErr + '<br/>';	
							return console.log('p4.reopen error:' + reopenErr);
						}
						editedFileCount += 1;
						if (editedFileCount === dynamoDBKeys.length) {
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
	postlog += 'fstatEdited' + '<br/>';	

	dynamoDBKeys.forEach( function(myjsonkey) {
		var filename = kRulesDataDepotPath+myjsonkey+'.json';
		console.log("fstating..." + filename);
		postlog += 'fstating...' + filename + '<br/>';	
	
		p4.fstat({files: [filename]}, function(err, result) {
		  	if (err) {
		  		 processActive = false;
		  		 postlog += 'fstating error: ' + err + '<br/>';	
		 	 	return console.log(err);
		 	 }
			fstats[myjsonkey] = {};
		  	fstats[myjsonkey].clientFile = result.clientFile;
		  	editedFileCount += 1;
		  	if (editedFileCount === dynamoDBKeys.length) {
		  		getJSONfromAWS( fstats);

		  	}
		});
	});
}
 
// Retrieve all JSON rules data sets from AWS. Add them to fstatsResults object.
function getJSONfromAWS(fstatResults) {
	console.log('getJSON');
	postlog += 'getJSON' + '<br/>';	

	var getItemCompletedCount = 0;
	dynamoDBKeys.forEach( function(myjsonkey) {
	 	var table = new AWS.DynamoDB({params: {TableName: 'ptownrules'}}); 
	 	var keyname =  myjsonkey;
	    table.getItem({Key: {ptownrules: {S: keyname}}}, function(err, data) {
	    	if(err) {
	    		processActive = false;
	    		postlog += 'getJSON:' + err + '<br/>';	
			 	return console.log('getJSON:' + err);
			}
			fstatResults[myjsonkey].getContent = data.Item.data.S;
	    	getItemCompletedCount ++;
	    	if (getItemCompletedCount === dynamoDBKeys.length) {	
		  		writeUpdates( fstatResults);
		  	}
	    });  
	});
}

// replace contents of local JSON rules files with content from AWS.
function writeUpdates( fstatResults) {
	postlog += 'writeUpdates' + '<br/>';
	console.log('writeUpdates');
	var writtenFileCount = 0;
	for (var property in fstatResults) {
	    if (fstatResults.hasOwnProperty(property)) {

	        fs.writeFile(fstatResults[property].clientFile, fstatResults[property].getContent, function(err) {
			    if(err) {
			    	processActive = false;
			    	postlog += 'ERROR: writeUpdates:' + err + '<br/>';
			        return console.log('ERROR: writeUpdates:' + err);
			    } else {
				    writtenFileCount += 1;
				   	if (writtenFileCount === dynamoDBKeys.length) {
			  			revertUnchangedUpdates( fstatResults);
			  		}
		  		}
			}); 
	    }
	}
}

// revert unchnged files in pending cl.
function revertUnchangedUpdates( fstatResults) {
	postlog += 'revertUnchangedUpdates' + '<br/>';
	console.log('revertUnchangedUpdates');
	var revertCalledCount= 0;
	dynamoDBKeys.forEach( function(myjsonkey) {
		var filename = kRulesDataDepotPath+myjsonkey+'.json';
		p4.revert({files: [filename], changelist: workingCL, 'unchanged' : null}, function (err) {
		  	if (err) {
		  		processActive = false;
		  		postlog += 'revertUnchangedUpdates error:' + err + '<br/>';
		  		console.log(err);
		  	}
			revertCalledCount += 1;
			if (revertCalledCount === dynamoDBKeys.length) {
				postlog += 'revertUnchangedUpdates completed' + '<br/>';
				console.log('revertUnchangedUpdates completed');
				submitUpdates( fstatResults);
			}
		});
	}); 
}

// submit cl if there are any files in it, otherwise delete it.
function submitUpdates( fstatResults) {
	p4.changelist.view({changelist: workingCL}, function (err, view) {
		if (err) {
			processActive = false;
			postlog += err + '<br/>';
			return console.log(err);
		}
		if ( view.files.length === 0) {
			p4.changelist.delete({changelist: workingCL}, function (err) {
					if (err) {
						processActive = false;
						postlog += 'changelist.delete error:' + err + '<br/>';
						console.log(err);
					}
					postlog += 'delete cl completed.' + '<br/>';
					console.log('delete cl completed.');
					processActive = false;
			});
			processActive = false;
		} else {
			p4.changelist.submit({changelist: workingCL}, function (err) {
					if (err) {
						processActive = false;
						postlog += 'changelist.submit' + err + '<br/>';
						console.log(err);
					}
					postlog += 'submit completed.' + '<br/>';
					console.log('submit completed.');
					processActive = false;
			});
			processActive = false;
		}
	});
}








