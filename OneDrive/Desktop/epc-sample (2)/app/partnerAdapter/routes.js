module.exports = configureAdapterRoutes

/**
 * @file This file contains the Partner Adapter's routes.  Each route is an endpoint
 * that will be used by a client to interact with the Partner Adapter.
 * <ul>
 * <li>Functions that start with <code>handleUI</code> are intended to be called by the 
 * Partner UI.  The Partner UI will use {@link https://www.w3schools.com/js/js_ajax_intro.asp|AJAX}
 * to make Partner Adapter requests.</li>
 * <li>Functions that start with <code>handleEPC</code> are intended to be called by Encompass
 * Partner Connect.  The route will be configured as part of the Partner Product configuration.</li>
 * </ul>
 * 
 * @module {function} routes
 */
 

const cfg = require("./config");
const epc = require("./epc");
const db = require("./db");
const adapterUtils = require("./adapterUtils");

const VALID_TOKEN_DURATION = 60 * 60 * 1000;  // token will be valid for 1 hour.

/**
 *  The function configures the routes the adapter supports.  Both the
 *  Partner UI and Encompass Partner Connect will communicate to the Partner 
 *  Adapter using the routes configured in this function.
 */
function configureAdapterRoutes(app, dbClient)
{
	console.log('Configuring the Partner Adapter server routes');
	
	var partnerDb = dbClient.db('partner');
	
	app.get('/ui', function(req, resp)
	{
		handleUIGetUIRequest(req, resp, partnerDb);
	});
	
	app.get('/progress', function(req, resp)
	{
		handleUIGetRequestProgressRequest(req, resp, partnerDb);
	});
	
	app.post('/request', function(req, resp)
	{
		handleEPCRequestNotification(req, resp, partnerDb);
	});
	
	app.post('/event', function(req, resp)
	{
		handleEPCEventNotification(req, resp, partnerDb);
	});
};

//=================================================================================================
//=================================================================================================
//
//  GET UI functions
//
//=================================================================================================
//=================================================================================================

/**
 * The Partner UI will contact the adapter while loading.  The response will be the list of products,
 * a list of orders for the loan, and all the origin information.
 * 
 * @param {*} req 
 * @param {*} resp 
 * @param {*} partnerDb 
 */
function handleUIGetUIRequest(req, resp, partnerDb)
{
	console.log('Handling the interface loading request.');

	adapterUtils.outputRequest("rcv", "ui-get-ui", req);
	
	if(req.query.oid && req.query.pat)
	{
		// this object will be returned to the UI.  The remainer of this function will
		// will populate each property.
		var uiInfo = 
		{
			products: [],
			orderHistory: [],
			origin: {},
			user: {}
		};
		
		db.products.getAll(partnerDb).then(function(productList)
		{
			uiInfo.products = productList;
			
			epc.origin.get(req.query.oid, req.query.pat).then(function(theOrigin)
			{
				if(theOrigin.credentials && theOrigin.credentials.username && theOrigin.credentials.password)
				{
					authenticateUser(partnerDb, theOrigin.credentials.username, theOrigin.credentials.password).then(function(authUser)
					{
						if(adapterUtils.isNullOrEmpty(authUser))
						{
							resp.json({code: 401, msg : "Not authorized to load the Partner UI", detail : "The authenticate user function returned an object that is not set or empty."});
						}
						else
						{
							// clear the password before being returned.
							theOrigin.credentials.password = "<<masked>>";
							
							delete authUser.pwd;
							uiInfo.origin = theOrigin;
							uiInfo.user = authUser;
							
							var loanGuid = adapterUtils.extractLoanGuid(uiInfo.origin.entityRef);
							
							db.orders.findByLoanGuid(partnerDb, loanGuid).then(function(result)
							{
								uiInfo.orderHistory = result;

								uiInfo.selectedOrder = getSelectedOrder(result, req.query.rid);

								// This solution just returns all the order detail for brevity.  In a real solution,
								// the order history should be summarized to just the information needed by the Partner UI
								// to render.

								adapterUtils.outputMessage("ret", "ui-get-ui", uiInfo);
							
								resp.json(uiInfo);
							
							}).catch(function(err)
							{
								var message = "Error getting the list of orders placed with loan guid '" + loanGuid + "' (entityId='" + entityId + "')."
								resp.statusCode = 500;
								resp.json({code: 500, msg : message, detail : err});
							});
						}
						
					}).catch(function(err)
					{
						resp.statusCode = 401;
						resp.json({code: 401, msg : "Not authorized to load the Partner UI", detail : "Checking the username and password responded with an error code '" + err + "'"});

					});
					
				}
				else
				{
					resp.statusCode = 401;
					resp.json({code: 401, msg : "Not authorized to load the Partner UI", detail : "The GET Origin response is missing the credentials information."});
				}
				
			}).catch(function(err)
			{
				var message = "Error getting the origin."
				console.log(message);
				console.log(err);
				
				if(err.code)
				{
					resp.statusCode = err.code;
					resp.json(err);
				}
				else
				{
					resp.statusCode = 500;
					resp.json({code: 500, msg : message, detail : err});
				}
			});
			
		}).catch(function(err)
		{
			var message = "Error getting the list of available products."
			console.log(message);
			console.log(err);
			resp.statusCode = 500;
			resp.json({code: 500, msg : message, detail : err});

		});
		
	}
	else
	{
		var msg = "Unable to return the UI information because the request is missing ";
		
		if(!req.query.oid && !req.query.pat)
		{
			msg = msg + " both the origin ID and PAT query parameters."
		}
		else if(!req.query.oid)
		{
			msg = msg + " the origin ID query parameters."
		}
		else
		{
			msg = msg + " the PAT query parameters."
		}
		
		resp.statusCode = 400;
		
		resp.send(msg);
	}
}

function getSelectedOrder(orderList, trxId)
{
	var retVal = {};

	if(trxId)
	{
		if(orderList && orderList instanceof Array && orderList.length > 0)
		{
			for(var ordIdx = 0 ; ordIdx < orderList.length ; ordIdx++)
			{
				var currOrder = orderList[ordIdx];

				if(currOrder.latestTrxId === trxId)
				{
					retVal = currOrder;
					console.log(`Found order '${currOrder._id}' associated to the latest transaction '${trxId}'`);
					break;
				}
				else
				{
					if(currOrder.trxIds && currOrder.trxIds instanceof Array && currOrder.trxIds.length > 0)
					{
						for(var trxIdIdx = 0 ; trxIdIdx < currOrder.trxIds.length ; trxIdIdx++)
						{
							if(currOrder.trxIds[trxIdIdx] === trxId)
							{
								retVal = currOrder;
								console.log(`Found order '${currOrder._id}' related to transaction '${trxId}'`);
								break;
							}
						}
					}
					else
					{
						if(currOrder.trxIds)
						{
							if(currOrder.trxIds instanceof Array)
							{
								console.log("No transaction IDs found. The trxIds property is empty.");
							}
							else
							{
								console.log("No transaction IDs found. The trxIds property is not an Array.");
							}
						}
						else
						{
							console.log("No transaction IDs found. The trxIds property is not set.");
						}
					}
				}
			}
		}
		else
		{
			if(orderList)
			{
				if(orderList instanceof Array)
				{
					console.log("No order to select.  The order list parameter is empty.");
				}
				else
				{
					console.log("No order to select.  The order list parameter is not an Array.");
				}
			}
			else
			{
				console.log("No order to select.  The order list parameter is not set.");
			}
		}
	}
	else
	{
		console.log("No order selected.  No transaction ID provided.");
	}

	return retVal;
}

//=================================================================================================
//=================================================================================================
//
//  GET Request status functions
//
//=================================================================================================
//=================================================================================================

/**
 * 
 * @param {*} req 
 * @param {*} resp 
 * @param {*} partnerDb 
 */
function handleUIGetRequestProgressRequest(req, resp, partnerDb)
{
	console.log('Handling the interface check progress request.');

	adapterUtils.outputRequest("rcv", "ui-get-progress", req);

	if(req.query.oid && req.query.pat && req.query.trxid)
	{
		epc.getOrigin(req.query.oid, req.query.pat).then(function(theOrigin)
		{
			if(adapterUtils.isNullOrEmpty(theOrigin))
			{
				resp.statusCode = 401;
				resp.json({code: 401, msg : "Not authorized to check the status of a request from the Partner UI", detail : "The request for the origin information resulted in an empty object."});
			}
			else if(theOrigin.credentials && theOrigin.credentials.username && theOrigin.credentials.password)
			{
				authenticateUser(partnerDb, theOrigin.credentials.username, theOrigin.credentials.password).then(function(authResult)
				{
					db.orders.findOrderByTransactionId(partnerDb, req.query.trxid).then(function(order)
					{
						if(adapterUtils.isNullOrEmpty(order))
						{
							resp.statusCode = 404
							resp.json({code : 404, msg : "No order is found with '" + req.query.trxid + "' as the ", detail : ""})
						}
						else
						{
							resp.json({code : 200 , order : order});
						}
						
					}).catch(function(err)
					{
						var message = "Error getting the orders associated to request id '" + req.query.trxid + "'.";
						resp.statusCode = 500;
						resp.json({code: 500, msg : message, detail : err});
					});
					
				}).catch(function(err)
				{
					resp.statusCode = 401;
					resp.json({code: 401, msg : "Not authorized to load the Partner UI", detail : "Checking the username and password responded with an error code '" + err + "'"});
				});
			}
			else
			{
				resp.statusCode = 401;
				resp.json({code: 401, msg : "Not authorized to check the status of a request from the Partner UI", detail : "The origin information is missing the credentials information.  Confirm the setup is complete."});
			}
			
		}).catch(function(err)
		{
			var message = "Error getting the origin."
			
			if(err.respCode)
			{
				if(err.respCode == 401)
				{
					resp.statusCode = 502;
					resp.json({code: 502, msg : "Not authorized to make the GET Origin request", detail : err.respDetail});
				}
				else
				{
					var message = "An unexpected error occurred making the GET Origin request."
					resp.statusCode = 500;
					resp.json({msg : message, error : err});
				}
			}
			else
			{
				resp.statusCode = 500;
				resp.json({code: 500, msg : message, detail : err});
			}
		});
	}
	else
	{
		resp.statusCode = 400;
		
		resp.json({code : 400, msg : "Missing request information to check the progress of an order", detail : "The Partner UI must include the transaction id, origin id, and the PAT."});
	}
}

//=================================================================================================
//=================================================================================================
//
//  Handle request notification functions
//
//=================================================================================================
//=================================================================================================

/**
 * This function is the entry point for all EPC 'transaction' notifications.  This function validates
 * the notification data, gets the request, authenticates the credentials on the request, and then 
 * sends it to the appropriate notification type handler.
 * 
 * @param {*} req 
 * @param {*} resp 
 * @param {*} partnerDb 
 */
function handleEPCRequestNotification(req, resp, partnerDb)
{
	console.log("Handling a request notification");
	adapterUtils.outputRequest("rcv", "epc-request-notify", req);
	
	if(adapterUtils.isValidEPCNotification(req.body, cfg.epc.notification.eventType.createValue, cfg.epc.notification.resourceType.transactionValue) ||
		adapterUtils.isValidEPCNotification(req.body, cfg.epc.notification.eventType.updateValue, cfg.epc.notification.resourceType.transactionValue)   )
	{
		var reqId = req.body.meta.resourceId;
		var resourceRef = req.body.meta.resourceRef;
		var notificationType = req.body.eventType;
		
		epc.request.get(resourceRef).then(function(theRequest)
		{
			// at this point, we should always return a 200 to the webhook emitter.
			// Since we can get the request, it is now "owned" by the partner and 
			// should start communicating status to the Lender via the EPC PATCH
			// response method
			resp.json({code: 200, msg: "Downloaded request starting to process", detail: `The Partner Adapter has received request '${reqId}' and will start processing the request.`});

			if(adapterUtils.isNullOrEmpty(theRequest))
			{
				var msg = "Trying to download request '" + reqId + "' resulted in an empty object.";

				epc.response.error(reqId, 401, msg);
			}
			else if(theRequest.request.credentials && theRequest.request.credentials.username && theRequest.request.credentials.password)
			{
				authenticateUser(partnerDb, theRequest.request.credentials.username, theRequest.request.credentials.password).then(function(authUser)
				{
					if(notificationType === cfg.epc.notification.eventType.createValue)
					{
						processCreateNotification(partnerDb, req.body, theRequest).then(function(orderObject)
						{
							console.log("Create notification for reqest '" + reqId + "' processed on order '" + orderObject._id + "'.");

							epc.response.acknowledge(reqId, orderObject._id);
	
						}).catch(function(err)
						{
							var msg = `Received an error trying to process the create notification for request '${reqId}'.`;
							console.log(msg);
							console.log(err);
							epc.response.error(reqId, 500, msg);
	
						});
					}
					else
					{
						console.log("Starting the update request process");
						processUpdateNotification(partnerDb, req.body, theRequest).then(function(orderObject)
						{
							console.log("Update notification for reqest '" + reqId + "' processed on order '" + orderObject._id + "'.");

							epc.response.acknowledge(reqId, orderObject._id);
		
						}).catch(function(err)
						{
							var msg = `Received an error trying to process the update notification for request '${reqId}'.`;
							console.log(msg);
							console.log(err);
							epc.response.error(reqId, 500, msg);

						});
					}

				}).catch(function(err)
				{
					console.log("Error received trying to authenticate the user.");
					console.log(err);

					var errCode = 500;
					var errDesc = JSON.stringify(err);

					if(err.code && err.code === 401)
					{
						errCode = 401;
					}

					epc.response.error(reqId, errCode, errDesc);

				});
			}
			else
			{
				var msg = "Request '" + reqId + "' is missing the credential information.  Unable to valid.";
				console.log(msg);
				console.log(err);

				epc.response.error(reqId, 401, msg);
			}
			
		}).catch(function(err)
		{
			// since we have yet to download the request, respond with an error HTTP response to the webhook emitter
			console.log("Getting the request failed with an error. Responding to notificaiton handle with an error message.");
			console.log(err);

			resp.statusCode = err.code;
			resp.json(err);

		});
	}
	else
	{
		// since we have yet to download the request, respond with a 400 HTTP response to the webhook emitter
		resp.statusCode = 400;
		resp.json({code: 400, msg: "Request body malformed", detail: "The notification object is missing the needed information to process."});
	}
}

/**
 * This function will process a create notification.
 * 
 * @param {*} partnerDb 
 * @param {*} theNotification 
 * @param {*} theRequest 
 */
function processCreateNotification(partnerDb, theNotification, theRequest)
{
	return new Promise(function(resolve, reject)
	{
		db.products.findByProductCode(partnerDb, theRequest.request.options.productCode).then(function(selectedProduct)
		{
			if(adapterUtils.isNullOrEmpty(selectedProduct))
			{
				var msg = `The product code '${theRequest.request.options.productCode}' was not found in the database.`;
				console.log(msg);
				
				reject({code : 400, msg : "Invalid product", detail : msg});

			}
			else
			{
				if(theRequest.request.type === cfg.adapter.request.type.newValue)
				{
					console.log("Request to create a new order.");

					var orderInfo = {
						rush: theRequest.request.options.rush
					}

					db.orders.create(partnerDb, theNotification, theRequest.id, selectedProduct, orderInfo, theRequest.entityRef, theRequest.request.loan).then(function(newOrder)
					{
						resolve(newOrder);
	
					}).catch(function(err)
					{
						reject({code : 500, msg : "Error trying to create a new order", detail : err});
	
					});
				}
				else
				{
					var priorTrxId = theRequest.request.options.priorReqId;
					console.log(`Request to update an existing order associated to prior request '${priorTrxId}'.`);

					if(priorTrxId)
					{
						db.orders.findByTransactionId(partnerDb, priorTrxId).then(function(foundOrder)
						{
							if(adapterUtils.isNullOrEmpty(foundOrder))
							{
								var msg = `No order was found associated to request '${theRequest.id}'.`;
								console.log(msg);
								reject({code : 404, msg : "Missing existing order", detail : msg});

							}
							else
							{
								console.log("Updating an existing order.");
				
								db.orders.update(partnerDb, foundOrder, theNotification, theRequest.id, selectedProduct, theRequest.request.loan).then(function(updatedOrder)
								{
									resolve(updatedOrder);
				
								}).catch(function(err)
								{
									reject({code : 500, msg : "Error trying to update an existing order", detail : err});
				
								});

							}

						}).catch(function(err)
						{
							reject({code : 500, msg : "Error trying to find an order", detail : err});
	
						});
					}
					else
					{
						reject({code : 400, msg : "Missing prior transaction ID", detail : `Request '${theRequest.id}' is a request against an existing order`});

					}

				}
			}

		}).catch(function(err)
		{
			var msg = `Error trying to lookup a product with product code '${theRequest.request.options.productCode}'.`;

			console.log(msg);
			console.log(err);

			reject({code : 500, msg : "Error trying to find the product", detail : err});

		});
	});
}

/**
 * 
 * 
 * @param {*} partnerDb 
 * @param {*} theNotification 
 * @param {*} theRequest 
 */
function processUpdateNotification(partnerDb, theNotification, theRequest)
{
	return new Promise(function(resolve, reject)
	{
		db.products.findByProductCode(partnerDb, theRequest.request.options.productCode).then(function(selectedProduct)
		{
			var priorTrxId = theNotification.meta.resourceId;

			console.log(`Request to update an existing order associated to prior request '${priorTrxId}'.`);

			db.orders.findByTransactionId(partnerDb, priorTrxId).then(function(orderObj)
			{
				if(adapterUtils.isNullOrEmpty(orderObj))
				{
					console.log(`The solution could not find an existing order related to request id '${theRequest.id}'`);
					reject({code : 404, msg : "No order found", detail : "No order was found associated to request id '" + priorTrxId + "'"});
				}
				else
				{
					console.log("Updating an existing order.");

					var orderInfo = {
						rush: theRequest.request.options.rush
					}

					db.orders.update(partnerDb, orderObj, theNotification, theRequest.id, selectedProduct, orderInfo, theRequest.request.loan).then(function(updatedOrder)
					{
						resolve(updatedOrder);

					}).catch(function(err)
					{
						reject({code : 500, msg : "Error trying to create a new order", detail : err});

					});
				}
				
			}).catch(function(err)
			{
				console.log("Error trying to handle request.");
				console.log(err);
				
				reject({code : 500, msg : "Error connecting to the data source.", detail : err});
			});
			
		}).catch(function(err)
		{
			var msg = `Error trying to lookup a product with product code '${theRequest.request.options.productCode}'.`;

			console.log(msg);
			console.log(err);

			reject({code : 500, msg : "Error trying to find the product", detail : err});

		});
	});
}

//=================================================================================================
//=================================================================================================
//
//  Handle event notification functions
//
//=================================================================================================
//=================================================================================================

function handleEPCEventNotification(req, resp, partnerDb)
{
	console.log("Handling an event notification");
	adapterUtils.outputRequest("rcv", "epc-event-notify", req);
	
	if(adapterUtils.isValidEPCNotification(req.body, cfg.epc.notification.eventType.createValue, cfg.epc.notification.resourceType.transactionEventValue) )
	{
		var evtId = req.body.meta.resourceId;
		var resourceRef = req.body.meta.resourceRef;
		
		epc.request.get(resourceRef).then(function(theEvent)
		{
			// at this point, we should always return a 200 to the webhook emitter.
			// Since we can get the event, it is now "owned" by the partner and 
			// should start communicating status to the Lender via the EPC PATCH
			// response method
			resp.json({code: 200, msg: "Downloaded event starting to process", detail: `The Partner Adapter has received event '${evtId}' and will start processing the request.`});

			console.log("Received event and will process.");
			console.log(theEvent);

			// Processing the event will include:
			//
			//     Parsing the resourceRef for the request ID
			//     Getting the order associated to the request ID
			//     Associating to the order
			//
			//     Will need to include appropriate error handling

			
		}).catch(function(err)
		{
			// since we have yet to download the request, respond with an error HTTP response to the webhook emitter
			console.log("Getting the request failed with an error. Responding to notificaiton handle with an error message.");
			console.log(err);

			resp.statusCode = err.code;
			resp.json(err);

		});
	}
	else
	{
		// since we have yet to download the request, respond with a 400 HTTP response to the webhook emitter
		resp.statusCode = 400;
		resp.json({code: 400, msg: "Request body malformed", detail: "The notification object is missing the needed information to process."});
	}
}

//=================================================================================================
//=================================================================================================
//
//  Authentication functions
//
//=================================================================================================
//=================================================================================================

function authenticateUser(partnerDb, uname, pwd)
{
	return new Promise(function(resolve, reject)
	{
		if(uname && pwd)
		{
			db.users.findByUsernameAndPassword(partnerDb, uname, pwd).then(function(userObject)
			{
				console.log(userObject);
				
				if(adapterUtils.isNullOrEmpty(userObject))
				{
					console.log("User '" + uname + "' not found.  Returning an empty token");
					reject({code: 401, msg : "User not found", detail : "'" + uname + "' is not a valid user."});
				}
				else
				{
					var createDate = new Date();
					var token = createDate.getTime().toString(36);
					
					userObject.token = token;
					userObject.tokenCreated = createDate.toISOString();
					
					var updatePromise = db.users.update(partnerDb, userObject);

					updatePromise.then(function(updatedUser)
					{
						resolve(updatedUser);

					}).catch(function(err)
					{
						reject({code: 500, msg: "Error trying to update user with new token.", detail: err});
					});
				}
				
			}).catch(function(err)
			{
				var msg = "Error received trying to authenticate '" + uname + "'.";
				console.log(msg + "  Rejecting the action with a 500.");
				console.log(err);
				reject({code: 500, msg: msg, detail: err});
			});
		}
		else
		{
			var msg = "The username and/or password parameter is not set.";
			console.log(msg + "  Rejecting the action with a 401.");
			reject({code: 401, msg: msg, detail: "The request does not contain the required credentials to authenticate the request."});
		}
	});
}
