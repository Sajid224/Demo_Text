/**
 * @file This file contains the Partner Adapter configuration variables.  Changing these values will be used in the application.
 * @module {object} config
 */
module.exports = 
{
	adapter :
	{
		description: "This object contains the configuration properties that govern how the partner adapter operates.",
		port : 8181,
		outputMsg : true,
		msgDir : "C:\\Apps\\epc-sample\\messages",
		ordersDir : `C:\\Apps\\epc-sample\\orders\\%s`,
		request :
		{
			downloadFile : `%s\\request\\%s\\files\\%s`,
			type :
			{
				newValue : "NEW_REQUEST",
				existingValue : "EXISTING_REQUEST"
			}
		},
		response :
		{
			loanFile : `%s\\response\\loan.json`,
			fileDir : `%s\\response\\files`,
			respondingParty :
			{
				name : "Sample Partner",
				address : "3004 S Alaska St",
				city : "Seattle",
				state : "WA",
				postalCode : "98108",
				pointOfContact : {
					name : "Sample Partner Support",
					role : "Account Management",
					email : "acct.mgr@example.com",
					phone : "(206) 555-1234"
				}
			}
		}
	},
	epc :
	{
		description: "This object contains the information needed by the Partner Adapter to interact with Encompass Partner Connect.  The only properties that need to be changed are the client ID and secret.",
		clientId: "<<TBD>>",
		clientSecret: "<<UPDATE_HERE>>",
		loanFormat : "application/vnd.plm-2.0.0+json",
		url : 
		{
			getToken : `https://api.elliemae.com/oauth2/v1/token`,
			getOrigin : `https://api.elliemae.com/partner/v2/origins/%s`,
			getRequest : `https://api.elliemae.com/partner/v2/transactions/%s`,
			getResources : `https://api.elliemae.com/partner/v2/transactions/%s/request/resources`,
			patchResponse : `https://api.elliemae.com/partner/v2/transactions/%s/response`,
			sendResource : `https://api.elliemae.com/partner/v2/transactions/%s/response/resources`,
		},
		notification : {
			eventType :
			{
				createValue : "created",
				updateValue : "updated"
			},
			resourceType :
			{
				transactionValue : "urn:elli:epc:transaction",
				eventValue : "urn:elli:epc:event"
			}
		},
		status :
		{
			processing : "processing",
			completed : "completed",
			inputRequired : "inputRequired",
			error : "failed",
			canceled : "canceled"
		}
	},
	order :
	{
		description : "This object holds order information used by the adatper",
		status :
		{
			created : "Made",
			acknowledged : "Got It",
			dataNeeded : "Need More",
			completed : "Fini",
			error : "Oops",
			canceled : "Nah"
		}
	},
	http :
	{
		description: "This object contains the configuration properties that govern what will be sent in HTTP requests or retrieved from HTTP responses.",
		request :
		{
			userAgent: "EllieMae Integrations Team EPC Example in Node.js"
		},
		response :
		{
			correlationIdHeaderName: "X-Correlation-ID"
		}
	},
	db :
	{
		description: "This object contains the mongoDb configuration information",
		url: "<<TBD>>",
		dbName: "partner",
		collectionNames :
		{
			products: "products",
			orders: "orders",
			users: "users"
		}
	}
}