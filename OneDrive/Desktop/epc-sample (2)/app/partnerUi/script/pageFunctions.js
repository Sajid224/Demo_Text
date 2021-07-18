
async function loadPage()
{
    // Draw the page debug info
    
	document.getElementById("pageUrlValue").innerHTML = location.href;
    document.getElementById("referrerUrlValue").innerHTML = (document.referrer ? document.referrer : "Not Set");
    document.getElementById("userAgentValue").innerHTML = (navigator.userAgent ? navigator.userAgent : "Not Set");

    //Make create origin call
    let trxObject = await elli.script.getObject("transaction");
    let originData = await trxObject.getOrigin();

    console.log("Got the origin object from the Partner JavaScript API.");
    console.log(originData);

    if(originData.transactionId)
    {
        await loadExistingOrderPage(originData);
    }
    else
    {
        await loadNewOrderPage(originData);
    }

    // call the activate page function to get the buttons activated or diabled
    activatePage();

    var reqTitleWidget = document.getElementById("requestTitle");
    reqTitleWidget.innerHTML = "Ready Commander";
}

async function loadNewOrderPage(originData)
{
    console.log("Preparing UI for a New Request!");

    let startTs = Date.now();
    let getUiResult = await getUI(originData.id, originData.partnerAccessToken);

    // add the duration to make the getUIResults call
    let durationMs = Date.now() - startTs;
    let durationSec = durationMs / 1000;
    document.getElementById("getUiDurationValue").innerHTML = durationSec.toFixed(2) + " seconds";


    var sendButton = document.getElementById("sendButton");
    sendButton.value = "Submit";

    // convert the UI result string to an object
    uiInfo = JSON.parse(getUiResult);
    
    // add new to the order number field
    document.getElementById("orderNumber").value = "<NEW>";

    initializeProductsDropDown(uiInfo.products);
}

async function loadExistingOrderPage(originData)
{
    console.log("Preparing UI for transaction with id '"+ originData.transactionId + "'!");

    priorTrxId = originData.transactionId;

    var sendButton = document.getElementById("sendButton");
    sendButton.value = "Update";

    //Get page data from server

    let startTs = Date.now();
    let getUiResult = await getUI(originData.id, originData.partnerAccessToken, originData.transactionId);

    // add the duration to make the getUIResults call
    let durationMs = Date.now() - startTs;
    let durationSec = durationMs / 1000;
    document.getElementById("getUiDurationValue").innerHTML = durationSec.toFixed(2) + " seconds";

    // convert the UI result string to an object
    uiInfo = JSON.parse(getUiResult);

    // add order number to the UI
    document.getElementById("orderNumber").value = uiInfo.selectedOrder._id;

    // load the product drop-down and include the selected product
    initializeProductsDropDown(uiInfo.products, uiInfo.selectedOrder.product);

    // if additional order information available, update the rush checkbox based on the additional order information
    if(uiInfo.selectedOrder.additionalOrderInformation)
    {
        document.getElementById("rush").checked = uiInfo.selectedOrder.additionalOrderInformation.rush;
    }
}

function initializeProductsDropDown(productList, selectedProduct)
{
    const productsDropDown = document.getElementById("products");

    productsDropDown.addEventListener("change", function(evt){
        
        activatePage();

    });

    if(productList)
    {
        productList.forEach(function (productItem){
    
            const productOption = document.createElement("option");
    
            productOption.text = productItem.productName;
            productOption.value = productItem.productCode;
    
            if(selectedProduct)
            {
                if(selectedProduct.productCode === productItem.productCode)
                {
                    productOption.selected = true;
                }
            }
    
            productsDropDown.options.add(productOption);
        });
    }

    console.log("Selected index: " + productsDropDown.selectedIndex);
}

function activatePage()
{
    const productsDropDown = document.getElementById("products");

    if(productsDropDown.selectedIndex > 0)
    {
        // activating the buttons on the page to allow for the user to submit a request
        document.getElementById("sendButton").disabled = false;
        document.getElementById("addAttachButton").disabled = false;
        document.getElementById("sendAttachmentButton").disabled = false;
    }
    else
    {
        // disabling the buttons on the page to allow for the user to submit a request
        document.getElementById("sendButton").disabled = true;
        document.getElementById("addAttachButton").disabled = true;
        document.getElementById("sendAttachmentButton").disabled = true;
    }
}

async function addAttachments()
{
	let appObj = await elli.script.getObject("application");

	let selectedFilesList = await appObj.performAction("getAvailableResources");

	if(selectedFilesList)
	{
		if(Array.isArray(selectedFilesList))
		{
            console.log("Processing attachments");

            // copy the selected files to the list
            selectedFilesList.forEach(function(selectedFile){
                
			    attachmentFileList.push(selectedFile);

            });
            
            let attachmentListLabel = "";

            attachmentFileList.forEach(function(attachmentFile)
            {

                if(attachmentListLabel.length > 0)
                {
                    attachmentListLabel = attachmentListLabel + ", ";
                }
                
                attachmentListLabel = attachmentListLabel + attachmentFile.name;
            });

            document.getElementById("attachmentList").innerHTML = attachmentListLabel;

		}
		else
		{
			console.log("Did not receive a list of selected resource")
		}
	}
	else
	{
		console.log("No data provided, assuming the user clicked 'Cancel'.");
	}
}

function clearAttachments()
{
    attachmentFileList = new Array();

    document.getElementById("attachmentList").innerHTML = "No Attachments";
}

function sendRequest()
{
    var sendButton = document.getElementById("sendButton");

    if(sendButton.value === "Submit")
    {
        sendCreateRequest();
    }
    else
    {
        sendUpdateRequest();
    }
}

async function sendCreateRequest()
{
    // update page title
    var reqTitleWidget = document.getElementById("requestTitle");
    reqTitleWidget.innerHTML = "Ready Commander";

    // get the page form controls
    const productDropDown = document.getElementById("products");
    const rushCheckbox = document.getElementById("rush");

    //build request object
	var req = {
		request: {
			options: {
				productCode: new Number(productDropDown.options[productDropDown.selectedIndex].value),
                rush: rushCheckbox.checked
			}
		}
	};

    // add attachments if available to the request object
    if(attachmentFileList.length > 0)
    {
        req.request.resources = attachmentFields;
    }

	if(priorTrxId)
	{
		console.log("Sending a new request and linking to an existing request via the Partner JavaScript API.");

		req.request.type = "EXISTING_REQUEST",
		req.request.options.priorReqId = priorTrxId;
	}
	else
	{
		console.log("Sending a new request via the Partner JavaScript API.");

		req.request.type = "NEW_REQUEST"
	}

    //Hide the order panel
    let orderPanelWidget = document.getElementById("orderPanel");
    orderPanelWidget.style.display = "none";

    //Show the progress panel
    let progressPanelWidget = document.getElementById("progressPanel");
    progressPanelWidget.style.display = "block";

    let progressTitleWidget = document.getElementById("progressTitle");
    progressTitleWidget.innerHTML = "Sending request";

    //send request object
    let trxObject = await elli.script.getObject("transaction");
    let trxData = await trxObject.create(req);

	console.log("Create the transaction with id " + trxData.id + "");
    console.log(trxData);

    // clear the attachment list since it has been sent
    attachmentFields = new Array();

    progressTitleWidget.innerHTML = "Request '" + trxData.id + "' created.";
}

async function sendUpdateRequest()
{
    // update page title
    var reqTitleWidget = document.getElementById("requestTitle");
    reqTitleWidget.innerHTML = "Sending Update via the Partner JavaScript API.";

    // get the page form controls
    const productDropDown = document.getElementById("products");
    const rushCheckbox = document.getElementById("rush");

    //build request object
	var req = {
		request: {
			options: {
				productCode: new Number(productDropDown.options[productDropDown.selectedIndex].value),
                rush: rushCheckbox.checked
			}
		}
	};

    // add attachments if available to the request object
    if(attachmentFileList.length > 0)
    {
        req.request.resources = attachmentFields;
    }

    //Hide the order panel
    let orderPanelWidget = document.getElementById("orderPanel");
    orderPanelWidget.style.display = "none";

    //Show the progress panel
    let progressPanelWidget = document.getElementById("progressPanel");
    progressPanelWidget.style.display = "block";

    pageState = "progress";

    // update title
    let progressTitleWidget = document.getElementById("progressTitle");
    progressTitleWidget.innerHTML = "Sending request update.";

    //send request object
    let trxObject = await elli.script.getObject("transaction");
    let trxData = await trxObject.update(req);

	console.log("Updated the transaction with id " + trxData.id + ".");
    console.log(trxData);

    // clear the attachment list since it has been sent
    attachmentFields = new Array();

    progressTitleWidget.innerHTML = "Request '" + trxData.id + "' updated.";
}

async function closePage()
{
	var transactionObject = await elli.script.getObject("transaction");
	await transactionObject.close();
}

async function cancel()
{
	var transactionObject = await elli.script.getObject("transaction");
	await transactionObject.cancel();
}

function loadAdminPage()
{

}

async function closeAdminPage()
{
	var transactionObject = await elli.script.getObject("transactionTemplate");
	await transactionObject.close();
}

//==============================================================================================================================
//
//  show panel functions
//
//==============================================================================================================================

function showOrder()
{
    if(pageState === "order")
    {
        document.getElementById("orderPanel").style.display = "block";
    }
    else
    {
        document.getElementById("progressPanel").style.display = "block";
    }

    document.getElementById("debugPanel").style.display = "none";    
}

function showDebug()
{
    if(pageState === "order")
    {
        document.getElementById("orderPanel").style.display = "none";
    }
    else
    {
        document.getElementById("progressPanel").style.display = "none";
    }

    document.getElementById("debugPanel").style.display = "block";    
}