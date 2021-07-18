/**
 * @file This file contains the Partner Adatper database functions.
 * @module {object} database
 */
 module.exports = {
	products :
	{
		getAll : getAllProducts,
		findById : findProductById,
		findByProductCode : findProductByProductCode
	},
	orders :
	{
		findById : findOrderById,
		findByLoanGuid : findOrdersByLoanGuid,
		findByTransactionId : findOrderByTransactionId,
		findByLatestTransactionId : findOrderByLatestTransactionId,
		create : createOrder,
		update : updateOrder
	},
	users :
	{
		findByUsernameAndPassword : findUserByUsernameAndPassword,
		findByToken : findUserByToken,
		update : updateUser
	}
}

const cfg = require("./config");
const adapterUtils = require("./adapterUtils");


//=================================================================================================
//=================================================================================================
//
// product collection functions
//
//=================================================================================================
//=================================================================================================

/**
 * 
 * @param {MongoClient.Db} partnerDb The partner DB that contains the partner data
 */
function getAllProducts(partnerDb)
{
	return new Promise(function(resolve, reject)
	{
		console.log('Getting the product list');
		
		var productListCursor = partnerDb.collection(cfg.db.collectionNames.products).find({});
		
		var productList = productListCursor.toArray();

		productList.then(function(value)
		{
			resolve(value);
			
		}).catch(function(err)
		{
			console.log("Error received trying to get all products.  Returning an empty list.");
			console.log(err);
			resolve(new Array());
			
		});
	
	});
}

/**
 * 
 * @param {MongoClient.Db} partnerDb The MongoClient.Db object used to store / access the partner data.
 * @param {string} productId The partner ID that should be used to 
 */
function findProductById(partnerDb, productId)
{
	return new Promise(function(resolve, reject)
	{
		console.log("Call to get product by id");
		
		var queryCriteria = {_id : productId};

		var productCursor = partnerDb.collection(cfg.db.collectionNames.products).findOne(queryCriteria);

		productCursor.then(function(product)
		{
			resolve(product);

		}).catch(function(err)
		{
			console.log("Error received trying to the product with ID '" + productId + "'.  Returning an empty object.");
			console.log(err);
			resolve({});
		});
	})
}

function findProductByProductCode(partnerDb, productCode)
{
	return new Promise(function(resolve, reject)
	{
		console.log("Call to get product by id");
		
		var queryCriteria = {productCode : productCode};

		var productCursor = partnerDb.collection(cfg.db.collectionNames.products).findOne(queryCriteria);

		productCursor.then(function(product)
		{
			resolve(product);

		}).catch(function(err)
		{
			console.log("Error received trying to the product with ID '" + productCode + "'.  Returning an empty object.");
			console.log(err);
			resolve({});
		});
	})
}

//=================================================================================================
//=================================================================================================
//
// order collection functions
//
//=================================================================================================
//=================================================================================================

function findOrderById(partnerDb, orderId)
{
	return new Promise(function(resolve, reject)
	{
		console.log("Getting the order list of loan '" + orderId + "'.");
		
		var queryCriteria = {_id : orderId};
		
		var orderCursor = partnerDb.collection(cfg.db.collectionNames.orders).findOne(queryCriteria);
		
		orderCursor.then(function(orderDoc)
		{
			resolve(orderDoc);

		}).catch(function(err)
		{
			console.log("Error received trying to get an order by id '" + orderId + "'.  Returning an empty object.");
			console.log(err);
			resolve({});
		});
	});
}

function findOrdersByLoanGuid(partnerDb, loanGuid)
{
	return new Promise(function(resolve, reject)
	{
		console.log("Getting the order list of loan '" + loanGuid + "'.");
		
		var queryCriteria = {loanGuid : loanGuid};
		
		var orderCursor = partnerDb.collection(cfg.db.collectionNames.orders).find(queryCriteria);
		
		var orderList = orderCursor.toArray();
		
		orderList.then(function(value)
		{
			resolve(value);

		}).catch(function(err)
		{
			console.log("Error received trying to get all orders.  Returning an empty list.");
			console.log(err);
			resolve(new Array());
		});
	});
}

function findOrderByTransactionId(partnerDb, epcTrxId)
{
	return new Promise(function(resolve, reject)
	{
		if(epcTrxId)
		{
			console.log("Getting the order related to transaction '" + epcTrxId + "'");
			
			var queryCriteria = {trxIds: epcTrxId};

			var orderCursor = partnerDb.collection(cfg.db.collectionNames.orders).find(queryCriteria);
			
			if(orderCursor)
			{
				if(orderCursor.hasNext())
				{
					resolve(orderCursor.next());
				}
				else
				{
					console.log("No order object was found for transaction id '" + epcTrxId + "'.");
					resolve({});  // this is returning an empty JSON Object
				}
			}
			else
			{
				console.log("'" + epcTrxId + "' did not result in a cursor object.  No existing order to updated.  Returning an empty object.");
				console.log(err);
				resolve({});  // this is returning an empty JSON Object
			}
		}
		else
		{
			console.log("A transaction ID is not provided.  Returning an empty object.");
			resolve({});  // this is returning an empty JSON Object
		}
	});
}

/**
 * Orders can have multiple requests.  The <code>orders</code> collection contains a <code>latestTrxId</code> property and an <code>Array</code>.
 * of transaction IDs that have been recieved for the order.  This function will search the <code>orders</code> collection for a document that
 * contains a <code>latestTrxId</code> with the <code>epcTrxId</code> value.
 * 
 * @param {*} partnerDb 
 * @param {string} epcTrxId 
 * @returns {Promise<Order>} The function will return a promise that resolve to the  {@link Order} object with the <code>latestTrxId</code> 
 *                            equal to the <code>epcTrxId</code> value
 */
function findOrderByLatestTransactionId(partnerDb, epcTrxId)
{
	return new Promise(function(resolve, reject)
	{
		if(epcTrxId)
		{
			console.log("Getting the order with the latest transaction id '" + epcTrxId + "'.");
			
			var queryCriteria = {latestTrxId : epcTrxId};

			var orderCursor = partnerDb.collection(cfg.db.collectionNames.orders).findOne(queryCriteria);
			
			orderCursor.then(function(value)
			{
				resolve(value);
				
			}).catch(function(err)
			{
				console.log("Error received trying to get an order with transaction id '" + epcTrxId + "'.  Returning an empty object.");
				console.log(err);
				resolve({});  // this is returning an empty JSON Object
			});
		}
		else
		{
			console.log("A transaction ID is not provided.  Returning an empty object.");
			resolve({});  // this is returning an empty JSON Object
		}
	
	});
}

/**
 * The function will create an order in the database.
 * 
 * @param {*} partnerDb 
 * @param {*} trxId 
 * @param {*} loanGuid 
 * @param {*} productId 
 * @param {*} loanData 
 * 
 * @returns {Promise.<Order>}
 * 
 */
function createOrder(partnerDb, theNotification, reqId, product, addlOrderInfo, entityRef, entity)
{
	return new Promise(function(resolve, reject)
	{
		console.log("Creating a new order.");

		var createDate = new Date();

		var newOrder = 
		{
			product : product,
			additionalOrderInformation: addlOrderInfo,
			status : cfg.order.status.created,
			latestTrxId : reqId,
			trxIds : [reqId],
			loanGuid : adapterUtils.extractLoanGuid(entityRef),
			entityReference : entityRef,
			entity : (entity ? entity : {}),
			notifs : [theNotification],
			created : createDate.toISOString(),
			modified : createDate.toISOString()
		};

		var insertCursor = partnerDb.collection(cfg.db.collectionNames.orders).insertOne(newOrder);

		insertCursor.then(function(insertResult)
		{
			resolve(insertResult.ops[0]);

		}).catch(function(err)
		{
			console.log(`Received error trying to insert a new order based on request ${reqId}`);
			console.log(err);

			reject(`Unable to create new order due to request ${reqId}`);

		});
	});
}

function updateOrder(partnerDb, order, theNotification, requestId, updatedProduct, addlOrderInfo, entity)
{
	return new Promise(function(resolve, reject)
	{
		if(order._id)
		{
			console.log("Updating order against loan '" + order._id + "'.");
	
			var modifiedDate = new Date();
	
			var idCriteria = {_id : order._id};
			
			var updateVals = { $set:
			{
				product : updatedProduct,
				additionalOrderInformation: addlOrderInfo,
				latestTrxId : requestId,
				trxIds : order.trxIds.concat([requestId]),
				entity : (entity ? entity : {}),
				notifs : order.notifs.concat([theNotification]),
				modified : modifiedDate.toISOString()
			}};
	
			var updatePromise = partnerDb.collection(cfg.db.collectionNames.orders).updateOne(idCriteria, updateVals);
	
			updatePromise.then(function(updateResult)
			{
				findOrderById(partnerDb, order._id).then(function(updatedOrderObj)
				{
					resolve(updatedOrderObj);

				}).catch(function(err)
				{
					console.log("Error received trying to get the updated order with id '" + order._id + "'.");
					console.log(err);
			
					reject(err);

				});

			}).catch(function(err)
			{
				console.log("Error received trying to update order for order with id '" + order._id + "'.");
				console.log(err);
		
				reject(err);

			});
		}
		else
		{
			console.log("Order object does not have an id parameter.  Returning an error to the calling function.");
			console.log(object);

			reject("Order object does not have an id parameter.");
		}
	});
}

//=================================================================================================
//=================================================================================================
//
// users collection functions
//
//=================================================================================================
//=================================================================================================

function findUserByUsernameAndPassword(partnerDb, uname, pwd)
{
	return new Promise(function(resolve, reject)
	{
		if(uname && pwd)
		{
			console.log("Searching for user with username '" + uname + "' by username and password.");
			
			var queryCrit = {uid : uname, pwd : pwd};
			console.log("Search criteria..");
			console.log(queryCrit);
			console.log("Trying to find in collection " + cfg.db.collectionNames.users);
			var userPromise = partnerDb.collection(cfg.db.collectionNames.users).findOne(queryCrit);
			
			userPromise.then(function(userObject)
			{
				resolve(userObject);
				
			}).catch(function(err)
			{
				console.log("Error received trying to get all orders.  Returning an empty object.");
				console.log(err);
				resolve({});
			});
		}
		else
		{
			console.log("Username and password not provided.  Returning an empty object.");
			resolve({});
		}
	});
}

function findUserByToken(partnerDb, token)
{
	return new Promise(function(resolve, reject)
	{
		if(token)
		{
			console.log("Finding user with username '" + uname + "' by token.");
			
			var queryCrit = {token : token};
			
			var userPromise = partnerDb.collection(cfg.db.collectionNames.users).findOne(queryCrit);
			
			userPromise.then(function(userObject)
			{
				resolve(userObject);
				
			}).catch(function(err)
			{
				console.log("Error received trying to get all orders.  Returning an empty object.");
				console.log(err);
				resolve({});
			});
		}
		else
		{
			console.log("Token not provided.  Returning an empty object.");
			resolve({});
		}
	});
}

function updateUser(partnerDb, user)
{
	return new Promise(function(resolve, reject)
	{
		var idCriteria = {_id : user._id};
		
		var updateVals = { $set: {uid: user.uid, pwd: user.pwd, token: user.token, tokenCreated: user.tokenCreated}};
		
		var updatePromise = partnerDb.collection(cfg.db.collectionNames.users).updateOne(idCriteria, updateVals);
		
		updatePromise.then(function(updateResult)
		{
			console.log("User updated.");
			resolve(user);
			
		}).catch(function(err)
		{
			console.log("Error received trying to save token for '" + uname + "'.  Rejecting the action with a 500.");
			console.log(err);
	
			reject(500);
		});
	});
}

/**
 * @typedef {object} Order The Order that was created based on requests received from Encompass.
 * @property {string} _id Contains the ID generated by MongoDB.
 * @property {string} status The status of the order.  The config file contains the valid values that will be populated.
 * @property {string} latestTrxId Contains the latest transaction ID recieved for the order.
 * @property {array} trxIds The list of transaction IDs received for this order.  This list includes the <code>latestTrxID</code> as well.
 * @property {string} entityReference The entity reference information provided in the request message.
 * @property {object} entity The entity data provided in the request message.  Generally, will be converted by the partner system as part of
 *                           the order process.  The type will be found in the <code>entityReference</code>
 * @property {date} created [Partner Product Config] Constains the Partner UI location.  This is configured in the partner product.
 * @property {date} modified [Partner Product Config] An object that summarizes which partner product.
 */

/**
 * @typedef {object} Product Represents a product a user could order.
 * @property {string} _id Contains the ID generated by MongoDB.
 * @property {string} productName The value displayed to the user.
 * @property {string} productCode The code that represents the product.  Intended as a user-friendly identifier
 *
 */