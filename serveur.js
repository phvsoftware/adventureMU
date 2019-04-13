var http = require('http');
var url = require('url');
var fs = require('fs')
var path = require('path');

var server = http.createServer(function (req, res) {
    var page = url.parse(req.url).pathname;
    var contentType = 'text/html';
    var ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null);
    ip = ip.split(',')[0];
    ip = ip.split(':').slice(-1);

    console.log('IP client : ' + ip);

    if ((page == '/') || (page == null)) {
        page = '/index.html';
    }
    extname = path.extname(page);
    switch (extname) {
        case ".js":
            contentType = "application/javascript";
            break;
        case ".css":
            contentType = "text/css";
            break;
        case ".png":
            contentType = "image/png";
            break;
        case ".jpg":
            contentType = "image/jpeg";
            break;
        case ".ico":
            contentType = "image/ico";
            break;
    }

    var pagelue = '.././adventureMU' + page;

    console.log('page lue : ' +pagelue + ', contentType : ' + contentType);

    fs.readFile(pagelue, function (err, data) {
        if (err) {
            console.log("erreur 404...");
            return;
        }
        res.writeHead(200, {"Content-Type": contentType});
        res.write(data);
        res.end();
    });

});

server.listen(8080);