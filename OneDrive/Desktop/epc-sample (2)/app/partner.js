/**
 * @file The partner.js file is the entry point for the sample Encompass Partner Connect application.  The
 * intention of the sample Encompass Partner Connect application is to provide an example partner solution that
 * can be extended for learning purposes.  Prior to using the sample application, you'll need to setup an environment.
 * <table>
 * <tr>
 * <th>&nbsp;</th><th>Step</th><th>Additional Information</th>
 * </tr>
 * <tr>
 * <td>1</td><td>Install node.js</td><td>Node.js is a JavaScript runtime environment used to build server nodes.  You can download node.js from {@link https://nodejs.org/en/download/|Downloads}</td>
 * </tr>
 * <tr>
 * <td>2</td><td>Create a working directory to store your node.js projects</td><td></td>
 * </tr>
 * <tr>
 * <td>3</td><td>Open a command window to the working directory created in step 2.</td><td></td>
 * </tr>
 * <tr>
 * <td>4</td><td>Install needed node.js modules</td><td>Enter the following command in the command window <pre><code>npm install -save express mongodb body-parser request cors</code></pre>This will install all the needed modules for the sample application</td>
 * </tr>
 * <tr>
 * <td>5</td><td>Get a <code>mongoDB</code> account</td><td>Sign-up for a free MongoDB Atlas account at {@link https://www.mongodb.com/cloud/atlas}</td>
 * </tr>
 * <tr>
 * <td>6</td><td>Install <code>ngrok</code></td><td><code>ngrok</code> is a utility that will proxy internet traffic to a locally running server.  You can download <code>ngrok</code> at {@link https://ngrok.com/download}</td>
 * </tr>
 * </table>
 */
 
console.log("Starting up the Partner Adapter server");
const cfg			= require('./partnerAdapter/config');
const express 		= require('express');
const MongoClient 	= require('mongodb').MongoClient;
const cors 			= require("cors");
const bodyParser 	= require('body-parser');

console.log("Initializing the Partner Adapter server");
const app 			= express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cors());

const client = new MongoClient(cfg.db.url, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(mongoCallback);

/**
 * This callback function is passed into the <code>MongoClient</code>'s <code>connect</code> function.  The 
 * successful call to this function will configure the adapter routes and start listening for incoming 
 * calls.  If the err parameter is set, the adatper will log the error and stop.
 */
function mongoCallback(err)
{
	console.log("Partner Adapter server MongoDB client setup");
	if(err)
	{
		console.log(err);
	}
	else
	{
		require('./partnerAdapter/routes')(app, client);
		
		app.use('/interface', express.static('./partnerUi'));
		app.listen(cfg.adapter.port, adapterServerHandler);
	}
}

/**
 * This callback function is passed into the the listen function of the express.js 
 * client.  This funtion logs to the console which port the adapter is listening.  The 
 * port is found in the adatper's config.js file
 */
function adapterServerHandler()
{
	console.log("The Partner solution is live on port '" + cfg.adapter.port + "'");
}