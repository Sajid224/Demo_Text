
module.exports =
{
    isNullOrEmpty: isNullOrEmpty,
    extractLoanGuid : extractLoanGuid,
    outputRequest : outputRequest,
    outputMessage: outputMessage,
    isValidEPCNotification: isValidEPCNotification
}

const cfg = require("./config");
const fs = require("fs");

function isNullOrEmpty(obj)
{
	retVal = true;
	
	if(obj)
	{
		retVal = Object.keys(obj).length === 0;
	}
	
	return retVal;
}

function extractLoanGuid(entityRef)
{
    var entityId = entityRef.entityId.split(":");
    var loanGuid = entityId[5];

    return loanGuid;
}

function outputRequest(direction, messageName, req)
{
	if(cfg.adapter.outputMsg)
	{
        var message =
        {
            protocol : req.protocol,
            hostname : req.hostname,
            subdomains : req.subdomains,
            method : req.method,
            headers : req.headers,
            path : req.path
        };

        if(req.params)
        {
            message.query = req.query;
        }

        if(req.params)
        {
            message.params = req.params;
        }

        if(req.body)
        {
            message.body = req.body;
        }

        var outfilename = createOutputFilename(cfg.adapter.msgDir, direction, messageName);
        var jsonStr = JSON.stringify(message);
        fs.writeFileSync(outfilename, jsonStr);
	}
}

function outputMessage(direction, messageName, message)
{
	if(cfg.adapter.outputMsg)
	{
        var outfilename = createOutputFilename(cfg.adapter.msgDir, direction, messageName);
        var jsonStr = JSON.stringify(message);
        fs.writeFileSync(outfilename, jsonStr);
	}
}

function createOutputFilename(path, direction, messageName)
{
    var now = new Date().valueOf();

    var retVal = path;

    if(retVal.lastIndexOf("\\") !== retVal.length - 1)
    {
        retVal = retVal + "\\";
    }

    retVal = retVal + now;
    retVal = retVal + "-";
    retVal = retVal + direction;
    retVal = retVal + "-";
    retVal = retVal + messageName;
    retVal = retVal + ".json";

    return retVal;
}

/**
 * 
 * @param {*} theNotification 
 * @param {*} expectedEventType 
 * @param {*} expectedResourceType 
 */
function isValidEPCNotification(theNotification, expectedEventType, expectedResourceType)
{
    var retVal = false;

    console.log("Validating that the notification is of type '" + expectedEventType + "' for a '" + expectedResourceType + "'");
    console.log("The notification is...");
    console.log(theNotification);

    if(theNotification && theNotification.eventType && theNotification.meta && 
        theNotification.meta.resourceType && theNotification.meta.resourceId && theNotification.meta.resourceRef)
	{
        if(theNotification.eventType === expectedEventType)
		{
            if(theNotification.meta.resourceType === expectedResourceType)
			{
                retVal = true;
            }
            else
            {
                console.log("The notification resource type '" + theNotification.meta.resourceType + "' does not match the expected event type '" + expectedResourceType + "'");
            }
        }
        else
        {
            console.log("The notification event type '" + theNotification.eventType + "' does not match the expected event type '" + expectedEventType + "'");
        }
    }
    else
    {
        console.log("The notification does not contain all the required properties.");
    }

    return retVal;
}