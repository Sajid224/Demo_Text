function getUI(originId, pat, trxId)
{
	return new Promise(function(resolve, reject)
	{
		var url = "https://" + ADAPTER_DOMAIN_NAME + "/ui?oid=" + originId + "&pat=" + pat;

		if(trxId)
		{
			url = url + "&rid=" + trxId;
		}

		var xhttp = new XMLHttpRequest();
		
		xhttp.onreadystatechange = function()
		{
			if (this.readyState === 4)
			{
				if(this.status === 200)
				{
					resolve(this.responseText);
				}
				else
				{
					reject(this.responseText);
				}
			}
		};
		
		xhttp.open("GET", url, true);
		xhttp.send();
	})
}

function getProgress(trxId)
{
	
}