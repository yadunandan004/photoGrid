'use strict';
const express = require('express');
const path = require('path');
const config = require('./config');
const knox =  require('knox');
const fs = require('fs');
const os = require('os');
const formidable = require('formidable');
const gm = require('gm');
const mongoose = require('mongoose').connect(config.dbURL);
var app = express();


app.set('views', path.join(__dirname, 'views'));
app.engine('html',require('hogan-express'));
app.set('view engine','html');

app.use(express.static(path.join(__dirname,'public')));
app.set('port',process.env.port || 3000);
app.set('host',config.host);

var knoxClient = knox.createClient({
	key:config.S3AccessKey,
	secret:config.S3Secret,
	bucket:config.S3BucketKey
})
var server = require('http').Server(app);
var io= require('socket.io')(server);
require('./routes')(express,app,formidable,fs,os,gm,knoxClient,mongoose,io);



server.listen(app.get('port'),()=>{
	console.log('photoGrid running on port:'+ app.get('port'));
})