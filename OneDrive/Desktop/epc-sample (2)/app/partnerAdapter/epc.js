/**
 * @file The epc.js file contains the class definition for the PartnerConnect class.  Each method aligns with 
 * {@link https://docs.partnerconnect.elliemae.com/partnerconnect/reference|Encompass Partner Connect RESTFUL APIs}
 * @module epc
 */
module.exports = {
	origin :
	{
		get : getOrigin
	},
	request : 
	{
		get : getRequest,
		downloadFiles : downloadRequestFiles
	},
	response : 
	{
		acknowledge : acknowledge,
		complete : complete,
		inputRequired : inputRequired,
		error : error,
		cancel : cancel
	}
}

const fs = require("fs");
const req = require("request");
const mimeTypes = require("mime-types");
const util = require("util");
const cfg = require("./config");
const adapterUtils = require("./adapterUtils");
const { epc } = require("./config");


/**
 * This function will contact Encompass Partner Connect to get the origin information.  The origin
 * information is intended to help the Partner UI render.  It is important that the Partner UI does not
 * include the loan data in the 'options' section.
 *
 * @param {string} originId The origin id that is generated in the Partner UI using the Partner JavaScript API
 * @param {string} PAT The partner access token (PAT) that is generated in the Partner UI using the Partner JavaScript API
 * @return {Promise<Origin>} Resolves to the {@link Origin} object returned from Encompass Partner Connect
 * 
 */
function getOrigin(originId, PAT)
{
	console.log("Calling the Partner Connect GET Origin Call.");
	
	return new Promise(function(resolve, reject)
	{
		var originUrl = util.format(cfg.epc.url.getOrigin, originId);
		console.log("Making GET Origin call to URL '" + originUrl + "'.");
		
		getToken().then(function(token)
		{
			console.log("Received '" + token.access_token + "' from the GET Token request.");
			
			var options = {
				
				method : "GET",
				url : originUrl,
				headers : 
				{
					"User-Agent" : cfg.http.request.userAgent,
					"Authorization" : "Bearer " + token.access_token,
					"X-Elli-PAT" : PAT
				}
			};

			adapterUtils.outputMessage("req", "adapter-get-origin", options);
			
			req(options, function(err, resp, body)
			{
				var bodyObj = {};
				
				if(body)
				{
					bodyObj = JSON.parse(body);
				}
				
				if(err)
				{
					reject({code: 500, msg : "Unexpected error receive trying to make the GET Origin call.", detail : err});
				}
				else if(resp.statusCode == 200)
				{
					adapterUtils.outputMessage("resp", "adapter-get-origin", resp);

					resolve(bodyObj);
				}
				else
				{
					adapterUtils.outputMessage("resp", "adapter-get-origin", resp);

					reject({code: 502, msg : "Received HTTP code '" + resp.statusCode + "' making the GET Origin call.", detail : bodyObj});
				}
			});
			
		}).catch(function(err)
		{
			if(err.respCode)
			{
				reject({code: 502, msg : "Received HTTP code '" + err.respCode + "' trying to get the token.", detail: err.respCode});
			}
			else
			{
				reject({code: 500, msg : "Unknown error received trying to get the token.", detail : err});
			}
		});
	});
}


//=================================================================================================
//=================================================================================================
//
//  GET Request functions
//
//=================================================================================================
//=================================================================================================

function getRequest(reqUrl)
{
	console.log("Calling the Partner Connect GET Request Call.");
	
	return new Promise(function(resolve, reject)
	{
		console.log("Making GET Request call to URL '" + reqUrl + "'.");
		
		getToken().then(function(token)
		{
			console.log("Received '" + token.access_token + "' from the GET Token request.");
			
			var options = {
				
				method : "GET",
				url : reqUrl,
				headers : 
				{
					"User-Agent" : cfg.http.request.userAgent,
					"Authorization" : "Bearer " + token.access_token,
				}
			};

			adapterUtils.outputMessage("req", "adapter-get-request", options);
			
			req(options, function(err, resp, body)
			{
				var bodyObj = {};
				
				if(body)
				{
					bodyObj = JSON.parse(body);
				}
				
				if(err)
				{
					reject({code: 500, msg : "Unexpected error receive trying to make the GET Request call.", detail : err});
				}
				else if(resp.statusCode == 200)
				{
					adapterUtils.outputMessage("resp", "adapter-get-request", resp);

					resolve(bodyObj);
				}
				else
				{
					adapterUtils.outputMessage("resp", "adapter-get-request", resp);

					reject({code: 502, msg : "Received HTTP code '" + resp.statusCode + "' making the GET Request call.", detail : bodyObj});
				}
			});
			
		}).catch(function(err)
		{
			if(err.respCode)
			{
				reject({code: 502, msg : "Received HTTP code '" + err.respCode + "' trying to get the token.", detail: err.respCode});
			}
			else
			{
				reject({code: 500, msg : "Unexpected error received trying to get the token.", detail : err});
			}
		});
	});
}

function downloadRequestFiles(reqId)
{
	console.log("Calling the Partner Connect GET Request Reources Call.");

	return new Promise(function(resolve, reject)
	{
		var reqUrl = util.format(cfg.epc.url.getResources, reqId);
		console.log("Making GET Request Resource call to URL '" + reqUrl + "'.");

		getToken().then(function(token)
		{
			console.log("Received '" + token.access_token + "' from the GET Token request.");
	
			var options =
			{
				method : "GET",
				url : reqUrl,
				headers : 
				{
					"User-Agent" : cfg.http.request.userAgent,
					"Authorization" : "Bearer " + token,
				}
			};

			adapterUtils.outputMessage("req", "adapter-get-request-resource", options);
				
			req(options, function(err, resp, body)
			{
				var bodyObj = [];
				
				if(body)
				{
					bodyObj = JSON.parse(body);
				}
				
				if(err)
				{
					reject({code: 500, msg : "Unexpected error receive trying to make the GET Request call.", detail : err});
				}
				else if(resp.statusCode == 200)
				{
					adapterUtils.outputMessage("resp", "adapter-get-request-resource", resp);
	
					if(bodyObj && bodyObj instanceof Array)
					{
						var retVal = [];
	
						if(bodyObj.length === 0)
						{
							console.log("No files sent from the lender to download.");
						}
						else
						{
							for(var idx = 0 ; idx < bodyObj.length ; idx++)
							{
								var curResourceObj = bodyObj[idx];

								downloadFile(reqId, curResourceObj).then(function(localFilename)
								{
									retVal.push({
										id : curResourceObj.id,
										name : curResourceObj.name,
										mimeType : curResourceObj.mimeType,
										localFile : localFilename
									});

								}).catch(function(err)
								{
									console.log(`Error transfering file '${curResourceObj.name}'.  Not adding to the return value list`);
								});
							}
						}

						resolve(retVal);
					}
					else
					{
						reject({code: 502, msg : "Received HTTP code '" + resp.statusCode + "' making the GET Request call.", detail : bodyObj});
					}
				}
				else
				{
					adapterUtils.outputMessage("resp", "adapter-get-request-resource", resp);
	
					reject({code: 502, msg : "Received HTTP code '" + resp.statusCode + "' making the GET Request call.", detail : bodyObj});
				}
			});
			
		}).catch(function(err)
		{
			if(err.respCode)
			{
				reject({code: 502, msg : "Received HTTP code '" + err.respCode + "' trying to get the token.", detail: err.respCode});
			}
			else
			{
				reject({code: 500, msg : "Unknown error received trying to get the token.", detail : err});
			}
		});
	});
}

function downloadFile(reqId, resourceObj)
{
	return new Promise(function(resolve, result)
	{
		console.log(`Downloading file '${resourceObj.name}' with id '${resourceObj.id}'.`);

		var filename = util.format(cfg.adapter.request.downloadFile, reqId, resourceObj.name);

		let file = fs.createWriteStream(filename);

		var options =
		{
			method : "GET",
			uri : resourceObj.url,
			headers :
			{
				"User-Agent" : cfg.http.request.userAgent,
			}
		};

		req(options)
		.pipe(file)
		.on('finish', function()
		{
			console.log(`The file is finished downloading.`);
			resolve(filename);

		})
		.on('error', function(error)
		{
			var msg = `Error encountered trying to download '${resourceObj.name}'`;
			console.log(msg);
			console.log(error);

			reject({code : 500, msg : msg, detail : error});

		});
	});
}

//=================================================================================================
//=================================================================================================
//
//  PATCH Response functions
//
//=================================================================================================
//=================================================================================================

function acknowledge(reqId, orderNumber)
{
	console.log(`Received request to acknowledge request '${reqId}'`);

	return new Promise(function(resolve, reject)
	{
		var respMsg = buildBasePatchResponseMessage(epc.status.processing, cfg.order.status.acknowledged, orderNumber);

		patchResponse(reqId, respMsg).then(function(patchResult)
		{
			resolve(patchResult);

		}).catch(function(err)
		{
			reject(err);

		});
		
	});
}

function complete(reqId, orderNumber)
{
	console.log(`Received request to complete request '${reqId}'`);

	return new Promise(function(resolve, reject)
	{
		var ordersDir = util.format(cfg.adapter.ordersDir, orderNumber);

		fs.access(ordersDir, function(err)
		{
			if(err)
			{
				console.log(`The working directory ${ordersDir} is not accessible.  This is typically due to the directory does not exist.`);
			}
			else
			{
				var respMsg = buildBasePatchResponseMessage(epc.status.completed, cfg.order.status.completed, orderNumber);

				var filesDir = util.format(cfg.adapter.response.fileDir, ordersDir);

				fs.access(filesDir, function(err)
				{
					if(err)
					{
						console.log(`Not adding response files to complete the request.  The response files directory ${filesDir} is not accessible.  This is typically due to the directory does not exist.`);
					}
					else
					{
						sendResponseFiles(reqId, filesDir);
					}
				});

				var loanFile = util.format(cfg.adapter.response.loanFile, ordersDir);

				fs.access(loanFile, function(err)
				{
					if(err)
					{
						console.log(`Not adding response files to complete the request.  The loan file ${ordersDir} is not accessible.  This is typically due to the file does not exist.`);
					}
					else
					{
						var rawLoan = fs.readFileSync(loanFile);

						if(rawLoan)
						{
							try
							{
								var loan = JSON.parse(rawLoan);
								respMsg.loanFormat = cfg.epc.loanFormat;
								respMsg.loan = loan;
							}
							catch(exp)
							{
								var msg = `Received an exception trying to parse the '${loanFile}' contents.`;
								console.log(msg);
								console.log(exp);
								reject({code: 500, msg : msg, detail : exp});
							}
						}
					}
				});
			}
		});
	});
}

function cancel(reqId, orderNumber)
{
	console.log(`Received request to cancel request '${reqId}'`);

	return new Promise(function(resolve, reject)
	{
		var respMsg = buildBasePatchResponseMessage(epc.status.canceled, cfg.order.status.canceled, orderNumber);

		patchResponse(reqId, respMsg).then(function(patchResult)
		{
			resolve(patchResult);

		}).catch(function(err)
		{
			reject(err);

		});
		
	});
}

function inputRequired(reqId, orderNumber, missingFieldList)
{
	console.log(`Received request to communicate data validation failed for request '${reqId}'`);

	return new Promise(function(resolve, reject)
	{
		var respMsg = buildBasePatchResponseMessage(epc.status.inputRequired, cfg.order.status.dataNeeded, orderNumber);
	
		respMsg.inputRequired = [missingFieldList];

		patchResponse(reqId, errMsg).then(function(patchResult)
		{
			resolve(patchResult);

		}).catch(function(err)
		{
			reject(err);

		});
	});
}

function error(reqId, errCode, errDesc, orderNumber)
{
	console.log(`Received request to communicate an error for request '${reqId}'`);

	return new Promise(function(resolve, reject)
	{
		var respMsg = buildBasePatchResponseMessage(epc.status.error, cfg.order.status.error, orderNumber);

		respMsg.errors = [{
			code : errCode,
			type : "system",
			description : errDesc,
			resourceId : "TRANSACTION"
		}];

		patchResponse(reqId, respMsg).then(function(patchResult)
		{
			resolve(patchResult);

		}).catch(function(err)
		{
			reject(err);

		});
	});
}

function buildBasePatchResponseMessage(epcStatus, orderStatus, orderNumber)
{
	var respMsg =
	{
		status : epcStatus,
		partnerStatus : orderStatus,
		respondingParty : cfg.adapter.response.respondingParty
	};

	if(orderNumber)
	{
		respMsg.referenceNumber = orderNumber;
	}

	return respMsg;
}

function patchResponse(reqId, responseMsg)
{
	console.log("Calling the Partner Connect PATCH Response Call.");
	
	return new Promise(function(resolve, reject)
	{
		var reqUrl = util.format(cfg.epc.url.patchResponse, reqId);
		console.log("Making PATCH Response call to URL '" + reqUrl + "'.");
		
		getToken().then(function(token)
		{
			console.log("Received '" + token.access_token + "' from the GET Token request.");
			
			var options = {
				
				method : "PATCH",
				url : reqUrl,
				headers : 
				{
					"User-Agent" : cfg.http.request.userAgent,
					"Authorization" : "Bearer " + token.access_token,
				},
				json : responseMsg
			};

			adapterUtils.outputMessage("req", "adapter-patch-response", options);
			
			req(options, function(err, resp, body)
			{
				var bodyObj = {};
				
				if(body)
				{
					bodyObj = JSON.parse(body);
				}
				
				if(err)
				{
					reject({code: 500, msg : "Unexpected error receive trying to make the GET Request call.", detail : err});
				}
				else if(resp.statusCode == 204)
				{
					adapterUtils.outputMessage("resp", "adapter-patch-response", resp);

					resolve(bodyObj);
				}
				else
				{
					adapterUtils.outputMessage("resp", "adapter-patch-response", resp);

					reject({code: 502, msg : "Received HTTP code '" + resp.statusCode + "' making the GET Request call.", detail : bodyObj});
				}
			});
			
		}).catch(function(err)
		{
			if(err.respCode)
			{
				reject({code: 502, msg : "Received HTTP code '" + err.respCode + "' trying to get the token.", detail: err.respCode});
			}
			else
			{
				reject({code: 500, msg : "Unexpected error received trying to get the token.", detail : err});
			}

		});
	});
}

function sendResponseFiles(reqId, respFilesDir)
{
	return new Promise(function(resolve, reject)
	{
		console.log(`Received call to send files found in ${respFilesDir}`);

		fs.readdir(respFilesDir, function(err, localFilesList)
		{
			if(err)
			{
				console.log(`Error received trying to get the list of files in '${respFilesDir}'`);
				reject(err);
			}
			else if(localFilesList && localFilesList.length > 0)
			{
				console.log(`Sending ${localFilesList.length} response file.`);
				var epcFileList = [];

				for(var idx = 0 ; idx < curFile.length ; idx++)
				{
					var curFile = localFilesList[idx];

					var mimeType = mimeTypes.lookup(curFile);

					epcFileList.push({
						name : curFile,
						mimeType : mimeType
					});
				}

				uploadFiles(localFilesList, epcFileList).then(function(uploadedFileList)
				{
					if(uploadedFileList && uploadedFileList.length > 0)
					{
						resolve(uploadedFileList);

					}
					else
					{
						resolve([]);

					}

				}).catch(function(err)
				{
					console.log("Received error uploading files.");
					console.log(err);
					reject(err);

				});
			}
			else
			{
				console.lop();

				resolve([]);
			}
		});

	});

}

function uploadFiles(localFilesList, epcFileList)
{
	return new Promise(function(resolve, reject)
	{
		console.log(`Uploading ${epcFileList.length} files.`);

		getToken().then(function(token)
		{
			console.log(`Received '${token.access_token}' from the GET Token request.`);

			var reqUrl = util.format(cfg.epc.url.sendResource, reqId);
			
			var options = {
				
				method : "POST",
				url : reqUrl,
				headers : 
				{
					"User-Agent" : cfg.http.request.userAgent,
					"Authorization" : "Bearer " + token.access_token,
				},
				json : epcFileList
			};

			adapterUtils.outputMessage("req", "adapter-post-resource", options);
			
			req(options, function(err, resp, body)
			{
				var bodyObj = [];
				
				if(body)
				{
					bodyObj = JSON.parse(body);
				}
				
				if(err)
				{
					reject({code: 500, msg : "Unexpected error receive trying to make the POST Request Resource call.", detail : err});
				}
				else if(resp.statusCode == 200)
				{
					adapterUtils.outputMessage("resp", "adapter-post-resource", resp);

					epcResourceFiles = [];

					for(var idx = 0 ; idx < resp.length ; idx++)
					{
						var curEpcFile = resp[idx];
						var curLocalFile = localFilesList[idx];

						var fileOptions = {

							method : "POST",
							url : curEpcFile.url,
							formData :
							{
								file : fs.createReadStream(curLocalFile),
								filetype : curEpcFile.mimeType,
								filename : curEpcFile.name
							}
						};
						
						req(fileOptions, function(err, resp, body)
						{
							var fileBodyObject = {};
							
							if(body)
							{
								fileBodyObject = JSON.parse(body);
							}
							
							if(err)
							{
								reject({code: 500, msg : "Unexpected error receive trying to make the POST Resource Response call.", detail : err});
							}
							else if(resp.statusCode == 200)
							{
								adapterUtils.outputMessage("resp", "adapter-post-response-resource", resp);

								epcResourceFiles.push({

									id : curEpcFile.id,
									name : curEpcFile.name,
									mimeType : curEpcFile.mimeType
								});
							}
							else
							{
								adapterUtils.outputMessage("resp", "adapter-post-response-resource", resp);

								reject({code: 502, msg : "Received HTTP code '" + resp.statusCode + "' making the POST Resource Response call.", detail : bodyObj});
							}
						});
					}

					resolve(epcResourceFiles);
				}
				else
				{
					adapterUtils.outputMessage("resp", "adapter-post-resource", resp);

					reject({code: 502, msg : "Received HTTP code '" + resp.statusCode + "' making the GET Request call.", detail : bodyObj});
				}
			});
			
		}).catch(function(err)
		{
			if(err.respCode)
			{
				reject({code: 502, msg : "Received HTTP code '" + err.respCode + "' trying to get the token.", detail: err.respCode});
			}
			else
			{
				reject({code: 500, msg : "Unexpected error received trying to get the token.", detail : err});
			}
		});
	});
}

//=================================================================================================
//=================================================================================================
//
//  utility functions
//
//=================================================================================================
//=================================================================================================

function getToken()
{
	return new Promise(function(resolve, reject)
	{
		console.log("Making GET Token request.");
		
		var options = {
			
			method : "POST",
			url : cfg.epc.url.getToken,
			headers : 
			{
				"User-Agent" : cfg.http.request.userAgent,
			},
			form :
			{
				grant_type : "client_credentials",
				client_id : cfg.epc.clientId,
				client_secret : cfg.epc.clientSecret,
				scope : "pc pcapi"
			}
		};
		
		req(options, function(err, resp, body)
		{
			var bodyObj = {};
			
			if(body)
			{
				bodyObj = JSON.parse(body);
			}
				
			if(err)
			{
				console.log("The GET Token request resulted in an unknown error.");
				
				reject(err);
			}
			else if(resp.statusCode == 200)
			{
				console.log("The GET Token resquest resulted in a 200 response.");

				adapterUtils.outputMessage("resp", "adapter-get-token", resp);

				resolve(bodyObj);
			}
			else
			{
				console.log("The GET Token resquest resulted in a '" + resp.statusCode + "' response.");
				
				adapterUtils.outputMessage("resp", "adapter-get-token", resp);

				reject({respCode: resp.statusCode, respDetail: bodyObj});
			}
		});
	});
}

/**
 * @typedef {object} Origin The Origin object is returned from Encompass Partner Connect.  This type definition summarizes the properties of the Origin object.
 * @property {string} id Contains the ID that was used to get the origin object.  This ID will be provided to the Partner UI leveraging the Partner JavaScript API
 * @property {object} entityRef An object that contains the information to understand what object the origin refers
 * @property {string} loanFormat Contains how the loan object is formatted
 * @property {object} loan [Partner Product Config] An object that contains the loan information as allowed in the the partner product's data entitlement
 * @property {string} interfaceUrl [Partner Product Config] Constains the Partner UI location.  This is configured in the partner product.
 * @property {object} product [Partner Product Config] An object that summarizes which partner product.
 * @property {object} credentials [Partner Product Config] An object that contains the user credentials.  The structure is defined in the partner product
 * @property {string} environment [Partner Product Config] Contains if the Partner UI is loading in a 'sandbox' or 'production' partner product
 * @property {object} originatingParty An object that contains information about the lender loading the Partner UI
 */