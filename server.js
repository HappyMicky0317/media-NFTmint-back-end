const express = require("express");

const ContractAddress = '0x0AD50C4DebdCe78F93EAf71D9029B3469207C0f5';
const OwnerAddress = '0xE686d4cE07034305A31d881b2Ab32aE6895B35F5';
const OwnerPrivateKey = '0xf4c3b0cb78e521829b0fc5b1bf654f4849bad8b9908a620e62b0bc7ae6f130b0';
// This owner will pay mint fees for all transactions.
const pinataApiKey = "a8bd3f27a3602b609c00";
const pinataSecretApiKey = "b7316ec284d24929f319bfd8700f0a9ebcbc579476dda8df4016cc24b2035ae9";


// for mint
const Web3 = require("web3");
const abi= require("../smart_contract/artifacts/contracts/NFTBatchMinting.sol/NFTBatchMinting.json");

const mint = async (uri, walletAddress) => {
    const web3 = new Web3("https://avalanche-fuji.infura.io/v3/648a641c48a44133b4bcea795725aa68");    
    const nftContract = new web3.eth.Contract(
      abi,
      ContractAddress
    );    
    const query = nftContract.methods.safeMint(walletAddress, uri);
    const encodedABI = query.encodeABI();
    const signedTx = await web3.eth.accounts.signTransaction(
      {
        data: encodedABI,
        from: OwnerAddress,
        to: ContractAddress,
        gas: 2000000,
      },
      OwnerPrivateKey,
      false
    );
    try {
      await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      console.log("true ");
    } catch (err) {
      console.log("error:", err);
    } 
};

const axios = require('axios');
const recursive = require('recursive-fs');
const fs = require('fs');
const FormData = require('form-data');
const textToImage = require('text-to-image');
const path = require('path');

const pinDirectoryTIoPFS = async (pinataApiKey, pinataSecretApiKey,description) => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
  const src = '../uploads';
  const srcJson = '../json';
  var file_name;
  recursive.readdirr(src, function (err, dirs, files) {
    const forLoop = async() => {
      for(let index = 0; index < files.length; index++) {
        var name = files[index].split("uploads/")[1].split(".")[0];
        file_name = files[index].split("uploads/")[1];
        let data = new FormData();
        await data.append(`file`, fs.createReadStream(files[index]));
        var result = await uploadImg(url, data, pinataApiKey, pinataSecretApiKey);
        
        var jsonData = await readFile(srcJson + "/1.json");
        var imageUrl = "https://gateway.pinata.cloud/ipfs/" + result.IpfsHash;
        var imageName = files[index].split("uploads/")[1].split(".")[0];
        var file_type = files[index].split("uploads/")[1].split(".")[1];
        file_type = file_type.toUpperCase();
        var newJson = {
          "description" : description,
          "image" : imageUrl,
          "name" : imageName
        }

        // create metadata json file for music NFTs.
        if(file_type == "MP3" || file_type == "AAC" ||file_type == "Ogg" ||file_type == "FLAC" ||file_type == "ALAC" ||file_type == "WAV" ||file_type == "AIFF" ||file_type == "DSD" ||file_type == "PCM" ||file_type == "WMA" || file_type == "M4A"){
          var newJson = {
            "description" : description,
            "animation_url" : imageUrl,
            "image" : "https://gateway.pinata.cloud/ipfs/QmdAabEkRaPeLT1jUMBZSTvuTggDEh4S5fRNRgCpNmZy6g",
            "name" : imageName
          }
        }

        newJson = JSON.stringify(newJson)
        var fileName = srcJson + "/1.json";
        await writeFile(fileName, newJson);
      }
    }
    forLoop();
  })
  return file_name;
}

const uploadImg = async (url, data, pinataApiKey, pinataSecretApiKey)=>{
  return new Promise((resolve, reject)=>{
    resolve(
      axios.post(url, 
        data, 
        {
            maxBodyLength: 'Infinity', //this is needed to prevent axios from erroring out with large directories
            headers: {
                'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
                pinata_api_key: pinataApiKey,
                pinata_secret_api_key: pinataSecretApiKey
            }
        })
        .then(function (response) {
            return response.data;
            //handle response here
        })
        .catch(function (error) {
            console.error("error: ", error);
            //handle error here
        })
    )
  })
}

const readFile =async (file) => {
  return new Promise((resolve, reject) => {
      resolve(
          fs.promises.readFile(file, 'utf8',  (err,data)=>{
              if (err){
                  console.error(err);return
              }
              return data;
          })
      )
  })
}

const writeFile = async (fileName, fileData) =>{
  fs.writeFile(path.join(__dirname, fileName),fileData, err => {
      if (err) {
          console.error(err)
          return
      }
  })
}

// convert text to image
const generatImage = async (text) => {
  const dataUri = await textToImage.generate(text , {
    debug: true,
    debugFilename: path.join('../uploads', 'image1.png'),
    maxWidth: 720,
    fontSize: 18,
    fontFamily: 'Arial',
    lineHeight: 30,
    margin: 5,
    bgColor: '#ADD8E6',
    textAlign: 'center',
    textColor: 'red',
  });
}

const pinMetadataToPFS = async () => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
  const src = "../json/1.json";
  let data = new FormData();
  await data.append(`file`, fs.createReadStream(src));
  result = await uploadImg(url, data, pinataApiKey, pinataSecretApiKey);
  var uri = "https://gateway.pinata.cloud/ipfs/" + result.IpfsHash;
  return uri;
}

const formatData = async(file) => {
  const directory = "../uploads";

  fs.readdir(directory, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      fs.unlink(path.join(directory, file), (err) => {
        if (err) throw err;
      });
    }
  });
}

const multer = require("multer");
var storage = multer.diskStorage(
    {
        destination: '../uploads/',
        filename: function ( req, file, cb ) {
            //req.body is empty...
            //How could I get the new_file_name property sent from client here?
            cb( null, file.originalname);
        }
    }
);

var upload = multer( { storage: storage } );

const app = express();
const cors=require("cors");
const corsOptions ={
   origin:true, 
   credentials:true,            //access-control-allow-credentials:true
   optionSuccessStatus:200,
}

function uploadFiles(req, res) {
  res.json({ message: "Successfully uploaded files" });
}


app.use(cors(corsOptions)) // Use this after the variable declaration
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.post("/upload_files", upload.array("files"), uploadFiles);

app.post("/upload_pinata",async (req, res) => {
  const file_name = await pinDirectoryTIoPFS(pinataApiKey, pinataSecretApiKey,req.body.description);
  var uri = await pinMetadataToPFS(pinataApiKey, pinataSecretApiKey);
  await mint(uri,req.body.walletAddress);
  await formatData(file_name);
  res.json({success:true})
});

app.post("/convert_image",async (req, res) => {
  generatImage(req.body.text);
  res.json({success:"convert success!"});
});
app.listen(5000, () => {
    console.log(`Server started...`);
});