'use strict';
module.exports = (express,app,formidable,fs,os,gm,kc,mongoose,io)=>{
	var router = express.Router();
	var singleImg = new mongoose.Schema({
		filename:String,
		votes:Number
	})
	var singleImgModel = mongoose.model('singleImage',singleImg);
router.get('/',(req,res,next)=>{
	res.render('index',{host:app.get('host')});
})
var Socket;
io.on('connection',function(socket){
	Socket = socket;
})
router.post('/upload',(req,res,next)=>{
	//File upload
	function generateName(filename){
		var reg_ex = /(?:\.([^.]+))?$/;
		var ext = reg_ex.exec(filename)[1];
		var date = new Date().getTime();
		var charBank = "abcdefghijklmnopqrstuvwxyz";
		var fstring = "";
		for(var i=0; i < 15; i++)
		{
			fstring+= charBank[parseInt(Math.random()*26)];
		}
		return (fstring += date + '.' +ext);
	}
	var tmpFile,nfile,fname;
	var newForm = new formidable.IncomingForm();
	newForm.keepExtensions = true;
	newForm.parse(req,function(err,fields,files){
		tmpFile = files.upload.path;
		fname = generateName(files.upload.name);
		nfile = os.tmpDir() + '/' + fname;
		res.writeHead(200,{'Content-Type':'text/plain'});
		res.end();
	})
	newForm.on('end',function(){
		fs.rename(tmpFile,nfile,function(){
			//resize image and upload to bucket
			gm(nfile).resize(300).write(nfile,function(){
				//upload to s3 bucket
				fs.readFile(nfile,function(err,buf){
					var req = kc.put(fname,{'Content-Length':buf.length,'Content-Type':'image/jpeg'});
					req.on('response',function(res){
						if(res.statusCode ==  200)
						{
							//file is in S3 bucket
							var newImage = new singleImgModel({
								filename:fname,
								votes:0
							}).save();
							Socket.emit('status',{'msg':'Saved !!','delay':3000});
							Socket.emit('doUpdate',{});
							fs.unlink(nfile,function(){
								console.log('Local file deleted');
							})
						}
					})
					req.end(buf);
				})
			});
		});

	})
})
router.get('/getimages',function(req,res,next){
	singleImgModel.find({},null,{sort:{votes:-1}},function(err,data){
		res.send(JSON.stringify(data));
	})
})
router.get('/voteup/:id',function(req,res,next){
	
	singleImgModel.findByIdAndUpdate(req.params.id,{$inc:{votes:1}},function(err,result){
		res.send({votes:result.votes+1});
	})
})
router.get('/votedown/:id',function(req,res,next){
	
	singleImgModel.findByIdAndUpdate(req.params.id,{$inc:{votes:-1}},function(err,result){
		res.send({votes:result.votes-1});
	})
})
app.use('/',router);

}