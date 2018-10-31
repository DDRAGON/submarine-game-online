var zlib = require('zlib');

const stringData = '["map data",{"playersMap":[],"AIMap":[["66559,526,856,1",{"x":990,"y":486,"isAlive":true,"';
let miniData;

zlib.deflate(stringData, function (err, buffer) {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    else {
        console.log(buffer);
        miniData = buffer.toString('base64');
        console.log(miniData);
        
        const buffer2 = Buffer.from(miniData, 'base64');
        zlib.unzip(buffer, (err, buffer3) => {
            if (!err) {
                console.log(buffer3.toString());
            } else {
                // handle error
            }
        });
    }
});
