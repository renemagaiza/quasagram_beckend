//dependences
const express = require('express')
const admin = require("firebase-admin")
let inspect = require('util').inspect
const Busboy = require('busboy')
const http = require('http')
let path = require('path')
let os = require('os')
let fs = require('fs')
let UUID = require('uuid-v4')
//const busboy = Busboy({ headers: request.headers });
//config - express
const app = express()
// config - firebase

const serviceAccount = require('./serviceAccountKey.json');
const { metadata } = require('core-js/fn/reflect')

admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'quasagram-e719b.appspot.com'
      });

const db = admin.firestore();
let bucket = admin.storage().bucket();


//endpoint - posts


app.get('/posts', (request, response) => {

    response.set('Access-Control-Allow-Origin', '*')

    let posts = []
    db.collection('pots').orderBy('date', 'desc').get().then(snapshot => {
        snapshot.forEach((doc) => {
        posts.push(doc.data())
    });
    response.send(posts)

    })
})

//endpoint - createposts


app.post('/createPost', (request, response) => {

    response.set('Access-Control-Allow-Origin', '*')

    let uuid = UUID()

    var busboy = Busboy({ headers: request.headers });

    let fields = {}
    let fileData = {}
    
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
        /// /tmp/576878767.png
        let filepath = path.join(os.tmpdir(), fieldname)
        file.pipe(fs.createWriteStream(filepath))
        fileData = {filepath, mimetype}
      });
      
    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
        fields[fieldname] = val
    });
    
    busboy.on('finish', function() {

    bucket.upload(
        fileData.filepath,
        {
            uploadType: 'media',
            metadata:{
                metadata:{
                    contentType: fileData.mimetype,
                    firebaseStorageDownloadTokens: uuid
                }
            }
        },
        (err, uploadedFile) => {
            if (!err){
                createDocument(uploadedFile)
            }
        }
    )

    function createDocument(uploadedFile){
        db.collection('pots').doc(fields.id).set({
            id: fields.id,
            caption: fields.caption,
            location: fields.location,
            date: parseInt(fields.date),
            imageUrl: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${uploadedFile.name}?alt=media&token=${uuid}`
        }).then( () => {
            response.send('Post added:' + fields.id)
        })
    }
    });
    request.pipe(busboy);
})



//listen
app.listen(process.env.PORT || 3000)